# Quickstart

> Add a vendor, upload a small payment run with a test key, and read the result after a person decides the held payment and releases the run.

One small payment run, start to finish. Your integration adds the vendor, uploads the run and reads the results with a test key. A person signed in to the Quarter console confirms the bank details, decides the held payment and releases the run. An API key never does those: it answers `403 session_required`. Every response below is the full JSON the api returns.

## Before you start

You need a test API key, which starts with `qk_test_`, and your API URL. Before launch, Quarter gives you the URL, and an admin creates the key in the console. You also need `curl` and `jq`.

```bash
export QUARTER_API_URL="<your API URL>"
export QUARTER_API_KEY="qk_test_..."
```

## 1. Add a vendor with bank details

A vendor is someone you pay. Give its name, the domain of its email addresses and the bank details you have on file. The details start `unverified`: nobody has confirmed them with the vendor yet, so payments to them would be held.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/vendors" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Harbor Point Logistics LLC","email_domain":"harborpoint.example","external_id":"V-1042","routing_number":"091408501","account_number":"4021887365","holder_name":"Harbor Point Logistics LLC"}'
```

Response:

```json
{
  "id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "object": "vendor",
  "name": "Harbor Point Logistics LLC",
  "email_domain": "harborpoint.example",
  "external_id": "V-1042",
  "status": "unverified",
  "individual": false,
  "created_at": "2026-10-05T13:40:12.000Z",
  "bank_accounts": [
    {
      "id": "ba_3HfJ6tWq1ZsN8kPm2RxA",
      "object": "bank_account",
      "routing_number": "091408501",
      "last4": "7365",
      "holder_name": "Harbor Point Logistics LLC",
      "source": "api",
      "status": "unverified",
      "verified_at": null,
      "verified_method": null,
      "created_at": "2026-10-05T13:40:12.000Z",
      "replaced_at": null,
      "request": {
        "channel": "unknown",
        "sender": null,
        "domain": null,
        "signals": null
      },
      "changed_by": null,
      "changed_by_note": null
    }
  ],
  "evidence": []
}
```

The response never repeats the account number. Quarter seals it and shows the last 4 digits. Keep the vendor `id` and the bank account `id`.

```bash
export VENDOR="ven_7Qm2KxR9pLwT4nVb8YcD"
export ACCOUNT="ba_3HfJ6tWq1ZsN8kPm2RxA"
```

## 2. Confirm the bank details

In production you would send the vendor a [verification link](/docs/verification.md), where they log in to their own bank. Here, a person records a [call-back](/docs/verification.md#callbacks) in the console instead: they called the vendor at a number you already had, and the vendor confirmed the details. Then read the vendor again.

Request:

```bash
curl "$QUARTER_API_URL/v1/vendors/$VENDOR" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "object": "vendor",
  "name": "Harbor Point Logistics LLC",
  "email_domain": "harborpoint.example",
  "external_id": "V-1042",
  "status": "verified",
  "individual": false,
  "created_at": "2026-10-05T13:40:12.000Z",
  "bank_accounts": [
    {
      "id": "ba_3HfJ6tWq1ZsN8kPm2RxA",
      "object": "bank_account",
      "routing_number": "091408501",
      "last4": "7365",
      "holder_name": "Harbor Point Logistics LLC",
      "source": "api",
      "status": "verified",
      "verified_at": "2026-10-05T13:52:40.000Z",
      "verified_method": "callback",
      "created_at": "2026-10-05T13:40:12.000Z",
      "replaced_at": null,
      "request": {
        "channel": "unknown",
        "sender": null,
        "domain": null,
        "signals": null
      },
      "changed_by": null,
      "changed_by_note": null
    }
  ],
  "evidence": [
    {
      "id": "evd_5LpV9cTy2MwQ7hKj4BnE",
      "bank_account_id": "ba_3HfJ6tWq1ZsN8kPm2RxA",
      "kind": "callback",
      "result": "pass",
      "details": {
        "phone_number": "+1 312 555 0148",
        "phone_source": "vendor_master_before_change",
        "contact_name": "Maria Okafor, accounts receivable",
        "notes": "Called the number on file since 2024. Maria read back the routing number and the last four digits."
      },
      "actor": "dana@yourcompany",
      "created_at": "2026-10-05T13:52:40.000Z",
      "object": "evidence"
    }
  ]
}
```

## 3. Upload a payment run

Here is a CSV with two payments: one to Harbor Point, and one to a payee you have never added. Save it as `run.csv`.

run.csv:

```shell
payee,routing_number,account_number,amount,payment_date,invoice
Harbor Point Logistics LLC,091408501,4021887365,"48,250.00",2026-10-06,INV-20931
J. Reyes Consulting,063174290,88412007,"9,800.00",2026-10-06,INV-0412
```

The api takes the file as text inside a JSON body. `jq` builds that body from the file.

Request:

```bash
jq -n --rawfile file run.csv '{format: "csv", name: "Week 41 vendor payments", file: $file}' |
  curl -X POST "$QUARTER_API_URL/v1/payment_runs" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d @-
```

Response:

```json
{
  "id": "run_4VbN8qLs2TjW6hPx9RkM",
  "object": "payment_run",
  "name": "Week 41 vendor payments",
  "format": "csv",
  "status": "scanned",
  "created_by": "api_key:qk_test_Xy7P",
  "created_at": "2026-10-05T14:02:11.000Z",
  "released_at": null,
  "released_by": null,
  "release_code": null,
  "file_deleted_at": null,
  "summary": {
    "payments": 2,
    "total": 58050,
    "held": 1,
    "held_amount": 9800,
    "rejected": 0,
    "rejected_amount": 0
  },
  "items": [
    {
      "id": "itm_9JcR4mXv7NpB2tKw5LqS",
      "object": "payment_item",
      "position": 0,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "Harbor Point Logistics LLC",
      "routing_number": "091408501",
      "bic": null,
      "last4": "7365",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 48250,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20931",
      "entry_class": null,
      "payroll": false,
      "status": "clear",
      "score": 5,
      "findings": [
        {
          "code": "first_payment",
          "severity": "warn",
          "message": "first payment to Harbor Point Logistics LLC",
          "points": 5
        }
      ],
      "decision": null,
      "outcome": null
    },
    {
      "id": "itm_1TzH6kQb3WmF8rNy4PdV",
      "object": "payment_item",
      "position": 1,
      "rail": "ach",
      "vendor_id": null,
      "payee_name": "J. Reyes Consulting",
      "routing_number": "063174290",
      "bic": null,
      "last4": "2007",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 9800,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-0412",
      "entry_class": null,
      "payroll": false,
      "status": "held",
      "score": 20,
      "findings": [
        {
          "code": "unknown_payee",
          "severity": "hold",
          "message": "J. Reyes Consulting is not a vendor on file",
          "points": 20
        }
      ],
      "decision": null,
      "outcome": null
    }
  ]
}
```

Harbor Point is `clear`. It carries a `warn` finding because it is the first payment to this vendor; a warning never holds. J. Reyes Consulting is `held`, because the payee is not a vendor you know. Every finding has a `code` you can look up in [Checks](/docs/checks.md) and a `message` you can show as it is.

## 4. A person decides the held payment

In the console, a person approves or rejects each held payment and says why. The reason and the person go into the audit trail. Here, they reject J. Reyes Consulting. Read the run to see the decision.

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs/run_4VbN8qLs2TjW6hPx9RkM" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_4VbN8qLs2TjW6hPx9RkM",
  "object": "payment_run",
  "name": "Week 41 vendor payments",
  "format": "csv",
  "status": "scanned",
  "created_by": "api_key:qk_test_Xy7P",
  "created_at": "2026-10-05T14:02:11.000Z",
  "released_at": null,
  "released_by": null,
  "release_code": null,
  "file_deleted_at": null,
  "summary": {
    "payments": 2,
    "total": 58050,
    "held": 0,
    "held_amount": 0,
    "rejected": 1,
    "rejected_amount": 9800
  },
  "items": [
    {
      "id": "itm_9JcR4mXv7NpB2tKw5LqS",
      "object": "payment_item",
      "position": 0,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "Harbor Point Logistics LLC",
      "routing_number": "091408501",
      "bic": null,
      "last4": "7365",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 48250,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20931",
      "entry_class": null,
      "payroll": false,
      "status": "clear",
      "score": 5,
      "findings": [
        {
          "code": "first_payment",
          "severity": "warn",
          "message": "first payment to Harbor Point Logistics LLC",
          "points": 5
        }
      ],
      "decision": null,
      "outcome": null
    },
    {
      "id": "itm_1TzH6kQb3WmF8rNy4PdV",
      "object": "payment_item",
      "position": 1,
      "rail": "ach",
      "vendor_id": null,
      "payee_name": "J. Reyes Consulting",
      "routing_number": "063174290",
      "bic": null,
      "last4": "2007",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 9800,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-0412",
      "entry_class": null,
      "payroll": false,
      "status": "rejected",
      "score": 20,
      "findings": [
        {
          "code": "unknown_payee",
          "severity": "hold",
          "message": "J. Reyes Consulting is not a vendor on file",
          "points": 20
        }
      ],
      "decision": {
        "by": "dana@yourcompany",
        "at": "2026-10-05T14:09:31.000Z",
        "reason": "Not a vendor of ours. The invoice came from an address we do not know.",
        "second_by": null
      },
      "outcome": null
    }
  ]
}
```

## 5. A person releases the run

Release works once no payment is still held. The person releasing it in the console gets the file to upload to your bank: the same CSV, without the rejected row.

run-released.csv:

```shell
payee,routing_number,account_number,amount,payment_date,invoice
Harbor Point Logistics LLC,091408501,4021887365,"48,250.00",2026-10-06,INV-20931
```

Your integration hears about it from the `payment_run.released` [webhook](/docs/webhooks.md#event-types), or by reading the run. A run is released once and then never changes.

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_runs/run_4VbN8qLs2TjW6hPx9RkM" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_4VbN8qLs2TjW6hPx9RkM",
  "object": "payment_run",
  "name": "Week 41 vendor payments",
  "format": "csv",
  "status": "released",
  "created_by": "api_key:qk_test_Xy7P",
  "created_at": "2026-10-05T14:02:11.000Z",
  "released_at": "2026-10-05T14:11:02.000Z",
  "released_by": "dana@yourcompany",
  "release_code": null,
  "file_deleted_at": null,
  "summary": {
    "payments": 2,
    "total": 58050,
    "held": 0,
    "held_amount": 0,
    "rejected": 1,
    "rejected_amount": 9800
  },
  "items": [
    {
      "id": "itm_9JcR4mXv7NpB2tKw5LqS",
      "object": "payment_item",
      "position": 0,
      "rail": "ach",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "payee_name": "Harbor Point Logistics LLC",
      "routing_number": "091408501",
      "bic": null,
      "last4": "7365",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 48250,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-20931",
      "entry_class": null,
      "payroll": false,
      "status": "clear",
      "score": 5,
      "findings": [
        {
          "code": "first_payment",
          "severity": "warn",
          "message": "first payment to Harbor Point Logistics LLC",
          "points": 5
        }
      ],
      "decision": null,
      "outcome": null
    },
    {
      "id": "itm_1TzH6kQb3WmF8rNy4PdV",
      "object": "payment_item",
      "position": 1,
      "rail": "ach",
      "vendor_id": null,
      "payee_name": "J. Reyes Consulting",
      "routing_number": "063174290",
      "bic": null,
      "last4": "2007",
      "check_number": null,
      "drawn_on_last4": null,
      "amount": 9800,
      "currency": "USD",
      "effective_date": "2026-10-06",
      "reference": "INV-0412",
      "entry_class": null,
      "payroll": false,
      "status": "rejected",
      "score": 20,
      "findings": [
        {
          "code": "unknown_payee",
          "severity": "hold",
          "message": "J. Reyes Consulting is not a vendor on file",
          "points": 20
        }
      ],
      "decision": {
        "by": "dana@yourcompany",
        "at": "2026-10-05T14:09:31.000Z",
        "reason": "Not a vendor of ours. The invoice came from an address we do not know.",
        "second_by": null
      },
      "outcome": null
    }
  ]
}
```

## Next

- [Payment runs](/docs/payment-runs.md): NACHA files, every CSV column name Quarter reads, and JSON items.
- [Checks](/docs/checks.md): all twenty-five checks and how to set each one.
- [Decisions and release](/docs/releases.md): two-person approval, cancel, and what release guarantees.
- [Payment checks](/docs/payment-checks.md): one wire or instant payment, checked before it is keyed in.
- [Webhooks](/docs/webhooks.md): hear about held payments as they happen.
