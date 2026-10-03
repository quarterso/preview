# Confirming bank details

> Two ways to confirm a vendor's bank details: a link where the vendor logs in to their own bank, or a recorded call-back to a number you already had.

New bank details hold payments until someone confirms them with the vendor. There are two ways: a [verification link](/docs/verification.md#verification-links), where the vendor logs in to their own bank, or a [call-back](/docs/verification.md#callbacks) to a phone number you already had. Either one marks the details `verified`. Never confirm a change with the phone number or email in the change request itself.

## Verification links

A verification link asks the vendor to prove that the bank details you have on file are theirs. You create the link, the vendor opens it, confirms a code sent to their email, and logs in to their own bank through Plaid. If the bank returns the same account and the owner name matches the vendor, the details become `verified` and payments to them stop being held.

## Why a bank login proves control

Someone who sends you fake bank details can also answer an email or a phone call from the change request. They cannot log in to the real vendor's bank account. When the vendor logs in, the bank itself returns the account numbers and the owner name. Quarter checks two things: one of the returned accounts is exactly the account on file, and the owner name is close to the vendor name (a score of 0.8 or more, after ignoring case, punctuation and suffixes such as LLC).

Quarter never sees the vendor's bank password. Plaid handles the login and returns the account details.

## Why the code goes to the contact email you set

The email code goes only to the `contact_email` you gave when you created the link. The person on the page cannot change it; the page shows it masked. Choose an address on the vendor's known email domain, which is the `email_domain` on the vendor. If the contact email is not on that domain, the code step still works, but the evidence is recorded with `result: "fail"` so a reviewer sees it.

Email alone never verifies anything. Most of this fraud starts in an email inbox, so the code step only shows the person controls the contact address. The bank login is what verifies.

## What the vendor sees

1. A page that names your company and the vendor, and asks them to confirm their bank details. The link works for 14 days.
2. A button that sends a six-digit code to the contact email. The code works for 15 minutes. After 5 wrong codes, the link stops working and you need to create a new one.
3. Their own bank's login, in Plaid.
4. A result: confirmed, or not confirmed. Either way, the evidence is recorded on the vendor.

Quarter hosts this page. Its routes are public and listed below, in the order the page calls them, so you can also build your own page.

## Create a link

### Create a verification link

`POST /v1/vendors/{vendor}/verification_requests` (auth: API key)

Creates a link for the vendor. Any open link for the same vendor is cancelled. The token in the `url` is shown only here; Quarter keeps only its hash.

With `send: true`, Quarter emails the link to the contact. Otherwise, send the `url` yourself.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `contact_email` | string | Yes | The vendor contact who confirms. Use an address on the vendor's email domain. |
| `send` | boolean | No | `true` to have Quarter email the link. Default `false`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD/verification_requests" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"contact_email":"ap@harborpoint.example","send":true}'
```

Response:

```json
{
  "id": "vrq_6KnT3pWz8RbL2xQm5YcJ",
  "object": "verification_request",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "contact_email": "ap@harborpoint.example",
  "url": "<Quarter console URL>/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va",
  "expires_in_days": 14
}
```

## Public routes, in order

These take no API key. The token is the only credential, and every lookup starts from it. A cancelled link answers `404 verification_request_not_found`; an expired one answers `400 link_expired`; a finished one answers `409 request_closed`.

### 1. Read the request

`GET /verify/{token}` (auth: None (the token in the link))

What the vendor is asked to confirm, and which steps are done. The contact email is masked.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | The 32-character token at the end of the verification link. |

Request:

```bash
curl "$QUARTER_API_URL/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va"
```

Response:

```json
{
  "object": "verification",
  "vendor_name": "Harbor Point Logistics LLC",
  "customer_name": "Lakeshore Fabrication Inc.",
  "contact_email": "a***@harborpoint.example",
  "status": "open",
  "steps": {
    "email": false,
    "bank": false
  }
}
```

### 2. Send the email code

`POST /verify/{token}/email` (auth: None (the token in the link))

Sends a six-digit code to the contact email. Sending again replaces the code, up to 5 codes for one link.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | The 32-character token at the end of the verification link. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va/email"
```

Response:

```json
{
  "object": "verification",
  "email_code_sent": true
}
```

### 3. Confirm the code

`POST /verify/{token}/email/confirm` (auth: None (the token in the link))

Checks the code. A wrong or expired code answers `400 code_invalid` and counts as an attempt. After 5 wrong codes, sending and confirming codes answer `429 too_many_attempts`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | The 32-character token at the end of the verification link. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | The six digits from the email. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va/email/confirm" \
  -H "content-type: application/json" \
  -d '{"code":"418302"}'
```

Response:

```json
{
  "object": "verification",
  "steps": {
    "email": true,
    "bank": false
  }
}
```

### 4. Start the bank login

`POST /verify/{token}/bank/link_token` (auth: None (the token in the link))

Returns a Plaid Link token. Open Plaid Link with it; when the vendor finishes, Plaid gives the page a `public_token`.

In a test project without Plaid, `test_bank` is `true`: confirm with the `public_token` `test-bank-match`, or `test-bank-mismatch` to see a refusal. When the plan has used its bank logins for the month, the answer is `409 bank_login_unavailable`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | The 32-character token at the end of the verification link. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va/bank/link_token"
```

Response:

```json
{
  "object": "link_token",
  "link_token": "link-sandbox-3f9c2e71-8a4d-4b6e-9d1f-27c5a0e8b412",
  "test_bank": false
}
```

### 5. Confirm the bank account

`POST /verify/{token}/bank` (auth: None (the token in the link))

Sends the Plaid `public_token`. The email step must be done first, or the answer is `409 email_first`. Quarter compares the accounts the bank returned with the current details on file and the owner name with the vendor name.

On a match, the details become `verified` with `verified_method: "bank_link"`, the vendor becomes `verified`, the link is completed, and the `vendor.verified` and `verification_request.completed` [events](/docs/webhooks.md#event-types) fire. Otherwise the answer says why: `account_not_on_file` (the vendor logged in to a bank that does not hold the account on file) or `owner_name_mismatch`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | The 32-character token at the end of the verification link. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `public_token` | string | Yes | From Plaid Link. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/verify/Hk7Qx2mPv9RtL4wNc8ZbJ3yFs6TdG1Va/bank" \
  -H "content-type: application/json" \
  -d '{"public_token":"public-sandbox-5b0e3d8a-61c2-4f7a-a9e4-0c3d72b1f985"}'
```

Response:

```json
{
  "object": "verification",
  "verified": true
}
```

When it does not match:

```json
{
  "object": "verification",
  "verified": false,
  "reason": "owner_name_mismatch"
}
```

## The evidence it leaves

Each step adds evidence to the vendor, newest first, and nothing is edited or deleted. [`GET /v1/vendors/{vendor}`](/docs/vendors.md#get-v1-vendors-vendor) returns it. The bank step records which accounts came back (last 4 digits only), whether one matched, and the owner name score.

evidence:

```json
[
  {
    "id": "evd_2WsD7fPk4QyH9mTn6VbG",
    "bank_account_id": "ba_6NcW1rLp8TkQ3vXm9HzB",
    "kind": "bank_link",
    "result": "pass",
    "details": {
      "accounts_returned": [
        {
          "routing_number": "263391271",
          "last4": "8226"
        }
      ],
      "matches_account_on_file": true,
      "owner_name_score": 1,
      "institution": "First Harborview Bank"
    },
    "actor": "vendor:ap@harborpoint.example",
    "created_at": "2026-10-07T15:04:19.000Z",
    "object": "evidence"
  },
  {
    "id": "evd_8RtB2nXw5KqJ3vMp9LcF",
    "bank_account_id": null,
    "kind": "email_domain",
    "result": "pass",
    "details": {
      "email": "ap@harborpoint.example",
      "on_vendor_domain": true
    },
    "actor": "vendor:ap@harborpoint.example",
    "created_at": "2026-10-07T15:02:51.000Z",
    "object": "evidence"
  }
]
```

> **Note:** A bank login result stays between you, the vendor and Quarter. It does not count toward the [network](/docs/network.md): only call-backs do.

## Call-backs

A call-back is the classic control against changed bank details: before paying new details, call the vendor and ask. Quarter records who called, which number, where that number came from, who answered and what they said. A call that confirms the details marks them `verified`. A call that does not marks them `rejected`.

The person who made the call records it, signed in to the console. An API key answers `403 session_required`. The person who added the bank details may not confirm them: a `pass` from them answers `403 attester_changed_details`, and someone else must call. Details added with an API key are not traced to a person.

### Where the number came from

A call proves something only if you dialed a number the fraudster could not have given you. A change request by email usually comes with a phone number, and that number reaches the fraudster. So Quarter asks where the number came from and accepts only these sources:

| `phone_source` | Meaning |
| --- | --- |
| `vendor_master_before_change` | The number was in your vendor records before the change was requested. |
| `signed_contract` | The number is in a contract you signed with the vendor. |
| `public_website` | You looked the number up yourself on the vendor's public website. |
| `previous_invoice` | The number is on an invoice you received and paid before the change. |

Sending `phone_source: "change_request"` is refused with `400 callback_number_untrusted`. Any other value is refused with `400 phone_source_invalid`.

### What a call-back changes

- The call is recorded as evidence of kind `callback` on the vendor, with `actor` set to the person who made the call. Evidence is never edited or deleted.
- With `result: "pass"`, the bank details become `verified` with `verified_method: "callback"`, the vendor becomes `verified` (unless it is blocked), and the `vendor.verified` [event](/docs/webhooks.md#event-types) fires.
- With `result: "fail"`, the bank details become `rejected`. Payments to them stay held.
- From a live project, a confirmed call-back counts once toward the [network](/docs/network.md): other Quarter customers see that one more business confirmed this account, never which one.

### Record a call-back

`POST /v1/vendors/{vendor}/bank_accounts/{account}/attestations` (auth: Signed-in approver)

Records the call against one set of bank details. They must be the current details: details that were replaced or rejected answer `400 bank_account_inactive`. Returns the vendor.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |
| `account` | string | Yes | The bank account id, starting with `ba_`. |

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `result` | string | Yes | `pass` if the vendor confirmed the details, `fail` if not. |
| `phone_source` | string | Yes | Where the number came from. See [above](/docs/verification.md#phone-source). |
| `reviewer` | string | No | Your own email, as the person who made the call. Taken from the session; any other email answers `400 reviewer_not_you`. Kept in the audit trail. |
| `phone_number` | string | No | The number you called. |
| `contact_name` | string | No | Who answered. |
| `notes` | string | No | What was said, up to 2,000 characters. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD/bank_accounts/ba_3HfJ6tWq1ZsN8kPm2RxA/attestations" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"result":"pass","phone_number":"+1 312 555 0148","phone_source":"vendor_master_before_change","contact_name":"Maria Okafor, accounts receivable","reviewer":"dana@yourcompany","notes":"Called the number on file since 2024. Maria read back the routing number and the last four digits."}'
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
      "replaced_at": null
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
