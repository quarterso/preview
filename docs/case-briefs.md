# Case briefs

> An optional, AI-written brief for a held payment or a bank change email: what happened, the evidence, what to verify and a call-back script.

> **Note:** Case briefs are built and tested. They have not yet been used by a customer, and they are off until an admin turns them on.

A case brief helps the person deciding a held payment, or a [bank change email](/docs/bank-change-emails.md), work faster. Quarter sends the case's facts to Claude, Anthropic's model, which writes four sections: What happened, Evidence, What to verify, and a Call-back script. A brief is written when someone asks for one, not for every hold.

> **Warning:** A brief is advisory. It never changes a check, a hold or a decision, and Quarter's checks never depend on it. People make every decision. Every brief carries `ai_written: true` and this label: Written by AI (Claude). Advisory only: it never changes a decision, and Quarter’s checks never depend on it.

## Turning briefs on

Briefs are off for every organization by default. A signed-in admin turns them on, or off again, with `ai_briefs` on [`PATCH /v1/organization`](/docs/compliance.md#patch-v1-organization). The change applies at once and is recorded in the audit log. While briefs are off, nothing is sent to Anthropic. `GET /v1/organization` shows `ai_briefs.enabled`, the exact fields sent and the label.

## Exactly what is sent

Only these fields leave Quarter, and each brief stores the list it sent in `fields_sent`.

| Brief for | Fields sent |
| --- | --- |
| A held payment (`payment_item`) | `payment.payee_name`, `payment.amount`, `payment.currency`, `payment.rail`, `payment.last4`, `payment.findings`, `vendor.name`, `vendor.email_domain`, `vendor.status`, `vendor.bank_accounts.last4`, `vendor.bank_accounts.status`, `vendor.bank_accounts.added_at`, `vendor.bank_accounts.request_channel`, `vendor.bank_accounts.request_domain`, `emails.from`, `emails.reply_to`, `emails.return_path`, `emails.subject`, `emails.sent_at`, `emails.authentication`, `emails.matched_phrases`, `emails.bank_details.last4`, `emails.findings` |
| A bank change email (`bank_change_email`) | `vendor.name`, `vendor.email_domain`, `vendor.status`, `vendor.bank_accounts.last4`, `vendor.bank_accounts.status`, `vendor.bank_accounts.added_at`, `vendor.bank_accounts.request_channel`, `vendor.bank_accounts.request_domain`, `emails.from`, `emails.reply_to`, `emails.return_path`, `emails.subject`, `emails.sent_at`, `emails.authentication`, `emails.matched_phrases`, `emails.bank_details.last4`, `emails.findings` |

- Bank accounts appear only as their last 4 digits. A full account number or routing number is never sent; longer numbers in a subject or finding are masked first.
- Never sent: an email body, a phone number, or the name of a person who acted in Quarter.
- For a held payment, the vendor's 5 latest bank details and 3 latest bank change emails go with it.

## The call-back number

The call-back number always comes from the vendor record, the vendor's `phone`, never from the model or the email. The model writes a placeholder, and Quarter puts the vendor's `phone` there. Any other phone number the model writes is taken out. When the vendor has no `phone`, the script says to use the number in your vendor record from before the change. The script tells the caller never to use a number, link or contact from the email, and to ask the vendor to confirm the old and new account by their last 4 digits. Set the number with `phone` on [the vendor](/docs/vendors.md#post-v1-vendors).

## Endpoints

### Write a case brief

`POST /v1/case_briefs` (auth: API key)

Writes and stores a brief for one held payment or bank change email. An agent's key answers `403 agent_key_refused`.

Errors: `400 subject_type_invalid`, `subject_id_required`; `404 payment_item_not_found`, `bank_change_email_not_found`; `409 ai_briefs_off` until an admin turns briefs on; `503 ai_briefs_unavailable` when this deployment has no model provider set up; `500 brief_not_written` when the model wrote nothing. On any error the case is unchanged and no brief is stored.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `subject_type` | string | Yes | `payment_item` or `bank_change_email`. |
| `subject_id` | string | Yes | The payment item (`itm_`) or bank change email (`bce_`). |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/case_briefs" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"subject_type":"bank_change_email","subject_id":"bce_4RkW9nTq2LpX7vMb3HcZ"}'
```

Response:

```json
{
  "id": "brf_8TnQ3wLx6RkV2pMb9HcJ",
  "object": "case_brief",
  "subject_type": "bank_change_email",
  "subject_id": "bce_4RkW9nTq2LpX7vMb3HcZ",
  "ai_written": true,
  "label": "Written by AI (Claude). Advisory only: it never changes a decision, and Quarter’s checks never depend on it.",
  "model": "claude-opus-5-5",
  "text": "<the brief: What happened, Evidence, What to verify, Call-back script>",
  "fields_sent": [
    "vendor.name",
    "vendor.email_domain",
    "vendor.status",
    "vendor.bank_accounts.last4",
    "vendor.bank_accounts.status",
    "vendor.bank_accounts.added_at",
    "vendor.bank_accounts.request_channel",
    "vendor.bank_accounts.request_domain",
    "emails.from",
    "emails.reply_to",
    "emails.return_path",
    "emails.subject",
    "emails.sent_at",
    "emails.authentication",
    "emails.matched_phrases",
    "emails.bank_details.last4",
    "emails.findings"
  ],
  "created_by": "dana@yourcompany",
  "created_at": "2026-10-22T15:24:02.000Z"
}
```

### List case briefs

`GET /v1/case_briefs` (auth: API key)

Newest first: the briefs for one subject, or the project's latest 50.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `subject_id` | string | No | Only the briefs for this payment item or bank change email. |

Request:

```bash
curl "$QUARTER_API_URL/v1/case_briefs?subject_id=bce_4RkW9nTq2LpX7vMb3HcZ" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "brf_8TnQ3wLx6RkV2pMb9HcJ",
      "object": "case_brief",
      "subject_type": "bank_change_email",
      "subject_id": "bce_4RkW9nTq2LpX7vMb3HcZ",
      "ai_written": true,
      "label": "Written by AI (Claude). Advisory only: it never changes a decision, and Quarter’s checks never depend on it.",
      "model": "claude-opus-5-5",
      "text": "<the brief: What happened, Evidence, What to verify, Call-back script>",
      "fields_sent": [
        "vendor.name",
        "vendor.email_domain",
        "vendor.status",
        "vendor.bank_accounts.last4",
        "vendor.bank_accounts.status",
        "vendor.bank_accounts.added_at",
        "vendor.bank_accounts.request_channel",
        "vendor.bank_accounts.request_domain",
        "emails.from",
        "emails.reply_to",
        "emails.return_path",
        "emails.subject",
        "emails.sent_at",
        "emails.authentication",
        "emails.matched_phrases",
        "emails.bank_details.last4",
        "emails.findings"
      ],
      "created_by": "dana@yourcompany",
      "created_at": "2026-10-22T15:24:02.000Z"
    }
  ]
}
```
