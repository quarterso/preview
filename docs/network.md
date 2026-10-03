# Account checks and fraud reports

> Check bank details before you pay them, and report an account used in a fraud against you. The network shares counts, never names.

An account check answers one question before anyone pays a set of bank details: what is known about this account? It is useful the moment a vendor sends new details, before you record them, and for platforms that pay on behalf of others.

## What it looks at

- **The routing number:** whether it passes the ABA checksum and has the structure of a real routing number. `bank_name` is `null`: the Federal Reserve's routing directory may not be used commercially without a licence, and Quarter consults it only where a deployment holds one.
- **The network:** how many businesses on Quarter confirmed this account by call-back (`verified_by`), and how many reported it in connection with a payment fraud (`flagged_by`).
- **Your own records:** which of your vendors have these as their current bank details, and how close the name you sent is to theirs (`name_score`, 0 to 1).
- **Sanctions:** name screening against OFAC's SDN and Consolidated lists, when you send a `name`; each match names its `list`. A resemblance is something for a person to look at, not a finding of fact. Name screening cannot find a business blocked only because listed parties own 50% or more of it.

## The network

Customers add to the network as they work. A confirmed [call-back](/docs/verification.md#callbacks) adds one to `verified_by` for that account, once per business. A [fraud report](/docs/network.md#fraud-reports) adds one to `flagged_by`, once per business. The network stores a keyed fingerprint of the account, never the account number. Only live projects contribute: a test project's call-backs and reports reach nobody, its own account checks included.

The network shares counts only. No response, finding or event ever says which business confirmed or reported an account. Bank login results from [verification links](/docs/verification.md) are not shared at all.

The network reports on businesses only. An account tied to a person, meaning a vendor marked `individual` or an account on an [employee list](/docs/compliance.md#employee-accounts), never enters it and is never answered from it: its counts read zero, and a payment to a person gets no `network_flagged` warning. A report about a person's account, used to decide a payment to them, could be a consumer report under the Fair Credit Reporting Act. The database enforces this, not only the code.

> **Note:** The network is built and starts empty. It fills only as businesses use Quarter in live mode, so a count of zero means nobody on Quarter has seen the account, not that it is safe.

## Recommendation

| `recommendation` | When |
| --- | --- |
| `do_not_pay` | Any business reported the account (`flagged_by` above 0), or the routing number is not valid. |
| `known` | One of your vendors has these as confirmed bank details. |
| `verify_first` | Anything else. Confirm the details with the vendor before paying them. |

### Check an account

`POST /v1/account_checks` (auth: API key)

Stores nothing: the account is not saved, and the check is not recorded. Each organization can run 60 a minute; past that, the answer is `429 rate_limited`.

In this example, Harbor Point has just asked to be paid at new details. Another business on Quarter confirmed that account by call-back. It is on file with you as unconfirmed details.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `routing_number` | string | Yes | The 9-digit routing number. |
| `account_number` | string | Yes | 4 to 17 letters or digits. |
| `name` | string | No | The account holder or payee name, for the name score and sanctions name screening. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/account_checks" \
  -H "authorization: Bearer $QUARTER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"routing_number":"263391271","account_number":"99300418226","name":"Harbor Point Logistics"}'
```

Response:

```json
{
  "object": "account_check",
  "routing": {
    "valid": true,
    "bank_name": null
  },
  "network": {
    "verified_by": 1,
    "flagged_by": 0,
    "disputed": false
  },
  "on_file": [
    {
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "vendor_name": "Harbor Point Logistics LLC",
      "status": "unverified",
      "name_score": 1
    }
  ],
  "sanctions": [],
  "recommendation": "verify_first"
}
```

An account reported by two businesses:

```json
{
  "object": "account_check",
  "routing": {
    "valid": true,
    "bank_name": null
  },
  "network": {
    "verified_by": 0,
    "flagged_by": 2,
    "disputed": false
  },
  "on_file": [],
  "sanctions": [],
  "recommendation": "do_not_pay"
}
```

## Fraud reports

When a fraudster gets you to pay an account, or tries to, a person signed in to the console reports the account from a live project. An API key cannot report or retract: it answers `403 session_required`. From then on, any payment to it by any business on Quarter gets a [`network_flagged`](/docs/checks.md#network-flagged) warning (a hold if that business chose one), and an [account check](/docs/network.md) on it says `do_not_pay`.

### What other businesses see

- A count: how many businesses reported the account. Never which ones.
- Factual wording only. The account was reported in connection with a payment fraud. Quarter does not say who owns the account or that its owner did anything.
- Nothing from your description. The description stays with your report, for your records and for any dispute.

Each business counts once per account, however many reports it makes. The `fraud_report.created` [event](/docs/webhooks.md#event-types) goes to your own webhooks only.

### Disputes

A business that says a report about its account is wrong can write to Quarter. Quarter staff open a dispute and check it, with the business and with the reporters. While it is open, the reports still count, so a complaint alone never clears a reported account, and an account check answers `disputed: true`. If Quarter upholds the dispute, every report made before the decision stops counting toward `flagged_by`. A report made afterwards counts, since it is new. Your own report stays in your records either way.

### Retracting a report

A report made in error can be withdrawn. When you retract your last open report on an account, your business stops counting toward its `flagged_by`. Reports by other businesses are not affected. The report itself is kept, marked as retracted, and the retraction is in the audit log.

### Endpoints

### Report an account

`POST /v1/fraud_reports` (auth: Signed-in approver)

Records the report and adds your business to the account's `flagged_by` count. Returns the routing number and the last 4 digits only.

An organization can make 10 reports a day; past that, the answer is `429 fraud_report_limit`. A `vendor_id` that is not yours answers `404 vendor_not_found`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `routing_number` | string | Yes | The 9-digit routing number. |
| `account_number` | string | Yes | 4 to 17 letters or digits. |
| `description` | string | Yes | What happened, 10 to 2,000 characters. Kept for your records; never shared. |
| `reporter` | string | No | Your own email, as the person reporting. Taken from the session; any other email answers `400 reporter_not_you`. Kept in the audit trail. |
| `vendor_id` | string | No | The vendor the fraudster pretended to be, if any. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/fraud_reports" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"routing_number":"042815936","account_number":"70019934417","vendor_id":"ven_7Qm2KxR9pLwT4nVb8YcD","description":"An email from a lookalike Harbor Point address asked us to pay this account. Harbor Point confirmed by phone it was not them.","reporter":"dana@yourcompany"}'
```

Response:

```json
{
  "id": "frd_7MxQ2vJk9LpT4bWn6HcR",
  "object": "fraud_report",
  "routing_number": "042815936",
  "last4": "4417"
}
```

### List your reports

`GET /v1/fraud_reports` (auth: API key)

This business's own reports, newest first, up to 500. Other businesses' reports are never listed.

Request:

```bash
curl "$QUARTER_API_URL/v1/fraud_reports" \
  -H "authorization: Bearer $QUARTER_API_KEY"
```

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "frd_7MxQ2vJk9LpT4bWn6HcR",
      "routing_number": "042815936",
      "last4": "4417",
      "vendor_id": "ven_7Qm2KxR9pLwT4nVb8YcD",
      "description": "An email from a lookalike Harbor Point address asked us to pay this account. Harbor Point confirmed by phone it was not them.",
      "reported_by": "dana@yourcompany",
      "created_at": "2026-10-08T11:20:05.000Z",
      "retracted_at": null,
      "object": "fraud_report"
    }
  ]
}
```

### Retract a report

`POST /v1/fraud_reports/{report}/retract` (auth: Signed-in approver)

Withdraws a report made in error. A report that does not exist or was already retracted answers `400 report_not_open`.

**Path parameters**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `report` | string | Yes | The report id, starting with `frd_`. |

Request:

```bash
curl -X POST "$QUARTER_API_URL/v1/fraud_reports/frd_7MxQ2vJk9LpT4bWn6HcR/retract" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN"
```

Response:

```json
{
  "id": "frd_7MxQ2vJk9LpT4bWn6HcR",
  "object": "fraud_report",
  "retracted": true
}
```
