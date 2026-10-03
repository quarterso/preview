# Compliance and insider controls

> The written procedure, its yearly review, the audit log, and the controls against payments steered by someone inside.

Nacha's rules ask every business that sends ACH payments to have a risk-based process to find payments authorized under false pretenses, such as a vendor impersonated by email, and to review it at least once a year. For businesses below the first phase's volume threshold, the rule applies from June 19, 2026. That day is a federal holiday, so in practice it applies from June 22, 2026.

Quarter does not make you compliant, and no tool can. It gives you a documented, risk-based process and the evidence that you followed it, which helps you meet Nacha's fraud-monitoring rule. Your bank and your auditor decide whether your process is enough.

## The written procedure

Quarter writes the procedure from your [settings](/docs/checks.md#settings) each time you ask for it, so the document always describes the controls actually in force. It lists every check that is on and what it does, names the checks you turned off as your own decision, and states the cooling period, the two-person threshold and the last review. It comes back as Markdown, ready to print, sign or hand to your bank.

markdown:

```shell
# Payment fraud monitoring procedure

Lakeshore Fabrication Inc. checks every outgoing vendor payment before it is sent, to detect payments authorized under false pretenses, such as a vendor impersonated by email or bank details changed by someone other than the vendor. This procedure is carried out with Quarter.

## Before a vendor is paid

- Every vendor is approved and recorded before its first payment.
- Bank details are confirmed with the vendor out of band before they are used: through the vendor's own bank login, or by a call to a phone number we already held, made by someone other than the person who entered the details. A number supplied in the change request is never used to confirm the change. Where the number came from is recorded by the person who made the call.
- A change of bank details puts the vendor back to unconfirmed. Payments to the new details are held until the change is confirmed with the vendor, and flagged to the reviewer for 10 days after it was made.

## Every payment run

Each payment file is checked before release.

| What we check | What happens |
|---|---|
| Payments to anyone who is not an approved vendor | Held for review |
| Payments to vendors the business has blocked | Held for review |
| Payments to bank details never confirmed with the vendor | Held for review |
| Payments to bank details changed recently and not confirmed out of band | Held for review |
| Payments to a vendor at an account other than the one on file | Held for review |
| Payee names that do not match the vendor | Flagged to the reviewer |
| First payments to a vendor | Flagged to the reviewer |
| Amounts far above what the vendor is usually paid | Flagged to the reviewer |
| The same payment made twice | Held for review |
| One bank account used by two vendors | Held for review |
| Accounts other businesses reported as used in fraud | Flagged to the reviewer |
| Payees resembling a party on OFAC's SDN or Consolidated lists, and every live payment while either list is more than 48 hours old | Held for review |
| Invalid routing numbers | Held for review |
| Invalid IBANs on international payments | Held for review |
| A check number already used on the same account | Held for review |
| A check payee line that differs from the vendor name on file | Flagged to the reviewer |
| Checks just under the two-person approval threshold | Flagged to the reviewer |
| Payments to an account on the employee account list | Held for review |
| A vendor unpaid for a year or more, paid again after its bank details changed | Flagged to the reviewer |
| Payments to one vendor within 7 days that together reach the two-person threshold, each under it | Flagged to the reviewer |
| A vendor added in the last 14 days and paid by the same person who added it | Flagged to the reviewer |
| Payments at or above the two-person threshold, and payments by a person who changed the vendor's bank details | Held for review |

Sanctions screening compares names. It cannot find a business blocked only because sanctioned parties own 50% or more of it (OFAC's 50 percent rule), or an affiliate covered by the Commerce Department's Affiliates Rule, since neither is on a list.

## Insider controls

- Lakeshore Fabrication Inc. keeps a list of its employees' own bank accounts in Quarter, as fingerprints only, and refreshes it from payroll. A payment to one of those accounts, or to a vendor whose account on file is one of them, is checked as set out above.
- A report of every change to vendors and their bank details, by person, is kept for review.

## Check runs

- Every check register is checked the same way before the checks are released, except for the checks on bank details, since a check pays a name and not an account.
- On release, the issued-check file for the bank's Positive Pay is produced from the register: every check issued, and as void every check rejected or voided. Lakeshore Fabrication Inc. uploads it to its bank, which compares each presented check against it. Quarter never sends it.

## Review and release

- A held payment is released only when a named person approves it with a reason. Every payment of $50,000 or more is held, and needs two different people to approve it.
- Nobody may approve a payment to a vendor whose bank details they changed in the last 90 days, as the first approver or the second. A payment to that vendor made by that person is held for someone else to approve, and that person may not release a run paying the vendor unless someone else approved the payment.
- Approvals, call-back confirmations and releases are made only by people signed in to Quarter. An integration using an API key can submit payments and read the results, but never approves or releases them.
- A rejected payment is removed from the file before it is sent.
- Every check, decision, approver and piece of evidence is recorded and kept.

## Review of this procedure

This procedure is reviewed at least once a year. Last reviewed on 2026-10-02 by dana@yourcompany. Next review due by 2027-10-02.
```

## The yearly review

Once a year, someone responsible reads the procedure, checks it still fits the business, and records the review, signed in to the console as an admin. The procedure then shows the date and the person, and `next_review_due` moves a year on. Before the first review, `next_review_due` is today.

## The audit log

Every action through the API is recorded with who did it, what, on which object, and when: vendors added and changed, bank details recorded, call-backs, verification links created, runs scanned, each decision with its reason, releases, cancels, fraud reports and retractions, settings changes and reviews. Nothing in it is edited or deleted. `actor` is the person signed in, or the person named in `uploaded_by` or `requested_by`. For anything else done with an API key, it is the key prefix, such as `api_key:qk_test_Xy7P`.

What a vendor does on a verification link is recorded as evidence on the vendor, with the vendor contact as the actor. See [the evidence it leaves](/docs/verification.md#the-evidence-it-leaves).

### Proof that no entry was changed

Each organization's audit log is a hash chain. The database gives every entry its number in the chain (`chain_seq`), the hash of the entry before it (`prev_hash`), a SHA-256 hash of its own content (`content_hash`), and `hash`, the SHA-256 of `prev_hash` followed by `content_hash`. The first entry follows 64 zeros. Changing, removing or reordering any entry breaks every link after it, even for someone with direct access to the database.

- An admin checks the whole chain in the console, under Compliance, or with [`GET /v1/audit_log/verify`](/docs/compliance.md#get-v1-audit-log-verify). It names the first entry that was changed or removed.
- Someone who could rewrite every hash after a change could make the chain look whole again. So once a day Quarter emails the latest hash of each organization's chain to its own staff inbox, outside the database and its host. Pass a hash you kept as `anchor_seq` and `anchor_hash`, and the check also says whether that entry still has it.
- A [privacy request](/docs/compliance.md#records-and-privacy) replaces a vendor contact's email inside audit entries. Those entries are marked, and the check counts them as `redacted` apart from `content_checked`: their links and their shape are checked, their content cannot be. An entry marked redacted breaks the chain as `redaction_invalid` unless it has the one shape a privacy request leaves and a privacy request is recorded at that moment or after.
- Entries written before the chain existed were chained in order, oldest first, when it was added.

## Security events

Quarter keeps a separate record of security events, with who acted, from which address, and when. It is append-only, and each organization's events form their own hash chain, built and anchored in the daily email the same way as the audit log.

| Event | Severity |
| --- | --- |
| A passkey reset by an admin | High |
| The employee account list replaced | High |
| A webhook endpoint added, which receives payee names and amounts | High |
| The NetSuite connection made or removed, a certificate created, or the payment flow turned on or off | High |
| An API key used from a network it was not used from before (an IPv4 /24 or IPv6 /48; its first use sets the start) | High |
| Security contacts or evidence retention changed | High |
| One person downloading more than 5 files with full account numbers in 24 hours | High |
| A passkey added or removed; a member's first passkey approved; an API key created or revoked | Medium |
| A member invited or removed, or a role changed; check settings changed (admins are already emailed each of these) | Medium |
| An export downloaded: the organization export, a claim file, the vendor health CSV, the vendor changes report, or a page of the audit log past the first or longer than 100 entries. A run released, or a payment or Positive Pay file downloaded: each carries full account numbers | Medium |

High events are emailed to your admins and security contacts, all waiting events in one email, at most every 15 minutes. Alert emails stop at 40 a day across Quarter, so they never use up the mail that sign-in links and vendor codes need; organizations' alerts go first, and past the limit alerts wait until the next day. An address that sends 20 unknown or expired credentials in a minute is recorded in Quarter's own chain and Quarter's staff are told, at most every 3 hours, because nothing names whose account it was after.

## The claim file

When a payment goes wrong, or an insurer, auditor or bank examiner asks how a vendor's bank change was handled, the claim file is the record in one download. It shows whether the new details were confirmed by a call to a number already on file, whether a second person approved, and who did each.

- Each change to the vendor's bank details: who entered it, when, and how it arrived (keyed in, imported or synced from NetSuite, sent through the API, or given by the vendor). How the request first reached your business, by email or phone, is recorded only if your team wrote it down.
- Each verification: call-backs with the number called, where that number came from, who called and who answered; the vendor confirming by email code or bank login; links sent.
- Each payment to the vendor that Quarter checked: why it was held, who approved or rejected it and when, with both names for two-person approval, the outcome recorded, and when it was released and by whom.
- The audit log entries behind all of it, each with its chain hashes, and the result of checking the whole chain when the file was made.
- Account numbers show only the last 4 digits, and any run of 6 or more digits typed into call-back notes is cut to its last 4. Approvers and admins can download it; each download is in the audit log.

It comes as JSON with a plain-text `summary` of the same evidence. In the console, open the vendor and choose Download JSON or Download summary. A file stops at the newest 2,000 payments and 5,000 audit entries and says so in `truncated`.

## Endpoints

### Get the procedure

`GET /v1/compliance/procedure` (auth: API key)

The procedure as Markdown, generated now from the settings in force.

Request:

```bash
curl "$QUARTER_API_URL/v1/compliance/procedure" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "procedure",
  "generated_at": "2026-10-06T09:30:00.000Z",
  "last_reviewed_at": "2026-10-02T16:20:00.000Z",
  "next_review_due": "2027-10-02",
  "markdown": "# Payment fraud monitoring procedure\n\nLakeshore Fabrication Inc. checks every outgoing vendor payment before it is sent, to detect payments authorized under false pretenses, such as a vendor impersonated by email or bank details changed by someone other than the vendor. This procedure is carried out with Quarter.\n\n## Before a vendor is paid\n\n- Every vendor is approved and recorded before its first payment.\n- Bank details are confirmed with the vendor out of band before they are used: through the vendor's own bank login, or by a call to a phone number we already held, made by someone other than the person who entered the details. A number supplied in the change request is never used to confirm the change. Where the number came from is recorded by the person who made the call.\n- A change of bank details puts the vendor back to unconfirmed. Payments to the new details are held until the change is confirmed with the vendor, and flagged to the reviewer for 10 days after it was made.\n\n## Every payment run\n\nEach payment file is checked before release.\n\n| What we check | What happens |\n|---|---|\n| Payments to anyone who is not an approved vendor | Held for review |\n| Payments to vendors the business has blocked | Held for review |\n| Payments to bank details never confirmed with the vendor | Held for review |\n| Payments to bank details changed recently and not confirmed out of band | Held for review |\n| Payments to a vendor at an account other than the one on file | Held for review |\n| Payee names that do not match the vendor | Flagged to the reviewer |\n| First payments to a vendor | Flagged to the reviewer |\n| Amounts far above what the vendor is usually paid | Flagged to the reviewer |\n| The same payment made twice | Held for review |\n| One bank account used by two vendors | Held for review |\n| Accounts other businesses reported as used in fraud | Flagged to the reviewer |\n| Payees resembling a party on OFAC's SDN or Consolidated lists, and every live payment while either list is more than 48 hours old | Held for review |\n| Invalid routing numbers | Held for review |\n| Invalid IBANs on international payments | Held for review |\n| A check number already used on the same account | Held for review |\n| A check payee line that differs from the vendor name on file | Flagged to the reviewer |\n| Checks just under the two-person approval threshold | Flagged to the reviewer |\n| Payments to an account on the employee account list | Held for review |\n| A vendor unpaid for a year or more, paid again after its bank details changed | Flagged to the reviewer |\n| Payments to one vendor within 7 days that together reach the two-person threshold, each under it | Flagged to the reviewer |\n| A vendor added in the last 14 days and paid by the same person who added it | Flagged to the reviewer |\n| Payments at or above the two-person threshold, and payments by a person who changed the vendor's bank details | Held for review |\n\nSanctions screening compares names. It cannot find a business blocked only because sanctioned parties own 50% or more of it (OFAC's 50 percent rule), or an affiliate covered by the Commerce Department's Affiliates Rule, since neither is on a list.\n\n## Insider controls\n\n- Lakeshore Fabrication Inc. keeps a list of its employees' own bank accounts in Quarter, as fingerprints only, and refreshes it from payroll. A payment to one of those accounts, or to a vendor whose account on file is one of them, is checked as set out above.\n- A report of every change to vendors and their bank details, by person, is kept for review.\n\n## Check runs\n\n- Every check register is checked the same way before the checks are released, except for the checks on bank details, since a check pays a name and not an account.\n- On release, the issued-check file for the bank's Positive Pay is produced from the register: every check issued, and as void every check rejected or voided. Lakeshore Fabrication Inc. uploads it to its bank, which compares each presented check against it. Quarter never sends it.\n\n## Review and release\n\n- A held payment is released only when a named person approves it with a reason. Every payment of $50,000 or more is held, and needs two different people to approve it.\n- Nobody may approve a payment to a vendor whose bank details they changed in the last 90 days, as the first approver or the second. A payment to that vendor made by that person is held for someone else to approve, and that person may not release a run paying the vendor unless someone else approved the payment.\n- Approvals, call-back confirmations and releases are made only by people signed in to Quarter. An integration using an API key can submit payments and read the results, but never approves or releases them.\n- A rejected payment is removed from the file before it is sent.\n- Every check, decision, approver and piece of evidence is recorded and kept.\n\n## Review of this procedure\n\nThis procedure is reviewed at least once a year. Last reviewed on 2026-10-02 by dana@yourcompany. Next review due by 2027-10-02.\n"
}
```

### Record the yearly review

`POST /v1/compliance/reviews` (auth: Signed-in admin)

Records that a person reviewed the procedure today. A signed-in admin only; an API key answers `403 session_required`. Returns the settings with `last_reviewed_at` and `last_reviewed_by` set.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `reviewer` | string | No | Your own email, as the person reviewing. Taken from the session; any other email answers `400 reviewer_not_you`. Kept in the audit trail. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/compliance/reviews" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"reviewer":"dana@yourcompany"}'
```

Response:

```json
{
  "object": "settings",
  "checks": {
    "unknown_payee": "default",
    "vendor_blocked": "hold",
    "unverified_account": "default",
    "account_changed_recently": "default",
    "account_not_on_file": "default",
    "name_mismatch": "default",
    "first_payment": "default",
    "amount_unusual": "default",
    "duplicate_payment": "default",
    "shared_account": "default",
    "network_flagged": "default",
    "sanctions_match": "hold",
    "routing_invalid": "default",
    "iban_invalid": "default",
    "check_number_reused": "default",
    "payee_name_altered": "default",
    "just_under_threshold": "default",
    "employee_account_match": "default",
    "payroll_account_unlisted": "hold",
    "vendor_dormant_reactivated": "default",
    "split_below_threshold": "default",
    "vendor_new_paid_fast": "default",
    "request_domain_lookalike": "default",
    "request_domain_new": "default",
    "request_domain_no_dmarc": "default",
    "second_person_required": "hold"
  },
  "mandatory_checks": [
    "vendor_blocked",
    "sanctions_match",
    "payroll_account_unlisted",
    "second_person_required"
  ],
  "defaults": {
    "unknown_payee": "hold",
    "vendor_blocked": "hold",
    "unverified_account": "hold",
    "account_changed_recently": "hold",
    "account_not_on_file": "hold",
    "name_mismatch": "warn",
    "first_payment": "warn",
    "amount_unusual": "warn",
    "duplicate_payment": "hold",
    "shared_account": "hold",
    "network_flagged": "warn",
    "sanctions_match": "hold",
    "routing_invalid": "hold",
    "iban_invalid": "hold",
    "check_number_reused": "hold",
    "payee_name_altered": "warn",
    "just_under_threshold": "warn",
    "employee_account_match": "hold",
    "payroll_account_unlisted": "hold",
    "vendor_dormant_reactivated": "warn",
    "split_below_threshold": "warn",
    "vendor_new_paid_fast": "warn",
    "request_domain_lookalike": "warn",
    "request_domain_new": "warn",
    "request_domain_no_dmarc": "warn",
    "second_person_required": "hold"
  },
  "check_names": {
    "unknown_payee": "Payee is not a vendor",
    "vendor_blocked": "Vendor is blocked",
    "unverified_account": "Bank details never confirmed",
    "account_changed_recently": "Bank details changed recently",
    "account_not_on_file": "Account is not the one on file",
    "name_mismatch": "Payee name does not match",
    "first_payment": "First payment to this vendor",
    "amount_unusual": "Unusually large amount",
    "duplicate_payment": "Duplicate payment",
    "shared_account": "Account shared with another vendor",
    "network_flagged": "Reported as fraud on Quarter",
    "sanctions_match": "Resembles a sanctioned party",
    "routing_invalid": "Invalid routing number",
    "iban_invalid": "IBAN fails its check digits",
    "check_number_reused": "Check number already used",
    "payee_name_altered": "Payee line differs from the vendor name",
    "just_under_threshold": "Just under the two-person threshold",
    "employee_account_match": "Account belongs to an employee",
    "payroll_account_unlisted": "Payroll to an account not on the employee list",
    "vendor_dormant_reactivated": "Dormant vendor with new bank details",
    "split_below_threshold": "Split to stay under the two-person threshold",
    "vendor_new_paid_fast": "New vendor paid by the person who added it",
    "request_domain_lookalike": "Change request came from a lookalike domain",
    "request_domain_new": "Change request came from a newly registered domain",
    "request_domain_no_dmarc": "Change request came from a domain anyone can send as",
    "second_person_required": "Needs a second person to approve"
  },
  "check_points": {
    "unknown_payee": {
      "points": 20,
      "variants": []
    },
    "vendor_blocked": {
      "points": 50,
      "variants": []
    },
    "unverified_account": {
      "points": 30,
      "variants": []
    },
    "account_changed_recently": {
      "points": 40,
      "variants": [
        {
          "name": "Bank details changed recently, and confirmed",
          "points": 10
        }
      ]
    },
    "account_not_on_file": {
      "points": 40,
      "variants": []
    },
    "name_mismatch": {
      "points": 15,
      "variants": []
    },
    "first_payment": {
      "points": 5,
      "variants": []
    },
    "amount_unusual": {
      "points": 10,
      "variants": []
    },
    "duplicate_payment": {
      "points": 30,
      "variants": []
    },
    "shared_account": {
      "points": 30,
      "variants": []
    },
    "network_flagged": {
      "points": 30,
      "variants": []
    },
    "sanctions_match": {
      "points": 60,
      "variants": [
        {
          "name": "Sanctions list out of date, so not screened",
          "points": 0
        },
        {
          "name": "Name in letters the lists cannot be compared with, so not screened",
          "points": 0
        }
      ]
    },
    "routing_invalid": {
      "points": 25,
      "variants": []
    },
    "iban_invalid": {
      "points": 25,
      "variants": []
    },
    "check_number_reused": {
      "points": 30,
      "variants": []
    },
    "payee_name_altered": {
      "points": 20,
      "variants": []
    },
    "just_under_threshold": {
      "points": 10,
      "variants": []
    },
    "employee_account_match": {
      "points": 40,
      "variants": [
        {
          "name": "Payroll to an employee account, employee id not compared",
          "points": 10
        }
      ]
    },
    "payroll_account_unlisted": {
      "points": 30,
      "variants": [
        {
          "name": "Several payroll entries to one account",
          "points": 30
        },
        {
          "name": "Payroll that could not be compared with an employee list",
          "points": 10
        }
      ]
    },
    "vendor_dormant_reactivated": {
      "points": 20,
      "variants": []
    },
    "split_below_threshold": {
      "points": 15,
      "variants": []
    },
    "vendor_new_paid_fast": {
      "points": 15,
      "variants": []
    },
    "request_domain_lookalike": {
      "points": 40,
      "variants": [
        {
          "name": "Change request came from a domain other than the vendor's",
          "points": 15
        }
      ]
    },
    "request_domain_new": {
      "points": 30,
      "variants": []
    },
    "request_domain_no_dmarc": {
      "points": 5,
      "variants": []
    },
    "second_person_required": {
      "points": 0,
      "variants": [
        {
          "name": "Paid by the person who changed the bank details",
          "points": 30
        },
        {
          "name": "Payments to one payee add up to the two-person threshold",
          "points": 0
        }
      ]
    }
  },
  "cooling_days": 10,
  "unusual_multiplier": 3,
  "two_person_threshold": 50000,
  "last_reviewed_at": "2026-10-02T16:20:00.000Z",
  "last_reviewed_by": "dana@yourcompany"
}
```

### Get the controls and evidence report

`GET /v1/compliance/controls_report` (auth: API key)

For your bank or auditor. Each section names an expectation of Nacha's 2026 risk management rules for Originators (change controls on payment information, account validation of new or changed accounts, out-of-band verification, dual control, risk-based processes, and a yearly review), the Quarter control that supports it, and this project's counts for the period. `markdown` is the same report as a document; the console downloads it from the Compliance page.

Quarter supports your own risk-based program. It does not make anyone compliant, and the program and its yearly review stay yours. A bad date answers `400 from_invalid` or `400 to_invalid`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | No | `YYYY-MM-DD`. Default 365 days before `to`. |
| `to` | string | No | `YYYY-MM-DD`, included. Default today. |

Request:

```bash
curl "$QUARTER_API_URL/v1/compliance/controls_report?from=2025-10-07&to=2026-10-06" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "controls_report",
  "generated_at": "2026-10-06T16:20:00.000Z",
  "period": {
    "from": "2025-10-07",
    "to": "2026-10-06"
  },
  "review": {
    "last_reviewed_at": "2026-10-02",
    "last_reviewed_by": "dana@yourcompany",
    "next_review_due": "2027-10-02"
  },
  "controls": [
    {
      "expectation": "Account validation of new or changed accounts before they are paid",
      "control": "Bank details stay unconfirmed until the vendor proves them by logging in to its own bank, or a call-back confirms them. Payments to unconfirmed details are held.",
      "evidence": {
        "confirmed_by_vendor_bank_login": 4,
        "bank_logins_failed": 1,
        "payments_flagged_unconfirmed_details": 6
      }
    }
  ],
  "markdown": "# Payment fraud controls and evidence: Lakeshore Fabrication Inc.\n\n..."
}
```

### Export the audit log

`GET /v1/audit_log` (auth: API key)

Every recorded action, oldest first, or newest first with `order=desc`. To page through it, pass the `id` of the last entry you have as `after`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `after` | string | No | An audit entry id. Returns the entries after it, in the order asked for. |
| `limit` | integer | No | 1 to 5,000. Default 500. |
| `order` | string | No | `asc`, oldest first, the default, or `desc`, newest first. |

Request:

```bash
curl "$QUARTER_API_URL/v1/audit_log?limit=3" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "aud_4MbT7xKq2WnR9pLv5HcZ",
      "actor": "api_key:qk_test_Xy7P",
      "action": "payment_run.scanned",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "format": "nacha",
        "payments": 3
      },
      "created_at": "2026-10-06T08:15:03.000Z",
      "chain_seq": 41,
      "prev_hash": "63419f9c1c003c02cf7b66c0bc53e0f1c8e642ab538081016caaaa6e47665b87",
      "content_hash": "2553922bc2c904474153daae11161d12d43c9d81fafa39a450ed8f53974d3244",
      "hash": "5976adaf43f7c79c6b2b7d0f13675143784301d36e6071af6281f2531365828e"
    },
    {
      "id": "aud_8KcW2pRt5NvQ1mXb7LzF",
      "actor": "dana@yourcompany",
      "action": "payment_item.reject",
      "object_type": "payment_item",
      "object_id": "itm_5RnX9cLw3TbM7kQp2VjF",
      "details": {
        "run": "run_8TpQ3xWm6KvB1nRz4LcH",
        "reason": "Harbor Point confirmed by phone that they did not change banks."
      },
      "created_at": "2026-10-06T09:02:47.000Z",
      "chain_seq": 42,
      "prev_hash": "5976adaf43f7c79c6b2b7d0f13675143784301d36e6071af6281f2531365828e",
      "content_hash": "ac61c96d349cb60a92b99c03387a187abe82abf502a09098165a3bd9b5434d13",
      "hash": "06aba9b80b67e79a14f0f2c267d436cd7e0e09c561343aedaa35458692b5117b"
    },
    {
      "id": "aud_3TnJ9vLq6WbR2kPm8CxD",
      "actor": "sam@yourcompany",
      "action": "payment_run.released",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "rejected": 1
      },
      "created_at": "2026-10-06T09:05:12.000Z",
      "chain_seq": 43,
      "prev_hash": "06aba9b80b67e79a14f0f2c267d436cd7e0e09c561343aedaa35458692b5117b",
      "content_hash": "840a5e844113338dc88fd8356576fbf0f34f791605494eb7f10492664debcf61",
      "hash": "33b644ad927ab3cf858921b2331e21cfa65d3552530bb4ba2f0d4d7db7b77532"
    }
  ]
}
```

### Check the audit log was not altered

`GET /v1/audit_log/verify` (auth: API key or signed-in admin)

Recomputes your organization's whole chain and reports the first entry that was changed, removed or reordered. `first_break.reason` is `entry_missing`, `link_broken`, `content_changed`, `hash_changed` or `redaction_invalid`. `content_checked` counts the entries whose content was recomputed and matched; `redacted` ones are counted apart. With an anchor, `intact` is false unless that entry still has the hash you kept; `anchor.matches` is `null` when the check stopped before reaching it. A check reads at most 1,000,000 entries and says `complete: false` when it stops there.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `anchor_seq` | integer | No | The number of an entry whose hash you kept. |
| `anchor_hash` | string | No | That hash: 64 characters, `0` to `9` and `a` to `f`. Anything else answers `400 anchor_invalid`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/audit_log/verify?anchor_seq=43&anchor_hash=33b644ad927ab3cf858921b2331e21cfa65d3552530bb4ba2f0d4d7db7b77532" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "audit_chain_verification",
  "organization_id": "org_5RkT8wPq3NmV7xLc2BzH",
  "intact": true,
  "entries": 43,
  "content_checked": 43,
  "redacted": 0,
  "complete": true,
  "head": {
    "chain_seq": 43,
    "hash": "33b644ad927ab3cf858921b2331e21cfa65d3552530bb4ba2f0d4d7db7b77532",
    "created_at": "2026-10-06T09:05:12.000Z"
  },
  "first_break": null,
  "anchor": {
    "chain_seq": 43,
    "hash": "33b644ad927ab3cf858921b2331e21cfa65d3552530bb4ba2f0d4d7db7b77532",
    "matches": true
  },
  "checked_at": "2026-10-07T08:00:00.000Z"
}
```

### List security events

`GET /v1/security_events` (auth: Signed-in admin)

Your [security events](/docs/compliance.md#security-events), newest first, a page at a time: pass the `id` of the last event you have as `after` while `has_more` is true. `alerted_at` is when the alert email went out, for high events. An API key answers `403 session_required`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `severity` | string | No | `high` or `medium`. Anything else answers `400 severity_invalid`. |
| `limit` | integer | No | 1 to 200. Default 50. |
| `after` | string | No | The `id` of the last event of the previous page. |

Request:

```bash
curl "$QUARTER_API_URL/v1/security_events?severity=high&limit=1" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "list",
  "has_more": false,
  "data": [
    {
      "id": "sev_8LmQ2vTx5RnK9wPc4HdJ",
      "object": "security_event",
      "kind": "organization_settings_changed",
      "severity": "high",
      "title": "Security contacts or evidence retention changed",
      "actor": "controller@yourcompany",
      "address": "203.0.113.24",
      "subject": {
        "type": "organization",
        "id": "org_5RkT8wPq3NmV7xLc2BzH"
      },
      "details": {
        "fields": [
          "security_contacts"
        ]
      },
      "created_at": "2026-10-06T14:02:51.000Z",
      "alerted_at": "2026-10-06T14:02:52.000Z"
    }
  ]
}
```

### Check the security events were not altered

`GET /v1/security_events/verify` (auth: Signed-in admin)

Recomputes your security event chain, exactly as [Check the audit log was not altered](/docs/compliance.md#get-v1-audit-log-verify) does the audit log, and answers in the same shape with `object: "security_chain_verification"`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `anchor_seq` | integer | No | The number of an event whose hash you kept. |
| `anchor_hash` | string | No | That hash: 64 characters, `0` to `9` and `a` to `f`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/security_events/verify" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "security_chain_verification",
  "organization_id": "org_5RkT8wPq3NmV7xLc2BzH",
  "intact": true,
  "entries": 12,
  "content_checked": 12,
  "redacted": 0,
  "complete": true,
  "head": {
    "chain_seq": 12,
    "hash": "06aba9b80b67e79a14f0f2c267d436cd7e0e09c561343aedaa35458692b5117b",
    "created_at": "2026-10-06T14:02:51.000Z"
  },
  "first_break": null,
  "checked_at": "2026-10-07T08:00:00.000Z"
}
```

### Download a vendor's claim file

`GET /v1/vendors/{vendor}/claim_file` (auth: API key or signed-in approver)

The evidence behind a vendor's bank details and the payments to it, described [above](/docs/compliance.md#claim-file). Viewers answer `403 role_required`. The response below is shortened: `vendor`, `verifications`, `payments` and `audit_entries` hold every field described above.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vendor` | string | Yes | The vendor id, starting with `ven_`. |

Request:

```bash
curl "$QUARTER_API_URL/v1/vendors/ven_7Qm2KxR9pLwT4nVb8YcD/claim_file" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "claim_file",
  "generated_at": "2026-10-07T08:00:00.000Z",
  "generated_by": "dana@yourcompany",
  "organization": {
    "id": "org_5RkT8wPq3NmV7xLc2BzH",
    "name": "Lakeshore Fabrication"
  },
  "environment": "live",
  "vendor": {
    "id": "ven_7Qm2KxR9pLwT4nVb8YcD",
    "name": "Harbor Point Logistics LLC"
  },
  "bank_changes": [
    {
      "bank_account_id": "ba_3HfJ6tWq1ZsN8kPm2RxA",
      "routing_number": "091408501",
      "last4": "7365",
      "holder_name": "Harbor Point Logistics LLC",
      "previous_last4": "0418",
      "added_at": "2026-10-05T14:21:09.000Z",
      "added_by": "sam@yourcompany",
      "arrived_through": "manual",
      "arrived_through_description": "entered in Quarter by a person",
      "audit_entry": 38,
      "status": "rejected",
      "verified_at": null,
      "verified_method": null,
      "replaced_at": null
    }
  ],
  "verifications": {
    "evidence": [],
    "requests": []
  },
  "payments": [],
  "fraud_reports": [],
  "audit_entries": [
    {
      "id": "aud_4MbT7xKq2WnR9pLv5HcZ",
      "actor": "api_key:qk_test_Xy7P",
      "action": "payment_run.scanned",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "format": "nacha",
        "payments": 3
      },
      "created_at": "2026-10-06T08:15:03.000Z",
      "chain_seq": 41,
      "prev_hash": "63419f9c1c003c02cf7b66c0bc53e0f1c8e642ab538081016caaaa6e47665b87",
      "content_hash": "2553922bc2c904474153daae11161d12d43c9d81fafa39a450ed8f53974d3244",
      "hash": "5976adaf43f7c79c6b2b7d0f13675143784301d36e6071af6281f2531365828e"
    },
    {
      "id": "aud_8KcW2pRt5NvQ1mXb7LzF",
      "actor": "dana@yourcompany",
      "action": "payment_item.reject",
      "object_type": "payment_item",
      "object_id": "itm_5RnX9cLw3TbM7kQp2VjF",
      "details": {
        "run": "run_8TpQ3xWm6KvB1nRz4LcH",
        "reason": "Harbor Point confirmed by phone that they did not change banks."
      },
      "created_at": "2026-10-06T09:02:47.000Z",
      "chain_seq": 42,
      "prev_hash": "5976adaf43f7c79c6b2b7d0f13675143784301d36e6071af6281f2531365828e",
      "content_hash": "ac61c96d349cb60a92b99c03387a187abe82abf502a09098165a3bd9b5434d13",
      "hash": "06aba9b80b67e79a14f0f2c267d436cd7e0e09c561343aedaa35458692b5117b"
    },
    {
      "id": "aud_3TnJ9vLq6WbR2kPm8CxD",
      "actor": "sam@yourcompany",
      "action": "payment_run.released",
      "object_type": "payment_run",
      "object_id": "run_8TpQ3xWm6KvB1nRz4LcH",
      "details": {
        "rejected": 1
      },
      "created_at": "2026-10-06T09:05:12.000Z",
      "chain_seq": 43,
      "prev_hash": "06aba9b80b67e79a14f0f2c267d436cd7e0e09c561343aedaa35458692b5117b",
      "content_hash": "840a5e844113338dc88fd8356576fbf0f34f791605494eb7f10492664debcf61",
      "hash": "33b644ad927ab3cf858921b2331e21cfa65d3552530bb4ba2f0d4d7db7b77532"
    }
  ],
  "chain": {
    "how_to_verify": "Each audit entry carries its place in the chain...",
    "verification": {
      "object": "audit_chain_verification",
      "intact": true
    }
  },
  "truncated": [],
  "summary": "Claim file: Harbor Point Logistics LLC ..."
}
```

## Records and privacy requests

Payment evidence (runs, payments, decisions, call-backs, verifications and the audit log) is kept while the account is open, and for 7 years after it closes unless you choose longer. When an account that sent live payments is erased, Quarter first keeps a sealed copy of its records for that period, which only Quarter staff can open to hand back to you. Uploaded payment files are deleted 90 days after they are scanned or released.

### Read retention and security contacts

`GET /v1/organization` (auth: Signed-in admin)

How long each kind of record is kept, and who Quarter tells first about a security incident, besides your admins.

Request:

```bash
curl "$QUARTER_API_URL/v1/organization" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "object": "organization",
  "id": "org_7TqW2nLp9VkR4mXb8HcZ",
  "name": "Lakeshore Fabrication Inc.",
  "retention": {
    "evidence_years": 7,
    "payment_files_days": 90,
    "erase_after_closing_days": 30
  },
  "security_contacts": [
    {
      "name": "Sam Rivera",
      "email": "sam@yourcompany",
      "phone": "+1 312 555 0110"
    }
  ]
}
```

### Change retention or security contacts

`PATCH /v1/organization` (auth: Signed-in admin)

Fields you leave out are kept. The audit log records which fields changed, never the contacts themselves. An API key answers `403 session_required`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `evidence_retention_years` | integer | No | 7 to 30. How long payment evidence is kept, including after the account closes. |
| `security_contacts` | object[] | No | Up to 5 people, each with `email` and optionally `name` and `phone`. An empty list leaves only your admins. |

Request:

```bash
curl -X PATCH "$QUARTER_API_URL/v1/organization" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"evidence_retention_years":10,"security_contacts":[{"name":"Sam Rivera","email":"sam@yourcompany","phone":"+1 312 555 0110"}]}'
```

Response:

```json
{
  "object": "organization",
  "id": "org_7TqW2nLp9VkR4mXb8HcZ",
  "name": "Lakeshore Fabrication Inc.",
  "retention": {
    "evidence_years": 10,
    "payment_files_days": 90,
    "erase_after_closing_days": 30
  },
  "security_contacts": [
    {
      "name": "Sam Rivera",
      "email": "sam@yourcompany",
      "phone": "+1 312 555 0110"
    }
  ]
}
```

A vendor contact may ask what your business holds about them, or ask for it to be deleted or corrected. These routes find a contact's email, phone number or name in vendor links, verification evidence, call-back notes and the audit log. Erasing replaces it with a pseudonym and keeps every record, so the evidence of each check survives; an email keeps the vendor's domain. A correction never rewrites that evidence. Payments, vendor names and bank details are payment records you keep for your retention period: they are listed as `retained` and never changed. A vendor's own name is corrected on the vendor. Each request is in the audit log by kind and count, never by value. Send exactly one of `email`, `phone` or `name`.

### Find a contact's personal data

`POST /v1/personal_data/search` (auth: Signed-in admin)

A POST, so the email or phone number never sits in a URL. The answer is the copy to give the person who asked.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | No | The contact email. |
| `phone` | string | No | 7 to 15 digits. Spaces, punctuation and a leading US 1 are ignored. |
| `name` | string | No | The whole name, matched without regard to case. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/personal_data/search" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"maria@harborpoint.example"}'
```

Response:

```json
{
  "object": "personal_data",
  "kind": "email",
  "records": [
    {
      "object": "verification_request",
      "id": "vrq_2KpT9wLn4RvQ7mXc1HbZ",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "field": "contact_email",
      "value": "maria@harborpoint.example",
      "created_at": "2026-10-05T13:41:02.000Z",
      "retained": false
    }
  ],
  "truncated": false
}
```

### Erase a contact's personal data

`POST /v1/personal_data/erase` (auth: Signed-in admin)

Open vendor links to an erased email are cancelled. `changed` counts the records changed; `retained` lists the payment records kept.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | No | The contact email. |
| `phone` | string | No | 7 to 15 digits. Spaces, punctuation and a leading US 1 are ignored. |
| `name` | string | No | The whole name, matched without regard to case. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/personal_data/erase" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"maria@harborpoint.example"}'
```

Response:

```json
{
  "object": "personal_data_request",
  "action": "erased",
  "kind": "email",
  "changed": 2,
  "retained": []
}
```

### Answer a request to correct a contact's personal data

`POST /v1/personal_data/correct` (auth: Signed-in admin)

A correction never rewrites evidence of a past contact: the number a call-back dialled, the address a code was sent to and the name the caller recorded are accurate records of what happened. Every record is listed in `retained` with the reason, for your answer to the person. Open vendor links to the email are cancelled (`links_cancelled`), so you can send a new link to an address you confirmed. Change a vendor's own name on the vendor.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | No | The contact email. |
| `phone` | string | No | 7 to 15 digits. Spaces, punctuation and a leading US 1 are ignored. |
| `name` | string | No | The whole name, matched without regard to case. |
| `corrected` | string | No | The value the person says is right. Not stored. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/personal_data/correct" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"phone":"+1 312 555 0148","corrected":"+1 312 555 0184"}'
```

Response:

```json
{
  "object": "personal_data_request",
  "action": "corrected",
  "kind": "phone",
  "changed": 0,
  "links_cancelled": 0,
  "retained": [
    {
      "object": "evidence",
      "id": "evd_7RmQ2xLc5TnW1pZk8HdY",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "field": "details.phone_number",
      "value": "+1 312 555 0148",
      "created_at": "2026-10-05T13:41:02.000Z",
      "retained": true,
      "reason": "a record of a past contact (the number called, the address a code was sent to, the name recorded), accurate as a record of what happened; Quarter never rewrites it"
    }
  ]
}
```

## Insider controls

Some payment fraud starts inside the business: an employee changes a vendor to their own account, adds a vendor and pays it, or splits a payment to stay under the second approver. These controls make that harder and leave a record.

### Segregation of duties

- Approvals, call-backs, releases and fraud reports are made only by people signed in to the console. An API key answers `403 session_required`.
- Nobody approves a payment to a vendor whose bank details they added or changed in the last 90 days, as the first approver or the second. The answer is `403 approver_changed_details`. Rejecting is always allowed.
- A payment to that vendor made by that same person is held as [`second_person_required`](/docs/checks.md#second-person-required), for someone else to approve.
- Nobody releases a run with a clear payment to that vendor: `403 releaser_changed_details`. Someone else releases it. A payment to that vendor that someone else approved does not stop the release.
- The person who added bank details may not confirm them by call-back: `403 attester_changed_details`.
- Only a signed-in admin can unblock a blocked vendor: `403 unblock_needs_admin`.
- A person added to the organization after it went live is not one of the two approvers of a payment at or above the two-person threshold for their first 7 days: `403 approver_recently_added`. So an admin cannot add a second account of their own and approve a large payment twice. Rejecting is always allowed.
- Every admin and [security contact](#records-and-privacy) is emailed when a member is added or removed, a role changes, or the check settings change: who made the change, what changed and when.
- People are compared by email with the person who added the details, as the audit trail records them. Details added with an API key are recorded against the key, not a person, so these rules cover changes made by people signed in to Quarter.

### Employee accounts

Keep a list of your employees' own bank accounts, from payroll. A vendor payment to one of those accounts, or to a vendor whose account on file is one of them, is held as [`employee_account_match`](/docs/checks.md#employee-account-match). A [payroll](/docs/checks.md#payroll) payment to one of them is held when its employee id is another employee's, so keep the list under the same employee ids as your payroll file.

- Quarter keeps only a fingerprint of each account and your own id for the employee. The account numbers are dropped as soon as they are fingerprinted, and they are never returned.
- Employee accounts are kept out of the network. Once an account is on the list, your business adds nothing about it to the network. A confirmation made before the account was listed still counts.
- Each import replaces the whole list. Sending the same list twice changes nothing. The audit log records the counts, never the accounts.

### Other insider checks

Three warnings look for patterns rather than lists: [`split_below_threshold`](/docs/checks.md#split-below-threshold), [`vendor_new_paid_fast`](/docs/checks.md#vendor-new-paid-fast) and [`vendor_dormant_reactivated`](/docs/checks.md#vendor-dormant-reactivated).

### Endpoints

### Import the employee account list

`POST /v1/employee_accounts/import` (auth: Signed-in admin)

Replaces the list with these accounts. Needs a signed-in admin, never an API key, since the list decides which payroll warns instead of holding. Returns how many accounts the list now holds, and how many were added and removed. Every change is a high [security event](/docs/compliance.md#security-events) and is emailed to the admins.

A list that would remove more than half the accounts on file answers `409 confirm_required`; send it again with `confirm: true` to replace the list.

Errors, all `400`: `employees_invalid`, `employee_ref_invalid`, `routing_number_invalid` and `account_number_invalid`. The message names the employee by position.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `employees` | object[] | Yes | 1 to 10,000 accounts, each with `employee_ref` (your own id for the employee, up to 100 characters), `routing_number` and `account_number`. |
| `confirm` | boolean | No | `true` to replace the list even when the new one removes more than half its accounts. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/employee_accounts/import" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"employees":[{"employee_ref":"E-1043","routing_number":"071921008","account_number":"88301274"},{"employee_ref":"E-1187","routing_number":"122611005","account_number":"40917736"}]}'
```

Response:

```json
{
  "object": "employee_account_import",
  "accounts": 2,
  "added": 2,
  "removed": 0
}
```

### Read the employee account list

`GET /v1/employee_accounts` (auth: API key)

How many accounts and employees are on the list, and when and by whom it was last imported. The accounts themselves are never returned.

Request:

```bash
curl "$QUARTER_API_URL/v1/employee_accounts" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "employee_accounts",
  "accounts": 2,
  "employees": 2,
  "imported_at": "2026-10-05T09:12:30.000Z",
  "imported_by": "api_key:qk_test_Xy7P"
}
```

### Report vendor changes

`GET /v1/reports/vendor_changes` (auth: API key)

Every change to vendors and their bank details in a period, oldest first, with who made it. `people` sums it by person, those with the most bank detail changes first. For bank details, it gives the old and new last 4, and how and by whom the new details were confirmed.

The report stops at 10,000 changes and says so in `truncated`; narrow the period then. A bad date answers `400 from_invalid` or `400 to_invalid`.

**Query parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string | No | `YYYY-MM-DD`. Default 90 days before `to`. |
| `to` | string | No | `YYYY-MM-DD`, included. Default today. |

Request:

```bash
curl "$QUARTER_API_URL/v1/reports/vendor_changes?from=2026-07-08&to=2026-10-06" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "vendor_change_report",
  "from": "2026-07-08",
  "to": "2026-10-06",
  "truncated": false,
  "people": [
    {
      "actor": "dana@yourcompany",
      "changes": 1,
      "bank_details_changed": 1,
      "vendors": 1
    },
    {
      "actor": "api_key:qk_test_Xy7P",
      "changes": 1,
      "bank_details_changed": 0,
      "vendors": 1
    }
  ],
  "data": [
    {
      "id": "aud_6RkT2vNp9WqL4mXb8HcJ",
      "object": "vendor_change",
      "at": "2026-10-05T13:40:12.000Z",
      "actor": "api_key:qk_test_Xy7P",
      "action": "vendor.created",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "vendor_name": "Harbor Point Logistics LLC",
      "fields": null,
      "last4": null,
      "previous_last4": null,
      "verified_method": null,
      "verified_by": null
    },
    {
      "id": "aud_9LwB3nTq7KpR2vMx5CzF",
      "object": "vendor_change",
      "at": "2026-10-05T16:02:44.000Z",
      "actor": "dana@yourcompany",
      "action": "vendor.bank_account_added",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "vendor_name": "Harbor Point Logistics LLC",
      "fields": null,
      "last4": "8226",
      "previous_last4": "7365",
      "verified_method": null,
      "verified_by": null
    }
  ]
}
```
