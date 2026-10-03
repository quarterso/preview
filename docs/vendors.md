# Vendors and bank details

> Add the people you pay, record their bank details, and see why a change of bank details holds payments until it is confirmed.

A vendor is someone you pay. Quarter matches every payment in a run to a vendor, so the vendor list is what the checks compare against: a payee that is not on it is held as [`unknown_payee`](/docs/checks.md#unknown-payee).

## Bank details and their history

A vendor has one current set of bank details. Recording new details does not overwrite the old ones. The old details stay on file with status `replaced`, so you can always see what changed and when.

| Bank account status | Meaning |
| --- | --- |
| `unverified` | Current, and not yet confirmed with the vendor. Payments to it are held. |
| `verified` | Current, and confirmed through the vendor bank login or a call-back. `verified_method` says which: `bank_link` or `callback`. |
| `rejected` | A call-back said these details are wrong. They are no longer current. |
| `replaced` | Newer details were recorded. Kept as history. |

The vendor `status` becomes `verified` when its current details are confirmed, and `unverified` when new details are recorded. A failed call-back rejects the details but leaves the vendor status as it was. You can also set a vendor to `blocked`: every payment to it is then held as [`vendor_blocked`](/docs/checks.md#vendor-blocked), a check nobody can turn off.

## Why a change of bank details holds payments

The most common payment fraud is a message that looks like it comes from a vendor and asks you to pay a new account. So any new bank details put the vendor back to `unverified`, and payments to the new details are held as [`account_changed_recently`](/docs/checks.md#account-changed-recently) until someone confirms the change with the vendor. A run that still pays the old details is held as [`account_not_on_file`](/docs/checks.md#account-not-on-file).

Confirm the change with a [verification link](/docs/verification.md) or a [call-back](/docs/verification.md#callbacks) to a number you already had. Never confirm it with the phone number or email in the change request itself.

## How a change arrived, and the sender's domain

Each set of bank details records how the request reached you, in `request.channel`: `email`, `phone`, `portal`, `letter`, `in_person`, `netsuite` for details the [NetSuite sync](/docs/netsuite.md#who-changed) brought in, or `unknown`. The console asks this one question whenever someone records new details. Details recorded before Quarter asked say `unknown`, or `netsuite` when the sync recorded them.

For a request that came by email, send the sender's address as `request_sender`. Quarter keeps it as given, and compares its domain with the vendor's `email_domain`: the vendor's own (that domain or a subdomain of it), a lookalike, or a domain other than the vendor's. Lookalikes are found the way dnstwist finds them: letters swapped for ones that look alike, a letter left out, doubled or swapped, a key next to it, a hyphen, a different ending, or the vendor's name with a word added. Quarter also reads two free public records about the domain: when it was registered, from the RDAP service IANA lists for its ending, and its DMARC policy, from DNS. Only the domain leaves Quarter. The answer is kept in `request.signals`.

A lookup waits at most 4 seconds and is kept for a day. When a registry does not answer, the details are still recorded and the record says `unavailable`. These records add [points](/docs/checks.md#points) and warnings only while the new details are unconfirmed, and never hold a payment by themselves: the change is already held until someone confirms it. They cannot catch a request sent from the vendor's own mailbox after someone took it over, so a call-back is still what confirms a change.

## What Quarter keeps

- The routing number, in full. It names a bank, not an account.
- The account number, sealed. Quarter matches accounts by a keyed fingerprint and shows only `last4`.
- For an emailed request, the sender's address as given, kept as evidence of how the change arrived. A personal data search lists it as kept.
- Recording the same details twice changes nothing. Leading zeros do not make a different account.

## Endpoints

### Add a vendor

`POST /v1/vendors` (auth: API key)

Creates a vendor and, when you send bank details, records them as its current details with `source: "api"`. Returns the vendor with its bank details and evidence.

An `external_id` already used by another of your vendors answers `409 external_id_taken`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | The vendor name, up to 200 characters. Legal suffixes, case and punctuation are ignored when matching. |
| `email_domain` | string | No | The domain the vendor emails from, such as `harborpoint.example`. A verification code sent anywhere else is recorded as a failed check. |
| `external_id` | string | No | Your own id for the vendor, unique among your vendors. A CSV run can match payments by it. |
| `individual` | boolean | No | `true` for a person or sole proprietor rather than a business. Default `false`. The network never takes or gives facts about a person's accounts, so a report about one cannot become a consumer report. |
| `routing_number` | string | No | The 9-digit ABA routing number. Spaces are ignored. |
| `account_number` | string | No | 4 to 17 letters or digits. Spaces and dashes are ignored. Sealed at rest; never returned. |
| `holder_name` | string | No | The name on the bank account, if you have it. Used when matching payee names. |
| `request_channel` | string | No | How the request for these details reached you: `email`, `phone`, `portal`, `letter`, `in_person` or `unknown`. Default `unknown`. |
| `request_sender` | string | No | With `email` only: the address the request came from, as you have it (`Accounts <ar@harborpoint.example>` is fine). Its domain is checked; see [the sender's domain](/docs/vendors.md#sender-domain). |

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

### List vendors

`GET /v1/vendors` (auth: API key)

Vendors in name order, each with its current bank details: the last 4 digits, the status, when they were added, and `changed`, which is `true` when they replaced earlier details.

`total` counts every vendor that matches, not just this page. To read the next page, pass the `id` of the last vendor you have as `after` while `has_more` is `true`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | No | `unverified`, `verified` or `blocked`. |
| `search` | string | No | Part of a name. Matched the same way payee names are. |
| `limit` | integer | No | 1 to 1000. Default 100. |
| `after` | string | No | A vendor id. Returns the vendors after it, by name. |

Request:

```bash
curl "$QUARTER_API_URL/v1/vendors?status=verified&limit=2" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "total": 2,
  "has_more": false,
  "data": [
    {
      "id": "ven_2PwK7nTq4XmB9vLr6JcH",
      "object": "vendor",
      "name": "Cedar Ridge Supply Co.",
      "email_domain": "cedarridgesupply.example",
      "external_id": "V-0388",
      "status": "verified",
      "individual": false,
      "bank_account": {
        "last4": "1904",
        "status": "verified",
        "added_at": "2026-08-14T09:12:30.000Z",
        "changed": false
      }
    },
    {
      "id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "object": "vendor",
      "name": "Harbor Point Logistics LLC",
      "email_domain": "harborpoint.example",
      "external_id": "V-1042",
      "status": "verified",
      "individual": false,
      "bank_account": {
        "last4": "7365",
        "status": "verified",
        "added_at": "2026-10-05T13:40:12.000Z",
        "changed": false
      }
    }
  ]
}
```

### Retrieve a vendor

`GET /v1/vendors/{vendor}` (auth: API key)

The vendor with every set of bank details it ever had, newest first, and every piece of verification evidence: email codes, bank logins and call-backs, with who did it and when. Evidence is never edited or deleted.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD" \
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

### Change a vendor

`PATCH /v1/vendors/{vendor}` (auth: API key)

Changes the name, the email domain, whether the vendor is a person, or the status. Fields you leave out are kept. Marking a vendor as a person takes back what your business told the network about its accounts. Bank details change only through the bank details route below.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | The new name. |
| `email_domain` | string | No | The new email domain. |
| `individual` | boolean | No | `true` for a person or sole proprietor rather than a business. Default `false`. The network never takes or gives facts about a person's accounts, so a report about one cannot become a consumer report. |
| `status` | string | No | `blocked`, or `unverified` to lift a block. Only a signed-in admin can lift a block; anyone else, and any API key, answers `403 unblock_needs_admin`. |

Request:

```bash
curl -X PATCH "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"email_domain":"harborpointlogistics.example"}'
```

Response:

```json
{
  "id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "object": "vendor",
  "name": "Harbor Point Logistics LLC",
  "email_domain": "harborpointlogistics.example",
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

### Import a vendor list

`POST /v1/vendors/import` (auth: API key)

Loads your vendor master in one request, up to 5,000 vendors, all or nothing. Each row has the same fields as [Add a vendor](/docs/vendors.md#post-v1-vendors). Bank details from an import are recorded with `source: "import"` and start `unverified`.

A row whose `external_id` matches an existing vendor counts as `updated`: its name is kept, and bank details that differ from the current ones are recorded as a change, which holds its payments until confirmed. Every other row creates a vendor. Export your vendor list as CSV from your accounting tool and send its rows as JSON.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendors` | object[] | Yes | 1 to 5,000 vendors, each with `name` and optionally `email_domain`, `external_id`, `individual`, `routing_number`, `account_number`, `holder_name`, `request_channel`, `request_sender`. Each sender domain is looked up once, up to 50 in one import; the rest are recorded as `not_checked`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/vendors/import" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"vendors":[{"name":"Cedar Ridge Supply Co.","email_domain":"cedarridgesupply.example","external_id":"V-0388","routing_number":"102103384","account_number":"55021904"},{"name":"Bluestem Office Products","external_id":"V-0412"}]}'
```

Response:

```json
{
  "object": "vendor_import",
  "created": 2,
  "updated": 0
}
```

### Record new bank details

`POST /v1/vendors/{vendor}/bank_accounts` (auth: API key)

Records new bank details for a vendor, with `source: "manual"`. The previous details become `replaced`, the vendor becomes `unverified`, and the `vendor.bank_account_changed` [event](/docs/webhooks.md#event-types) fires. Payments to the new details are held until someone confirms them. A blocked vendor stays blocked.

Sending the details already on file changes nothing. A `request_channel` not in the list answers `400 request_channel_invalid`; a `request_sender` that is not an email address, or comes without `email`, answers `400 request_sender_invalid`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `routing_number` | string | Yes | The 9-digit ABA routing number. |
| `account_number` | string | Yes | 4 to 17 letters or digits. |
| `holder_name` | string | No | The name on the bank account. |
| `request_channel` | string | No | How the request for these details reached you: `email`, `phone`, `portal`, `letter`, `in_person` or `unknown`. Default `unknown`. |
| `request_sender` | string | No | With `email` only: the address the request came from, as you have it (`Accounts <ar@harborpoint.example>` is fine). Its domain is checked; see [the sender's domain](/docs/vendors.md#sender-domain). |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD/bank_accounts" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"routing_number":"263391271","account_number":"99300418226","holder_name":"Harbor Point Logistics","request_channel":"email","request_sender":"ar@harborpoint-logistics.example"}'
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
      "id": "ba_6NcW1rLp8TkQ3vXm9HzB",
      "object": "bank_account",
      "routing_number": "263391271",
      "last4": "8226",
      "holder_name": "Harbor Point Logistics",
      "source": "manual",
      "status": "unverified",
      "verified_at": null,
      "verified_method": null,
      "created_at": "2026-10-07T10:21:44.000Z",
      "replaced_at": null,
      "request": {
        "channel": "email",
        "sender": "ar@harborpoint-logistics.example",
        "domain": "harborpoint-logistics.example",
        "signals": {
          "domain": "harborpoint-logistics.example",
          "vendor_domain": "harborpoint.example",
          "relation": "lookalike",
          "lookalike": "added_word",
          "registration": "found",
          "registered_on": "2026-09-28",
          "dmarc": "missing",
          "checked_at": "2026-10-07T10:21:44.000Z"
        }
      },
      "changed_by": null,
      "changed_by_note": null
    },
    {
      "id": "ba_3HfJ6tWq1ZsN8kPm2RxA",
      "object": "bank_account",
      "routing_number": "091408501",
      "last4": "7365",
      "holder_name": "Harbor Point Logistics LLC",
      "source": "api",
      "status": "replaced",
      "verified_at": "2026-10-05T13:52:40.000Z",
      "verified_method": "callback",
      "created_at": "2026-10-05T13:40:12.000Z",
      "replaced_at": "2026-10-07T10:21:44.000Z",
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
