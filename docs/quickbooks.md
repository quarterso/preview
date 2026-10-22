# QuickBooks Online

> Check every QuickBooks Online bill awaiting payment and get an alert for each one held. QuickBooks Online has no hold Quarter can set, so Quarter alerts and never stops a payment there.

> **Note:** The QuickBooks Online connection is built and tested against a simulated QuickBooks Online company. It has not yet run against a real one.

> **Warning:** Quarter checks QuickBooks Online bills and alerts. It cannot stop one. A held bill can still be paid in QuickBooks Online until someone stops it there or at your bank.

Quarter reads your QuickBooks Online vendors every hour and, with the payment flow on, every bill with a balance every 5 minutes. Quarter never writes to QuickBooks Online.

## What Quarter controls and what it does not

| In QuickBooks Online | Quarter |
| --- | --- |
| Vendors | Read every hour, changes only |
| Vendor bank details | Not read: the QuickBooks Online API does not show them |
| Who changed bank details | Not known: the API has no change history |
| Bills awaiting payment | Read: every bill with a balance. QuickBooks Online has no approval step |
| Hold one bill | Not possible: QuickBooks Online has no hold Quarter can set |
| Block a vendor | Not done: making a vendor inactive is too blunt and is refused while it has a balance |
| Quarter's note on the bill | Not written. The private note belongs to you |

Since bank details are not in the API, a QuickBooks Online payment cannot be held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) from a change made there. Record bank changes in Quarter, or check each payment with [payment checks](/docs/payment-checks.md) where it leaves.

## Connecting

Quarter is not yet registered as an Intuit app with its own consent screen. Until it is, you connect with an Intuit app of your own:

1. Create an app in Intuit's developer portal with the `com.intuit.quickbooks.accounting` scope.
2. Run the app's OAuth 2.0 consent as a QuickBooks Online admin of the company. Intuit returns the company id (realm id) and a refresh token.
3. Connect with the realm id, the client id and secret, and the refresh token. Quarter tests them before it saves anything, then seals them. They are never returned, logged or put in the audit log, and are wiped on disconnect.

Intuit replaces the refresh token each time it is used. Quarter keeps the newest one, so do not use the same refresh token anywhere else: the copy you hold stops working after Quarter first syncs.

## What a sync does

- Every hour from connect, or every 5 minutes with the payment flow on, Quarter reads the QuickBooks Online vendors changed since the last sync. Each becomes a Quarter vendor whose `external_id` is the QuickBooks Online id.
- Bank details are taken only where the platform has them, and only US details: a 9-digit routing number and an account number. Anything else is left unread and noted on the vendor, in `notes` on the connection.
- A bank change becomes new, unverified details with `request.channel` `erp` and `request.provider` `quickbooks`, so the next payment to them is held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms them with the vendor.
- A project stays with the company its vendors came from. Connect another company to another project: a different one answers `409 account_changed`.

## The payment flow

With the payment flow on, every 5 minutes after the vendor sync, Quarter reads the bills awaiting payment. Bills that are new or changed since their check are checked as one [payment run](/docs/payment-runs.md) of format `erp`, with `erp_provider` naming the platform. A person decides each held payment in Quarter, signed in. Quarter lifts a hold once the bill is clear or approved and reads the same when read again. A bill that changes after its check, in amount, vendor or bank details, is checked again. A run of bills cannot be cancelled (`409 erp_run`): reject the payments that should not be paid.

- Quarter keeps a record of the holds it set and lifts only those. A hold that was already on when Quarter first wrote is never claimed.
- A hold Quarter set that someone cleared is set again at the next sync and reported as `integration.hold_overridden`. A write that fails is retried at every sync and reported once as `integration.write_failed`.
- Turning the payment flow off stops every write and leaves every hold where it is.
- These routes take a signed-in admin, never an API key: an API key answers `403 session_required`. Only the bill list is open to API keys and anyone signed in.

## What a hold looks like

- Nothing changes in QuickBooks Online. A held bill raises `integration.bill_held` once for each result, with `payment_stopped: false` and `stop_payment` saying where to stop it. See [event types](/docs/webhooks.md#event-types).
- The bill shows as `held` in Quarter, with `payment_stopped: false`. The payment flow says `stops_payment: false`.
- Stop the bill yourself in QuickBooks Online, or at your bank, until a person decides it in Quarter.
- A test project may turn the payment flow on against any QuickBooks Online company, since Quarter writes nothing.

## Endpoints

### Connect QuickBooks Online

`PUT /v1/integrations/quickbooks` (auth: Signed-in admin)

Tests the credentials against QuickBooks Online, saves them sealed and starts the first sync. Nothing is saved when QuickBooks Online refuses them. The answer shows `coverage`: what Quarter reads and controls through this platform.

Errors: `realm_id_invalid`, `client_id_invalid`, `client_secret_invalid`, `refresh_token_invalid`, `sandbox_invalid`, `sandbox_account_in_live`, `quickbooks_unauthorized`, `quickbooks_forbidden`, `quickbooks_query_failed` and `quickbooks_response_too_large`, all `400`; `account_changed`, `409`; `quickbooks_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `realm_id` | string | Yes | The company id Intuit returns with the consent, digits only. |
| `client_id` | string | Yes | Your Intuit app's client id. |
| `client_secret` | string | Yes | Your Intuit app's client secret. |
| `refresh_token` | string | Yes | The refresh token from the consent. Quarter keeps the newest one Intuit returns. |
| `sandbox` | boolean | No | A QuickBooks Online sandbox company. Test projects only. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/quickbooks" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"realm_id":"<realm id>","client_id":"<client id>","client_secret":"<client secret>","refresh_token":"<refresh token>"}'
```

Response:

```json
{
  "object": "integration",
  "provider": "quickbooks",
  "status": "active",
  "account_id": "9130356781234567",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "none"
  },
  "last_synced_at": null,
  "next_sync_at": "2026-10-21T15:20:04.000Z",
  "syncing": false,
  "last_error": null,
  "last_sync": null,
  "records": {
    "active": 0,
    "inactive": 0,
    "deleted": 0,
    "failed": 0
  },
  "failures": [],
  "notes": [],
  "payment_flow": {
    "enabled": false,
    "stops_payment": false,
    "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
    "last_synced_at": null,
    "last_error": null,
    "last_sync": null,
    "bills": {
      "open": 0,
      "waiting": 0,
      "held": 0,
      "rejected": 0,
      "cleared": 0,
      "check_failed": 0,
      "write_failed": 0
    }
  }
}
```

### Read the connection

`GET /v1/integrations/quickbooks` (auth: Signed-in admin)

The connection, its coverage, its last sync, the vendors that failed to save, `notes` on what a sync left out of a vendor (such as bank details that are not a US account), and the payment flow with its bill counts. Never the credentials.

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/quickbooks" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "quickbooks",
  "status": "active",
  "account_id": "9130356781234567",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "none"
  },
  "last_synced_at": "2026-10-21T15:20:31.000Z",
  "next_sync_at": "2026-10-21T15:35:31.000Z",
  "syncing": false,
  "last_error": null,
  "last_sync": {
    "created": 42,
    "updated": 0,
    "bank_changed": 0,
    "inactive": 0,
    "unchanged": 0,
    "deleted": 0,
    "failed": 0
  },
  "records": {
    "active": 42,
    "inactive": 0,
    "deleted": 0,
    "failed": 0
  },
  "failures": [],
  "notes": [],
  "payment_flow": {
    "enabled": true,
    "stops_payment": false,
    "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
    "last_synced_at": "2026-10-21T15:20:33.000Z",
    "last_error": null,
    "last_sync": null,
    "bills": {
      "open": 3,
      "waiting": 0,
      "held": 1,
      "rejected": 0,
      "cleared": 2,
      "check_failed": 0,
      "write_failed": 0
    }
  }
}
```

### Sync now

`POST /v1/integrations/quickbooks/sync` (auth: Signed-in admin)

Starts a sync now instead of at the next one, which is every hour, or every 5 minutes with the payment flow on. At most once in 5 minutes: sooner answers `429 sync_rate_limited`. While a sync runs, the answer is `409 sync_in_progress`. Not connected: `409 not_connected`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/quickbooks/sync" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "quickbooks",
  "status": "active",
  "account_id": "9130356781234567",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "none"
  },
  "last_synced_at": "2026-10-21T15:20:31.000Z",
  "next_sync_at": "2026-10-21T15:31:10.000Z",
  "syncing": false,
  "last_error": null,
  "last_sync": {
    "created": 42,
    "updated": 0,
    "bank_changed": 0,
    "inactive": 0,
    "unchanged": 0,
    "deleted": 0,
    "failed": 0
  },
  "records": {
    "active": 42,
    "inactive": 0,
    "deleted": 0,
    "failed": 0
  },
  "failures": [],
  "notes": [],
  "payment_flow": {
    "enabled": false,
    "stops_payment": false,
    "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
    "last_synced_at": null,
    "last_error": null,
    "last_sync": null,
    "bills": {
      "open": 0,
      "waiting": 0,
      "held": 0,
      "rejected": 0,
      "cleared": 0,
      "check_failed": 0,
      "write_failed": 0
    }
  }
}
```

### Turn the payment flow on or off

`PUT /v1/integrations/quickbooks/payment_flow` (auth: Signed-in admin)

On, Quarter checks open bills every 5 minutes and raises `integration.bill_held` for each one held. QuickBooks Online has no payment hold, so Quarter never stops a payment there. Off, Quarter stops checking.

Errors: `enabled_invalid`, `quickbooks_unauthorized` and `quickbooks_forbidden`, `400`; `not_connected`, `409`; `quickbooks_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | Yes | True to turn the payment flow on, false to turn it off. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/quickbooks/payment_flow" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
```

Response:

```json
{
  "object": "integration",
  "provider": "quickbooks",
  "status": "active",
  "account_id": "9130356781234567",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "none"
  },
  "last_synced_at": "2026-10-21T15:20:31.000Z",
  "next_sync_at": "2026-10-21T15:35:31.000Z",
  "syncing": false,
  "last_error": null,
  "last_sync": {
    "created": 42,
    "updated": 0,
    "bank_changed": 0,
    "inactive": 0,
    "unchanged": 0,
    "deleted": 0,
    "failed": 0
  },
  "records": {
    "active": 42,
    "inactive": 0,
    "deleted": 0,
    "failed": 0
  },
  "failures": [],
  "notes": [],
  "payment_flow": {
    "enabled": true,
    "stops_payment": false,
    "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
    "last_synced_at": null,
    "last_error": null,
    "last_sync": null,
    "bills": {
      "open": 3,
      "waiting": 0,
      "held": 1,
      "rejected": 0,
      "cleared": 2,
      "check_failed": 0,
      "write_failed": 0
    }
  }
}
```

### List the open bills

`GET /v1/integrations/quickbooks/bills` (auth: API key, or anyone signed in)

The open bills Quarter follows, newest change first. `status` is `waiting` (not checked yet, or changed since), `held`, `rejected` or `cleared`; `failed` lists the bills with a `check_error` or `write_error`. Decide a held bill at `/v1/payment_runs/{run_id}/items/{item_id}/decision`.

Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `waiting`, `held`, `rejected`, `cleared`, `failed` or `all`, the default. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/quickbooks/bills?status=held" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "erp_bill",
      "provider": "quickbooks",
      "id": "1042",
      "bill_number": "BILL-2207",
      "vendor_external_id": "58",
      "payee_name": "Northwind Logistics",
      "amount": 18400,
      "currency": "USD",
      "due_date": "2026-10-24",
      "status": "held",
      "payment_stopped": false,
      "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
      "run_id": "run_8Hq2LmZx4TbN0cVwYp3R",
      "item_id": "itm_Qe7Rt2Yu9Io1Pa4Sd6Fg",
      "check_error": null,
      "write_error": null,
      "written_at": "2026-10-21T15:20:33.000Z",
      "updated_at": "2026-10-21T15:20:33.000Z"
    }
  ]
}
```

### Disconnect QuickBooks Online

`DELETE /v1/integrations/quickbooks` (auth: Signed-in admin)

Stops the syncs, and the payment flow with them, and wipes the credentials. Vendors already synced, and their history, stay. Holds Quarter set stay where they are in QuickBooks Online.

Request:

```bash
curl -X DELETE "$QUARTER_API_URL/v1/integrations/quickbooks" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "quickbooks",
  "status": "disconnected",
  "account_id": "9130356781234567",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "none"
  },
  "last_synced_at": "2026-10-21T15:20:31.000Z",
  "next_sync_at": null,
  "syncing": false,
  "last_error": null,
  "last_sync": {
    "created": 42,
    "updated": 0,
    "bank_changed": 0,
    "inactive": 0,
    "unchanged": 0,
    "deleted": 0,
    "failed": 0
  },
  "records": {
    "active": 42,
    "inactive": 0,
    "deleted": 0,
    "failed": 0
  },
  "failures": [],
  "notes": [],
  "payment_flow": {
    "enabled": false,
    "stops_payment": false,
    "stop_payment": "QuickBooks Online has no payment hold, so Quarter has not stopped this payment: stop it in QuickBooks Online or at your bank until it is decided",
    "last_synced_at": null,
    "last_error": null,
    "last_sync": null,
    "bills": {
      "open": 0,
      "waiting": 0,
      "held": 0,
      "rejected": 0,
      "cleared": 0,
      "check_failed": 0,
      "write_failed": 0
    }
  }
}
```
