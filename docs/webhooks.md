# Webhooks and events

> Event types, the signed delivery format, how to verify quarter-signature, and how retries work.

Quarter records each change as an event and sends it to your webhook endpoints. The event and its deliveries are written in the same transaction, so an event is never recorded without its webhooks, and no webhook is sent for a change that did not happen.

## Event types

| Type | When | `data` fields besides `object_type` and `object_id` |
| --- | --- | --- |
| `vendor.created` | A vendor was added. | `name` |
| `vendor.bank_account_changed` | A vendor got new bank details. Its payments are held until they are confirmed. | `vendor_id`, `bank_account_id`, `last4`, `previous_last4` |
| `vendor.verified` | Bank details were confirmed, by bank login or call-back. | `vendor_id`, `bank_account_id`, `last4`, `method` |
| `verification_request.completed` | A vendor finished a verification link with a bank login that matched the details on file. | `vendor_id`, `request_id`, `verified`, and `reason: "callback_required"` when `verified` is `false` because the link went to a [new contact](/docs/verification.md#new-contact) |
| `payment_run.scanned` | A run was uploaded and checked. | `run_id` |
| `payment_item.held` | A payment in a run was held. | `run_id`, `item_id`, `payee_name`, `amount`, `findings` (the check codes), `score` ([points](/docs/checks.md#points)) |
| `payment_run.released` | A run was released. | `run_id`, `released_by`, `rejected` (how many payments were left out), and `release_code` for a [payment check](/docs/payment-checks.md) |
| `fraud_report.created` | You reported an account. | `id`, `routing_number`, `last4` |
| `integration.synced` | A [NetSuite](/docs/netsuite.md) sync finished. | `provider`, and the counts `created`, `updated`, `bank_changed`, `inactive`, `unchanged`, `deleted`, `failed`; with the [payment flow](/docs/netsuite.md#payment-flow) on, `bills` with its own counts |
| `integration.failed` | A NetSuite sync failed. | `provider`, `error` |
| `integration.hold_overridden` | Someone cleared Quarter's Payment Hold on a bill in NetSuite. Quarter put it back. | `provider`, `external_id`, `bill_number`, `run_id` |
| `integration.write_failed` | Quarter could not write its result to a NetSuite bill. Sent once until a write to that bill succeeds. | `provider`, `external_id`, `bill_number`, `error` |
| `billing.trial_ending` | The free trial ends in 3 days or less. Sent to every project. | `trial_ends_at` |
| `billing.trial_ended` | The free trial ended without a subscription. Sent to every project. | `trial_ended_at` |

## What a delivery looks like

A `POST` with a JSON body and these headers: `quarter-event-id`, `quarter-timestamp` and `quarter-signature`.

Body:

```json
{
  "id": "evt_3QkW8nRv5TpZ2mLx7BcJ",
  "object": "event",
  "type": "payment_item.held",
  "created_at": "2026-10-06T08:15:03.000Z",
  "data": {
    "object_type": "payment_item",
    "object_id": "itm_5RnX9cLw3TbM7kQp2VjF",
    "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
    "item_id": "itm_5RnX9cLw3TbM7kQp2VjF",
    "payee_name": "HARBOR POINT LOGISTICS",
    "amount": 12000,
    "findings": [
      "account_not_on_file"
    ],
    "score": 40
  }
}
```

## Verify the signature

`quarter-signature` is `t=<timestamp>,v1=<signature>`. The timestamp is in Unix seconds. The signature is the hex HMAC SHA-256 of `<timestamp>.<raw body>`, keyed with your endpoint secret, which starts with `whsec_`. Compute it over the raw body before parsing it, and compare in constant time.

Verify and handle a delivery:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

// The endpoint secret, shown once when you added the endpoint. Use all of it, "whsec_" included.
const secret = process.env.QUARTER_WEBHOOK_SECRET!;

/** quarter-signature is "t=<unix seconds>,v1=<hex HMAC-SHA256 of `<t>.<raw body>`>". */
export function verifyQuarterSignature(rawBody: string, header: string | null, toleranceSeconds = 300): boolean {
  if (!header) return false;
  const parts = new Map(header.split(",").map((part) => part.split("=", 2) as [string, string]));
  const timestamp = Number(parts.get("t"));
  const signature = parts.get("v1") ?? "";
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

// A Next.js route handler. Read the body as text: the signature covers the exact bytes Quarter sent.
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyQuarterSignature(rawBody, request.headers.get("quarter-signature"))) {
    return new Response("bad signature", { status: 400 });
  }
  const event = JSON.parse(rawBody);
  if (event.type === "payment_item.held") {
    // Tell the reviewer: event.data.payee_name, event.data.amount, event.data.findings
  }
  return new Response(null, { status: 204 });
}
```

Each attempt is signed with the time it was sent, so refusing signatures older than a few minutes also refuses replays.

## Retries

- Any 2xx response counts as delivered. Anything else, a redirect, or no answer within 10 seconds counts as a failure.
- A failed delivery is tried again after 10 seconds, then waits that double each time, up to 8 attempts. Then it is marked `failed`.
- You can send any delivery again with [`POST /v1/webhook_deliveries/{id}/retry`](/docs/webhooks.md#post-v1-webhook-deliveries-id-retry).
- Because of retries, an event can arrive more than once. Use the event `id` to do the work once.

## Endpoints

### Add a webhook endpoint

`POST /v1/webhook_endpoints` (auth: API key)

The URL must use https and be publicly reachable. The endpoint receives every event type unless you list the ones it wants. The `secret` is shown only in this response.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | Where to send events. |
| `enabled_events` | string[] | No | Event types to send. All of them when left out. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/webhook_endpoints" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"url":"https://<your host>/webhooks/quarter","enabled_events":["payment_item.held","vendor.bank_account_changed"]}'
```

Response:

```json
{
  "id": "we_5HtN9qLv2WkR7pXm3BcD",
  "object": "webhook_endpoint",
  "url": "https://<your host>/webhooks/quarter",
  "enabled_events": [
    "payment_item.held",
    "vendor.bank_account_changed"
  ],
  "secret": "whsec_Rk2Vn8QxT4mLp7WcZ3bJ9yHs6FdG1aNe"
}
```

### List webhook endpoints

`GET /v1/webhook_endpoints` (auth: API key)

Your endpoints, oldest first, without their secrets.

Request:

```bash
curl "$QUARTER_API_URL/v1/webhook_endpoints" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "we_5HtN9qLv2WkR7pXm3BcD",
      "object": "webhook_endpoint",
      "url": "https://<your host>/webhooks/quarter",
      "enabled_events": [
        "payment_item.held",
        "vendor.bank_account_changed"
      ],
      "enabled": true
    }
  ]
}
```

### List events

`GET /v1/events` (auth: API key)

Events, newest first. Useful to catch up after downtime, or to see everything that happened to one vendor or run.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `object_id` | string | No | Only events about this vendor, run, item or report. |
| `limit` | integer | No | Up to 200. Default 50. |

Request:

```bash
curl "$QUARTER_API_URL/v1/events?object_id=itm_5RnX9cLw3TbM7kQp2VjF" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "evt_3QkW8nRv5TpZ2mLx7BcJ",
      "object": "event",
      "type": "payment_item.held",
      "created_at": "2026-10-06T08:15:03.000Z",
      "data": {
        "object_type": "payment_item",
        "object_id": "itm_5RnX9cLw3TbM7kQp2VjF",
        "run_id": "run_8TpQ3xWm6KvB1nRz4LcH",
        "item_id": "itm_5RnX9cLw3TbM7kQp2VjF",
        "payee_name": "HARBOR POINT LOGISTICS",
        "amount": 12000,
        "findings": [
          "account_not_on_file"
        ],
        "score": 40
      }
    }
  ]
}
```

### List deliveries

`GET /v1/webhook_deliveries` (auth: API key)

The 100 most recent deliveries, with their status: `pending`, `delivered` or `failed`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `event` | string | No | Only deliveries of this event id. |

Request:

```bash
curl "$QUARTER_API_URL/v1/webhook_deliveries?event=evt_3QkW8nRv5TpZ2mLx7BcJ" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "whd_8f3c1a9e2d7b4c6a0e51",
      "event_id": "evt_3QkW8nRv5TpZ2mLx7BcJ",
      "endpoint_id": "we_5HtN9qLv2WkR7pXm3BcD",
      "status": "delivered",
      "attempts": 1,
      "last_status_code": 204,
      "last_error": null,
      "delivered_at": "2026-10-06T08:15:04.000Z"
    }
  ]
}
```

### Retry a delivery

`POST /v1/webhook_deliveries/{id}/retry` (auth: API key)

Sends a delivery again now, whatever its state, with a fresh count of attempts.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | The delivery id, starting with `whd_`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/webhook_deliveries/whd_8f3c1a9e2d7b4c6a0e51/retry" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "whd_8f3c1a9e2d7b4c6a0e51",
  "status": "pending"
}
```
