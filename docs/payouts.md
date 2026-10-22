# Payouts

> For platforms that pay out to their own users: check each payout before it is sent, and get allow, review or block with the reasons.

> **Note:** The payouts API is built and tested. It has not yet been used by a platform.

A marketplace paying sellers, a gig platform paying workers or a payroll tool calls Quarter before each payout. Quarter answers `allow`, `review` or `block`, with the reasons. Holds, decisions, two-person approval, the audit trail and webhooks are the same as for any [payment run](/docs/payment-runs.md). Quarter never sends the money: you do, once the answer is `allow`.

## The model

- A **connected account** is one of your own users that you pay out for, named by your `external_id`, unique in the project.
- A **payee** is who a connected account's payouts go to. A payee is a vendor of the project reached only through that account's payouts, so it also appears in `/v1/vendors` and shares the vendors' `external_id` space. A payee is a person by default (`individual: true`).
- Bank detail changes keep history: new details replace the old ones, which stay on file. A payout within 72 hours of a change holds as `payout_details_changed`.
- A payout is a [payment run](/docs/payment-runs.md) of format `payout`, or `payout_batch` for up to 1,000. The payout id is the payment item id.

## Decisions

| Decision | Means |
| --- | --- |
| `allow` | Clear, or a person approved it. Send it. |
| `review` | Held until a person decides at `/v1/payment_runs/{run_id}/items/{id}/decision`. `payout.reviewed` says the outcome. |
| `block` | Do not send it: the payee is blocked, a sanctions match was found (payee, wallet or connected account), or a person rejected it. |

## The checks on a payout

Four checks run only on payouts: [`payout_details_changed`](/docs/checks.md#payout-details-changed), [`payout_new_payee_large`](/docs/checks.md#payout-new-payee-large), [`payout_account_fan_in`](/docs/checks.md#payout-account-fan-in) and [`payout_velocity_spike`](/docs/checks.md#payout-velocity-spike). `sanctions_match` also looks at the connected account's name.

Some vendor checks do not run on payouts, because your payees change their own details in your app and nobody calls them back: `unverified_account`, `account_changed_recently`, `shared_account`, `first_payment`, `vendor_new_paid_fast`, the three `request_domain_*` checks and `just_under_threshold`. A payout must name a payee of that connected account, or it is refused with `404 payee_not_found`, so `unknown_payee` never fires.

## Idempotency

Every check and batch needs an `Idempotency-Key` header of 1 to 255 printable characters, unique to the payout or batch. A retry with the same key and the same body gets the first answer back with `200`. The same key with a different body answers `409 idempotency_key_reused`. Without the header: `400 idempotency_key_required`.

## Outcomes and the network

- Report what became of a payout, such as one that left and was later found to be fraud. An API key may record it.
- Only a signed-in approver's report reaches the [network](/docs/network.md), and only for a business payee at a US account, from a live project, within 10 fraud reports per organization per day. Payees are people by default, so most payout reports stay with you.
- When an API key reports fraud, the answer says `network.shared: false` with `reason: needs_signed_in_approver`. A person sends the same outcome again to share it.

## Webhooks

When a person decides a held payout, `payout.reviewed` is sent with `payout_id` (the payout, as `GET /v1/payouts/{payout}` takes it), `run_id` (the check or batch it came in), `item_id` (the same as `payout_id`), `decision` (`allow` or `block`), `reviewed_by` and `reason`. `payment_item.held` and `payment_run.released` fire as for any run. See [webhooks](/docs/webhooks.md).

## Limits

- Each credential may send 600 requests a minute, and a project 30 batches a minute: at most 600 single checks, or 30,000 payouts in batches, per key per minute.
- Integration keys and approvers signed in may write; viewers may read. Agent keys cannot call these routes.
- Payee bank details on file are US accounts only: a 9-digit routing number and an account number. An IBAN payout therefore holds as `account_not_on_file`.
- In live mode, payees count toward `active_vendors` on your plan.

## Endpoints

### Create a connected account

`POST /v1/connected_accounts` (auth: API key)

Errors: `400 external_id_invalid`, `name_invalid`; `409 external_id_taken`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `external_id` | string | Yes | Your id for the account, unique in the project. |
| `name` | string | Yes | Up to 200 characters. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/connected_accounts" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"external_id":"seller_20931","name":"Bayside Ceramics"}'
```

Response:

```json
{
  "id": "cac_5RkT8mWq2LnB7vXc4HdP",
  "object": "connected_account",
  "external_id": "seller_20931",
  "name": "Bayside Ceramics",
  "created_at": "2026-10-21T14:02:11.000Z"
}
```

### List connected accounts

`GET /v1/connected_accounts` (auth: API key)

Oldest first. `limit` is 1 to 200, 50 by default; pass the last id as `after` for the next page.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | integer | No | 1 to 200, 50 by default. |
| `after` | string | No | The id of the last account on the previous page. |

Request:

```bash
curl "$QUARTER_API_URL/v1/connected_accounts" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "has_more": false,
  "data": [
    {
      "id": "cac_5RkT8mWq2LnB7vXc4HdP",
      "object": "connected_account",
      "external_id": "seller_20931",
      "name": "Bayside Ceramics",
      "created_at": "2026-10-21T14:02:11.000Z"
    }
  ]
}
```

### Retrieve a connected account

`GET /v1/connected_accounts/{account}` (auth: API key)

Unknown: `404 connected_account_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `account` | string | Yes | Quarter's id (`cac_`) or your `external_id`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/connected_accounts/seller_20931" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "cac_5RkT8mWq2LnB7vXc4HdP",
  "object": "connected_account",
  "external_id": "seller_20931",
  "name": "Bayside Ceramics",
  "created_at": "2026-10-21T14:02:11.000Z"
}
```

### Create a payee

`POST /v1/connected_accounts/{account}/payees` (auth: API key)

A payee of the connected account, optionally with bank details. The answer is the payee as a [vendor](/docs/vendors.md) with `object: payee` and `connected_account_id`; `bank_accounts` keeps every account it has had.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `account` | string | Yes | Quarter's id (`cac_`) or your `external_id`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | The payee's name. |
| `external_id` | string | No | Your id for the payee, unique in the project. |
| `individual` | boolean | No | True by default for a payee: the network never takes or gives facts about a person. |
| `routing_number` | string | No | 9 digits. |
| `account_number` | string | No | 4 to 17 letters or digits. |
| `holder_name` | string | No | The account holder. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/connected_accounts/seller_20931/payees" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"name":"Maya Chen","external_id":"payee_4471","routing_number":"<routing number>","account_number":"<account number>"}'
```

Response:

```shell
The payee, shaped as a vendor with object "payee" and connected_account_id.
```

### Retrieve a payee

`GET /v1/connected_accounts/{account}/payees/{payee}` (auth: API key)

The payee with its bank detail history. Unknown: `404 payee_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `account` | string | Yes | Quarter's id (`cac_`) or your `external_id`. |
| `payee` | string | Yes | Quarter's id (`ven_`) or your `external_id`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/connected_accounts/seller_20931/payees/payee_4471" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```shell
The payee, shaped as a vendor with object "payee" and connected_account_id.
```

### Change a payee's bank details

`PUT /v1/connected_accounts/{account}/payees/{payee}/bank_account` (auth: API key)

The old details stay as history. A payout within 72 hours holds as `payout_details_changed`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `account` | string | Yes | Quarter's id (`cac_`) or your `external_id`. |
| `payee` | string | Yes | Quarter's id (`ven_`) or your `external_id`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `routing_number` | string | Yes | 9 digits. |
| `account_number` | string | Yes | 4 to 17 letters or digits. |
| `holder_name` | string | No | The account holder. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/connected_accounts/seller_20931/payees/payee_4471/bank_account" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"routing_number":"<routing number>","account_number":"<account number>"}'
```

Response:

```shell
The payee, with the new details first and the old ones marked replaced.
```

### Check a payout

`POST /v1/payouts/check` (auth: API key)

Checks one payout before it is sent and answers at once. `201` the first time, `200` for a retry under the same key. A payout with nothing held is released at once; a held one waits for a person.

Errors: `400 idempotency_key_required`, `connected_account_required`, `payee_required`, `rail_invalid` and the [payment check](/docs/payment-checks.md) field errors; `404 connected_account_not_found`, `payee_not_found`; `409 idempotency_key_reused`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `connected_account` | string | Yes | Quarter's id or yours for the connected account. |
| `payee` | string | Yes | Quarter's id or yours for the connected account's payee. |
| `rail` | string | Yes | `ach`, `wire`, `rtp`, `fednow`, `international` or `stablecoin`. |
| `amount` | number | Yes | In major units. |
| `currency` | string | No | Three letters; USD unless the rail is international. |
| `routing_number` | string | No | 9 digits; ach, wire, rtp and fednow. |
| `account_number` | string | No | 4 to 17 letters or digits; ach, wire, rtp and fednow. |
| `iban` | string | No | International only. |
| `bic` | string | No | International only. |
| `network` | string | No | Stablecoin only. |
| `address` | string | No | Stablecoin only: the wallet paid. |
| `reference` | string | No | Your id for the payout. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payouts/check" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "idempotency-key: po_88213" \
  -H "content-type: application/json" \
  -d '{"connected_account":"seller_20931","payee":"payee_4471","rail":"ach","amount":1840,"reference":"po_88213"}'
```

Response:

```json
{
  "id": "itm_7NwQ3kTz9RbM2xLp6VcJ",
  "object": "payout",
  "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
  "decision": "review",
  "status": "held",
  "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
  "payee_id": "ven_4LtB9wQm6RzK2pXn8HcF",
  "payee_name": "Maya Chen",
  "rail": "ach",
  "amount": 1840,
  "currency": "USD",
  "last4": "5521",
  "reference": "po_88213",
  "score": 40,
  "reasons": [
    {
      "code": "payout_details_changed",
      "severity": "hold",
      "message": "Maya Chen's bank details changed 3 hours ago, just before this payout",
      "points": 40
    }
  ],
  "review": null,
  "outcome": null,
  "created_at": "2026-10-21T17:40:03.000Z"
}
```

### Check a batch of payouts

`POST /v1/payouts/batches` (auth: API key)

Checks 1 to 1,000 payouts under one Idempotency-Key. Earlier payouts in the batch count toward the fan-in and velocity of later ones. 30 batches a minute per project.

Errors: `400 payouts_invalid`, `idempotency_key_required`, and any payout error prefixed with its index, such as `payouts[3]`; `409 idempotency_key_reused`; `429` over the batch limit.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payouts` | array | Yes | 1 to 1,000 payouts, each with the fields of a single check. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payouts/batches" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "idempotency-key: batch_2026-10-21_17" \
  -H "content-type: application/json" \
  -d '{"payouts":[{"connected_account":"seller_20931","payee":"payee_4471","rail":"ach","amount":1840,"reference":"po_88213"}]}'
```

Response:

```json
{
  "id": "run_2HcV8pLw5TqK9nRz3XbM",
  "object": "payout_batch",
  "summary": {
    "payouts": 2,
    "allow": 1,
    "review": 1,
    "block": 0
  },
  "payouts": [
    {
      "id": "itm_7NwQ3kTz9RbM2xLp6VcJ",
      "object": "payout",
      "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
      "decision": "review",
      "status": "held",
      "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
      "payee_id": "ven_4LtB9wQm6RzK2pXn8HcF",
      "payee_name": "Maya Chen",
      "rail": "ach",
      "amount": 1840,
      "currency": "USD",
      "last4": "5521",
      "reference": "po_88213",
      "score": 40,
      "reasons": [
        {
          "code": "payout_details_changed",
          "severity": "hold",
          "message": "Maya Chen's bank details changed 3 hours ago, just before this payout",
          "points": 40
        }
      ],
      "review": null,
      "outcome": null,
      "created_at": "2026-10-21T17:40:03.000Z"
    },
    {
      "id": "itm_1KpR6vTn3WqZ8mLx4BcH",
      "object": "payout",
      "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
      "decision": "allow",
      "status": "clear",
      "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
      "payee_id": "ven_8QzM2nRb5TkW7vLp3JcD",
      "payee_name": "Luis Ortega",
      "rail": "ach",
      "amount": 420,
      "currency": "USD",
      "last4": "0937",
      "reference": "po_88214",
      "score": 0,
      "reasons": [],
      "review": null,
      "outcome": null,
      "created_at": "2026-10-21T17:40:03.000Z"
    }
  ],
  "created_at": "2026-10-21T17:40:03.000Z"
}
```

### Retrieve a batch

`GET /v1/payouts/batches/{batch}` (auth: API key)

The batch with each payout as it stands. Unknown: `404 payout_batch_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `batch` | string | Yes | The batch id, starting with `run_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payouts/batches/run_2HcV8pLw5TqK9nRz3XbM" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "run_2HcV8pLw5TqK9nRz3XbM",
  "object": "payout_batch",
  "summary": {
    "payouts": 2,
    "allow": 1,
    "review": 1,
    "block": 0
  },
  "payouts": [
    {
      "id": "itm_7NwQ3kTz9RbM2xLp6VcJ",
      "object": "payout",
      "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
      "decision": "review",
      "status": "held",
      "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
      "payee_id": "ven_4LtB9wQm6RzK2pXn8HcF",
      "payee_name": "Maya Chen",
      "rail": "ach",
      "amount": 1840,
      "currency": "USD",
      "last4": "5521",
      "reference": "po_88213",
      "score": 40,
      "reasons": [
        {
          "code": "payout_details_changed",
          "severity": "hold",
          "message": "Maya Chen's bank details changed 3 hours ago, just before this payout",
          "points": 40
        }
      ],
      "review": null,
      "outcome": null,
      "created_at": "2026-10-21T17:40:03.000Z"
    },
    {
      "id": "itm_1KpR6vTn3WqZ8mLx4BcH",
      "object": "payout",
      "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
      "decision": "allow",
      "status": "clear",
      "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
      "payee_id": "ven_8QzM2nRb5TkW7vLp3JcD",
      "payee_name": "Luis Ortega",
      "rail": "ach",
      "amount": 420,
      "currency": "USD",
      "last4": "0937",
      "reference": "po_88214",
      "score": 0,
      "reasons": [],
      "review": null,
      "outcome": null,
      "created_at": "2026-10-21T17:40:03.000Z"
    }
  ],
  "created_at": "2026-10-21T17:40:03.000Z"
}
```

### Retrieve a payout

`GET /v1/payouts/{payout}` (auth: API key)

Its current decision, and the review once a person made one. Unknown: `404 payout_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payout` | string | Yes | The payout id, starting with `itm_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/payouts/itm_7NwQ3kTz9RbM2xLp6VcJ" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "itm_7NwQ3kTz9RbM2xLp6VcJ",
  "object": "payout",
  "run_id": "run_2HcV8pLw5TqK9nRz3XbM",
  "decision": "allow",
  "status": "approved",
  "connected_account_id": "cac_5RkT8mWq2LnB7vXc4HdP",
  "payee_id": "ven_4LtB9wQm6RzK2pXn8HcF",
  "payee_name": "Maya Chen",
  "rail": "ach",
  "amount": 1840,
  "currency": "USD",
  "last4": "5521",
  "reference": "po_88213",
  "score": 40,
  "reasons": [
    {
      "code": "payout_details_changed",
      "severity": "hold",
      "message": "Maya Chen's bank details changed 3 hours ago, just before this payout",
      "points": 40
    }
  ],
  "review": {
    "by": "dana@yourcompany",
    "at": "2026-10-21T17:52:40.000Z",
    "reason": "Payee confirmed the change in the app with a passkey.",
    "second_by": null
  },
  "outcome": null,
  "created_at": "2026-10-21T17:40:03.000Z"
}
```

### Report what became of a payout

`POST /v1/payouts/{payout}/outcome` (auth: API key, or a signed-in approver)

Takes the same body as [recording what a payment was](/docs/releases.md#outcomes). An API key records it; a signed-in approver reporting a `fraud_attempt` about a business payee at a US account also reports it to the network, within the daily limit. `network.reason` is `not_fraud`, `needs_signed_in_approver`, `individual_payee`, `not_a_us_account` or `daily_limit` when it was not shared.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `payout` | string | Yes | The payout id, starting with `itm_`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/payouts/itm_1KpR6vTn3WqZ8mLx4BcH/outcome" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"outcome":"fraud_attempt","reason":"account_takeover","found_on":"2026-10-23","found_how":"bank_notice"}'
```

Response:

```shell
The recorded outcome (object "payment_item_outcome", with outcome, caught and missed), and network: { "shared": false, "reason": "needs_signed_in_approver" }
```
