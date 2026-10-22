# Xero

> Check every Xero bill awaiting payment, and hold a suspicious one by sending it back to awaiting approval, so it is not paid until a person decides in Quarter.

> **Note:** The Xero connection is built and tested against a simulated Xero organisation. It has not yet run against a real one.

Quarter reads your Xero suppliers every hour and, with the payment flow on, your approved and submitted bills every 5 minutes. Xero has no payment hold, so Quarter uses the approval status: an approved bill can be paid, a bill awaiting approval cannot.

## What Quarter controls and what it does not

| In Xero | Quarter |
| --- | --- |
| Suppliers | Read every hour, changes only |
| Supplier bank details | Read from the one free-text bank line, US routing and account numbers only. A BSB, sort code or IBAN is left unread and noted |
| Who changed bank details | Partly: the contact's history names the Xero user, without an email |
| Bills awaiting payment | Read: bills that are approved or awaiting approval, with an amount due |
| Hold one bill | Yes: sent back to awaiting approval. Refused by Xero once a payment is on the bill |
| Block a supplier | Not possible through the API |
| Quarter's note on the bill | Added to the bill's history. Xero cannot read it back, so Quarter keeps what it last wrote |

Xero's history gives a name, not an email, so Quarter cannot match the person to a member of your organization. The change is recorded with that name and a note saying so, and the rules that stop the person who changed details from approving a payment to them cannot apply.

## Connecting

Quarter is not yet registered as a Xero app with its own consent screen. Until it is, you connect with a Xero app of your own:

1. Create an app in Xero's developer portal with the `accounting.contacts`, `accounting.transactions` and `offline_access` scopes. `offline_access` is what gives a refresh token.
2. Run the app's OAuth 2.0 consent for the organisation, then read its tenant id from the connections endpoint.
3. Connect with the tenant id, the client id and secret, and the refresh token. Quarter tests them before it saves anything, then seals them. They are never returned, logged or put in the audit log, and are wiped on disconnect.

Xero replaces the refresh token each time it is used. Quarter keeps the newest one, so do not use the same refresh token anywhere else.

## What a sync does

- Every hour from connect, or every 5 minutes with the payment flow on, Quarter reads the Xero vendors changed since the last sync. Each becomes a Quarter vendor whose `external_id` is the Xero id.
- Bank details are taken only where the platform has them, and only US details: a 9-digit routing number and an account number. Anything else is left unread and noted on the vendor, in `notes` on the connection.
- A bank change becomes new, unverified details with `request.channel` `erp` and `request.provider` `xero`, so the next payment to them is held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms them with the vendor.
- A project stays with the company its vendors came from. Connect another company to another project: a different one answers `409 account_changed`.

## The payment flow

With the payment flow on, every 5 minutes after the vendor sync, Quarter reads the bills awaiting payment. Bills that are new or changed since their check are checked as one [payment run](/docs/payment-runs.md) of format `erp`, with `erp_provider` naming the platform. A person decides each held payment in Quarter, signed in. Quarter lifts a hold once the bill is clear or approved and reads the same when read again. A bill that changes after its check, in amount, vendor or bank details, is checked again. A run of bills cannot be cancelled (`409 erp_run`): reject the payments that should not be paid.

- Quarter keeps a record of the holds it set and lifts only those. A hold that was already on when Quarter first wrote is never claimed.
- A hold Quarter set that someone cleared is set again at the next sync and reported as `integration.hold_overridden`. A write that fails is retried at every sync and reported once as `integration.write_failed`.
- Turning the payment flow off stops every write and leaves every hold where it is.
- These routes take a signed-in admin, never an API key: an API key answers `403 session_required`. Only the bill list is open to API keys and anyone signed in.

## What a hold looks like

- A held bill goes back to **Awaiting Approval**, and Quarter's reason is added to its history. It cannot be paid in Xero while it waits. Once a person approves it in Quarter, or it is clear, Quarter approves it again.
- A bill with a payment already on it cannot go back to awaiting approval. Xero refuses, Quarter records `xero_hold_refused` on the bill and sends `integration.write_failed`, and the bill shows `payment_stopped: false`. Hold the rest of that payment at your bank.
- Anyone who can approve bills in Xero can approve a held bill again. Quarter sends it back at the next sync and reports `integration.hold_overridden`, but a payment made in between is made.
- A test project cannot turn the payment flow on for Xero (`production_account_in_test`): Xero has no sandbox organisation Quarter can tell apart from a real one. Use a live project.

## Endpoints

### Connect Xero

`PUT /v1/integrations/xero` (auth: Signed-in admin)

Tests the credentials against Xero, saves them sealed and starts the first sync. Nothing is saved when Xero refuses them. The answer shows `coverage`: what Quarter reads and controls through this platform.

Errors: `tenant_id_invalid`, `client_id_invalid`, `client_secret_invalid`, `refresh_token_invalid`, `xero_unauthorized`, `xero_forbidden`, `xero_rate_limited`, `xero_query_failed` and `xero_response_too_large`, all `400`; `account_changed`, `409`; `xero_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tenant_id` | string | Yes | The organisation id from Xero's connections endpoint. |
| `client_id` | string | Yes | Your Xero app's client id. |
| `client_secret` | string | Yes | Your Xero app's client secret. |
| `refresh_token` | string | Yes | The refresh token from the consent. Quarter keeps the newest one Xero returns. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/xero" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"tenant_id":"<tenant id>","client_id":"<client id>","client_secret":"<client secret>","refresh_token":"<refresh token>"}'
```

Response:

```json
{
  "object": "integration",
  "provider": "xero",
  "status": "active",
  "account_id": "4f2c9a1e-7b3d-4e8a-9c61-2d5b8f0e3a47",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "free_text_us_only",
    "bank_change_author": true,
    "bills": true,
    "bill_hold": "approval_status",
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
    "stops_payment": "bill",
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

`GET /v1/integrations/xero` (auth: Signed-in admin)

The connection, its coverage, its last sync, the vendors that failed to save, `notes` on what a sync left out of a vendor (such as bank details that are not a US account), and the payment flow with its bill counts. Never the credentials.

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/xero" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "xero",
  "status": "active",
  "account_id": "4f2c9a1e-7b3d-4e8a-9c61-2d5b8f0e3a47",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "free_text_us_only",
    "bank_change_author": true,
    "bills": true,
    "bill_hold": "approval_status",
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
    "stops_payment": "bill",
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

`POST /v1/integrations/xero/sync` (auth: Signed-in admin)

Starts a sync now instead of at the next one, which is every hour, or every 5 minutes with the payment flow on. At most once in 5 minutes: sooner answers `429 sync_rate_limited`. While a sync runs, the answer is `409 sync_in_progress`. Not connected: `409 not_connected`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/xero/sync" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "xero",
  "status": "active",
  "account_id": "4f2c9a1e-7b3d-4e8a-9c61-2d5b8f0e3a47",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "free_text_us_only",
    "bank_change_author": true,
    "bills": true,
    "bill_hold": "approval_status",
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
    "stops_payment": "bill",
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

`PUT /v1/integrations/xero/payment_flow` (auth: Signed-in admin)

On, Quarter checks open bills every 5 minutes, holds one by sending it back to awaiting approval, and approves it again once cleared. Xero refuses this for a bill with a payment on it, and Quarter reports the refusal. Off, Quarter stops writing and every hold stays where it is.

Errors: `enabled_invalid`, `production_account_in_test`, `xero_unauthorized` and `xero_forbidden`, `400`; `not_connected`, `409`; `xero_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | Yes | True to turn the payment flow on, false to turn it off. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/xero/payment_flow" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
```

Response:

```json
{
  "object": "integration",
  "provider": "xero",
  "status": "active",
  "account_id": "4f2c9a1e-7b3d-4e8a-9c61-2d5b8f0e3a47",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "free_text_us_only",
    "bank_change_author": true,
    "bills": true,
    "bill_hold": "approval_status",
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
    "stops_payment": "bill",
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

`GET /v1/integrations/xero/bills` (auth: API key, or anyone signed in)

The open bills Quarter follows, newest change first. `status` is `waiting` (not checked yet, or changed since), `held`, `rejected` or `cleared`; `failed` lists the bills with a `check_error` or `write_error`. Decide a held bill at `/v1/payment_runs/{run_id}/items/{item_id}/decision`.

Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `waiting`, `held`, `rejected`, `cleared`, `failed` or `all`, the default. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/xero/bills?status=held" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "erp_bill",
      "provider": "xero",
      "id": "9b1e4c7a-2f6d-4a3b-8e5c-1d7f0a9b6c24",
      "bill_number": "INV-0457",
      "vendor_external_id": "3c8e1f5a-9d2b-4c7e-a1f6-8b4d2e0c7a93",
      "payee_name": "Northwind Logistics",
      "amount": 18400,
      "currency": "USD",
      "due_date": "2026-10-24",
      "status": "held",
      "payment_stopped": true,
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

### Disconnect Xero

`DELETE /v1/integrations/xero` (auth: Signed-in admin)

Stops the syncs, and the payment flow with them, and wipes the credentials. Vendors already synced, and their history, stay. Holds Quarter set stay where they are in Xero.

Request:

```bash
curl -X DELETE "$QUARTER_API_URL/v1/integrations/xero" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "xero",
  "status": "disconnected",
  "account_id": "4f2c9a1e-7b3d-4e8a-9c61-2d5b8f0e3a47",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "free_text_us_only",
    "bank_change_author": true,
    "bills": true,
    "bill_hold": "approval_status",
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
    "stops_payment": "bill",
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
