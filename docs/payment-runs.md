# Payment runs

> Upload a NACHA file, a CSV, a list of payments or a check register, and get every payment back clear or held, with its findings.

A payment run is one batch of outgoing payments: the file you are about to upload to your bank. Send it to Quarter first. Quarter matches each payment to a vendor, runs the [checks](/docs/checks.md), and marks each payment `clear` or `held`. Nothing is sent anywhere. People signed in to the console decide the held payments and [release](/docs/releases.md) the run to get the file back. An API key uploads and reads runs, but never decides or releases.

## Formats

The body is JSON. `format` says what the run is: `nacha`, `csv` or `check_register`, with the file as text in `file`, or `json`, with the payments in `items`. The body can be up to 10 MB.

### NACHA files

A standard NACHA file of 94-character records, as your accounting system or bank portal writes it. Quarter checks every credit entry, which is every payment out. Debits and prenotes are not checked, and they stay in the released file as they were. An entry with a transaction code a business does not send, such as a return (codes 21, 31, 41 and 51), refuses the whole file with `400 file_invalid`. So do a record with a character that is not plain ASCII, such as a lone carriage return, and an IAT (international) batch, whose payee and bank sit in addenda records Quarter does not read yet.

| Item field | Taken from |
| --- | --- |
| `payee_name` | The entry name (positions 55 to 76). NACHA keeps 22 characters, so long names arrive cut short; the sanctions check allows for that. |
| `routing_number` | The receiving bank routing number and check digit. |
| `last4` | The last 4 characters of the account number. |
| `amount` | The entry amount, in dollars. |
| `reference` | The identification number (positions 40 to 54), often an invoice number. |
| `effective_date` | The batch effective entry date. |

october-6.ach:

```shell
101 09100001912345678902610060900A094101DESTINATION BANK       LAKESHORE FAB                  
5220LAKESHORE FAB                       1234567890CCDVENDOR PAY      261006   1091000010000001
6220914085014021887365       0003641000INV-20977      HARBOR POINT LOGISTICS  0091000010000001
62210210338455021904         0000391240INV-7718       CEDAR RIDGE SUPPLY CO   0091000010000002
62226339127199300418226      0001200000INV-20981      HARBOR POINT LOGISTICS  0091000010000003
822000000300456903150000000000000000052322401234567890                         091000010000001
9000001000001000000030045690315000000000000000005232240                                       
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999
```

### CSV files

Accounting tools and bank portals export payments as CSV, each with its own column names. Quarter reads three common shapes: a generic export, an accounting tool bill pay export, and a bank portal upload template. It finds columns by name, not by position. Names are matched after lowercasing and turning spaces and punctuation into `_`, so `Routing Number` and `routing_number` are the same.

| Column | Required | Accepted names |
| --- | --- | --- |
| Payee | Yes | `payee`, `payee_name`, `name`, `vendor`, `vendor_name`, `beneficiary`, `beneficiary_name`, `receiver`, `recipient` |
| Routing number | Yes | `routing`, `routing_number`, `aba`, `aba_number`, `bank_routing`, `routing_no` |
| Account number | Yes | `account`, `account_number`, `bank_account`, `account_no`, `beneficiary_account` |
| Amount | Yes | `amount`, `payment_amount`, `total`, `amount_usd` |
| Date | No | `date`, `effective_date`, `payment_date`, `pay_date` |
| Reference | No | `reference`, `memo`, `invoice`, `invoice_number`, `description`, `bill_number` |
| Vendor id | No | `vendor_id`, `vendor_number`, `supplier_id`, `external_id`. Matched to Quarter's vendor id or your `external_id`. |

- The first row is the header. Other columns are ignored and kept in the released file.
- A file the bank could read differently from Quarter is refused with `400 file_invalid`: two columns for the payee, routing number, account number or amount, such as `amount` and `total`, or a column Quarter does not read whose name looks like an account, a routing number or an amount, such as `iban` or `amount_due`. Rename or remove the column.
- Amounts are positive dollars, with or without `$` and thousands separators: `48250`, `48,250.00` and `$48,250.00` all work. A bad amount refuses the whole file with `400 file_invalid` and the row number.
- Quoted fields may hold commas and quotes, except the payee and the reference: a comma or quote there refuses the file, since a bank importer that splits on commas would read another field.
- A cell with a line break or another control character, in any column, refuses the file with `400 file_invalid` and its row and column. A bank importer that splits lines first would read the rest as a payment of its own.
- A routing number is 9 digits. 8 digits are read as a routing number whose leading zero a spreadsheet dropped, and the released file carries all 9. Anything else refuses the file. An account number is 4 to 17 letters or digits, with spaces and dashes taken out.
- A date is kept as `effective_date` when it is written `YYYY-MM-DD`.

Headers Quarter reads:

```shell
payee,routing_number,account_number,amount,payment_date,invoice
Vendor Name,Bill Number,Payment Date,Amount,Routing Number,Account Number,Memo
Beneficiary Name,ABA,Beneficiary Account,Payment Amount,Effective Date,Reference
```

### JSON items

Send the payments directly, for example from your own payables system. The released file is the same list, as JSON, without the rejected items and with only the fields Quarter read. `amount` must be a positive amount, `routing_number` 9 digits and `account_number` 4 to 17 letters or digits, or the list is refused naming the item. A payment with no payee name matches no vendor, and a payee name with a line break refuses the list.

| Field | Type | Description |
| --- | --- | --- |
| `payee_name` | string | Who is paid. |
| `routing_number` | string | The 9-digit routing number. |
| `account_number` | string | The account number. Never returned. |
| `amount` | number | Positive, in dollars. Required. |
| `effective_date` | string | `YYYY-MM-DD`. Optional. |
| `reference` | string | An invoice number or memo. Optional. |
| `vendor_id` | string | Quarter's vendor id, or your own id (`external_id`). Optional. |

### Check registers

A check register is the list of paper checks you are about to print, as a CSV. Quarter finds its columns by name, the same way as a CSV export. Each row is one check. A voided check is not a payment: it is not checked, and it goes into the [Positive Pay file](/docs/releases.md#positive-pay) as a void.

| Column | Required | Accepted names |
| --- | --- | --- |
| Check number | Yes | `check_number`, `check_no`, `check_num`, `check`, `number`, `serial_number`, `item_number`. Up to 15 digits. |
| Issue date | Yes | `issue_date`, `date`, `check_date`, `issued`, `issued_date`. `YYYY-MM-DD` or `MM/DD/YYYY`. |
| Payee | Yes | `payee`, `payee_name`, `name`, `vendor`, `vendor_name`, `pay_to` |
| Amount | Yes | `amount`, `check_amount`, `amount_usd`, `total` |
| Account drawn on | Yes | `account`, `account_number`, `drawn_on`, `drawn_on_account`, `bank_account`, `from_account`. Your own account, 4 to 17 digits. |
| Void | No | `void`, `voided`, `void_indicator`, `status`. `y`, `yes`, `true`, `1`, `v`, `void` or `voided` marks a void. |
| Memo | No | `memo`, `reference`, `invoice`, `invoice_number`, `description` |
| Vendor id | No | `vendor_id`, `vendor_number`, `supplier_id`, `external_id`. Matched to Quarter's vendor id or your `external_id`. |

- Each check becomes an item with `rail: check`, its `check_number` and `drawn_on_last4`, the last 4 digits of your account. A check pays a name, not an account, so `routing_number` and `last4` are `null`.
- The issue date is kept as `effective_date`, and the memo as `reference`.
- A payee name that starts with `=`, `+`, `-`, `@` or a tab refuses the file with `400 file_invalid`, because the bank file repeats it and a spreadsheet would run it as a formula.
- As in a CSV export, two columns for the check number, payee, amount, account or void, or an unread column whose name looks like an account, a routing number or an amount, refuses the file with `400 file_invalid`.
- The checks about bank accounts do not apply to a check. Three checks apply only to checks. See [checks on paper checks](/docs/checks.md#paper-checks).

One item of a check run:

```json
{
  "id": "itm_6WqT2nLx8RkB4vMp3HcJ",
  "object": "payment_item",
  "position": 0,
  "rail": "check",
  "vendor_id": "ven_2PwK7nTq4XmB9vLr6JcH",
  "payee_name": "Cedar Ridge Supply Co.",
  "routing_number": null,
  "bic": null,
  "last4": null,
  "check_number": "10452",
  "drawn_on_last4": "3318",
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
}
```

## How a payment finds its vendor

1. By vendor id (`vendor_id` in JSON or the vendor id column in a CSV), matched to Quarter's vendor id or your `external_id`.
2. Otherwise by the bank account: a vendor whose current bank details are this account. A check has no account, so this step is skipped.
3. Otherwise by a close name: the payee name, after ignoring case, punctuation and suffixes such as LLC, at 0.85 or more alike.

A payment that finds no vendor is held as [`unknown_payee`](/docs/checks.md#unknown-payee). A payment that finds a vendor by name but at a different account is held as [`account_not_on_file`](/docs/checks.md#account-not-on-file).

## Statuses

| Item `status` | Meaning |
| --- | --- |
| `clear` | No finding holds it. It may still carry `warn` findings. A [payroll](/docs/checks.md#payroll) payment is `clear` unless a check that always holds fires. |
| `held` | At least one finding holds it. It needs a decision before the run can be released. |
| `approved` | A person approved it, with a reason. It goes in the released file. |
| `rejected` | A person rejected it, with a reason. It is left out of the released file. |

| Run `status` | Meaning |
| --- | --- |
| `scanned` | Checked and waiting for decisions or release. |
| `released` | The file was returned. The run and its items no longer change. |
| `cancelled` | Cancelled before release. Its file can be uploaded again. |

`summary` counts the run: `payments` and `total` for everything, `held` and `held_amount` for payments still waiting for a decision, `rejected` and `rejected_amount` for payments left out. Amounts are dollars.

## The same file twice

Uploading a file that is byte for byte the same as a run that was not cancelled answers `409 duplicate_file`, with the id of the earlier run. Sending the same file to the bank twice pays everyone twice. The same file uploaded twice at the same moment is refused too. Two different files uploaded together are checked one after the other, so a payment in both is held as [`duplicate_payment`](/docs/checks.md#duplicate-payment) in the file checked second. A file that waits more than 55 seconds behind another answers `503 scan_busy` and nothing is recorded; send it again.

## Endpoints

### Upload a payment run

`POST /v1/payment_runs` (auth: API key)

Checks every outgoing payment in the file and returns the run with each payment and its findings. Each held payment fires a `payment_item.held` [event](/docs/webhooks.md#event-types), and the run fires `payment_run.scanned`.

A run holds at most 10,000 payments (`400 too_many_payments`), and a test project at most 50 (`409 test_mode_limit`). Payee names are at most 140 characters (`400 payee_name_invalid`). In live mode, an organization whose trial or pilot ended answers `409 trial_ended`.

In this example, Harbor Point and Cedar Ridge are known vendors with confirmed bank details and earlier payments. The third entry pays Harbor Point at an account it never gave you.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `format` | string | Yes | `nacha`, `csv`, `json` or `check_register`. |
| `file` | string | No | The NACHA, CSV or check register file as text. Required for `nacha`, `csv` and `check_register`. |
| `items` | object[] | No | The payments. Required for `json`. See [JSON items](/docs/payment-runs.md#json). |
| `name` | string | No | A name for the run, up to 200 characters. Default `Payment run YYYY-MM-DD`. |
| `uploaded_by` | string | No | Email of the person uploading. Defaults to the person signed in, or the API key. |
| `payroll` | boolean | No | `true` for a payroll CSV, check register or list, from a signed-in admin only (anyone else is answered `403 payroll_needs_admin`): pay to an account on your employee list [warns instead of holding](/docs/checks.md#payroll), and the checks that always hold still hold. A NACHA file says this in each batch's entry class, so sending `payroll` with one answers `400 payroll_invalid`. |

Request:

```bash
jq -n --rawfile file october-6.ach '{format: "nacha", name: "October 6 vendor run", file: $file}' |
  curl -X POST "$QUARTER_API_URL/v1/payment_runs" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d @-
```

Response:

```json
{
  "id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "object": "payment_run",
  "name": "October 6 vendor run",
  "format": "nacha",
  "status": "scanned",
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

The same endpoint with JSON items:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Contractor payments","format":"json","items":[{"payee_name":"Cedar Ridge Supply Co.","routing_number":"102103384","account_number":"55021904","amount":3912.4,"effective_date":"2026-10-09","reference":"INV-7731","vendor_id":"V-0388"}]}'
```

### List payment runs

`GET /v1/payment_runs` (auth: API key)

Runs, newest first, with counts and totals but without their items. A [payment check](/docs/payment-checks.md) is listed as a run of format `single`.

To read the next page, pass the `id` of the last run you have as `after` while `has_more` is `true`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | integer | No | 1 to 200. Default 50. |
| `after` | string | No | A run id. Returns the runs after it. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs?limit=2" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "has_more": true,
  "data": [
    {
      "id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "object": "payment_run",
      "name": "October 6 vendor run",
      "format": "nacha",
      "status": "scanned",
      "created_at": "2026-10-06T08:15:03.000Z",
      "payments": 3,
      "held": 1,
      "held_amount": 12000,
      "total": 52322.4
    },
    {
      "id": "run_4VbN8qLs2TjW6hPx9RkM",
      "object": "payment_run",
      "name": "Week 41 vendor payments",
      "format": "csv",
      "status": "released",
      "created_at": "2026-10-05T14:02:11.000Z",
      "payments": 2,
      "held": 0,
      "held_amount": 0,
      "total": 58050
    }
  ]
}
```

### List held payments

`GET /v1/payment_items` (auth: API key)

Every held payment in a run not yet released or cancelled, across runs, the highest `score` first, then the longest waiting, each with the run it is in. This is the one queue to decide from. A payment with a first approval that still needs a second is in it, with its `decision`. See [points](/docs/checks.md#points) for how the score is made.

`summary` counts the whole queue, not the page. Pass the `id` of the last payment you have as `after` while `has_more` is `true`. Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `held`, the default and the only value. |
| `limit` | integer | No | 1 to 200. Default 50. |
| `after` | string | No | A payment item id. Returns the payments after it. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_items?limit=1" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "has_more": false,
  "summary": {
    "held": 1,
    "held_amount": 12000,
    "runs": 1
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
      "outcome": null,
      "run": {
        "id": "run_8TpQ3xWm6KvB1nRz4LcH",
        "name": "October 6 vendor run",
        "format": "nacha",
        "created_at": "2026-10-06T08:15:03.000Z"
      }
    }
  ]
}
```

### Check a sample run

`POST /v1/payment_runs/sample` (auth: API key)

Test projects only, to try Quarter without a real file. Quarter builds a NACHA file that pays up to 20 of your vendors with bank details on file, a random amount each, plus a payee who is not a vendor and one payment twice, and checks it like an upload. Takes no body.

A live project answers `409 test_mode_only`. A project with no vendor bank details answers `409 no_vendors_with_bank_details`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_runs/sample" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```shell
A payment run, as for an upload, named "Sample payment run".
```

### Retrieve a payment run

`GET /v1/payment_runs/{run}` (auth: API key)

The run with every payment, its findings and its decision, in file order.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | string | Yes | The payment run id, starting with `run_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs/run_8TpQ3xWm6KvB1nRz4LcH" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_8TpQ3xWm6KvB1nRz4LcH",
  "object": "payment_run",
  "name": "October 6 vendor run",
  "format": "nacha",
  "status": "scanned",
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

An item that has a first approval but still needs a second shows `status: "held"` with a `decision` whose `second_by` is `null`. See [two-person approval](/docs/releases.md#two-person-approval).

One item, decided:

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
  "outcome": null
}
```
