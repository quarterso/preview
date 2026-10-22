# Business Central

> Check every open purchase invoice in Microsoft Dynamics 365 Business Central, and block payments to a vendor while any of its invoices is held.

> **Note:** The Business Central connection is built and tested against a simulated Business Central company. It has not yet run against a real one.

> **Warning:** Business Central's API has no hold on a single invoice. Quarter's hold blocks every payment to the vendor, not just the held invoice, until no invoice of that vendor is held.

## What Quarter controls and what it does not

| In Business Central | Quarter |
| --- | --- |
| Vendors | Read every hour, changes only |
| Vendor bank details | Not read: API v2.0 does not show them |
| Who changed bank details | Not known: the API has no change log |
| Open purchase invoices | Read. The amount is the invoice total: the API shows no amount left after a part payment |
| Hold one invoice | Not possible through the API |
| Block a vendor | Yes: the vendor's Blocked field set to Payment |
| Quarter's note on the invoice | Not written: there is no field for it |

Since bank details are not in the API, a Business Central payment cannot be held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) from a change made there. Record bank changes in Quarter, or check each payment with [payment checks](/docs/payment-checks.md) where it leaves.

## Connecting

Quarter signs in as a Microsoft Entra app with client credentials, as Microsoft's page Using Service to Service Authentication describes. Your administrator does this once:

1. In the Microsoft Entra admin center, register an application. Copy its **Application (client) ID**.
2. Under **Certificates & secrets**, add a new client secret and copy its value. Entra shows it only once.
3. Under **API permissions**, add **Dynamics 365 Business Central**, **Application permissions**, **API.ReadWrite.All**, and grant admin consent for your tenant.
4. In Business Central, open the **Microsoft Entra Applications** page, add a new card with the client id, and set **State** to **Enabled**.
5. Assign the app permission sets that read vendors and purchase invoices and, for the payment flow, modify vendors. Business Central does not let an app have SUPER.
6. Connect with the tenant id, environment name, company id, client id and secret. Quarter tests them before it saves anything, then seals them. They are never returned, logged or put in the audit log, and are wiped on disconnect.

## What a sync does

- Every hour from connect, or every 5 minutes with the payment flow on, Quarter reads the Business Central vendors changed since the last sync. Each becomes a Quarter vendor whose `external_id` is the Business Central id.
- Bank details are taken only where the platform has them, and only US details: a 9-digit routing number and an account number. Anything else is left unread and noted on the vendor, in `notes` on the connection.
- A bank change becomes new, unverified details with `request.channel` `erp` and `request.provider` `businesscentral`, so the next payment to them is held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms them with the vendor.
- A project stays with the company its vendors came from. Connect another company to another project: a different one answers `409 account_changed`.

## The payment flow

With the payment flow on, every 5 minutes after the vendor sync, Quarter reads the bills awaiting payment. Bills that are new or changed since their check are checked as one [payment run](/docs/payment-runs.md) of format `erp`, with `erp_provider` naming the platform. A person decides each held payment in Quarter, signed in. Quarter lifts a hold once the bill is clear or approved and reads the same when read again. A bill that changes after its check, in amount, vendor or bank details, is checked again. A run of bills cannot be cancelled (`409 erp_run`): reject the payments that should not be paid.

- Quarter keeps a record of the holds it set and lifts only those. A hold that was already on when Quarter first wrote is never claimed.
- A hold Quarter set that someone cleared is set again at the next sync and reported as `integration.hold_overridden`. A write that fails is retried at every sync and reported once as `integration.write_failed`.
- Turning the payment flow off stops every write and leaves every hold where it is.
- These routes take a signed-in admin, never an API key: an API key answers `403 session_required`. Only the bill list is open to API keys and anyone signed in.

## What a hold looks like

- While any open invoice of a vendor is held, the vendor's **Blocked** field is **Payment**. No payment to that vendor can be posted, for any invoice.
- Quarter clears the block only if Quarter set it, once no held invoice of that vendor remains and every one of its invoices still reads as checked. A block someone else set stays, and a vendor blocked for **All** is left alone.
- Someone who can edit vendors can clear the block by hand. Quarter sets it again at the next sync and reports `integration.hold_overridden`, but a payment made in between is made.
- A test project may turn the payment flow on for any environment other than `Production`.

Bank details and holds on single ledger entries would need the vendor bank account page (page 426) and the vendor ledger entries published as web services, or a Quarter extension. Neither is built.

## Endpoints

### Connect Business Central

`PUT /v1/integrations/businesscentral` (auth: Signed-in admin)

Tests the credentials against Business Central, saves them sealed and starts the first sync. Nothing is saved when Business Central refuses them. The answer shows `coverage`: what Quarter reads and controls through this platform.

Errors: `tenant_id_invalid`, `environment_invalid`, `company_id_invalid`, `client_id_invalid`, `client_secret_invalid`, `businesscentral_unauthorized`, `businesscentral_forbidden`, `businesscentral_query_failed` and `businesscentral_response_too_large`, all `400`; `account_changed`, `409`; `businesscentral_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tenant_id` | string | Yes | The Microsoft Entra tenant id. |
| `environment` | string | Yes | The environment name, such as `Production` or `Sandbox`. |
| `company_id` | string | Yes | The company id from Business Central's companies endpoint. |
| `client_id` | string | Yes | The application (client) id of the Entra app. |
| `client_secret` | string | Yes | A client secret of the Entra app. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/businesscentral" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"tenant_id":"<tenant id>","environment":"Production","company_id":"<company id>","client_id":"<client id>","client_secret":"<client secret>"}'
```

Response:

```json
{
  "object": "integration",
  "provider": "businesscentral",
  "status": "active",
  "account_id": "6b2d9f4e-1a7c-4e3b-9d58-0c3f7a2e8b61/Production/8e4a1c6f-3b9d-4f2a-a7e5-5d0c9b3f1e28",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "blocked_payment"
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
    "stops_payment": "vendor",
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

`GET /v1/integrations/businesscentral` (auth: Signed-in admin)

The connection, its coverage, its last sync, the vendors that failed to save, `notes` on what a sync left out of a vendor (such as bank details that are not a US account), and the payment flow with its bill counts. Never the credentials.

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/businesscentral" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "businesscentral",
  "status": "active",
  "account_id": "6b2d9f4e-1a7c-4e3b-9d58-0c3f7a2e8b61/Production/8e4a1c6f-3b9d-4f2a-a7e5-5d0c9b3f1e28",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "blocked_payment"
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
    "stops_payment": "vendor",
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

`POST /v1/integrations/businesscentral/sync` (auth: Signed-in admin)

Starts a sync now instead of at the next one, which is every hour, or every 5 minutes with the payment flow on. At most once in 5 minutes: sooner answers `429 sync_rate_limited`. While a sync runs, the answer is `409 sync_in_progress`. Not connected: `409 not_connected`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/businesscentral/sync" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "businesscentral",
  "status": "active",
  "account_id": "6b2d9f4e-1a7c-4e3b-9d58-0c3f7a2e8b61/Production/8e4a1c6f-3b9d-4f2a-a7e5-5d0c9b3f1e28",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "blocked_payment"
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
    "stops_payment": "vendor",
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

`PUT /v1/integrations/businesscentral/payment_flow` (auth: Signed-in admin)

On, Quarter checks open purchase invoices every 5 minutes and blocks payments to a vendor while any of its invoices is held. It clears only a block it set, once none of that vendor's invoices is held. Off, Quarter stops writing and every block stays where it is.

Errors: `enabled_invalid`, `production_account_in_test`, `businesscentral_unauthorized` and `businesscentral_forbidden`, `400`; `not_connected`, `409`; `businesscentral_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | Yes | True to turn the payment flow on, false to turn it off. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/businesscentral/payment_flow" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
```

Response:

```json
{
  "object": "integration",
  "provider": "businesscentral",
  "status": "active",
  "account_id": "6b2d9f4e-1a7c-4e3b-9d58-0c3f7a2e8b61/Production/8e4a1c6f-3b9d-4f2a-a7e5-5d0c9b3f1e28",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "blocked_payment"
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
    "stops_payment": "vendor",
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

`GET /v1/integrations/businesscentral/bills` (auth: API key, or anyone signed in)

The open bills Quarter follows, newest change first. `status` is `waiting` (not checked yet, or changed since), `held`, `rejected` or `cleared`; `failed` lists the bills with a `check_error` or `write_error`. Decide a held bill at `/v1/payment_runs/{run_id}/items/{item_id}/decision`.

Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `waiting`, `held`, `rejected`, `cleared`, `failed` or `all`, the default. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/businesscentral/bills?status=held" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "erp_bill",
      "provider": "businesscentral",
      "id": "2f7c1a9e-4b6d-4e8f-a3c5-9d1e7b0f6a42",
      "bill_number": "108204",
      "vendor_external_id": "5a3e8c1f-7d2b-4f9a-b6e4-1c0d8a7f3e95",
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

### Disconnect Business Central

`DELETE /v1/integrations/businesscentral` (auth: Signed-in admin)

Stops the syncs, and the payment flow with them, and wipes the credentials. Vendors already synced, and their history, stay. Holds Quarter set stay where they are in Business Central.

Request:

```bash
curl -X DELETE "$QUARTER_API_URL/v1/integrations/businesscentral" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "businesscentral",
  "status": "disconnected",
  "account_id": "6b2d9f4e-1a7c-4e3b-9d58-0c3f7a2e8b61/Production/8e4a1c6f-3b9d-4f2a-a7e5-5d0c9b3f1e28",
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-21T15:20:04.000Z",
  "coverage": {
    "vendors": true,
    "bank_details": "none",
    "bank_change_author": false,
    "bills": true,
    "bill_hold": "none",
    "vendor_block": "blocked_payment"
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
    "stops_payment": "vendor",
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
