# Sage Intacct

> Bring your Sage Intacct vendors and their ACH bank details into Quarter every hour, and hold suspicious bills with Sage Intacct's own On hold box.

> **Note:** The Sage Intacct connection is built and tested against a simulated Sage Intacct company. It has not yet run against a real one.

Sage Intacct is the closest of these platforms to NetSuite: vendors carry ACH bank details, and bills have a real hold. With the payment flow on, Quarter puts suspicious bills on hold and writes why in a custom field you add.

## What Quarter controls and what it does not

| In Sage Intacct | Quarter |
| --- | --- |
| Vendors | Read every hour, changes only |
| Vendor bank details | Read: the ACH routing and account number on the vendor, US only |
| Who changed bank details | Not known: Sage Intacct records who last changed the vendor, not which field, so Quarter names no one |
| Bills awaiting payment | Read: posted and partly paid bills with an amount due |
| Hold one bill | Yes: the bill's On hold box |
| Block a vendor | Sage Intacct has a vendor hold. Quarter does not use it: it holds bills |
| Quarter's note on the bill | Yes: the custom field `QUARTER_CHECK`, which you add |

## Connecting

Quarter signs in to the Sage Intacct XML API as a Web Services sender and a Web Services user. Your Sage Intacct administrator does this once:

1. Authorise the sender id under Company > Security > Web Services authorizations. Without it Sage Intacct answers `intacct_sender_unauthorized`.
2. Create a Web Services user for Quarter, with permission to read Accounts Payable vendors and bills, and to edit bills once you turn the payment flow on.
3. Add a custom text field on AP bills with the integration name `QUARTER_CHECK`, and give the Web Services user access to it. Quarter writes its result there.
4. Connect with the sender id and password, the company id, and the user id and password. Quarter tests them before it saves anything, then seals them. They are never returned, logged or put in the audit log, and are wiped on disconnect.

## What a sync does

- Every hour from connect, or every 5 minutes with the payment flow on, Quarter reads the Sage Intacct vendors changed since the last sync. Each becomes a Quarter vendor whose `external_id` is the Sage Intacct id.
- Bank details are taken only where the platform has them, and only US details: a 9-digit routing number and an account number. Anything else is left unread and noted on the vendor, in `notes` on the connection.
- A bank change becomes new, unverified details with `request.channel` `erp` and `request.provider` `intacct`, so the next payment to them is held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms them with the vendor.
- A project stays with the company its vendors came from. Connect another company to another project: a different one answers `409 account_changed`.

## The payment flow

With the payment flow on, every 5 minutes after the vendor sync, Quarter reads the bills awaiting payment. Bills that are new or changed since their check are checked as one [payment run](/docs/payment-runs.md) of format `erp`, with `erp_provider` naming the platform. A person decides each held payment in Quarter, signed in. Quarter lifts a hold once the bill is clear or approved and reads the same when read again. A bill that changes after its check, in amount, vendor or bank details, is checked again. A run of bills cannot be cancelled (`409 erp_run`): reject the payments that should not be paid.

- Quarter keeps a record of the holds it set and lifts only those. A hold that was already on when Quarter first wrote is never claimed.
- A hold Quarter set that someone cleared is set again at the next sync and reported as `integration.hold_overridden`. A write that fails is retried at every sync and reported once as `integration.write_failed`.
- Turning the payment flow off stops every write and leaves every hold where it is.
- These routes take a signed-in admin, never an API key: an API key answers `403 session_required`. Only the bill list is open to API keys and anyone signed in.

## What a hold looks like

- A held bill is put **On hold**, and `QUARTER_CHECK` says why and where to decide. Once a person approves it in Quarter, or it is clear, Quarter takes the hold off and the field says it was cleared.
- Sage Intacct needs the due date on every bill update, so Quarter reads it first and sends it back unchanged.
- Someone who can edit bills can take the hold off by hand. Quarter puts it back at the next sync and reports `integration.hold_overridden`, but a payment made in between is made.
- A test project may turn the payment flow on only for a company id ending in `-sandbox`.

> **Warning:** Not yet checked against a real Sage Intacct company: whether the ACH account number comes back masked, whether the amount due and the last change time are readable as Quarter expects, and the `-sandbox` naming of test companies.

## Endpoints

### Connect Sage Intacct

`PUT /v1/integrations/intacct` (auth: Signed-in admin)

Tests the credentials against Sage Intacct, saves them sealed and starts the first sync. Nothing is saved when Sage Intacct refuses them. The answer shows `coverage`: what Quarter reads and controls through this platform.

Errors: `sender_id_invalid`, `sender_password_invalid`, `company_id_invalid`, `user_id_invalid`, `user_password_invalid`, `intacct_sender_unauthorized`, `intacct_unauthorized`, `intacct_forbidden`, `intacct_query_failed` and `intacct_response_too_large`, all `400`; `account_changed`, `409`; `intacct_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `sender_id` | string | Yes | The Web Services sender id authorised in the company. |
| `sender_password` | string | Yes | The sender's password. |
| `company_id` | string | Yes | Your Sage Intacct company id. |
| `user_id` | string | Yes | A Web Services user with Accounts Payable vendors and bills. |
| `user_password` | string | Yes | The Web Services user's password. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/intacct" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"sender_id":"<sender id>","sender_password":"<sender password>","company_id":"<company id>","user_id":"<web services user>","user_password":"<user password>"}'
```

Response:

```json
{
  "object": "integration",
  "provider": "intacct",
  "status": "active",
  "account_id": "lakeshore-fab",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "ach",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "on_hold",
    "vendor_block": "on_hold"
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

`GET /v1/integrations/intacct` (auth: Signed-in admin)

The connection, its coverage, its last sync, the vendors that failed to save, `notes` on what a sync left out of a vendor (such as bank details that are not a US account), and the payment flow with its bill counts. Never the credentials.

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/intacct" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "intacct",
  "status": "active",
  "account_id": "lakeshore-fab",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "ach",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "on_hold",
    "vendor_block": "on_hold"
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

`POST /v1/integrations/intacct/sync` (auth: Signed-in admin)

Starts a sync now instead of at the next one, which is every hour, or every 5 minutes with the payment flow on. At most once in 5 minutes: sooner answers `429 sync_rate_limited`. While a sync runs, the answer is `409 sync_in_progress`. Not connected: `409 not_connected`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/intacct/sync" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "intacct",
  "status": "active",
  "account_id": "lakeshore-fab",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "ach",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "on_hold",
    "vendor_block": "on_hold"
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

`PUT /v1/integrations/intacct/payment_flow` (auth: Signed-in admin)

On, Quarter checks open bills every 5 minutes and writes each bill's On hold box and Quarter's `QUARTER_CHECK` field. Before turning it on, Quarter reads one bill with both fields. Off, Quarter stops writing and every hold stays where it is.

Errors: `enabled_invalid`, `production_account_in_test`, `intacct_field_missing`, `intacct_unauthorized` and `intacct_forbidden`, `400`; `not_connected`, `409`; `intacct_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | Yes | True to turn the payment flow on, false to turn it off. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/intacct/payment_flow" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
```

Response:

```json
{
  "object": "integration",
  "provider": "intacct",
  "status": "active",
  "account_id": "lakeshore-fab",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "ach",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "on_hold",
    "vendor_block": "on_hold"
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

`GET /v1/integrations/intacct/bills` (auth: API key, or anyone signed in)

The open bills Quarter follows, newest change first. `status` is `waiting` (not checked yet, or changed since), `held`, `rejected` or `cleared`; `failed` lists the bills with a `check_error` or `write_error`. Decide a held bill at `/v1/payment_runs/{run_id}/items/{item_id}/decision`.

Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `waiting`, `held`, `rejected`, `cleared`, `failed` or `all`, the default. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/intacct/bills?status=held" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "erp_bill",
      "provider": "intacct",
      "id": "48213",
      "bill_number": "BILL-2207",
      "vendor_external_id": "V-1187",
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

### Disconnect Sage Intacct

`DELETE /v1/integrations/intacct` (auth: Signed-in admin)

Stops the syncs, and the payment flow with them, and wipes the credentials. Vendors already synced, and their history, stay. Holds Quarter set stay where they are in Sage Intacct.

Request:

```bash
curl -X DELETE "$QUARTER_API_URL/v1/integrations/intacct" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "intacct",
  "status": "disconnected",
  "account_id": "lakeshore-fab",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "ach",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "on_hold",
    "vendor_block": "on_hold"
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
