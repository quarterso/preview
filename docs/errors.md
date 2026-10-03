# Errors

> The error shape, the error types and their HTTP status, and every error code the api returns.

Every error has the same shape. `type` tells you what kind of problem it is, `code` tells you exactly which one, and `message` is a plain sentence you can log or show. `request_id` is also sent as the `quarter-request-id` header on every response; quote it when you ask for help.

Response:

```json
{
  "error": {
    "type": "conflict",
    "code": "payments_still_held",
    "message": "1 held payments need a decision first",
    "request_id": "req_Wc7GPq8Ln5Xv3Rn6Tk1A"
  }
}
```

## Types

| `type` | HTTP status | Meaning |
| --- | --- | --- |
| `invalid_request` | 400 | Something in the request is missing or wrong. Fix it before trying again. Also used with 413 and 415. |
| `authentication` | 401 | No credential, or an API key, session or sign-in link that is unknown, revoked or expired. |
| `permission` | 403 | The caller may not do this: a role too low, an API key on a route only a signed-in person may use, or an action the rules forbid. |
| `not_found` | 404 | The object or route does not exist, or belongs to another account. |
| `conflict` | 409 | The request is valid, but the object is not in a state that allows it, such as releasing a run with held payments. |
| `rate_limited` | 429 | Too many requests. Every key or session may make 600 a minute, and the public routes 30 a minute per address. An address that sends 20 unknown, revoked or expired keys, sessions or links in a minute is refused for the rest of that minute, whatever it sends. Some actions have their own limits, named below. The `retry-after` header says when to try again. |
| `api_error` | 500 | Something went wrong on our side. Safe to retry later. |
| `unavailable` | 503 | A service Quarter depends on did not answer, such as NetSuite, or is not set up on this deployment, such as Plaid. Nothing is wrong with the request. |

## Codes

| Area | Status | Codes |
| --- | --- | --- |
| Any request | 400 | `request_invalid`, `limit_invalid`, `json_too_deep`. `request_invalid` covers a body that is not valid JSON; `json_too_deep` one nested more than 32 levels. |
| Any request | 413, 415 | `payload_too_large`, `unsupported_media_type`. Send `application/json`, up to 256 KB, or 10 MB to the payment run and import routes. |
| Any request | 401 | `api_key_missing`, `api_key_invalid`, `api_key_expired`, `session_invalid`, `session_expired` |
| Any request | 403 | `role_required`, `session_required`, `passkey_required`, `passkey_check_required`, `passkey_awaiting_approval`, `payroll_needs_admin`. Deciding, releasing, call-backs, fraud reports, settings and the yearly review need a person signed in; an API key answers `session_required`, as it does for a released payment file or Positive Pay file. Once an organization has live payments, an approver's or admin's session answers `passkey_required` until the person proves their passkey in the console. A first passkey answers `passkey_awaiting_approval` until another admin approves it. A session answers `passkey_check_required` on those decisions, and on downloading those files, when the last check is more than 5 minutes old. |
| Any request | 429 | `rate_limited`, `too_many_failed_authentications` |
| Any request | 500 | `internal` |
| Any request | 404 | `route_not_found`, `vendor_not_found`, `bank_account_not_found`, `payment_run_not_found`, `payment_item_not_found`, `payment_check_not_found`, `verification_request_not_found`, `webhook_delivery_not_found` |
| Who is acting | 400 | `reviewer_not_you`, `uploaded_by_not_you`, `requested_by_not_you`, `reporter_not_you`. Signed in, you may only name yourself. With an API key, `uploaded_by` and `requested_by` name the person by email. |
| [Vendors](/docs/vendors.md) | 400 | `name_required`, `name_invalid`, `email_domain_invalid`, `external_id_invalid`, `holder_name_invalid`, `status_invalid`, `routing_number_invalid`, `account_number_invalid`, `vendors_invalid` |
| [Vendors](/docs/vendors.md) | 403 | `unblock_needs_admin` |
| [Vendors](/docs/vendors.md) | 409 | `external_id_taken` |
| [Call-backs](/docs/verification.md#callbacks) | 400 | `result_invalid`, `phone_source_invalid`, `callback_number_untrusted`, `bank_account_inactive`, `phone_number_invalid`, `contact_name_invalid`, `notes_invalid` |
| [Call-backs](/docs/verification.md#callbacks) | 403 | `attester_changed_details` |
| [Verification links](/docs/verification.md) | 400 | `contact_email_invalid`, `link_expired`, `code_invalid`, `public_token_required`, `public_token_invalid` |
| [Verification links](/docs/verification.md) | 409 | `email_first`, `request_closed`, `bank_login_unavailable` |
| [Verification links](/docs/verification.md) | 429 | `too_many_attempts` |
| [Verification links](/docs/verification.md) | 503 | `bank_login_not_configured` |
| [Payment runs](/docs/payment-runs.md) | 400 | `format_invalid`, `file_required`, `file_invalid`, `items_required`, `amount_invalid`, `no_payments`, `too_many_payments`, `payee_name_invalid`, `payroll_invalid` |
| [Payment runs](/docs/payment-runs.md) | 409 | `duplicate_file`, `test_mode_limit`, `trial_ended`, `test_mode_only`, `no_vendors_with_bank_details` |
| [Payment runs](/docs/payment-runs.md) | 503 | `scan_busy`, `scan_timeout` |
| [Payment checks](/docs/payment-checks.md) | 400 | `rail_invalid`, `payee_name_required`, `currency_invalid`, `iban_format_invalid`, `bic_invalid` |
| [Decisions and release](/docs/releases.md) | 400 | `decision_invalid`, `reason_required`, `template_invalid`, `template_does_not_fit` |
| [Decisions and release](/docs/releases.md) | 403 | `approver_changed_details`, `approver_recently_added`, `releaser_changed_details` |
| [Decisions and release](/docs/releases.md) | 409 | `item_not_held`, `run_closed`, `second_approver_required`, `payments_still_held`, `payments_held_since_scan`, `released_when_approved`, `netsuite_run`, `not_a_check_run`, `run_not_released`, `file_deleted`, `no_payment_file` |
| [Fraud reports](/docs/network.md#fraud-reports) | 400 | `description_required`, `report_not_open` |
| [Fraud reports](/docs/network.md#fraud-reports) | 429 | `fraud_report_limit` |
| [Settings](/docs/checks.md#settings) | 400 | `checks_invalid`, `check_unknown`, `check_mandatory`, `check_mode_invalid`, `cooling_days_invalid`, `unusual_multiplier_invalid`, `two_person_threshold_invalid` |
| [Insider controls](/docs/compliance.md#insider-controls) | 400 | `employees_invalid`, `employee_ref_invalid`, `from_invalid`, `to_invalid` |
| [NetSuite](/docs/netsuite.md) | 400 | `account_id_invalid`, `client_id_invalid`, `certificate_id_invalid`, `private_key_invalid`, `sandbox_invalid`, `sandbox_test_only`, `sandbox_account_in_live`, `netsuite_unauthorized`, `netsuite_forbidden`, `netsuite_bank_details_unavailable`, `netsuite_field_missing`, `netsuite_query_failed`, `netsuite_response_too_large`, `enabled_invalid`, `production_account_in_test`, `status_invalid`, `limit_invalid` |
| [NetSuite](/docs/netsuite.md) | 409 | `netsuite_account_changed`, `not_connected`, `sync_in_progress` |
| [NetSuite](/docs/netsuite.md) | 429 | `sync_rate_limited` |
| [NetSuite](/docs/netsuite.md) | 503 | `netsuite_unreachable` |
| [Webhooks](/docs/webhooks.md) | 400 | `url_required`, `url_invalid`, `enabled_events_invalid` |

Sign-in, members, API keys and billing serve the console and have their own codes, listed with those routes in the OpenAPI document at `GET $QUARTER_API_URL/openapi.json`.

A text field that is too long, or not text, answers `<field>_invalid`, such as `name_invalid` (200 characters at most) or `notes_invalid` (2,000).

## Handling errors

- Branch on `code`, not on `message`. Messages may get clearer over time; codes do not change.
- Retry `api_error` and network failures. Do not retry `invalid_request` or `conflict` unchanged: they will fail again.
- A payment run upload is safe to retry: the same file a second time answers `409 duplicate_file`, with the id of the run already made unless both arrived at once.
