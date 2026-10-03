# NetSuite

> Bring your NetSuite vendors and their bank details into Quarter every hour, and check every open vendor bill with a hold that NetSuite itself enforces.

> **Note:** The NetSuite connection and the payment flow are built and tested against a simulated NetSuite account. They are in testing before the first pilot and have not yet run against a real NetSuite account.

Quarter reads your vendors and their primary bank details from NetSuite every hour. Bank details that change in NetSuite are recorded in Quarter like any other change, so the next payment to them is held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms them with the vendor.

With the [payment flow](#payment-flow) on, Quarter also checks every open vendor bill and writes the result onto the bill, using NetSuite's own Payment Hold. That is the only thing Quarter writes. Until you turn the payment flow on, Quarter only reads.

## What a sync does

- Each NetSuite vendor becomes a Quarter vendor whose `external_id` is the NetSuite id. A vendor already carrying that id is adopted, not duplicated. A vendor is created only while it is active in NetSuite.
- Bank details are added only when NetSuite's differ from the ones last synced. A change you rejected in Quarter is not added back every hour.
- A vendor deleted or made inactive in NetSuite is marked, with an entry in its audit trail. The vendor and its history stay in Quarter.
- Each sync fires `integration.synced` with the counts, or `integration.failed` with the reason. See [event types](/docs/webhooks.md#event-types).
- A project stays with the NetSuite account its vendors came from. Connect another account to another project.

### Who changed bank details in NetSuite

When a vendor's bank details changed, the sync reads the system notes of its Entity Bank Details record and takes the employee who made the latest change to the account or routing number, from a day before the previous sync on. A note on any other field never names who changed the details. Quarter keeps the employee's NetSuite id with the change. Quarter matches that employee to a member of your organization by email and records them as the person who changed the details. That person then cannot confirm the details, approve a payment to them, or release one alone for 90 days, the same rules as for a change made in Quarter.

When NetSuite names no employee (a script, an import or the system), names one without an email, or shows no note, the person is recorded as unknown with the reason, and those rules cannot apply to anyone. A NetSuite role sees only the system notes NetSuite lets it see: give Quarter's role permission to read system notes and employees, or every change made in NetSuite stays unknown. Tested against a simulated NetSuite account; not yet run against a real one.

## Connecting

Connect NetSuite from the console's Integrations settings, as an admin. Quarter uses OAuth 2.0 client credentials with a certificate. The credentials are tested against NetSuite before they are saved, then sealed. They are never returned, logged or put in the audit log, and they are wiped on disconnect.

1. In Quarter, create a certificate. Quarter makes an EC P-256 key pair and a certificate valid for 2 years. It keeps the private key sealed and never shows it, so no copy sits on a laptop or in a download folder.
2. Download the certificate and upload it in NetSuite under Setup > Integration > OAuth 2.0 Client Credentials (M2M) Setup, for the integration record, an employee and the role.
3. Connect with the account id, the integration's client id and the certificate id NetSuite shows. Quarter uses its newest certificate, or the one you name in `certificate`.

Admins and security contacts are emailed 60 days and again 14 days before the certificate in use expires. To replace it, create a new certificate, upload it in NetSuite (NetSuite accepts several at once), and connect again with its certificate id: the old one is retired and its private key deleted. A key pair you made yourself still works, sent once as `private_key`, but a copy of it stays wherever it was made.

These routes take a signed-in admin's session, never an API key: an API key answers `403 session_required`. A test project can connect Quarter's sample account of four vendors with `sandbox: true`. A live project refuses NetSuite sandbox accounts.

## The payment flow

A vendor bill with Payment Hold checked cannot be paid in NetSuite: the Make Payment button is gone, the bill is left off the Pay Bills page, and Electronic Bank Payments does not process it. Oracle's NetSuite help says so on its page Entering a Vendor Bill. Quarter uses that box, so a held bill is stopped by NetSuite itself, before any payment file exists.

1. A workflow you add holds every new bill, with Quarter's field saying `Held by Quarter until checked`. It holds a bill again when its amount or vendor changes.
2. Every 5 minutes, after the vendor sync, Quarter reads every open, approved bill with an unpaid amount, with its vendor's primary bank details. Bills that are new or changed since their check are checked as one [payment run](/docs/payment-runs.md) of format `netsuite`. Each payment carries the bill's internal id as `external_id`, and the bill number as its reference.
3. Quarter writes each result to the bill. A clear bill comes off hold, and Quarter's field says it was cleared, with a link to the run. A held bill stays on hold, and the field says why and where to decide.
4. A person approves or rejects the held payment in Quarter, signed in, never with an API key. Two different people approve at or above your two-person threshold. Quarter then takes the hold off an approved bill and keeps it on a rejected one.
5. A bill that changes after its check, in amount, vendor or bank details, is checked again in a new run and held again if it needs to be. The first check is closed as rejected, with the reason.

### What it cannot stop

- Someone with edit access to bills in NetSuite can clear Payment Hold and pay at once. Quarter puts the hold back at the next sync and sends `integration.hold_overridden`, but a payment made in between is made. A bill that leaves the open bills while Quarter holds it is recorded in the audit log, since it was paid, voided or deleted in NetSuite.
- Payments that do not come from a vendor bill: checks written directly, journal entries, and payments keyed in your bank portal.
- A bank change made on the vendor in NetSuite after a bill was cleared, or a vendor blocked in Quarter after its bill was cleared, holds the bill again at the next sync, at most 5 minutes later. Until then NetSuite can still pay it. Sync now before a payment run to close that gap, or have your NetSuite administrator set Payment Hold on the open bills of a vendor whose bank details change, with a workflow or script on Entity Bank Details.
- Without the workflow, a new bill can be paid before Quarter first sees it. Quarter counts bills that arrive without a hold and shows the count in the console.
- A payment file Electronic Bank Payments already generated. Quarter acts on the bill, before the file.

### Checks and Positive Pay

NetSuite's own Positive Pay payment format has templates for three banks only: Bank of America Merrill Lynch, Royal Bank of Canada and Silicon Valley Bank controlled disbursement accounts (Oracle NetSuite Help, Positive Pay Payment Format). Quarter writes the issued-check file for any bank whose layout is a delimited or fixed-width file of the fields it knows: check number, amount, issue date, payee, account and a void marker. Export the checks you are about to print from NetSuite as a CSV and upload it as a [check run](/docs/payment-runs.md). Quarter checks each check, and at release writes the file in a preset layout, Jack Henry Banno's among them, or in [your bank's own layout](/docs/releases.md#custom-layout). You upload the file to your bank; Quarter never sends it.

### When something fails

- Quarter only takes a hold off a bill it checked and found clear, or a person approved. A bill Quarter could not check stays on hold, and its field says why.
- If NetSuite cannot be read, Quarter writes nothing and every hold stays. If a write fails, the bill keeps what NetSuite shows: an approved bill stays on hold until the write goes through. Quarter tries again at every sync and sends `integration.write_failed` once.
- Quarter never lifts a hold it did not put on. If someone holds a bill Quarter cleared, for a dispute for example, Quarter leaves the hold on and changes only its own field.
- Syncing the same bills again changes nothing: no new run and no new write.
- A test project writes only to a NetSuite sandbox account or to Quarter's sample account, never to a production account. A live project refuses sandbox accounts.

### Setting it up in NetSuite

Your NetSuite administrator does this once, after the [connection](#connecting) works. Then an admin turns the payment flow on in the console under Settings, Integrations. Quarter reads one bill with its field before it accepts, so a missing step is refused with the reason.

1. Give Quarter's role **Transactions > Bills** at **Edit**, and **Lists > Currency** at **View**. NetSuite has no field-level edit permission, so Edit lets the role change any field on a bill. Quarter's code writes only Payment Hold and its own field, and each write is in the bill's system notes and Quarter's audit log. Vendors and bank details stay view only.
2. Add the custom transaction body field `custbody_quarter_check`: free-form text, 300 characters, applied to Purchase, shown inline so people cannot edit it. Deploy the object definition below with SuiteCloud Development Framework, or create it by hand under Customization > Lists, Records, & Fields > Transaction Body Fields.
3. Add a workflow on Transaction, sub-type Bill, triggered on create and on update, before record submit. Give it one state with two Set Field Value actions: Payment Hold checked, and Quarter check set to `Held by Quarter until checked`. On update, run the actions only when Total or Vendor differs from the old record's value.
4. Turn the payment flow on in the console. Leave Payment Hold to Quarter: clearing it in NetSuite is reported.

Objects/custbody_quarter_check.xml:

```shell
<transactionbodycustomfield scriptid="custbody_quarter_check">
  <label>Quarter check</label>
  <description>What Quarter decided about this bill, written by Quarter.</description>
  <fieldtype>TEXT</fieldtype>
  <maxlength>300</maxlength>
  <storevalue>T</storevalue>
  <displaytype>INLINE</displaytype>
  <accesslevel>2</accesslevel>
  <searchlevel>2</searchlevel>
  <showinlist>T</showinlist>
  <bodypurchase>T</bodypurchase>
  <subtab>TRANSACTIONMAIN</subtab>
</transactionbodycustomfield>
```

Turning the payment flow off stops every write and leaves every hold where it is. Bills Quarter held stay on hold until someone clears them in NetSuite.

## Endpoints

### Connect NetSuite

`PUT /v1/integrations/netsuite` (auth: Signed-in admin)

Tests the credentials against NetSuite, saves them sealed and starts the first sync. Nothing is saved when NetSuite refuses them.

Without `private_key`, the connection uses the newest certificate Quarter made for the project, or the one named in `certificate`; with none, it answers `409 certificate_required`.

Errors: `account_id_invalid`, `client_id_invalid`, `certificate_id_invalid`, `private_key_invalid`, `sandbox_invalid`, `sandbox_test_only`, `sandbox_account_in_live`, `netsuite_unauthorized`, `netsuite_forbidden`, `netsuite_bank_details_unavailable`, `netsuite_query_failed` and `netsuite_response_too_large`, all `400`; `netsuite_account_changed`, `409`; `netsuite_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `account_id` | string | Yes | Your NetSuite account id, such as `1234567`, or `1234567_SB1` for a sandbox (test projects only). |
| `client_id` | string | Yes | The integration record's client id. |
| `certificate_id` | string | Yes | The certificate id NetSuite shows for the uploaded certificate, in the OAuth 2.0 client credentials mapping. |
| `certificate` | string | No | The id of a certificate Quarter made. Default: the newest. |
| `private_key` | string | No | Only for a key pair you made yourself: its PEM private key, RSA of 3072 bits or more, or EC P-256. Leave it out to use the certificate Quarter made. |
| `sandbox` | boolean | No | Test projects only: connect Quarter's sample account instead. No other field is needed. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/netsuite" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"account_id":"1234567","client_id":"<client id>","certificate_id":"<certificate id>"}'
```

Response:

```json
{
  "object": "integration",
  "provider": "netsuite",
  "status": "active",
  "account_id": "1234567",
  "sandbox": false,
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-05T15:20:04.000Z",
  "last_synced_at": null,
  "next_sync_at": "2026-10-05T15:20:04.000Z",
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
  "payment_flow": {
    "enabled": false,
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
  },
  "certificates": [
    {
      "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
      "object": "netsuite_certificate",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
      "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
      "not_before": "2026-10-05T15:12:40.000Z",
      "not_after": "2028-10-04T15:12:40.000Z",
      "days_left": 729,
      "in_use": true,
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-05T15:12:40.000Z"
    }
  ]
}
```

### Create a certificate

`POST /v1/integrations/netsuite/certificates` (auth: Signed-in admin)

Makes an EC P-256 key pair and a self-signed certificate valid for 2 years, and keeps the private key sealed. The answer has the certificate to upload in NetSuite, never the key. The certificate in use keeps working until you connect with the new one.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/netsuite/certificates" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
  "object": "netsuite_certificate",
  "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
  "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
  "not_before": "2026-10-05T15:12:40.000Z",
  "not_after": "2028-10-04T15:12:40.000Z",
  "days_left": 729,
  "in_use": false,
  "created_by": "dana@yourcompany",
  "created_at": "2026-10-05T15:12:40.000Z"
}
```

### Read the connection

`GET /v1/integrations/netsuite` (auth: Signed-in admin)

The connection, its last sync, the vendors that failed to save and the payment flow with its bill counts. Never the credentials.

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/netsuite" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "netsuite",
  "status": "active",
  "account_id": "1234567",
  "sandbox": false,
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-05T15:20:04.000Z",
  "last_synced_at": "2026-10-05T15:20:31.000Z",
  "next_sync_at": "2026-10-05T15:35:31.000Z",
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
  "payment_flow": {
    "enabled": true,
    "last_synced_at": "2026-10-05T15:20:33.000Z",
    "last_error": null,
    "last_sync": {
      "open": 3,
      "checked": 3,
      "rechecked": 0,
      "check_failed": 0,
      "written": 3,
      "write_failed": 0,
      "overridden": 0,
      "unheld_on_arrival": 0,
      "closed": 0,
      "closed_while_held": 0
    },
    "bills": {
      "open": 3,
      "waiting": 0,
      "held": 1,
      "rejected": 0,
      "cleared": 2,
      "check_failed": 0,
      "write_failed": 0
    }
  },
  "certificates": [
    {
      "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
      "object": "netsuite_certificate",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
      "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
      "not_before": "2026-10-05T15:12:40.000Z",
      "not_after": "2028-10-04T15:12:40.000Z",
      "days_left": 729,
      "in_use": true,
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-05T15:12:40.000Z"
    }
  ]
}
```

### Sync now

`POST /v1/integrations/netsuite/sync` (auth: Signed-in admin)

Starts a sync now instead of at the next one, which is every hour, or every 5 minutes with the payment flow on. At most once in 5 minutes: sooner answers `429 sync_rate_limited`. While a sync runs, the answer is `409 sync_in_progress`. Not connected: `409 not_connected`.

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/integrations/netsuite/sync" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "netsuite",
  "status": "active",
  "account_id": "1234567",
  "sandbox": false,
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-05T15:20:04.000Z",
  "last_synced_at": "2026-10-05T15:20:31.000Z",
  "next_sync_at": "2026-10-05T15:31:10.000Z",
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
  "payment_flow": {
    "enabled": false,
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
  },
  "certificates": [
    {
      "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
      "object": "netsuite_certificate",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
      "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
      "not_before": "2026-10-05T15:12:40.000Z",
      "not_after": "2028-10-04T15:12:40.000Z",
      "days_left": 729,
      "in_use": true,
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-05T15:12:40.000Z"
    }
  ]
}
```

### Turn the payment flow on or off

`PUT /v1/integrations/netsuite/payment_flow` (auth: Signed-in admin)

On, Quarter checks open bills every 5 minutes and writes its result to each one. Off, Quarter stops writing and leaves every hold where it is. Before turning it on, Quarter reads one bill with Payment Hold and its own field.

Errors: `enabled_invalid`, `production_account_in_test`, `netsuite_field_missing`, `netsuite_unauthorized` and `netsuite_forbidden`, all `400`; `not_connected`, `409`; `netsuite_unreachable`, `503`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | boolean | Yes | True to turn the payment flow on, false to turn it off. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/integrations/netsuite/payment_flow" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"enabled":true}'
```

Response:

```json
{
  "object": "integration",
  "provider": "netsuite",
  "status": "active",
  "account_id": "1234567",
  "sandbox": false,
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-05T15:20:04.000Z",
  "last_synced_at": "2026-10-05T15:20:31.000Z",
  "next_sync_at": "2026-10-05T15:35:31.000Z",
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
  "payment_flow": {
    "enabled": true,
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
  },
  "certificates": [
    {
      "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
      "object": "netsuite_certificate",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
      "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
      "not_before": "2026-10-05T15:12:40.000Z",
      "not_after": "2028-10-04T15:12:40.000Z",
      "days_left": 729,
      "in_use": true,
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-05T15:12:40.000Z"
    }
  ]
}
```

### List the open bills

`GET /v1/integrations/netsuite/bills` (auth: API key, or anyone signed in)

The open bills Quarter follows, newest change first. `status` is `waiting` (not checked yet, or changed since), `held`, `rejected` or `cleared`; `failed` lists the bills with a `check_error` or `write_error`. Decide a held bill at `/v1/payment_runs/{run_id}/items/{item_id}/decision`.

Errors: `status_invalid` and `limit_invalid`, `400`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `waiting`, `held`, `rejected`, `cleared`, `failed` or `all`, the default. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/integrations/netsuite/bills?status=held" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "object": "netsuite_bill",
      "id": "48213",
      "bill_number": "BILL-2207",
      "vendor_external_id": "1187",
      "payee_name": "Northwind Logistics",
      "amount": 18400,
      "currency": "USD",
      "due_date": "2026-10-09",
      "status": "held",
      "held_in_netsuite": true,
      "run_id": "run_8Hq2LmZx4TbN0cVwYp3R",
      "item_id": "itm_Qe7Rt2Yu9Io1Pa4Sd6Fg",
      "check_error": null,
      "write_error": null,
      "written_at": "2026-10-05T15:20:33.000Z",
      "updated_at": "2026-10-05T15:20:33.000Z"
    }
  ]
}
```

### Disconnect NetSuite

`DELETE /v1/integrations/netsuite` (auth: Signed-in admin)

Stops the syncs, and the payment flow with them, and wipes the credentials. Vendors already synced, and their history, stay. Bills Quarter held stay on hold in NetSuite.

Request:

```bash
curl -X DELETE "$QUARTER_API_URL/v1/integrations/netsuite" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "integration",
  "provider": "netsuite",
  "status": "disconnected",
  "account_id": "1234567",
  "sandbox": false,
  "connected_by": "dana@yourcompany",
  "connected_at": "2026-10-05T15:20:04.000Z",
  "last_synced_at": "2026-10-05T15:20:31.000Z",
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
  "payment_flow": {
    "enabled": false,
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
  },
  "certificates": [
    {
      "id": "nsc_4TqW8nLx2RcV6mPz9KdB",
      "object": "netsuite_certificate",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIBijCCATCgAwIBAgIQ...\n-----END CERTIFICATE-----\n",
      "fingerprint_sha256": "6316c24235f036327e0b0d6a4f1c8e2b9a7d5c3e1f0a9b8c7d6e5f4a3b2c1d0e",
      "not_before": "2026-10-05T15:12:40.000Z",
      "not_after": "2028-10-04T15:12:40.000Z",
      "days_left": 729,
      "in_use": true,
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-05T15:12:40.000Z"
    }
  ]
}
```
