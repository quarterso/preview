# Compliance and insider controls

> The written procedure, its yearly review, the audit log, and the controls against payments steered by someone inside.

Nacha's rules ask every business that sends ACH payments to have a risk-based process to find payments authorized under false pretenses, such as a vendor impersonated by email, and to review it at least once a year. For businesses below the first phase's volume threshold, the rule applies from June 19, 2026. That day is a federal holiday, so in practice it applies from June 22, 2026.

Quarter does not make you compliant, and no tool can. It gives you a documented, risk-based process and the evidence that you followed it, which helps you meet Nacha's fraud-monitoring rule. Your bank and your auditor decide whether your process is enough.

## The written procedure

Quarter writes the procedure from your [settings](/docs/checks.md#settings) each time you ask for it, so the document always describes the controls actually in force. It lists every check that is on and what it does, names the checks you turned off as your own decision, and states the cooling period, the two-person threshold and the last review. It comes back as Markdown, ready to print, sign or hand to your bank.

markdown:

```shell
# Payment fraud monitoring procedure

Lakeshore Fabrication Inc. checks every outgoing vendor payment before it is sent, to detect payments authorized under false pretenses, such as a vendor impersonated by email or bank details changed by someone other than the vendor. This procedure is carried out with Quarter.

## Before a vendor is paid

- Every vendor is approved and recorded before its first payment.
- Bank details are confirmed with the vendor out of band before they are used: through the vendor's own bank login, or by a call to a phone number we already held, made by someone other than the person who entered the details. A number supplied in the change request is never used to confirm the change. Where the number came from is recorded by the person who made the call.
- A change of bank details puts the vendor back to unconfirmed. Payments to the new details are held until the change is confirmed with the vendor, and flagged to the reviewer for 10 days after it was made.

## Every payment run

Each payment file is checked before release.

| What we check | What happens |
|---|---|
| Payments to anyone who is not an approved vendor | Held for review |
| Payments to vendors the business has blocked | Held for review |
| Payments to bank details never confirmed with the vendor | Held for review |
| Payments to bank details changed recently and not confirmed out of band | Held for review |
| Payments to a vendor at an account other than the one on file | Held for review |
| Payee names that do not match the vendor | Flagged to the reviewer |
| First payments to a vendor | Flagged to the reviewer |
| Amounts far above what the vendor is usually paid | Flagged to the reviewer |
| The same payment made twice | Held for review |
| One bank account used by two vendors | Held for review |
| Accounts other businesses reported as used in fraud | Flagged to the reviewer |
| Payees resembling a party on the OFAC sanctions list, and every live payment while that list is more than 48 hours old | Held for review |
| Invalid routing numbers | Held for review |
| Invalid IBANs on international payments | Held for review |
| A check number already used on the same account | Held for review |
| A check payee line that differs from the vendor name on file | Flagged to the reviewer |
| Checks just under the two-person approval threshold | Flagged to the reviewer |
| Payments to an account on the employee account list | Held for review |
| A vendor unpaid for a year or more, paid again after its bank details changed | Flagged to the reviewer |
| Payments to one vendor within 7 days that together reach the two-person threshold, each under it | Flagged to the reviewer |
| A vendor added in the last 14 days and paid by the same person who added it | Flagged to the reviewer |
| Payments at or above the two-person threshold, and payments by a person who changed the vendor's bank details | Held for review |

## Insider controls

- Lakeshore Fabrication Inc. keeps a list of its employees' own bank accounts in Quarter, as fingerprints only, and refreshes it from payroll. A payment to one of those accounts, or to a vendor whose account on file is one of them, is checked as set out above.
- A report of every change to vendors and their bank details, by person, is kept for review.

## Check runs

- Every check register is checked the same way before the checks are released, except for the checks on bank details, since a check pays a name and not an account.
- On release, the issued-check file for the bank's Positive Pay is produced from the register: every check issued, and as void every check rejected or voided. Lakeshore Fabrication Inc. uploads it to its bank, which compares each presented check against it. Quarter never sends it.

## Review and release

- A held payment is released only when a named person approves it with a reason. Every payment of $50,000 or more is held, and needs two different people to approve it.
- Nobody may approve a payment to a vendor whose bank details they changed in the last 90 days, as the first approver or the second. A payment to that vendor made by that person is held for someone else to approve, and that person may not release a run paying the vendor unless someone else approved the payment.
- Approvals, call-back confirmations and releases are made only by people signed in to Quarter. An integration using an API key can submit payments and read the results, but never approves or releases them.
- A rejected payment is removed from the file before it is sent.
- Every check, decision, approver and piece of evidence is recorded and kept.

## Review of this procedure

This procedure is reviewed at least once a year. Last reviewed on 2026-10-02 by dana@yourcompany. Next review due by 2027-10-02.
```

## The yearly review

Once a year, someone responsible reads the procedure, checks it still fits the business, and records the review, signed in to the console as an admin. The procedure then shows the date and the person, and `next_review_due` moves a year on. Before the first review, `next_review_due` is today.

## The audit log

Every action through the API is recorded with who did it, what, on which object, and when: vendors added and changed, bank details recorded, call-backs, verification links created, runs scanned, each decision with its reason, releases, cancels, fraud reports and retractions, settings changes and reviews. Nothing in it is edited or deleted. `actor` is the person signed in, or the person named in `uploaded_by` or `requested_by`. For anything else done with an API key, it is the key prefix, such as `api_key:qk_test_Xy7P`.

What a vendor does on a verification link is recorded as evidence on the vendor, with the vendor contact as the actor. See [the evidence it leaves](/docs/verification.md#the-evidence-it-leaves).

## Endpoints

### Get the procedure

`GET /v1/compliance/procedure` (auth: API key)

The procedure as Markdown, generated now from the settings in force.

Request:

```bash
curl "$QUARTER_API_URL/v1/compliance/procedure" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "procedure",
  "generated_at": "2026-10-06T09:30:00.000Z",
  "last_reviewed_at": "2026-10-02T16:20:00.000Z",
  "next_review_due": "2027-10-02",
  "markdown": "# Payment fraud monitoring procedure\n\nLakeshore Fabrication Inc. checks every outgoing vendor payment before it is sent, to detect payments authorized under false pretenses, such as a vendor impersonated by email or bank details changed by someone other than the vendor. This procedure is carried out with Quarter.\n\n## Before a vendor is paid\n\n- Every vendor is approved and recorded before its first payment.\n- Bank details are confirmed with the vendor out of band before they are used: through the vendor's own bank login, or by a call to a phone number we already held, made by someone other than the person who entered the details. A number supplied in the change request is never used to confirm the change. Where the number came from is recorded by the person who made the call.\n- A change of bank details puts the vendor back to unconfirmed. Payments to the new details are held until the change is confirmed with the vendor, and flagged to the reviewer for 10 days after it was made.\n\n## Every payment run\n\nEach payment file is checked before release.\n\n| What we check | What happens |\n|---|---|\n| Payments to anyone who is not an approved vendor | Held for review |\n| Payments to vendors the business has blocked | Held for review |\n| Payments to bank details never confirmed with the vendor | Held for review |\n| Payments to bank details changed recently and not confirmed out of band | Held for review |\n| Payments to a vendor at an account other than the one on file | Held for review |\n| Payee names that do not match the vendor | Flagged to the reviewer |\n| First payments to a vendor | Flagged to the reviewer |\n| Amounts far above what the vendor is usually paid | Flagged to the reviewer |\n| The same payment made twice | Held for review |\n| One bank account used by two vendors | Held for review |\n| Accounts other businesses reported as used in fraud | Flagged to the reviewer |\n| Payees resembling a party on the OFAC sanctions list, and every live payment while that list is more than 48 hours old | Held for review |\n| Invalid routing numbers | Held for review |\n| Invalid IBANs on international payments | Held for review |\n| A check number already used on the same account | Held for review |\n| A check payee line that differs from the vendor name on file | Flagged to the reviewer |\n| Checks just under the two-person approval threshold | Flagged to the reviewer |\n| Payments to an account on the employee account list | Held for review |\n| A vendor unpaid for a year or more, paid again after its bank details changed | Flagged to the reviewer |\n| Payments to one vendor within 7 days that together reach the two-person threshold, each under it | Flagged to the reviewer |\n| A vendor added in the last 14 days and paid by the same person who added it | Flagged to the reviewer |\n| Payments at or above the two-person threshold, and payments by a person who changed the vendor's bank details | Held for review |\n\n## Insider controls\n\n- Lakeshore Fabrication Inc. keeps a list of its employees' own bank accounts in Quarter, as fingerprints only, and refreshes it from payroll. A payment to one of those accounts, or to a vendor whose account on file is one of them, is checked as set out above.\n- A report of every change to vendors and their bank details, by person, is kept for review.\n\n## Check runs\n\n- Every check register is checked the same way before the checks are released, except for the checks on bank details, since a check pays a name and not an account.\n- On release, the issued-check file for the bank's Positive Pay is produced from the register: every check issued, and as void every check rejected or voided. Lakeshore Fabrication Inc. uploads it to its bank, which compares each presented check against it. Quarter never sends it.\n\n## Review and release\n\n- A held payment is released only when a named person approves it with a reason. Every payment of $50,000 or more is held, and needs two different people to approve it.\n- Nobody may approve a payment to a vendor whose bank details they changed in the last 90 days, as the first approver or the second. A payment to that vendor made by that person is held for someone else to approve, and that person may not release a run paying the vendor unless someone else approved the payment.\n- Approvals, call-back confirmations and releases are made only by people signed in to Quarter. An integration using an API key can submit payments and read the results, but never approves or releases them.\n- A rejected payment is removed from the file before it is sent.\n- Every check, decision, approver and piece of evidence is recorded and kept.\n\n## Review of this procedure\n\nThis procedure is reviewed at least once a year. Last reviewed on 2026-10-02 by dana@yourcompany. Next review due by 2027-10-02.\n"
}
```

### Record the yearly review

`POST /v1/compliance/reviews` (auth: Signed-in admin)

Records that a person reviewed the procedure today. A signed-in admin only; an API key answers `403 session_required`. Returns the settings with `last_reviewed_at` and `last_reviewed_by` set.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reviewer` | string | No | Your own email, as the person reviewing. Taken from the session; any other email answers `400 reviewer_not_you`. Kept in the audit trail. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/compliance/reviews" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"reviewer":"dana@yourcompany"}'
```

Response:

```json
{
  "object": "settings",
  "checks": {
    "unknown_payee": "default",
    "vendor_blocked": "hold",
    "unverified_account": "default",
    "account_changed_recently": "default",
    "account_not_on_file": "default",
    "name_mismatch": "default",
    "first_payment": "default",
    "amount_unusual": "default",
    "duplicate_payment": "default",
    "shared_account": "default",
    "network_flagged": "default",
    "sanctions_match": "hold",
    "routing_invalid": "default",
    "iban_invalid": "default",
    "check_number_reused": "default",
    "payee_name_altered": "default",
    "just_under_threshold": "default",
    "employee_account_match": "default",
    "vendor_dormant_reactivated": "default",
    "split_below_threshold": "default",
    "vendor_new_paid_fast": "default",
    "second_person_required": "hold"
  },
  "mandatory_checks": [
    "sanctions_match",
    "vendor_blocked",
    "second_person_required"
  ],
  "defaults": {
    "unknown_payee": "hold",
    "vendor_blocked": "hold",
    "unverified_account": "hold",
    "account_changed_recently": "hold",
    "account_not_on_file": "hold",
    "name_mismatch": "warn",
    "first_payment": "warn",
    "amount_unusual": "warn",
    "duplicate_payment": "hold",
    "shared_account": "hold",
    "network_flagged": "warn",
    "sanctions_match": "hold",
    "routing_invalid": "hold",
    "iban_invalid": "hold",
    "check_number_reused": "hold",
    "payee_name_altered": "warn",
    "just_under_threshold": "warn",
    "employee_account_match": "hold",
    "vendor_dormant_reactivated": "warn",
    "split_below_threshold": "warn",
    "vendor_new_paid_fast": "warn",
    "second_person_required": "hold"
  },
  "cooling_days": 10,
  "unusual_multiplier": 3,
  "two_person_threshold": 50000,
  "last_reviewed_at": "2026-10-02T16:20:00.000Z",
  "last_reviewed_by": "dana@yourcompany"
}
```

### Export the audit log

`GET /v1/audit_log` (auth: API key)

Every recorded action, oldest first. To page through it, pass the `id` of the last entry you have as `after`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `after` | string | No | An audit entry id. Returns entries after it. |
| `limit` | integer | No | 1 to 5,000. Default 500. |

Request:

```bash
curl "$QUARTER_API_URL/v1/audit_log?limit=3" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "aud_4MbT7xKq2WnR9pLv5HcZ",
      "actor": "api_key:qk_test_Xy7P",
      "action": "payment_run.scanned",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "format": "nacha",
        "payments": 3
      },
      "created_at": "2026-10-06T08:15:03.000Z"
    },
    {
      "id": "aud_8KcW2pRt5NvQ1mXb7LzF",
      "actor": "dana@yourcompany",
      "action": "payment_item.reject",
      "object_type": "payment_item",
      "object_id": "itm_5RnX9cLw3TbM7kQp2VjF",
      "details": {
        "run": "run_8TpQ3xWm6KvB1nRz4LcH",
        "reason": "Harbor Point confirmed by phone that they did not change banks."
      },
      "created_at": "2026-10-06T09:02:47.000Z"
    },
    {
      "id": "aud_3TnJ9vLq6WbR2kPm8CxD",
      "actor": "sam@yourcompany",
      "action": "payment_run.released",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "rejected": 1
      },
      "created_at": "2026-10-06T09:05:12.000Z"
    }
  ]
}
```

## Insider controls

Some payment fraud starts inside the business: an employee changes a vendor to their own account, adds a vendor and pays it, or splits a payment to stay under the second approver. These controls make that harder and leave a record.

### Segregation of duties

- Approvals, call-backs, releases and fraud reports are made only by people signed in to the console. An API key answers `403 session_required`.
- Nobody approves a payment to a vendor whose bank details they added or changed in the last 90 days, as the first approver or the second. The answer is `403 approver_changed_details`. Rejecting is always allowed.
- A payment to that vendor made by that same person is held as [`second_person_required`](/docs/checks.md#second-person-required), for someone else to approve.
- Nobody releases a run with a clear payment to that vendor: `403 releaser_changed_details`. Someone else releases it. A payment to that vendor that someone else approved does not stop the release.
- The person who added bank details may not confirm them by call-back: `403 attester_changed_details`.
- Only a signed-in admin can unblock a blocked vendor: `403 unblock_needs_admin`.
- People are compared by email with the person who added the details, as the audit trail records them. Details added with an API key are recorded against the key, not a person, so these rules cover changes made by people signed in to Quarter.

### Employee accounts

Keep a list of your employees' own bank accounts, from payroll. A payment to one of those accounts, or to a vendor whose account on file is one of them, is held as [`employee_account_match`](/docs/checks.md#employee-account-match).

- Quarter keeps only a fingerprint of each account and your own id for the employee. The account numbers are dropped as soon as they are fingerprinted, and they are never returned.
- Employee accounts are kept out of the network. Once an account is on the list, your business adds nothing about it to the network. A confirmation made before the account was listed still counts.
- Each import replaces the whole list. Sending the same list twice changes nothing. The audit log records the counts, never the accounts.

### Other insider checks

Three warnings look for patterns rather than lists: [`split_below_threshold`](/docs/checks.md#split-below-threshold), [`vendor_new_paid_fast`](/docs/checks.md#vendor-new-paid-fast) and [`vendor_dormant_reactivated`](/docs/checks.md#vendor-dormant-reactivated).

### Endpoints

### Import the employee account list

`POST /v1/employee_accounts/import` (auth: API key)

Replaces the list with these accounts. Needs an admin, or an API key. Returns how many accounts the list now holds, and how many were added and removed.

Errors, all `400`: `employees_invalid`, `employee_ref_invalid`, `routing_number_invalid` and `account_number_invalid`. The message names the employee by position.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `employees` | object[] | Yes | 1 to 10,000 accounts, each with `employee_ref` (your own id for the employee, up to 100 characters), `routing_number` and `account_number`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/employee_accounts/import" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"employees":[{"employee_ref":"E-1043","routing_number":"071921008","account_number":"88301274"},{"employee_ref":"E-1187","routing_number":"122611005","account_number":"40917736"}]}'
```

Response:

```json
{
  "object": "employee_account_import",
  "accounts": 2,
  "added": 2,
  "removed": 0
}
```

### Read the employee account list

`GET /v1/employee_accounts` (auth: API key)

How many accounts and employees are on the list, and when and by whom it was last imported. The accounts themselves are never returned.

Request:

```bash
curl "$QUARTER_API_URL/v1/employee_accounts" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "employee_accounts",
  "accounts": 2,
  "employees": 2,
  "imported_at": "2026-10-05T09:12:30.000Z",
  "imported_by": "api_key:qk_test_Xy7P"
}
```

### Report vendor changes

`GET /v1/reports/vendor_changes` (auth: API key)

Every change to vendors and their bank details in a period, oldest first, with who made it. `people` sums it by person, those with the most bank detail changes first. For bank details, it gives the old and new last 4, and how and by whom the new details were confirmed.

The report stops at 10,000 changes and says so in `truncated`; narrow the period then. A bad date answers `400 from_invalid` or `400 to_invalid`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | No | `YYYY-MM-DD`. Default 90 days before `to`. |
| `to` | string | No | `YYYY-MM-DD`, included. Default today. |

Request:

```bash
curl "$QUARTER_API_URL/v1/reports/vendor_changes?from=2026-07-08&to=2026-10-06" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "vendor_change_report",
  "from": "2026-07-08",
  "to": "2026-10-06",
  "truncated": false,
  "people": [
    {
      "actor": "dana@yourcompany",
      "changes": 1,
      "bank_details_changed": 1,
      "vendors": 1
    },
    {
      "actor": "api_key:qk_test_Xy7P",
      "changes": 1,
      "bank_details_changed": 0,
      "vendors": 1
    }
  ],
  "data": [
    {
      "id": "aud_6RkT2vNp9WqL4mXb8HcJ",
      "object": "vendor_change",
      "at": "2026-10-05T13:40:12.000Z",
      "actor": "api_key:qk_test_Xy7P",
      "action": "vendor.created",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "vendor_name": "Harbor Point Logistics LLC",
      "fields": null,
      "last4": null,
      "previous_last4": null,
      "verified_method": null,
      "verified_by": null
    },
    {
      "id": "aud_9LwB3nTq7KpR2vMx5CzF",
      "object": "vendor_change",
      "at": "2026-10-05T16:02:44.000Z",
      "actor": "dana@yourcompany",
      "action": "vendor.bank_account_added",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "vendor_name": "Harbor Point Logistics LLC",
      "fields": null,
      "last4": "8226",
      "previous_last4": "7365",
      "verified_method": null,
      "verified_by": null
    }
  ]
}
```
