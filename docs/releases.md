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

## What a hold turned out to be

Once a held payment has a decision, a person records what it was: `fraud_attempt`, `error` (wrong amount, duplicate or wrong details), `legitimate` or `unknown`, with an optional note. The console asks for it when someone rejects a payment; an approval may leave it for later. It moves no money and changes no decision.

- Only a payment Quarter held takes an outcome, once it is decided or its run was cancelled: otherwise `409 item_not_held` or `409 item_not_decided`.
- Recording again replaces it. Each recording goes into the [audit log](/docs/compliance.md#get-v1-audit-log) with the one it replaced. It shows on the item as `outcome`.
- A **catch** is a hold recorded as `fraud_attempt` or `error` whose payment never left: rejected, or in a run cancelled before release. A NetSuite bill changed after its check counts as rejected.
- Like decisions, outcomes are recorded by a signed-in person; with an API key the route answers `403 session_required`.

## Two-person approval

Every payment at or above the two-person threshold is held as [`second_person_required`](/docs/checks.md#second-person-required), even when no other check holds it, and its approval needs two different people. The threshold is `two_person_threshold` in [settings](/docs/checks.md#settings), $50,000 by default. The first approval is recorded and the payment stays `held`. A second approval by a different person makes it `approved`. The same person approving twice answers `409 second_approver_required`.

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
- **CSV:** the same header and rows, without the rejected rows.
- **JSON:** the items you sent, as a JSON array in `file`, without the rejected ones.
- **Check register:** the issued-check file for your bank's [Positive Pay](/docs/releases.md#positive-pay), in the layout you chose.

Upload `file` to your bank as you would have uploaded the original. Quarter does not send it anywhere.

## Positive Pay

Releasing a check run returns the issued-check file for your bank's Positive Pay: each check issued, and each check voided in the register or rejected in Quarter as a void. You upload the file to your bank. Quarter never sends it. Your bank's Positive Pay then compares each check presented with the file. That is what stops a counterfeit or altered check at the bank. Quarter does not stop it.

| `template` | Layout |
| --- | --- |
| `generic_csv` | The default. A CSV with a header row that most bank portals can map. `I` for issued, `V` for void. |
| `citizens_fixed_180` | Citizens Bank, fixed width, 180 characters a line. `40` for issued, `50` for void. |
| `fm_fixed_84` | F&M Bank, fixed length, 84 characters a line. The layout has no void marker, so voids are left out and counted in `voids_left_out`. Enter them in the bank's Positive Pay screen. |

- More bank layouts are added as pilots need them.
- A value too long for its field is refused, never cut, because a cut number would match the wrong check: `400 template_does_not_fit`. Fixed-width payees are written in plain ASCII.
- While the register is kept, 90 days, the file can be downloaded again, in the same layout or another.

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
  "status": "rejected",
  "findings": [
    {
      "code": "account_not_on_file",
      "severity": "hold",
      "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file"
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

### Record what a hold was

`POST /v1/payment_runs/{run}/items/{item}/outcome` (auth: Signed-in approver)

Records or replaces what a decided hold turned out to be. `caught` says whether it counts as a catch.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |
| `item` | string | Yes | The payment item id, starting with `itm_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `outcome` | string | Yes | `fraud_attempt`, `error`, `legitimate` or `unknown`. |
| `note` | string | No | Up to 2,000 characters. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH/items/itm_5RnX9cLw3TbM7kQp2VjF/outcome" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"outcome":"fraud_attempt","note":"The change request came from a lookalike domain."}'
```

Response:

```json
{
  "object": "payment_item_outcome",
  "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "item_id": "itm_5RnX9cLw3TbM7kQp2VjF",
  "outcome": {
    "kind": "fraud_attempt",
    "note": "The change request came from a lookalike domain.",
    "by": "dana@yourcompany",
    "at": "2026-10-06T09:03:10.000Z"
  },
  "caught": true
}
```

### A month of holds

`GET /v1/monthly_summary` (auth: API key)

The payments held in runs checked in one month, how many got a final decision from a person (a payment waiting for its second approver is not counted yet), the median minutes from the check to the first decision, the outcomes recorded, and the catches with the amount kept from leaving, by currency. Only your own project is counted.

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
  ]
}
```

### Release a run

`POST /v1/payment_runs/{run}/release` (auth: Signed-in approver)

Releases the run once no payment is held, and returns the file to send. While a payment is held, the answer is `409 payments_still_held` with how many. The `payment_run.released` [event](/docs/webhooks.md#event-types) fires.

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
  "file": "101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  \n5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001\n6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001\n62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002\n822000000200193511880000000000000000040322401234567890                         091000010000001\n9000001000001000000020019351188000000000000000004032240                                       \n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999\n"
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
  "template": "generic_csv",
  "extension": "csv"
}
```

### Download the Positive Pay file again

`GET /v1/payment_runs/{run}/positive_pay` (auth: API key)

The issued-check file of a released check run, in any layout, while the register is kept. A run that is not a check register answers `409 not_a_check_run`; one not yet released answers `409 run_not_released`; one whose register was deleted after 90 days answers `409 file_deleted`.

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
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "positive_pay_file",
  "run_id": "run_3KxP9vLq2TmW7nRb5HcZ",
  "template": "generic_csv",
  "extension": "csv",
  "file": "account_number,check_number,amount,issue_date,payee,record_type\r\n4400193318,10452,3912.40,10/06/2026,Cedar Ridge Supply Co.,I\r\n4400193318,10453,2150.00,10/06/2026,Harbor Point Logistics LLC,V\r\n",
  "issued": 1,
  "issued_amount": 3912.4,
  "voids": 1,
  "voids_left_out": 0
}
```

### List Positive Pay layouts

`GET /v1/positive_pay_templates` (auth: API key)

The bank layouts a Positive Pay file can be written in.

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
      "extension": "csv"
    },
    {
      "id": "citizens_fixed_180",
      "object": "positive_pay_template",
      "name": "Citizens Bank, fixed width (180 characters)",
      "description": "Account (10), check number (10), amount in cents (10), issue date MMDDYY, record type 40 for issued or 50 for void, payee (60), zero-padded numbers.",
      "kind": "fixed",
      "voids": true,
      "extension": "txt"
    },
    {
      "id": "fm_fixed_84",
      "object": "positive_pay_template",
      "name": "F&M Bank, fixed length (84 characters)",
      "description": "Account (10), check number (4), amount in cents (10), issue date MMDDYY, payee (54). The layout has no void marker: enter voids in the bank’s Positive Pay screen.",
      "kind": "fixed",
      "voids": false,
      "extension": "txt"
    }
  ]
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
      "status": "clear",
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
      "status": "clear",
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
      "status": "held",
      "findings": [
        {
          "code": "account_not_on_file",
          "severity": "hold",
          "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file"
        }
      ],
      "decision": null,
      "outcome": null
    }
  ]
}
```
