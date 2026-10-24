# Bank change emails

> Forward a vendor's email asking to change bank details. Quarter checks who really sent it and holds payments to the new details when it fails.

> **Note:** Bank change email checks are built and tested. They have not yet been used by a customer. There is no inbound email address yet: send the email through the API.

Most vendor payment fraud starts with an email that asks you to pay a new account. Save that email from your mail client as a `.eml` file, headers and all, and send it to Quarter with the vendor it claims to come from. Quarter checks the sender, the email's authentication results, its wording and the bank details in it, and returns every finding.

> **Warning:** An email never confirms bank details, however clean it looks. Uploading one can hold payments, never release them. Confirm a change with a [verification link](/docs/verification.md) or a [call-back](/docs/verification.md#callbacks) to the number in your vendor record.

## What Quarter checks

Each finding has a `severity`. A `hold` finding sets `flagged: true`, and payments to the bank details the email asked for are then held. A `note` is shown to the reviewer and holds nothing.

| Code | Severity | When |
| --- | --- | --- |
| `sender_lookalike` | hold | The sender's domain imitates the vendor's `email_domain`, found the same way as for [the sender's domain](/docs/vendors.md#sender-domain). |
| `sender_other_domain` | hold | The sender's domain is not the vendor's `email_domain`. |
| `reply_to_elsewhere` | hold | Replies go to a different domain from the sender's. |
| `dmarc_failed` | hold | DMARC failed. |
| `spf_failed` | hold | SPF failed. |
| `return_path_elsewhere` | note | Bounces go to a different domain from the sender's. Mailing services do this too. |
| `first_time_sender` | note | The first email from this address uploaded to Quarter for the business. |
| `authentication_missing` | note | No Authentication-Results header, so whether the sender is who it claims is unknown. |
| `spf_weak` | note | SPF result `softfail`, `none` or `permerror`. |
| `dkim_failed` | note | DKIM result other than `pass`. |
| `urgency` | note | Wording that presses for speed, such as `urgent`, `immediately` or `final notice`. |
| `secrecy` | note | Wording that asks for secrecy or to avoid a call, such as `confidential`, `do not call` or an old account said to be closed. |
| `bank_details_differ` | note | The bank details in the email differ from the ones on file. |
| `account_new` | note | The account in the email has never been on file for any vendor of the business. |

The domain checks need the vendor's `email_domain`. SPF, DKIM and DMARC come from the first Authentication-Results header, the one your own mail server added when the email arrived. Bank details are read from the body only when it gives a valid 9-digit routing number with an account number of 4 to 17 digits.

## The hold on payments

Quarter links the email to the bank change it asked for: the `bank_account_id` you send, or else the vendor's bank details with the account the email gives. While those details are unconfirmed, a payment to them holds as [`request_email_suspicious`](/docs/checks.md#request-email-suspicious), with each hold finding in the message. Once the vendor confirms the details by a verification link or a call-back, the check stops firing.

## What is stored and what is not

- Kept: the headers (up to 200, each up to 2,000 characters), the sender, Reply-To and Return-Path addresses, subject, Message-ID, date, authentication results and the findings.
- Never kept: the body. Quarter reads it once to find the phrases and bank details, then keeps only the phrases it matched in `matched_phrases`.
- Bank details in the body are kept as the routing number, the last 4 digits and a fingerprint to compare with other accounts, never the full account number.
- Each upload is recorded in the audit log with the email, the bank change and the finding codes.
- The list of emails leaves out the headers; retrieve one email to read them.

## Endpoints

### Upload a bank change email

`POST /v1/bank_change_emails` (auth: API key)

Checks the email and keeps it as evidence on the vendor. An agent's key answers `403 agent_key_refused`.

Errors: `400 vendor_id_required`, `eml_required`, `eml_too_large`, `eml_invalid` (no From header: upload the original, not a forward), `bank_account_invalid`; `404 vendor_not_found`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor_id` | string | Yes | The vendor the email claims to be from. |
| `eml` | string | Yes | The raw message as your mail client saves it, headers and all. At most 2 MB. |
| `bank_account_id` | string | No | The bank change the email asked for, one of this vendor's bank details. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/bank_change_emails" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"vendor_id":"ven_7Qm2KxR9pLwT4nVb8YcD","eml":"<the raw .eml file>","bank_account_id":"ba_6NcW1rLp8TkQ3vXm9HzB"}'
```

Response:

```json
{
  "id": "bce_4RkW9nTq2LpX7vMb3HcZ",
  "object": "bank_change_email",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "bank_account_id": "ba_6NcW1rLp8TkQ3vXm9HzB",
  "from": "ar@harb0rpoint.example",
  "reply_to": "payments.harborpoint@mailbox.example",
  "return_path": "ar@harb0rpoint.example",
  "subject": "Updated bank details for October invoices",
  "message_id": "<7f3a9c21@harb0rpoint.example>",
  "sent_at": "2026-10-22T15:04:11.000Z",
  "authentication": {
    "server": "mx.yourcompany.example",
    "spf": "pass",
    "dkim": "pass",
    "dmarc": "pass"
  },
  "matched_phrases": [
    "urgent",
    "do not call"
  ],
  "bank_details": {
    "routing_number": "<routing number>",
    "last4": "5508"
  },
  "flagged": true,
  "findings": [
    {
      "code": "sender_lookalike",
      "severity": "hold",
      "message": "sent from harb0rpoint.example, which looks like harborpoint.example, the vendor's domain: letters swapped for ones that look the same"
    },
    {
      "code": "reply_to_elsewhere",
      "severity": "hold",
      "message": "replies go to mailbox.example, not to the sender's harb0rpoint.example"
    },
    {
      "code": "first_time_sender",
      "severity": "note",
      "message": "the first email from ar@harb0rpoint.example uploaded to Quarter for this business"
    },
    {
      "code": "urgency",
      "severity": "note",
      "message": "presses for speed: urgent"
    },
    {
      "code": "secrecy",
      "severity": "note",
      "message": "asks for secrecy or to avoid a call: do not call"
    },
    {
      "code": "bank_details_differ",
      "severity": "note",
      "message": "the bank details in the email differ from the ones on file"
    },
    {
      "code": "account_new",
      "severity": "note",
      "message": "the account in the email has never been on file for any vendor of this business"
    }
  ],
  "received_by": "dana@yourcompany",
  "created_at": "2026-10-22T15:20:37.000Z",
  "headers": [
    [
      "authentication-results",
      "mx.yourcompany.example; spf=pass dkim=pass dmarc=pass"
    ],
    [
      "from",
      "Harbor Point Accounts <ar@harb0rpoint.example>"
    ],
    [
      "reply-to",
      "payments.harborpoint@mailbox.example"
    ],
    [
      "subject",
      "Updated bank details for October invoices"
    ]
  ]
}
```

### List bank change emails

`GET /v1/bank_change_emails` (auth: API key)

Newest first, without their headers. Errors: `400 limit_invalid`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor_id` | string | No | Only this vendor's emails. |
| `limit` | integer | No | 1 to 200, 50 by default. |

Request:

```bash
curl "$QUARTER_API_URL/v1/bank_change_emails?vendor_id=ven_7Qm2KxR9pLwT4nVb8YcD" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "bce_4RkW9nTq2LpX7vMb3HcZ",
      "object": "bank_change_email",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "bank_account_id": "ba_6NcW1rLp8TkQ3vXm9HzB",
      "from": "ar@harb0rpoint.example",
      "reply_to": "payments.harborpoint@mailbox.example",
      "return_path": "ar@harb0rpoint.example",
      "subject": "Updated bank details for October invoices",
      "message_id": "<7f3a9c21@harb0rpoint.example>",
      "sent_at": "2026-10-22T15:04:11.000Z",
      "authentication": {
        "server": "mx.yourcompany.example",
        "spf": "pass",
        "dkim": "pass",
        "dmarc": "pass"
      },
      "matched_phrases": [
        "urgent",
        "do not call"
      ],
      "bank_details": {
        "routing_number": "<routing number>",
        "last4": "5508"
      },
      "flagged": true,
      "findings": [
        {
          "code": "sender_lookalike",
          "severity": "hold",
          "message": "sent from harb0rpoint.example, which looks like harborpoint.example, the vendor's domain: letters swapped for ones that look the same"
        },
        {
          "code": "reply_to_elsewhere",
          "severity": "hold",
          "message": "replies go to mailbox.example, not to the sender's harb0rpoint.example"
        },
        {
          "code": "first_time_sender",
          "severity": "note",
          "message": "the first email from ar@harb0rpoint.example uploaded to Quarter for this business"
        },
        {
          "code": "urgency",
          "severity": "note",
          "message": "presses for speed: urgent"
        },
        {
          "code": "secrecy",
          "severity": "note",
          "message": "asks for secrecy or to avoid a call: do not call"
        },
        {
          "code": "bank_details_differ",
          "severity": "note",
          "message": "the bank details in the email differ from the ones on file"
        },
        {
          "code": "account_new",
          "severity": "note",
          "message": "the account in the email has never been on file for any vendor of this business"
        }
      ],
      "received_by": "dana@yourcompany",
      "created_at": "2026-10-22T15:20:37.000Z"
    }
  ]
}
```

### Retrieve a bank change email

`GET /v1/bank_change_emails/{email}` (auth: API key)

The email with its headers and findings. Unknown: `404 bank_change_email_not_found`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | The email id, starting with `bce_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/bank_change_emails/bce_4RkW9nTq2LpX7vMb3HcZ" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "id": "bce_4RkW9nTq2LpX7vMb3HcZ",
  "object": "bank_change_email",
  "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
  "bank_account_id": "ba_6NcW1rLp8TkQ3vXm9HzB",
  "from": "ar@harb0rpoint.example",
  "reply_to": "payments.harborpoint@mailbox.example",
  "return_path": "ar@harb0rpoint.example",
  "subject": "Updated bank details for October invoices",
  "message_id": "<7f3a9c21@harb0rpoint.example>",
  "sent_at": "2026-10-22T15:04:11.000Z",
  "authentication": {
    "server": "mx.yourcompany.example",
    "spf": "pass",
    "dkim": "pass",
    "dmarc": "pass"
  },
  "matched_phrases": [
    "urgent",
    "do not call"
  ],
  "bank_details": {
    "routing_number": "<routing number>",
    "last4": "5508"
  },
  "flagged": true,
  "findings": [
    {
      "code": "sender_lookalike",
      "severity": "hold",
      "message": "sent from harb0rpoint.example, which looks like harborpoint.example, the vendor's domain: letters swapped for ones that look the same"
    },
    {
      "code": "reply_to_elsewhere",
      "severity": "hold",
      "message": "replies go to mailbox.example, not to the sender's harb0rpoint.example"
    },
    {
      "code": "first_time_sender",
      "severity": "note",
      "message": "the first email from ar@harb0rpoint.example uploaded to Quarter for this business"
    },
    {
      "code": "urgency",
      "severity": "note",
      "message": "presses for speed: urgent"
    },
    {
      "code": "secrecy",
      "severity": "note",
      "message": "asks for secrecy or to avoid a call: do not call"
    },
    {
      "code": "bank_details_differ",
      "severity": "note",
      "message": "the bank details in the email differ from the ones on file"
    },
    {
      "code": "account_new",
      "severity": "note",
      "message": "the account in the email has never been on file for any vendor of this business"
    }
  ],
  "received_by": "dana@yourcompany",
  "created_at": "2026-10-22T15:20:37.000Z",
  "headers": [
    [
      "authentication-results",
      "mx.yourcompany.example; spf=pass dkim=pass dmarc=pass"
    ],
    [
      "from",
      "Harbor Point Accounts <ar@harb0rpoint.example>"
    ],
    [
      "reply-to",
      "payments.harborpoint@mailbox.example"
    ],
    [
      "subject",
      "Updated bank details for October invoices"
    ]
  ]
}
```
