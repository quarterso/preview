# Payment checks

> Check one wire, RTP, FedNow, international or ACH payment before someone keys it into the bank portal.

A payment run checks a file. A payment check checks one payment that has no file: a wire, an instant payment or an international transfer that someone is about to key into the bank portal. It runs the same [checks](/docs/checks.md) as a run. When the payment is clear, or a person approves it, Quarter gives a release code to paste into the wire memo or the bank reference, so the payment carries proof that it was checked.

## How it works

1. Send the payment to `POST /v1/payment_checks`. Quarter matches it to a vendor, by `vendor_id` (your own id or Quarter's), then by the account, then by the payee name.
2. A clear payment is released at once. The answer carries its `release_code` and `released_at`.
3. A held payment waits for a person, signed in to the console. They decide it like any held payment, with [`POST /v1/payment_runs/{run}/items/{item}/decision`](/docs/releases.md#post-v1-payment-runs-run-items-item-decision), using the check's `id` as the run and its `item_id` as the item. An API key cannot decide it. Two-person approval and the rule on people who changed the bank details apply as usual.
4. Once approved, the check is released and gets its release code. A rejected check gets none.
5. Quarter sends nothing to the bank. Your team keys the payment in, with the code in the memo.

## Rails

| `rail` | Bank details | Currency |
| --- | --- | --- |
| `ach`, `wire`, `rtp`, `fednow` | `routing_number` (9 digits) and `account_number` (4 to 17 letters or digits) | `USD` only |
| `international` | `iban` and `bic` (8 or 11 characters) | Any three-letter code |

The three checks that only apply to paper checks never fire on a payment check. `routing_invalid` applies to the US rails, and `iban_invalid` to international payments.

> **Warning:** Bank details on file are US routing and account numbers, so an IBAN is never compared with them. An international payment to a known vendor is therefore always held as `account_not_on_file`, with the message that the vendor has no IBAN on file, and a person decides it.

A clear check counts as a payment to the vendor from then on, for [`first_payment`](/docs/checks.md#first-payment) and [`amount_unusual`](/docs/checks.md#amount-unusual). In the list of payment runs, a payment check appears as a run of format `single`.

## Endpoints

### Check a payment

`POST /v1/payment_checks` (auth: API key)

Checks one payment and returns it with its findings. The account number is sealed at once and never returned; `last4` is the last 4 digits of the account or the IBAN. Fires `payment_run.scanned`, and `payment_item.held` when it is held, or `payment_run.released` when it is clear.

Errors: `400 rail_invalid`, `payee_name_required`, `amount_invalid`, `currency_invalid`, `routing_number_invalid`, `account_number_invalid`, `iban_format_invalid`, `bic_invalid`, `requested_by_not_you`; `409 trial_ended`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rail` | string | Yes | `ach`, `wire`, `rtp`, `fednow` or `international`. |
| `payee_name` | string | Yes | Who is paid, 1 to 140 characters. |
| `amount` | number | Yes | In the payment currency, more than 0 and up to 1,000,000,000. Rounded to cents. |
| `currency` | string | No | Three letters. `USD` by default, and always `USD` unless the rail is `international`. |
| `routing_number` | string | No | Required on every rail but `international`. |
| `account_number` | string | No | Required on every rail but `international`. Sealed at rest; never returned. |
| `iban` | string | No | Required for `international`. |
| `bic` | string | No | Required for `international`: the 8 or 11 character SWIFT code. |
| `vendor_id` | string | No | Quarter's vendor id, or your own id for the vendor (`external_id`). |
| `reference` | string | No | Your invoice or payment reference, up to 140 characters. |
| `requested_by` | string | No | Email of the person checking the payment. Defaults to the person signed in, or the API key. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payment_checks" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"rail":"wire","payee_name":"Harbor Point Logistics LLC","amount":48250,"routing_number":"263391271","account_number":"99300418226","vendor_id":"V-1042","reference":"INV-20931","requested_by":"dana@yourcompany"}'
```

Response:

```json
{
  "id": "run_6WmQ2tKx9BvL4nRp7HcJ",
  "object": "payment_check",
  "item_id": "itm_3KpV8nQw5TzB2mLx6RcH",
  "rail": "wire",
  "payee_name": "Harbor Point Logistics LLC",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "routing_number": "263391271",
  "bic": null,
  "last4": "8226",
  "amount": 48250,
  "currency": "USD",
  "reference": "INV-20931",
  "status": "held",
  "score": 40,
  "findings": [
    {
      "code": "account_changed_recently",
      "severity": "hold",
      "message": "bank details changed 2 days ago and were not confirmed with the vendor",
      "points": 40
    }
  ],
  "decision": null,
  "release_code": null,
  "created_by": "dana@yourcompany",
  "created_at": "2026-10-07T14:03:11.000Z",
  "released_at": null
}
```

A clear payment:

```json
{
  "id": "run_6WmQ2tKx9BvL4nRp7HcJ",
  "object": "payment_check",
  "item_id": "itm_3KpV8nQw5TzB2mLx6RcH",
  "rail": "wire",
  "payee_name": "Harbor Point Logistics LLC",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "routing_number": "263391271",
  "bic": null,
  "last4": "8226",
  "amount": 48250,
  "currency": "USD",
  "reference": "INV-20931",
  "status": "clear",
  "score": 0,
  "findings": [],
  "decision": null,
  "release_code": "7KQ4MXRP",
  "created_by": "dana@yourcompany",
  "created_at": "2026-10-07T14:03:11.000Z",
  "released_at": "2026-10-07T14:03:11.000Z"
}
```

### Retrieve a payment check

`GET /v1/payment_checks/{check}` (auth: API key)

The check with its current status, decision and release code. An id that is a payment run but not a payment check answers `404 payment_check_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `check` | string | Yes | The payment check id, starting with `run_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payment_checks/run_6WmQ2tKx9BvL4nRp7HcJ" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_6WmQ2tKx9BvL4nRp7HcJ",
  "object": "payment_check",
  "item_id": "itm_3KpV8nQw5TzB2mLx6RcH",
  "rail": "wire",
  "payee_name": "Harbor Point Logistics LLC",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "routing_number": "263391271",
  "bic": null,
  "last4": "8226",
  "amount": 48250,
  "currency": "USD",
  "reference": "INV-20931",
  "status": "clear",
  "score": 0,
  "findings": [],
  "decision": null,
  "release_code": "7KQ4MXRP",
  "created_by": "dana@yourcompany",
  "created_at": "2026-10-07T14:03:11.000Z",
  "released_at": "2026-10-07T14:03:11.000Z"
}
```
