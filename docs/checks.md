# Checks and settings

> The twenty-five checks Quarter runs on payments, the exact message each gives, its points, and the settings that decide whether it holds, warns or is off.

Every payment in a run goes through every check that applies to it. A check that fires adds a finding to the payment: a `code`, a `severity`, a `message` and its `points`. A `hold` finding keeps the payment out of the released file until a person approves it. A `warn` finding is shown to the reviewer and does not hold.

A finding:

```json
{
  "code": "account_not_on_file",
  "severity": "hold",
  "message": "this pays Harbor Point Logistics LLC at an account that is not the one on file",
  "points": 40
}
```

Messages are plain words, written to be shown to the reviewer as they are. In the messages below, the parts in braces are filled in from the payment. Amounts are written like `$48,250.00`.

## All checks

| Code | Default | Points | Fires when |
| --- | --- | --- | --- |
| [`unknown_payee`](/docs/checks.md#unknown-payee) | Hold | 20 | The payee matches no vendor. |
| [`vendor_blocked`](/docs/checks.md#vendor-blocked) | Hold (always) | 50 | You blocked this vendor from being paid. |
| [`unverified_account`](/docs/checks.md#unverified-account) | Hold | 30 | The account is the one on file, but nobody ever confirmed it with the vendor. |
| [`account_changed_recently`](/docs/checks.md#account-changed-recently) | Hold; warn once confirmed | 40; 10 (bank details changed recently, and confirmed) | The vendor changed its bank details, and the new details are not confirmed, or were confirmed within the cooling period. |
| [`account_not_on_file`](/docs/checks.md#account-not-on-file) | Hold | 40 | The run pays a known vendor at an account other than the one on file. |
| [`name_mismatch`](/docs/checks.md#name-mismatch) | Warn | 15 | The payee name in the file does not match the vendor. |
| [`first_payment`](/docs/checks.md#first-payment) | Warn | 5 | The first payment to this vendor. |
| [`amount_unusual`](/docs/checks.md#amount-unusual) | Warn | 10 | Far above what this vendor is usually paid. |
| [`duplicate_payment`](/docs/checks.md#duplicate-payment) | Hold | 30 | The same amount to the same account twice. |
| [`shared_account`](/docs/checks.md#shared-account) | Hold | 30 | Another of your vendors is paid at this same account. |
| [`network_flagged`](/docs/checks.md#network-flagged) | Warn | 30 | A business on Quarter reported this account in connection with a payment fraud. |
| [`sanctions_match`](/docs/checks.md#sanctions-match) | Hold (always) | 60; 0 (sanctions list out of date, so not screened) | The payee name resembles a name on OFAC's SDN or Consolidated lists. |
| [`routing_invalid`](/docs/checks.md#routing-invalid) | Hold | 25 | The routing number is not a valid US bank routing number. |
| [`iban_invalid`](/docs/checks.md#iban-invalid) | Hold | 25 | The IBAN on an international payment fails its checksum. |
| [`check_number_reused`](/docs/checks.md#check-number-reused) | Hold | 30 | A check number already used on the same account. |
| [`payee_name_altered`](/docs/checks.md#payee-name-altered) | Warn | 20 | A check's payee line is close to the vendor's name on file, but not the same. |
| [`just_under_threshold`](/docs/checks.md#just-under-threshold) | Warn | 10 | A check for just under the two-person threshold. |
| [`employee_account_match`](/docs/checks.md#employee-account-match) | Hold | 40; 10 (payroll to an employee account, employee id not compared) | The account paid, or the vendor's account on file, is on your employee account list. |
| [`vendor_dormant_reactivated`](/docs/checks.md#vendor-dormant-reactivated) | Warn | 20 | A vendor not paid for a year has bank details that changed since its last payment. |
| [`split_below_threshold`](/docs/checks.md#split-below-threshold) | Warn | 15 | Payments to one vendor within 7 days, each under the two-person threshold, add up to it or more. |
| [`vendor_new_paid_fast`](/docs/checks.md#vendor-new-paid-fast) | Warn | 15 | A vendor added in the last 14 days is paid for the first time by the person who added it. |
| [`request_domain_lookalike`](/docs/checks.md#request-domain-lookalike) | Warn | 40; 15 (change request came from a domain other than the vendor's) | The request for the unconfirmed bank details came by email from a domain that imitates the vendor's, or from a domain other than the vendor's. |
| [`request_domain_new`](/docs/checks.md#request-domain-new) | Warn | 30 | The request for the unconfirmed bank details came by email from a domain registered in the 90 days before it, or after the vendor was added. |
| [`request_domain_no_dmarc`](/docs/checks.md#request-domain-no-dmarc) | Warn | 5 | The request for the unconfirmed bank details came by email from the vendor's own domain, which does not refuse mail forged in its name. |
| [`second_person_required`](/docs/checks.md#second-person-required) | Hold (always) | 0; 30 (paid by the person who changed the bank details) | The payment is at or above the two-person threshold, or the person paying changed the vendor's bank details in the last 90 days. |

## Points and the order of held payments

Each check has a fixed number of points, in the table above. A payment's `score` is the sum of the points of its findings, holds and warnings alike, so the reasons shown with a payment always add up to its score. The [held payments queue](/docs/payment-runs.md#get-v1-payment-items) lists the highest score first, then the payment that has waited longest, so the payment with the strongest reasons is looked at first.

- Points never decide whether a payment is held. The checks and your settings do. A payment with a low score can be held, and a payment with a high score from warnings alone is not.
- Every 10 points means a payment with that reason is judged about twice as likely to be fraud or an error as one without it, so 40 points is about 16 times. These are estimates written by Quarter from published fraud reports and how the checks work. They are not yet measured: no public data gives the precision of these checks, and Quarter has too few recorded outcomes to measure them.
- Some checks give different points for different evidence. Bank details changed recently score 40 while not confirmed with the vendor, and 10 once confirmed: a change alone is common, since many vendors change bank details each year, while a change nobody confirmed is how vendor impersonation works.
- Two weaker reasons together add up. A new vendor paid by the person who added it, at an amount just under the two-person threshold, scores more than either alone.
- `second_person_required` scores 0 for an amount at or above the threshold, because it is a control, not a suspicion. It scores 30 when the person paying changed the vendor's bank details.
- Quarter changes the table only by publishing a new dated version, and never changes your settings. As outcomes are recorded, [precision per check](/docs/releases.md#get-v1-check-precision) shows how each check's holds turned out, for you to judge.

## Payroll

Payroll and other payments to people are checked like any payment, but most findings warn instead of holding, so wages are not held up. A payment is payroll when its NACHA batch has a consumer entry class (`PPD`, or `WEB`, `TEL`, `CIE`, `POP`, `ARC`, `BOC`, `RCK`, `POS`, `MTE`, `SHR`), or when a CSV, check register or list is sent with `payroll: true`. Its item shows `payroll: true` and, for NACHA, its `entry_class`.

- A finding that would hold is a warning instead, whatever your settings say for that check.
- `sanctions_match` and `second_person_required` still hold: a payroll payment at or above the two-person threshold needs two people, and so does one paid by the person who changed the payee's bank details.
- [`employee_account_match`](/docs/checks.md#employee-account-match) holds a payroll payment to an employee's account made under another employee's id, and warns when the id cannot be compared.
- `unknown_payee` does not run on payroll: paying people who are not vendors is what payroll does.
- Anyone who can upload a run, a signed-in person or an API key, can send a payroll file. The audit log records who uploaded it and how many of its payments were payroll.
- A payroll entry that pays a vendor on file, by its id, account or name, is checked as a vendor payment, so marking a file as payroll never lets a held vendor payment through.

## Checks on paper checks

A [check register](/docs/payment-runs.md#check-register) pays names, not accounts. So the checks about the account paid do not apply to a check: `unverified_account`, `account_changed_recently`, `account_not_on_file`, `shared_account`, `network_flagged`, `routing_invalid`, `iban_invalid` and the three `request_domain` checks. Three checks apply only to checks: `check_number_reused`, `payee_name_altered` and `just_under_threshold`. The rest apply to every payment.

> **Note:** The checks lower the risk of paying a fraudster. They do not guarantee that every fraud is caught. A held payment is a question for a person, not a verdict.

## Settings

Settings decide how payments are checked for your account. Set any check to `hold`, `warn` or `off`, or back to `default`, except the three that always hold. The other windows, such as 365 days for a dormant vendor, are fixed. Every change is recorded in the [audit log](/docs/compliance.md#get-v1-audit-log) with the settings it produced, and the [written procedure](/docs/compliance.md) follows the settings at once, so the document and the controls never disagree.

### Fields

| Field | Default | Meaning |
| --- | --- | --- |
| `checks` | `default` for each | Each check set to `hold`, `warn`, `off` or `default` (the default in [Checks](/docs/checks.md#all-checks)). `vendor_blocked`, `sanctions_match` and `second_person_required` always show `hold` and cannot be changed. |
| `mandatory_checks` |  | The checks that cannot be changed. Read only. |
| `defaults` |  | What each check does when left at `default`. Read only. |
| `check_names` |  | The plain name of each check, as the console shows it. Read only. |
| `check_points` |  | The [points](/docs/checks.md#points) of each check and of its variants. Read only. |
| `cooling_days` | 10 | How long confirmed new bank details still warn, for [`account_changed_recently`](/docs/checks.md#account-changed-recently). 0 to 90. |
| `unusual_multiplier` | 3 | How many times the usual amount counts as unusual, for [`amount_unusual`](/docs/checks.md#amount-unusual). 1.5 to 100. |
| `two_person_threshold` | 50000 | In dollars, 0 to 1,000,000,000. Every payment of this amount or more is held as [`second_person_required`](/docs/checks.md#second-person-required), and approving it needs [two different people](/docs/releases.md#two-person-approval). 0 holds every payment for two people. Also used by [`just_under_threshold`](/docs/checks.md#just-under-threshold) and [`split_below_threshold`](/docs/checks.md#split-below-threshold). |
| `last_reviewed_at`, `last_reviewed_by` | `null` | The last yearly review of the procedure. Set by [`POST /v1/compliance/reviews`](/docs/compliance.md#post-v1-compliance-reviews). |

### Endpoints

### Read the settings

`GET /v1/settings` (auth: API key)

The settings in force. An account that never changed them gets the defaults.

Request:

```bash
curl "$QUARTER_API_URL/v1/settings" \
  -H "authorization: Bearer $QUARTER_API_KEY"
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
        }
      ]
    }
  },
  "cooling_days": 10,
  "unusual_multiplier": 3,
  "two_person_threshold": 50000,
  "last_reviewed_at": null,
  "last_reviewed_by": null
}
```

### Change the settings

`PUT /v1/settings` (auth: Signed-in admin)

A signed-in admin only; an API key answers `403 session_required`. Changes the fields you send and keeps the rest. Inside `checks`, only the checks you name change. A change applies to runs uploaded after it, not to runs already scanned.

Errors: `checks_invalid`, `check_unknown`, `check_mandatory`, `check_mode_invalid`, `cooling_days_invalid`, `unusual_multiplier_invalid`, `two_person_threshold_invalid`, all `400`.

**Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `checks` | object | No | Check codes mapped to `hold`, `warn`, `off` or `default`. |
| `cooling_days` | integer | No | 0 to 90. |
| `unusual_multiplier` | number | No | 1.5 to 100. |
| `two_person_threshold` | number | No | Dollars, 0 to 1,000,000,000. |

Request:

```bash
curl -X PUT "$QUARTER_API_URL/v1/settings" \
  -H "authorization: Bearer $QUARTER_SESSION_TOKEN" \
  -H "content-type: application/json" \
  -d '{"checks":{"first_payment":"hold"},"cooling_days":14,"two_person_threshold":25000}'
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
    "first_payment": "hold",
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
        }
      ]
    }
  },
  "cooling_days": 14,
  "unusual_multiplier": 3,
  "two_person_threshold": 25000,
  "last_reviewed_at": null,
  "last_reviewed_by": null
}
```

## Each check

### `unknown_payee`

**Default: hold. Points: 20.** The payee matches no vendor.

Message:

```shell
{payee name} is not a vendor on file
```

Quarter looks for the vendor by your vendor id, then by the bank account, then by a close name. See [how a payment finds its vendor](/docs/payment-runs.md#matching). Add the vendor and confirm its bank details, or reject the payment.

### `vendor_blocked`

**Default: hold, cannot be turned off. Points: 50.** You blocked this vendor from being paid.

Message:

```shell
{vendor name} is blocked from being paid
```

Set with `PATCH /v1/vendors/{vendor}` and `status: blocked`. It always holds and cannot be changed in settings.

### `unverified_account`

**Default: hold. Points: 30.** The account is the one on file, but nobody ever confirmed it with the vendor.

Message:

```shell
these bank details were never confirmed with the vendor
```

Fires for a vendor whose first and only bank details are `unverified`. Confirm them with a [verification link](/docs/verification.md) or a [call-back](/docs/verification.md#callbacks).

### `account_changed_recently`

**Default: hold. Points: 40; 10 (bank details changed recently, and confirmed).** The vendor changed its bank details, and the new details are not confirmed, or were confirmed within the cooling period.

Messages:

```shell
bank details changed {days} days ago and were not confirmed with the vendor
bank details changed {days} days ago; they were confirmed
```

For a change made today or yesterday, `{days} days ago` reads `today` or `1 day ago`. New details that are not confirmed hold every payment to them, however old the change is. Once they are confirmed, payments within the cooling period (`cooling_days`, default 10) still carry the second message, as a warning. After the cooling period, the check stays quiet.

If you set this check to `hold`, the confirmed case holds too. If you set it to `warn`, the unconfirmed case only warns, which is not advised.

### `account_not_on_file`

**Default: hold. Points: 40.** The run pays a known vendor at an account other than the one on file.

Messages:

```shell
this pays {vendor name} at an account that is not the one on file
{vendor name} has no bank details on file, so this account was never confirmed
{vendor name} has no IBAN on file, so this account was never confirmed
```

The payee matched a vendor by its id, your `external_id` or its name, but the account is not that vendor's current bank details. This is what a fraudulent change looks like when it reaches the payment file before it reaches your vendor records. It also fires when a run still pays details that were replaced.

The third message is for an [international payment check](/docs/payment-checks.md#rails). Bank details on file are US routing and account numbers, so an IBAN is never compared with them.

### `name_mismatch`

**Default: warn. Points: 15.** The payee name in the file does not match the vendor.

Message:

```shell
the payee name "{payee name}" does not match the vendor "{vendor name}"
```

Names are compared after ignoring case, accents, punctuation and suffixes such as Inc or LLC, against both the vendor name and the name on its bank account. Below 0.6 alike, the check fires. On a check, a payee line 0.6 alike or more that is still not the same is [`payee_name_altered`](/docs/checks.md#payee-name-altered) instead.

### `first_payment`

**Default: warn. Points: 5.** The first payment to this vendor.

Message:

```shell
first payment to {vendor name}
```

Counts payments in released runs that were clear or approved.

### `amount_unusual`

**Default: warn. Points: 10.** Far above what this vendor is usually paid.

Message:

```shell
{amount} is more than {multiplier} times the usual {median}
```

Compares the amount with the median of the vendor's last 12 released payments. Fires when the amount is more than `unusual_multiplier` times that median (default 3). It needs at least 3 earlier payments; before that, it stays quiet.

### `duplicate_payment`

**Default: hold. Points: 30.** The same amount to the same account twice.

Messages:

```shell
the same payment appears twice in this run
the same amount was paid to the same account in the last 7 days
the same amount was paid to the same payee in the last 7 days
```

The first message is for a second payment of the same amount to the same account in one run. The second is for a run created in the last 7 days, not cancelled, that has the same payment and did not reject it. The third is the same for a check, which has no account: the same amount to the same vendor, or to the same payee name.

### `shared_account`

**Default: hold. Points: 30.** Another of your vendors is paid at this same account.

Message:

```shell
another vendor on file is paid at this same account
```

Two vendors with one bank account is a sign that one of them is not who it says. It can also be a duplicate vendor record.

### `network_flagged`

**Default: warn. Points: 30.** A business on Quarter reported this account in connection with a payment fraud.

Messages:

```shell
this account was reported as used in fraud by a business on Quarter
this account was reported as used in fraud by {count} businesses on Quarter
```

The finding gives a count, never who reported. See [fraud reports](/docs/network.md#fraud-reports). It warns by default until reports can be disputed, so one business cannot hold another's payments by mistake. Set it to `hold` if you want that.

### `sanctions_match`

**Default: hold, cannot be turned off. Points: 60; 0 (sanctions list out of date, so not screened).** The payee name resembles a name on OFAC's SDN or Consolidated lists.

Messages:

```shell
the payee name resembles a listed party: {listed name}, on {list}
Quarter's sanctions list is missing or out of date, so this payee could not be screened
```

Name screening against OFAC's SDN list and its Consolidated (non-SDN) list, which Quarter loads twice a day, and the Commerce Department's Consolidated Screening List where the deployment loads it. The message names the list. A name at least 0.85 alike fires, and so does a name of 20 or more characters that is the start of a listed name, because NACHA cuts names at 22 characters. A resemblance is not a finding of fact: a person looks and decides. This check always holds and cannot be turned off.

In a live project, while Quarter's copy of either OFAC list is missing or more than 48 hours old, every payment is held with the second message. Test projects are not held for it.

Name screening compares names. It cannot find a business blocked only because listed parties own 50% or more of it (OFAC's 50 percent rule), or an affiliate covered by the Commerce Department's Affiliates Rule, because neither is on a list. Quarter never says a payee is cleared.

### `routing_invalid`

**Default: hold. Points: 25.** The routing number is not a valid US bank routing number.

Message:

```shell
the routing number is not a valid US bank routing number
```

Fires when the ABA checksum fails, or when the first two digits are not a kind of routing number that exists (00 to 12, 21 to 32, 61 to 72, 80). Quarter does not use the Federal Reserve's routing directory, whose terms forbid commercial use without a licence, unless a deployment holds one; then a number missing from it fires too.

### `iban_invalid`

**Default: hold. Points: 25.** The IBAN on an international payment fails its checksum.

Message:

```shell
the IBAN fails its check digits
```

Applies only to international payment checks. The mod-97 check catches a mistyped or altered IBAN before the wire is keyed in.

### `check_number_reused`

**Default: hold. Points: 30.** A check number already used on the same account.

Message:

```shell
check number {number} was already used on this account
```

Checks only. Fires when the same number on the same drawn-on account appears twice in this run, or in any other run that was not cancelled, rejected checks included.

### `payee_name_altered`

**Default: warn. Points: 20.** A check's payee line is close to the vendor's name on file, but not the same.

Message:

```shell
the payee line "{payee name}" is not the vendor's name on file, "{vendor name}"; a bank's payee match compares them exactly
```

Checks only. Fires when the payee line is 0.6 alike or more to the vendor name but not equal to it. Below 0.6, [`name_mismatch`](/docs/checks.md#name-mismatch) fires instead. A bank that matches payee names compares the printed line with the file exactly.

### `just_under_threshold`

**Default: warn. Points: 10.** A check for just under the two-person threshold.

Message:

```shell
{amount} is just under the two-person threshold of {threshold}
```

Checks only. Fires from 90% of `two_person_threshold` up to just under it.

### `employee_account_match`

**Default: hold. Points: 40; 10 (payroll to an employee account, employee id not compared).** The account paid, or the vendor's account on file, is on your employee account list.

Messages:

```shell
this bank account is on your employee account list
this account belongs to {employee ids} on your employee account list, but the payroll entry is for employee id {id}
this account belongs to {employee ids} on your employee account list; the payroll entry's employee id could not be compared
```

You keep the list with [`POST /v1/employee_accounts/import`](/docs/compliance.md#post-v1-employee-accounts-import). A vendor paid at an employee's own account is a common insider fraud. On a check, the vendor's account on file is compared.

On [payroll](/docs/checks.md#payroll), paying an employee's own account is expected, so Quarter compares the entry's employee id (a NACHA entry's individual id, or a CSV's reference) with the employee the account belongs to, ignoring case, spaces, dashes and leading zeros. A match says nothing. A different id, or none, holds with the second message, which is how a payroll clerk paying a made-up or another employee's wage into their own account shows. Quarter trusts the comparison only once another entry in the same run matches its owner; until then a mismatch only warns, with the third message, so a list kept under other ids never holds a whole payroll.

### `vendor_dormant_reactivated`

**Default: warn. Points: 20.** A vendor not paid for a year has bank details that changed since its last payment.

Message:

```shell
{vendor name} was last paid {when}, and its bank details changed {when}
```

Fires when the vendor was last paid 365 days ago or more, and its bank details changed after that payment. `{when}` reads like `today`, `12 days ago` or `14 months ago`.

### `split_below_threshold`

**Default: warn. Points: 15.** Payments to one vendor within 7 days, each under the two-person threshold, add up to it or more.

Messages:

```shell
with another payment to {vendor name} within 7 days, this comes to {total}, over the two-person threshold of {threshold}
with {count} other payments to {vendor name} within 7 days, this comes to {total}, over the two-person threshold of {threshold}
```

Counts payments to the same vendor in this run and in runs created in the last 7 days that were not cancelled, leaving out rejected ones. Each must be under `two_person_threshold`. Splitting one payment into smaller ones is a way around a second approver.

### `vendor_new_paid_fast`

**Default: warn. Points: 15.** A vendor added in the last 14 days is paid for the first time by the person who added it.

Message:

```shell
{vendor name} was added {when} by {person}, who is also the person paying it
```

Fires when the person uploading the run is the person who added the vendor, signed in to Quarter, and the vendor was never paid before. A vendor added with an API key is not traced to a person, so it does not fire.

### `request_domain_lookalike`

**Default: warn. Points: 40; 15 (change request came from a domain other than the vendor's).** The request for the unconfirmed bank details came by email from a domain that imitates the vendor's, or from a domain other than the vendor's.

Messages:

```shell
the request for these bank details came by email from {domain}, which looks like {vendor domain}, the vendor's domain: {how}
the request for these bank details came by email from {domain}, not from {vendor domain}, the vendor's domain on file
```

Fires only when the details were recorded with `request_channel: email` and a `request_sender`, the vendor has an `email_domain`, and the details are not yet confirmed. `{how}` names the imitation, such as `one letter doubled` or `letters swapped for ones that look the same`; see [the sender's domain](/docs/vendors.md#sender-domain). The second message, for a domain other than the vendor's such as a free mail service, scores 15. A domain that shares only a hosting suffix with the vendor's, such as another tenant of the same Microsoft 365 or Shopify suffix, is a domain other than the vendor's.

### `request_domain_new`

**Default: warn. Points: 30.** The request for the unconfirmed bank details came by email from a domain registered in the 90 days before it, or after the vendor was added.

Messages:

```shell
the request came from {domain}, registered {days} days before the request
the request came from {domain}, registered on {date}, after {vendor name} was added
```

The registration date comes from the domain's registry by RDAP when the details are recorded. For a domain registered the same day, `{days} days before the request` reads `the same day as the request`. When the registry did not answer, or gives no date, nothing fires. It does not fire for the vendor's own domain.

### `request_domain_no_dmarc`

**Default: warn. Points: 5.** The request for the unconfirmed bank details came by email from the vendor's own domain, which does not refuse mail forged in its name.

Messages:

```shell
the request came from {domain}, which publishes no DMARC policy, so mail forged in its name is not refused
the request came from {domain}, which has a DMARC policy of none, so mail forged in its name is not refused
```

Fires when the sender's domain is the vendor's, or the vendor has no email domain on file, and the domain's DMARC policy is missing or `none`. Anyone can then send mail that appears to come from it. A weak reason alone, so it scores 5.

### `second_person_required`

**Default: hold, cannot be turned off. Points: 0; 30 (paid by the person who changed the bank details).** The payment is at or above the two-person threshold, or the person paying changed the vendor's bank details in the last 90 days.

Messages:

```shell
{amount} is at or above the two-person threshold of {threshold}, so two different people must approve it
{person} changed {vendor name}'s bank details {when} and is also paying it, so someone else must approve it
```

The first message holds every payment of `two_person_threshold` or more, even when no other check holds it. Its approval needs [two different people](/docs/releases.md#two-person-approval).

The second holds a payment made by a person who added bank details for the vendor in the last 90 days. That person may not approve it. The person paying is the one signed in, or the one named in `uploaded_by` or `requested_by`. Bank details added with an API key are not traced to a person, so they do not fire it.

This check always holds and cannot be turned off. The threshold itself is a setting.
