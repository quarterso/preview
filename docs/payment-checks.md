# Payment checks

> Check one wire, RTP, FedNow, international, ACH, stablecoin or card payment before it goes out, by a person or an AI agent.

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
| `stablecoin` | `network` (`ethereum`, `base`, `polygon`, `arbitrum` or `solana`) and `address` | `USD` only |
| `card` | `mcc`, the merchant category code (4 digits) | `USD` only |

The three checks that only apply to paper checks never fire on a payment check. `routing_invalid` applies to the US rails, and `iban_invalid` to international payments.

A stablecoin payment is checked like a bank payment, with the wallet in place of the account: the same address on the same chain is the same wallet, so a repeat is a duplicate. EVM addresses are compared in lower case. Wallets are never on file for a vendor, so a stablecoin payment to a known vendor is held as `account_not_on_file`. A card payment pays a merchant, not an account, so the bank detail checks never run on it, and a duplicate is the same amount to the same merchant name.

> **Warning:** Bank details on file are US routing and account numbers, so an IBAN is never compared with them. An international payment to a known vendor is therefore always held as `account_not_on_file`, with the message that the vendor has no IBAN on file, and a person decides it.

A clear check counts as a payment to the vendor from then on, for [`first_payment`](/docs/checks.md#first-payment) and [`amount_unusual`](/docs/checks.md#amount-unusual). In the list of payment runs, a payment check appears as a run of format `single`.

## AI agents

An agent is software that asks Quarter to check its own payments, with an API key bound to it. A signed-in admin creates it with `POST /v1/agents`, naming a member as `owner`, a `per_payment_limit`, a `daily_limit`, and optionally `allowed_vendor_ids` and, for card payments, `allowed_mccs`. Then `POST /v1/agents/{agent}/api_keys` gives the agent its key, shown once.

- The agent's payments are recorded as requested by its owner, so a person answers for each one. `requested_by` is ignored.
- A payment over a limit holds as [`agent_over_limit`](/docs/checks.md#agent-over-limit); one to a payee off its lists holds as [`agent_payee_not_allowed`](/docs/checks.md#agent-payee-not-allowed). Both always hold. Every other check runs as usual.
- The agent's key reaches only `POST /v1/payment_checks` and `GET /v1/payment_checks/{check}`. Any other route answers `403 agent_key_refused`, so an agent can never decide its own held payment.
- `POST /v1/agents/{agent}/disable` stops the agent and revokes its keys at once. A disabled agent cannot be enabled again.
- An agent that works over MCP can call Quarter as a tool: `POST /mcp` with its key exposes one tool, `check_payment`, which takes the same fields as `POST /v1/payment_checks` and returns the status, findings and release code.

## Card authorizations

Connect Lithic with `PUT /v1/integrations/lithic` and the project's Auth Stream Access secret, then enroll the `responder_path` it returns as Lithic's AUTH_STREAM_ACCESS responder. Lithic then calls Quarter while each card purchase is authorized. Quarter checks it as a card payment and answers `APPROVED` only when it is clear. A held purchase is declined (`VELOCITY_EXCEEDED` for an agent over its limits, `UNAUTHORIZED_MERCHANT` off its allowed list, `SUSPECTED_FRAUD` otherwise) and closed as rejected, since a card payment cannot wait for a person. A card tagged `quarter_agent` with an agent id is checked as that agent's payment. Anything Quarter cannot check, including a currency other than USD, is declined. On a card payment, a merchant that is not a vendor on file only warns. For another issuer, such as Marqeta, call `POST /v1/payment_checks` from your own endpoint the same way.

## Endpoints

### Check a payment

`POST /v1/payment_checks` (auth: API key)

Checks one payment and returns it with its findings. The account number is sealed at once and never returned; `last4` is the last 4 digits of the account or the IBAN. Fires `payment_run.scanned`, and `payment_item.held` when it is held, or `payment_run.released` when it is clear.

Errors: `400 rail_invalid`, `payee_name_required`, `amount_invalid`, `currency_invalid`, `routing_number_invalid`, `account_number_invalid`, `iban_format_invalid`, `bic_invalid`, `network_invalid`, `address_invalid`, `mcc_invalid`, `requested_by_not_you`; `409 trial_ended`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `rail` | string | Yes | `ach`, `wire`, `rtp`, `fednow`, `international`, `stablecoin` or `card`. |
| `payee_name` | string | Yes | Who is paid, 1 to 140 characters. |
| `amount` | number | Yes | In the payment currency, more than 0 and up to 1,000,000,000. Rounded to cents. |
| `currency` | string | No | Three letters. `USD` by default, and always `USD` unless the rail is `international`. |
| `routing_number` | string | No | Required for `ach`, `wire`, `rtp` and `fednow`. |
| `account_number` | string | No | Required for `ach`, `wire`, `rtp` and `fednow`. Sealed at rest; never returned. |
| `iban` | string | No | Required for `international`. |
| `bic` | string | No | Required for `international`: the 8 or 11 character SWIFT code. |
| `network` | string | No | Required for `stablecoin`: `ethereum`, `base`, `polygon`, `arbitrum` or `solana`. |
| `address` | string | No | Required for `stablecoin`: 0x and 40 hex digits, or a Solana base58 address. Only its fingerprint and last 4 are kept. |
| `mcc` | string | No | Required for `card`: the merchant's 4-digit category code. |
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
  "network": null,
  "mcc": null,
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
  "network": null,
  "mcc": null,
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
  "network": null,
  "mcc": null,
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
