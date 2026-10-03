# Quarter docs

> Check every outgoing vendor payment before it leaves your bank. Hold the suspicious ones for a person, with the reason in plain words.

Quarter is a payment firewall. It matches each payment to a vendor you know, checks it, and holds anything wrong for a person to approve or reject.

If you pay bills from NetSuite, you upload nothing. Quarter checks every open, approved vendor bill and holds the suspicious ones with NetSuite's own Payment Hold box, so NetSuite does not pay them until a person decides in Quarter. See [the payment flow](/docs/netsuite.md#payment-flow). It is built and tested against a simulated NetSuite account; not yet run against a real one.

Otherwise, you give Quarter a payment run, as a NACHA file, a CSV, a list of payments or a check register, before you upload it to your bank. When every held payment has a decision, Quarter gives the file back without the rejected payments, and you upload that file to your bank as usual.

## How a payment run flows

1. **Know your vendors.** Add each vendor and its bank details with [`POST /v1/vendors`](/docs/vendors.md#post-v1-vendors). New or changed bank details hold payments until someone confirms them with the vendor.
2. **Confirm bank details.** Send the vendor a [verification link](/docs/verification.md), where they log in to their own bank, or record a [call-back](/docs/verification.md#callbacks) to a phone number you already had.
3. **Upload the run.** Send the file to [`POST /v1/payment_runs`](/docs/payment-runs.md#post-v1-payment-runs). Each payment comes back `clear` or `held`, with [findings](/docs/checks.md) that say what is wrong. A single wire goes to [`POST /v1/payment_checks`](/docs/payment-checks.md) instead.
4. **Decide.** A person signed in to the console approves or rejects each held payment, with a reason. Large payments need a [second, different approver](/docs/releases.md#two-person-approval).
5. **Release.** A person signed in to the console [releases the run](/docs/releases.md#post-v1-payment-runs-run-release) and gets the file to send, without the rejected payments. Every step is in the [audit log](/docs/compliance.md#get-v1-audit-log).

## What Quarter never does

- It never holds, moves or sends money. The file goes back to you, and you upload it to your own bank.
- It never keeps a full account number in the clear. Account numbers are sealed at rest. Responses show the last 4 digits only.
- It never tells one customer which other customer verified or reported an account. The [network](/docs/network.md) shares counts only.
- It does not promise to catch every fraud. It holds what its [checks](/docs/checks.md) find, and a person decides.

## Keys and the API URL

Send your API key as a Bearer token on every `/v1` request. Test keys start with `qk_test_` and live keys with `qk_live_`. A test key never sees live data, and a live key never sees test data. Keep keys on your server.

An API key acts for your integration. It adds vendors and bank details, uploads runs, checks payments and reads the results. It never approves, rejects or releases a payment, records a call-back, reports fraud or changes settings. Those need a person signed in to the console, and an API key answers `403 session_required`.

An admin creates API keys in the console, under Settings, and each key is shown once. Before launch, Quarter sets up your organization and gives you the API URL. The examples use `$QUARTER_API_URL` and `$QUARTER_API_KEY`.

```bash
export QUARTER_API_URL="<your API URL>"
export QUARTER_API_KEY="qk_test_..."
```

The routes under `/verify` are for your vendor, not for you. They take no key: the token in the verification link is the only credential. See [Verification links](/docs/verification.md).

## For AI tools

- The exact contract of every route is an OpenAPI 3.1 document at `GET $QUARTER_API_URL/openapi.json`. It needs no key.
- These docs are plain Markdown at [/llms.txt](/llms.txt) (an index) and [/llms-full.txt](/llms-full.txt) (every page in one file). Every page also has a `.md` twin.

## Status

> **Note:** Quarter is pre-launch and has no customers yet. Everything described in these docs is built and tested. The network is built and starts empty.
