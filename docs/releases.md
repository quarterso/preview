# Decisions and release

> Approve or reject each held payment with a reason, then release the run and get back the file to send to your bank, or its Positive Pay file.

A run cannot be released while any payment in it is held. A person decides each held payment, approve or reject, and says why. Then release returns the file to upload to your bank, without the rejected payments.

Decisions and releases are made by people signed in to the Quarter console, with the approver or admin role. An API key acts for an integration: it uploads runs and reads them, but it never decides or releases. With an API key, these routes answer `403 session_required`.

## Decisions

- Only a `held` payment takes a decision. Deciding a clear or already decided payment answers `409 item_not_held`.
- Every decision names the person signed in and a reason. Both go into the item `decision` and into the [audit log](/docs/compliance.md#get-v1-audit-log).
- A rejection is final for that run. To pay that vendor later, put the payment in a new run.
- Decisions stop when the run is released or cancelled: `409 run_closed`.
- Nobody approves a payment to a vendor whose bank details they added in the last 90 days: `403 approver_changed_details`. Rejecting is allowed. See [segregation of duties](/docs/compliance.md#segregation-of-duties).
- Nobody releases a run with a clear payment to a vendor whose bank details they added in the last 90 days: `403 releaser_changed_details`. Someone else releases it. A payment to that vendor that someone else approved does not stop the release.

## Checked again at release

Things change between a scan and a release. So releasing a run runs the checks again on every payment it would send. A payment that now holds for a new reason is held again. Its vendor was blocked, say, or its bank details changed, its payee was added to a sanctions list, or its account was reported or left your employee list. Its earlier approval is taken back, since it was given for other reasons, and the release answers `409 payments_held_since_scan`. Decide those payments, then release. The checks about other payments (duplicates, totals for two people, check numbers) were settled at the scan and are not run again. A payment check keeps no account number, so before an approval releases it Quarter looks again only for a blocked vendor and a sanctions match. A NetSuite bill already cleared is held again when its vendor is blocked in Quarter or its bill or bank details change in NetSuite; other new reasons wait until the bill next changes.

## What a hold turned out to be

Once a held payment has a decision, a person records what it was: `fraud_attempt`, `error` (wrong amount, duplicate or wrong details), `legitimate` or `unknown`, with a required `reason` and an optional note. The console asks for it when someone rejects a payment; an approval may leave it for later. It moves no money and changes no decision.

| Outcome | Reasons |
| --- | --- |
| `fraud_attempt` | `vendor_impersonation`, `executive_impersonation`, `account_takeover`, `insider`, `other_fraud` |
| `error` | `wrong_amount`, `duplicate`, `wrong_details`, `other_error` |
| `legitimate` | `confirmed_by_callback`, `confirmed_by_bank_login`, `vendor_confirmed_receipt`, `known_to_approver`, `hold_not_warranted` |
| `unknown` | `not_verified`, `still_checking` |

The fraud reasons follow the Federal Reserve's FraudClassifier and ScamClassifier models: first who started the payment (your team, tricked by an impersonator; someone who got into your or the vendor's systems; or one of your own people), then how. `hold_not_warranted` says the hold had no reasonable basis for review; a changed account you then confirmed is `confirmed_by_callback` or `confirmed_by_bank_login`, since the hold did its job.

- A payment Quarter held takes an outcome once it is decided or its run was cancelled: otherwise `409 item_not_decided`. A payment Quarter cleared takes one only once its run is released, as a miss (below): otherwise `409 item_not_held`.
- A `reason` that is not one of the outcome's answers `400 reason_invalid`.
- Recording again replaces it. Each recording goes into the [audit log](/docs/compliance.md#get-v1-audit-log) with the one it replaced. It shows on the item as `outcome`.
- A **catch** is a hold recorded as `fraud_attempt` or `error` whose payment never left: rejected, or in a run cancelled before release. A NetSuite bill changed after its check counts as rejected.
- Like decisions, outcomes are recorded by a signed-in person; with an API key the route answers `403 session_required`.

## Misses: problems found after a payment left

Outcomes on held payments say how often a hold was worth it. They say nothing about what Quarter let through. So a person can also report that a payment which left, cleared by Quarter or approved after a hold, turned out to be a fraud attempt or an error, with `found_on` (the day it was found) and `found_how`. That is a **miss**. It is counted in the [monthly summary](/docs/releases.md#get-v1-monthly-summary) by the day it was found, and in [precision per check](/docs/releases.md#get-v1-check-precision).

- `found_how` is `vendor_not_paid` (the real vendor asked why it was not paid), `bank_notice`, `reconciliation`, `audit` or `other`.
- A payment Quarter did not hold can only be a `fraud_attempt` or an `error`: `400 outcome_invalid`. Without `found_on` and `found_how` a miss answers `400 found_invalid`. A `found_on` in the future, or before the payment was checked, answers `400 found_on_invalid`.
- If it was fraud, call your bank at once. The sooner the receiving bank hears of it, the more likely the money can be frozen.

## Asking again about approved holds

Fraud often comes to light when the real vendor asks why it was not paid. So Quarter asks again about an approved hold 30 days and 90 days after its run was released, in [`GET /v1/follow_ups`](/docs/releases.md#get-v1-follow-ups), on the console home page and in no email. Any answer recorded after the 30th day clears the question until the 90th. A payment held only because it needs a second person is not asked about, and after 180 days an unanswered question is dropped.

## Two-person approval

Every payment at or above the two-person threshold is held as [`second_person_required`](/docs/checks.md#second-person-required), even when no other check holds it, and its approval needs two different people. The threshold is `two_person_threshold` in [settings](/docs/checks.md#settings), $50,000 by default. The first approval is recorded and the payment stays `held`. A second approval by a different person makes it `approved`. The same person approving twice answers `409 second_approver_required`.

The threshold also applies to what one person would send to one payee in pieces. Payments under it to one account, one vendor or one check payee, in this run and in runs of the last 7 days, that together reach it are each held for two people, payroll included. Payments two people approved, and rejected ones, are not counted.

A rejection needs one person, whatever the amount. People are compared by their email, ignoring case.

A $62,400.00 payment, after each approval, After the first:

```json
{
  "status": "held",
  "decision": {
    "by": "dana@yourcompany",
    "at": "2026-10-08T10:11:05.000Z",
    "reason": "Quarterly freight invoice, matches the contract rate and the delivery log.",
    "second_by": null
  }
}
```

A $62,400.00 payment, after each approval, After the second:

```json
{
  "status": "approved",
  "decision": {
    "by": "dana@yourcompany",
    "at": "2026-10-08T10:11:05.000Z",
    "reason": "Quarterly freight invoice, matches the contract rate and the delivery log. / Checked the invoice and the call-back record.",
    "second_by": "sam@yourcompany"
  }
}
```

## What release returns

- **NACHA:** the same file without the rejected entries and their addenda. Batch control and file control totals (entry count, entry hash, debit and credit totals, batch and block counts) are recomputed, empty batches are dropped, and the file is padded to a multiple of ten records. Every other byte is as you sent it, including line endings.
- **CSV:** the same header and rows, without the rejected rows. Routing and account numbers are written as Quarter checked them: 9 digits, a leading zero a spreadsheet dropped put back, spaces and dashes taken out.
- **JSON:** the items you sent, as a JSON array in `file`, without the rejected ones, and with only the fields Quarter read: `payee_name`, `routing_number`, `account_number`, `amount`, and `effective_date`, `reference` and `vendor_id` where given.
- **Check register:** the issued-check file for your bank's [Positive Pay](/docs/releases.md#positive-pay), in the layout you chose.

Upload `file` to your bank as you would have uploaded the original. Quarter does not send it anywhere.

## Positive Pay

Releasing a check run returns the issued-check file for your bank's Positive Pay: each check issued, and each check voided in the register or rejected in Quarter as a void. You upload the file to your bank. Quarter never sends it. Your bank's Positive Pay then compares each check presented with the file. That is what stops a counterfeit or altered check at the bank. Quarter does not stop it.

| `template` | Layout |
| --- | --- |
| `generic_csv` | The default. A CSV with a header row that most bank portals can map. `I` for issued, `V` for void. |
| `banno_csv` | Jack Henry's Banno Business Positive Pay upload: no header row, then check number, amount as `x.xx`, issue date as `mm/dd/yyyy`, payee, and `V` for a void, as Banno's own help describes it (Jack Henry, Banno Business Positive Pay). The file has no account column: you pick the account when you upload, so a run drawn on two accounts is refused with `400 template_does_not_fit`. |
| `citizens_fixed_180` | Citizens Bank, fixed width, 180 characters a line. `40` for issued, `50` for void. |
| `fm_fixed_84` | F&M Bank, fixed length, 84 characters a line. The layout has no void marker, so voids are left out and counted in `voids_left_out`. Enter them in the bank's Positive Pay screen. |
| `custom` | Your organization's own layout, once an admin has saved one. See [Your bank's own layout](/docs/releases.md#custom-layout). |

- A value too long for its field is refused, never cut, because a cut number would match the wrong check: `400 template_does_not_fit`. Fixed-width payees are written in plain ASCII.
- While the register is kept, 90 days, the file can be downloaded again, in the same layout or another.

## Your bank's own layout

Positive Pay layouts have no standard, so an admin can add your bank's layout from the bank's file specification, in the console under Settings, Positive Pay. You build it from a fixed list of fields, so it never holds code. Quarter checks it before saving, and you can preview it against a check run first. The preview writes the whole file, so a check that would not fit is refused as it would be at release, and shows the first 10 lines with account numbers masked to the last 4 digits.

| Choice | Options |
| --- | --- |
| Kind | `delimited` (with `,` `\|` `;` or `tab` between fields, and an optional first line of column names) or `fixed` (every field has a width). |
| Fields on each check line | `check_number` and `amount`, which every layout needs, then any of `issue_date`, `payee`, `account`, `record_type` (the issued or void marker), `text` (fixed text) and `blank`. |
| Header and trailer lines | Optional: `text`, `record_count`, `total_amount` (checks issued, not voids), `file_date`, `account` and `blank`. |
| Width and padding | Up to 200 characters a field and 1,000 a line. Padding is zeros on the left, spaces on the right, or spaces on the left. In a fixed-width file every line is the same length. |
| Dates | `MM/DD/YYYY`, `MMDDYY`, `MMDDYYYY`, `YYYYMMDD`, `YYMMDD`, `YYYY-MM-DD` or `MM/DD/YY`. |
| Amounts | `decimal` (1250.00) or `cents` (125000). |
| Void marker | With a `record_type` field: up to 10 characters each for an issued check (may be empty) and a void. Without one, voids are left out. |

- Fixed text and column names are plain letters, digits and punctuation, and may not start with `=` `+` `-` `@` or a tab, so a spreadsheet never runs the file as a formula. Payees with the same start are already refused when the register is read.
- A layout without an `account` field, or with the account in its header, takes one account per file.
- Saving a layout replaces the one before. The audit log records who saved it and the whole definition, and each preview.

## What always holds

- A held payment is never in a released file unless a person approved it.
- A released file's totals match the payments in it.
- A released run and its items never change again.
- Every decision and the release name a person, and are kept in the audit log.

## Endpoints

### Decide a held payment

`POST /v1/payment_runs/{run}/items/{item}/decision` (auth: Signed-in approver)

Approves or rejects one held payment. Answers with the payment and its run's totals, not the run's other payments.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |
| `item` | string | Yes | The payment item id, starting with `itm_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `decision` | string | Yes | `approve` or `reject`. |
| `reason` | string | Yes | Why, in plain words, up to 2,000 characters. |
| `reviewer` | string | No | Your own email, as the person deciding. Taken from the session; any other email answers `400 reviewer_not_you`. Kept in the audit trail. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/items/itm_5RnX9cLw3TbM7kQp2VjF/decision" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"decision":"reject","reason":"Harbor Point confirmed by phone that they did not change banks.","reviewer":"dana@yourcompany"}'
```

Response:

```json
{
  "id": "itm_5RnX9cLw3TbM7kQp2VjF",
  "object": "payment_item",
  "position": 2,
  "rail": "ach",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "payee_name": "HARBOR POINT LOGISTICS",
  "routing_number": "263391271",
  "bic": null,
  "last4": "8226",
  "check_number": null,
  "drawn_on_last4": null,
  "amount": 12000,
  "currency": "USD",
  "effective_date": "2026-10-06",
  "reference": "INV-20981",
  "entry_class": null,
  "payroll": false,
  "status": "rejected",
  "score": 40,
  "findings": [
    {
      "code": "account_not_on_file",
      "severity": "hold",
      "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file",
      "points": 40
    }
  ],
  "decision": {
    "by": "dana@yourcompany",
    "at": "2026-10-06T09:02:47.000Z",
    "reason": "Harbor Point confirmed by phone that they did not change banks.",
    "second_by": null
  },
  "outcome": null,
  "run": {
    "id": "run_8TpQ3xWm6KvB1nRz4LcH",
    "name": "October 6 vendor run",
    "format": "nacha",
    "status": "scanned",
    "released_at": null,
    "summary": {
      "payments": 3,
      "held": 0,
      "held_amount": 0
    }
  }
}
```

### Record what a payment was

`POST /v1/payment_runs/{run}/items/{item}/outcome` (auth: Signed-in approver)

Records or replaces what a decided hold turned out to be, or reports a payment that left as a fraud attempt or an error found later. `caught` says whether it counts as a catch, and `missed` whether it is a miss.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |
| `item` | string | Yes | The payment item id, starting with `itm_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `outcome` | string | Yes | `fraud_attempt`, `error`, `legitimate` or `unknown`. |
| `reason` | string | Yes | One of the outcome's reasons, in [the table above](/docs/releases.md#outcomes). |
| `note` | string | No | Up to 2,000 characters. |
| `found_on` | string | No | `YYYY-MM-DD`. Required, with `found_how`, for a payment that left. Only with a fraud attempt or an error. |
| `found_how` | string | No | `vendor_not_paid`, `bank_notice`, `reconciliation`, `audit` or `other`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/items/itm_5RnX9cLw3TbM7kQp2VjF/outcome" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"outcome":"fraud_attempt","reason":"vendor_impersonation","note":"The change request came from a lookalike domain."}'
```

Response:

```json
{
  "object": "payment_item_outcome",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "item_id": "itm_5RnX9cLw3TbM7kQp2VjF",
  "outcome": {
    "kind": "fraud_attempt",
    "reason": "vendor_impersonation",
    "note": "The change request came from a lookalike domain.",
    "by": "dana@yourcompany",
    "at": "2026-10-06T09:03:10.000Z",
    "found_on": null,
    "found_how": null
  },
  "caught": true,
  "missed": false
}
```

Reporting a miss on a payment that left, Request:

```json
{
  "outcome": "fraud_attempt",
  "reason": "account_takeover",
  "note": "Harbor Point called: the September invoice was never paid.",
  "found_on": "2026-11-04",
  "found_how": "vendor_not_paid"
}
```

Reporting a miss on a payment that left, Response:

```json
{
  "object": "payment_item_outcome",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "item_id": "itm_2LwQ8vNc5RtK9mBx3JhP",
  "outcome": {
    "kind": "fraud_attempt",
    "reason": "account_takeover",
    "note": "Harbor Point called: the September invoice was never paid.",
    "by": "sam@yourcompany",
    "at": "2026-11-04T15:20:00.000Z",
    "found_on": "2026-11-04",
    "found_how": "vendor_not_paid"
  },
  "caught": false,
  "missed": true
}
```

### A month of holds

`GET /v1/monthly_summary` (auth: API key)

The payments held in runs checked in one month, how many got a final decision from a person (a payment waiting for its second approver is not counted yet), the median minutes from the check to the first decision, the outcomes recorded, and the catches with the amount kept from leaving, by currency. Beside them, the misses found that month, by `found_on`, with their amount. Only your own project is counted.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `month` | string | No | `YYYY-MM`, in UTC. This month by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/monthly_summary?month=2026-10" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "monthly_summary",
  "month": "2026-10",
  "holds": 3,
  "decided": 3,
  "median_minutes_to_decide": 41,
  "outcomes": {
    "fraud_attempt": 1,
    "error": 1,
    "legitimate": 1,
    "unknown": 0
  },
  "catches": 2,
  "amount_protected": [
    {
      "currency": "USD",
      "amount": 14150
    }
  ],
  "misses": 0,
  "amount_missed": []
}
```

### Precision per check

`GET /v1/check_precision` (auth: API key)

For each check except `second_person_required`, which holds by amount and is a control rather than a suspicion: how the holds it made turned out, over every outcome your team recorded. `precision` is the share that were a fraud attempt or an error, among those whose answer is not `unknown`. `interval` is the 95% Wilson interval, which stays honest with few answers: no fraud in 40 holds still allows up to about 9%.

`warned_misses` counts misses on payments where the check only warned. `misses` counts every miss: `cleared` for payments Quarter did not hold, `approved` for holds a person approved. Only your own project is counted.

Quarter never relaxes a check by itself. Whether a check holds, warns or is off stays your decision, in [settings](/docs/checks.md#settings).

Request:

```bash
curl "$QUARTER_API_URL/v1/check_precision" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "check_precision",
  "checks": [
    {
      "code": "unknown_payee",
      "name": "Payee is not a vendor",
      "recorded": 6,
      "fraud_attempt": 2,
      "error": 1,
      "legitimate": 2,
      "unknown": 1,
      "precision": 0.6,
      "interval": {
        "low": 0.231,
        "high": 0.882
      },
      "warned_misses": 0
    }
  ],
  "misses": {
    "cleared": 1,
    "approved": 0
  }
}
```

### Approved holds to ask about again

`GET /v1/follow_ups` (auth: API key)

Approved holds whose run was released 30 to 180 days ago and that have no answer since the 30th or the 90th day, the longest since release first. `due_after_days` is 30 or 90. Answer one by recording its outcome. `summary.due` counts them all.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | integer | No | 1 to 200. Default 50. |

Request:

```bash
curl "$QUARTER_API_URL/v1/follow_ups" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "has_more": false,
  "summary": {
    "due": 1
  },
  "data": [
    {
      "id": "itm_5RnX9cLw3TbM7kQp2VjF",
      "object": "payment_item",
      "position": 2,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "HARBOR POINT LOGISTICS",
      "routing_number": "263391271",
      "bic": null,
      "last4": "8226",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 12000,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20981",
      "entry_class": null,
      "payroll": false,
      "status": "approved",
      "score": 40,
      "findings": [
        {
          "code": "account_not_on_file",
          "severity": "hold",
          "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file",
          "points": 40
        }
      ],
      "decision": {
        "by": "dana@yourcompany",
        "at": "2026-10-06T09:02:47.000Z",
        "reason": "Harbor Point confirmed by phone that they did not change banks.",
        "second_by": null
      },
      "outcome": {
        "kind": "legitimate",
        "reason": "confirmed_by_callback",
        "note": null,
        "by": "dana@yourcompany",
        "at": "2026-10-06T09:03:10.000Z",
        "found_on": null,
        "found_how": null
      },
      "run": {
        "id": "run_8TpQ3xWm6KvB1nRz4LcH",
        "name": "October 6 vendor run",
        "released_at": "2026-10-06T09:30:00.000Z"
      },
      "due_after_days": 30
    }
  ]
}
```

### Release a run

`POST /v1/payment_runs/{run}/release` (auth: Signed-in approver)

Releases the run once no payment is held, and returns the file to send with its SHA-256 (`sha256`), so you can compare it with the file your bank receives. While a payment is held, the answer is `409 payments_still_held` with how many. Every payment is [checked again](/docs/releases.md#release-recheck) first; one that now holds is held again and the answer is `409 payments_held_since_scan`. The `payment_run.released` [event](/docs/webhooks.md#event-types) fires, and the answer, which carries full account numbers, is a `full_numbers_downloaded` [security event](/docs/compliance.md#security-events).

A [payment check](/docs/payment-checks.md) is released by itself when it is clear or approved. Releasing one that is held or rejected answers `409 released_when_approved`.

This is the example run above, with its third entry rejected. The batch and file control records now total two entries and $40,322.40.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reviewer` | string | No | Your own email, as the person releasing. Taken from the session; any other email answers `400 reviewer_not_you`. Kept in the audit trail. |
| `template` | string | No | Check registers only: the [Positive Pay layout](/docs/releases.md#positive-pay). Default `generic_csv`. An unknown layout answers `400 template_invalid`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/release" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"reviewer":"sam@yourcompany"}'
```

Response:

```json
{
  "object": "payment_run_release",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "format": "nacha",
  "file": "101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  \n5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001\n6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001\n62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002\n822000000200193511880000000000000000040322401234567890                         091000010000001\n9000001000001000000020019351188000000000000000004032240                                       \n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n",
  "sha256": "bc9d67721d4f3e0d93e2a0a865abb6487e86c992c467cf58580fa7056e0a18bc"
}
```

The released file:

```shell
101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  
5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001
6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001
62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002
822000000200193511880000000000000000040322401234567890                         091000010000001
9000001000001000000020019351188000000000000000004032240                                       
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
```

A check register run answers with the Positive Pay file, and says which layout it is in and the file extension to save it with.

Releasing a check run:

```json
{
  "object": "payment_run_release",
  "run_id": "run_3KxP9vLq2TmW7nRb5HcZ",
  "format": "check_register",
  "file": "account_number,check_number,amount,issue_date,payee,record_type\r\n4400193318,10452,3912.40,10/06/2026,Cedar Ridge Supply Co.,I\r\n4400193318,10453,2150.00,10/06/2026,Harbor Point Logistics LLC,V\r\n",
  "sha256": "c5979c76d58538b3744fb09bcf6cfb046cab044915a910404d74f8b3f7ce0d71",
  "template": "generic_csv",
  "extension": "csv"
}
```

### Download the released file again

`GET /v1/payment_runs/{run}/file` (auth: Signed-in approver)

The same file the release returned, for a download that was lost, while Quarter keeps the original (90 days). It carries full account numbers, so only a signed-in approver downloads it; an API key answers `403 session_required`. Once the organization is live, the person needs a passkey check from the last 5 minutes. Each download is recorded in the audit log. A run not yet released answers `409 run_not_released`; one whose file was deleted answers `409 file_deleted`; a check run answers `409 no_payment_file`, since it gives its Positive Pay file instead.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/file" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "payment_run_file",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "format": "nacha",
  "file": "101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  \n5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001\n6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001\n62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002\n822000000200193511880000000000000000040322401234567890                         091000010000001\n9000001000001000000020019351188000000000000000004032240                                       \n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n",
  "sha256": "bc9d67721d4f3e0d93e2a0a865abb6487e86c992c467cf58580fa7056e0a18bc"
}
```

### Check a file against its run

`POST /v1/payment_runs/{run}/file_checks` (auth: API key)

Says whether a file is the one Quarter released for the run (`released`), the one uploaded to it (`uploaded`), or neither (`null`). Use it before you upload a file to your bank, or on the copy your bank says it received, to show that the file sent is the file that was checked. Malware or a person that changes one account number after download makes the answer `null`.

Quarter compares a keyed hash it recorded at upload and at release, and keeps nothing of the file you send. Any role and API keys may ask, 30 times a minute per organization. Each check is recorded in the audit log with its answer. A payment check or a NetSuite run answers `409 no_payment_file`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | string | Yes | The text of the file. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/file_checks" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"file":"101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  \n5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001\n6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001\n62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002\n822000000200193511880000000000000000040322401234567890                         091000010000001\n9000001000001000000020019351188000000000000000004032240                                       \n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n"}'
```

Response:

```json
{
  "object": "file_check",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "matches": "released",
  "sha256": "bc9d67721d4f3e0d93e2a0a865abb6487e86c992c467cf58580fa7056e0a18bc",
  "released_at": "2026-10-06T09:30:00.000Z"
}
```

### Download the Positive Pay file again

`GET /v1/payment_runs/{run}/positive_pay` (auth: Signed-in approver)

The issued-check file of a released check run, in any layout, while the register is kept. It carries full account numbers, so only a signed-in approver downloads it; an API key answers `403 session_required`. Once the organization is live, the person needs a passkey check from the last 5 minutes. Each download is recorded in the audit log. A run that is not a check register answers `409 not_a_check_run`; one not yet released answers `409 run_not_released`; one whose register was deleted after 90 days answers `409 file_deleted`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `template` | string | No | The layout. Default `generic_csv`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs/run_3KxP9vLq2TmW7nRb5HcZ/positive_pay?template=generic_csv" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "positive_pay_file",
  "run_id": "run_3KxP9vLq2TmW7nRb5HcZ",
  "template": "generic_csv",
  "extension": "csv",
  "file": "account_number,check_number,amount,issue_date,payee,record_type\r\n4400193318,10452,3912.40,10/06/2026,Cedar Ridge Supply Co.,I\r\n4400193318,10453,2150.00,10/06/2026,Harbor Point Logistics LLC,V\r\n",
  "sha256": "c5979c76d58538b3744fb09bcf6cfb046cab044915a910404d74f8b3f7ce0d71",
  "issued": 1,
  "issued_amount": 3912.4,
  "voids": 1,
  "voids_left_out": 0
}
```

### List Positive Pay layouts

`GET /v1/positive_pay_templates` (auth: API key)

The bank layouts a Positive Pay file can be written in, with your organization's own layout last when it has one.

Request:

```bash
curl "$QUARTER_API_URL/v1/positive_pay_templates" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "generic_csv",
      "object": "positive_pay_template",
      "name": "Generic CSV",
      "description": "A header row, then account, check number, amount in dollars, issue date as MM/DD/YYYY, payee, and I for issued or V for void. Most bank portals can map it.",
      "kind": "delimited",
      "voids": true,
      "one_account_per_file": false,
      "extension": "csv"
    },
    {
      "id": "banno_csv",
      "object": "positive_pay_template",
      "name": "Jack Henry Banno Business, CSV",
      "description": "No header row. Check number, amount in dollars, issue date as MM/DD/YYYY, payee, and V for a void. The file has no account column: choose the account when you upload it in Banno, one account per file.",
      "kind": "delimited",
      "voids": true,
      "one_account_per_file": true,
      "extension": "csv"
    },
    {
      "id": "citizens_fixed_180",
      "object": "positive_pay_template",
      "name": "Citizens Bank, fixed width (180 characters)",
      "description": "Account (10), check number (10), amount in cents (10), issue date MMDDYY, record type 40 for issued or 50 for void, payee (60), zero-padded numbers.",
      "kind": "fixed",
      "voids": true,
      "one_account_per_file": false,
      "extension": "txt"
    },
    {
      "id": "fm_fixed_84",
      "object": "positive_pay_template",
      "name": "F&M Bank, fixed length (84 characters)",
      "description": "Account (10), check number (4), amount in cents (10), issue date MMDDYY, payee (54). The layout has no void marker: enter voids in the bank’s Positive Pay screen.",
      "kind": "fixed",
      "voids": false,
      "one_account_per_file": false,
      "extension": "txt"
    },
    {
      "id": "custom",
      "object": "positive_pay_template",
      "name": "Lakeshore Community Bank issue file",
      "description": "Your organization's own fixed-width layout (40 characters).",
      "kind": "fixed",
      "voids": true,
      "one_account_per_file": false,
      "extension": "txt"
    }
  ]
}
```

### Get your organization's layout

`GET /v1/positive_pay_templates/custom` (auth: API key)

The saved layout and the definition it was saved from. Both are `null` when your organization has none.

Request:

```bash
curl "$QUARTER_API_URL/v1/positive_pay_templates/custom" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "positive_pay_custom_template",
  "template": {
    "id": "custom",
    "object": "positive_pay_template",
    "name": "Lakeshore Community Bank issue file",
    "description": "Your organization's own fixed-width layout (40 characters).",
    "kind": "fixed",
    "voids": true,
    "one_account_per_file": false,
    "extension": "txt"
  },
  "definition": {
    "name": "Lakeshore Community Bank issue file",
    "kind": "fixed",
    "fields": [
      {
        "value": "text",
        "width": 1,
        "pad": "space",
        "text": "D"
      },
      {
        "value": "account",
        "width": 12,
        "pad": "zero"
      },
      {
        "value": "check_number",
        "width": 8,
        "pad": "zero"
      },
      {
        "value": "amount",
        "width": 10,
        "pad": "zero"
      },
      {
        "value": "issue_date",
        "width": 8,
        "pad": "space"
      },
      {
        "value": "record_type",
        "width": 1,
        "pad": "space"
      }
    ],
    "header": [],
    "trailer": [
      {
        "value": "text",
        "width": 1,
        "pad": "space",
        "text": "T"
      },
      {
        "value": "record_count",
        "width": 6,
        "pad": "zero"
      },
      {
        "value": "total_amount",
        "width": 12,
        "pad": "zero"
      },
      {
        "value": "blank",
        "width": 21,
        "pad": "space"
      }
    ],
    "date_format": "YYYYMMDD",
    "amount_format": "cents",
    "issue_marker": "I",
    "void_marker": "V"
  }
}
```

### Save your organization's layout

`PUT /v1/positive_pay_templates/custom` (auth: Signed-in admin)

Checks the layout and saves it in place of any earlier one. A layout a bank could not read answers `400 positive_pay_template_invalid`, with what to change. Use it at release with `template: custom`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | 1 to 60 characters, shown when you choose a layout. |
| `kind` | string | Yes | `delimited` or `fixed`. |
| `delimiter` | string | No | Delimited only: `,` (the default), `\|`, `;` or `tab`. |
| `field_names_row` | boolean | No | Delimited only: a first line naming each column, from each field's `label`. |
| `fields` | array | Yes | The fields of each check line, in order. Each has a `value`, and a `width` and `pad` in a fixed-width layout; `text` for fixed text. |
| `header` | array | No | The fields of a line before the checks. |
| `trailer` | array | No | The fields of a line after the checks. |
| `date_format` | string | No | Default `MM/DD/YYYY`. |
| `amount_format` | string | No | `decimal` (the default) or `cents`. |
| `issue_marker` | string | No | With a `record_type` field: what marks an issued check. |
| `void_marker` | string | No | With a `record_type` field: what marks a void. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/positive_pay_templates/custom" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"name":"Lakeshore Community Bank issue file","kind":"fixed","fields":[{"value":"text","width":1,"pad":"space","text":"D"},{"value":"account","width":12,"pad":"zero"},{"value":"check_number","width":8,"pad":"zero"},{"value":"amount","width":10,"pad":"zero"},{"value":"issue_date","width":8,"pad":"space"},{"value":"record_type","width":1,"pad":"space"}],"header":[],"trailer":[{"value":"text","width":1,"pad":"space","text":"T"},{"value":"record_count","width":6,"pad":"zero"},{"value":"total_amount","width":12,"pad":"zero"},{"value":"blank","width":21,"pad":"space"}],"date_format":"YYYYMMDD","amount_format":"cents","issue_marker":"I","void_marker":"V"}'
```

Response:

```json
{
  "object": "positive_pay_custom_template",
  "template": {
    "id": "custom",
    "object": "positive_pay_template",
    "name": "Lakeshore Community Bank issue file",
    "description": "Your organization's own fixed-width layout (40 characters).",
    "kind": "fixed",
    "voids": true,
    "one_account_per_file": false,
    "extension": "txt"
  },
  "definition": {
    "name": "Lakeshore Community Bank issue file",
    "kind": "fixed",
    "fields": [
      {
        "value": "text",
        "width": 1,
        "pad": "space",
        "text": "D"
      },
      {
        "value": "account",
        "width": 12,
        "pad": "zero"
      },
      {
        "value": "check_number",
        "width": 8,
        "pad": "zero"
      },
      {
        "value": "amount",
        "width": 10,
        "pad": "zero"
      },
      {
        "value": "issue_date",
        "width": 8,
        "pad": "space"
      },
      {
        "value": "record_type",
        "width": 1,
        "pad": "space"
      }
    ],
    "header": [],
    "trailer": [
      {
        "value": "text",
        "width": 1,
        "pad": "space",
        "text": "T"
      },
      {
        "value": "record_count",
        "width": 6,
        "pad": "zero"
      },
      {
        "value": "total_amount",
        "width": 12,
        "pad": "zero"
      },
      {
        "value": "blank",
        "width": 21,
        "pad": "space"
      }
    ],
    "date_format": "YYYYMMDD",
    "amount_format": "cents",
    "issue_marker": "I",
    "void_marker": "V"
  }
}
```

### Preview a layout against a check run

`POST /v1/payment_runs/{run}/positive_pay/preview` (auth: API key or signed-in admin)

Writes a check run, released or not, in a layout before you save or use it. `template` is a layout id or a whole definition as above. The first 10 lines come back with account numbers masked. A check that does not fit answers `400 template_does_not_fit`. Each preview is in the audit log.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `template` | string or object | Yes | A layout id, or a layout definition. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_3KxP9vLq2TmW7nRb5HcZ/positive_pay/preview" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"template":{"name":"Lakeshore Community Bank issue file","kind":"fixed","fields":[{"value":"text","width":1,"pad":"space","text":"D"},{"value":"account","width":12,"pad":"zero"},{"value":"check_number","width":8,"pad":"zero"},{"value":"amount","width":10,"pad":"zero"},{"value":"issue_date","width":8,"pad":"space"},{"value":"record_type","width":1,"pad":"space"}],"header":[],"trailer":[{"value":"text","width":1,"pad":"space","text":"T"},{"value":"record_count","width":6,"pad":"zero"},{"value":"total_amount","width":12,"pad":"zero"},{"value":"blank","width":21,"pad":"space"}],"date_format":"YYYYMMDD","amount_format":"cents","issue_marker":"I","void_marker":"V"}}'
```

Response:

```json
{
  "object": "positive_pay_preview",
  "run_id": "run_3KxP9vLq2TmW7nRb5HcZ",
  "template": "custom",
  "lines": [
    "D00******331800010452000039124020261006I",
    "D00******331800010453000021500020261006V",
    "T000002000000391240                     "
  ],
  "total_lines": 3,
  "line_lengths": [
    40
  ],
  "issued": 1,
  "issued_amount": 3912.4,
  "voids": 1,
  "voids_left_out": 0
}
```

### Cancel a run

`POST /v1/payment_runs/{run}/cancel` (auth: API key)

Cancels a run that was not released, for example to fix the file and upload it again. A cancelled run keeps its items and decisions for the record. A released run cannot be cancelled: `409 run_closed`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/cancel" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "object": "payment_run",
  "name": "October 6 vendor run",
  "format": "nacha",
  "status": "cancelled",
  "created_by": "api_key:qk_test_Xy7P",
  "created_at": "2026-10-06T08:15:03.000Z",
  "released_at": null,
  "released_by": null,
  "release_code": null,
  "file_deleted_at": null,
  "summary": {
    "payments": 3,
    "total": 52322.4,
    "held": 1,
    "held_amount": 12000,
    "rejected": 0,
    "rejected_amount": 0
  },
  "items": [
    {
      "id": "itm_2LwQ8vNc5RtK9mBx3JhP",
      "object": "payment_item",
      "position": 0,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "HARBOR POINT LOGISTICS",
      "routing_number": "091408501",
      "bic": null,
      "last4": "7365",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 36410,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20977",
      "entry_class": null,
      "payroll": false,
      "status": "clear",
      "score": 0,
      "findings": [],
      "decision": null,
      "outcome": null
    },
    {
      "id": "itm_7BkP4zTm1WqH6nRv8CxL",
      "object": "payment_item",
      "position": 1,
      "rail": "ach",
      "vendor_id": "ven_2PwK7nTq4XmB9vLr6JcH",
      "payee_name": "CEDAR RIDGE SUPPLY CO",
      "routing_number": "102103384",
      "bic": null,
      "last4": "1904",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 3912.4,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-7718",
      "entry_class": null,
      "payroll": false,
      "status": "clear",
      "score": 0,
      "findings": [],
      "decision": null,
      "outcome": null
    },
    {
      "id": "itm_5RnX9cLw3TbM7kQp2VjF",
      "object": "payment_item",
      "position": 2,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "HARBOR POINT LOGISTICS",
      "routing_number": "263391271",
      "bic": null,
      "last4": "8226",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 12000,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20981",
      "entry_class": null,
      "payroll": false,
      "status": "held",
      "score": 40,
      "findings": [
        {
          "code": "account_not_on_file",
          "severity": "hold",
          "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file",
          "points": 40
        }
      ],
      "decision": null,
      "outcome": null
    }
  ]
}
```
