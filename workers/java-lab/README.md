# Cashier Lab

Live: https://java-cashier-lab.jingkevin0408.workers.dev/cashier

The assignment assumes a fully taxable Ontario purchase with 13% HST.
Rate reference: https://www.ontario.ca/document/harmonized-sales-tax-hst

The Worker serves `java/` at its own domain root and handles `/api/java/status`
and `/api/java/run`. Existing quiz pages remain available there. A static-only
copy of the lab can edit/download code but reports execution as unavailable.

## Local setup

Create `.dev.vars` beside `wrangler.toml`, using `.dev.vars.example` as the schema.
Set `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET`, and a classroom `LAB_ACCESS_CODE`.
This file is Git-ignored and outside the public assets directory.

From the repository root:

```powershell
npx.cmd wrangler dev --config workers/java-lab/wrangler.toml --port 8794 --ip 127.0.0.1
node --test workers/java-lab/worker.test.mjs
```

Open http://127.0.0.1:8794/cashier.html. Enter the classroom code in the form.
The provider keys are never sent to the browser. Draft source stays in localStorage;
the classroom code is not persisted. Running sends source and inputs to JDoodle.

## Deployment

```powershell
npx.cmd wrangler login
npx.cmd wrangler deploy --config workers/java-lab/wrangler.toml
npx.cmd wrangler secret put JDOODLE_CLIENT_ID --config workers/java-lab/wrangler.toml
npx.cmd wrangler secret put JDOODLE_CLIENT_SECRET --config workers/java-lab/wrangler.toml
npx.cmd wrangler secret put LAB_ACCESS_CODE --config workers/java-lab/wrangler.toml
```

Use the secret commands' interactive prompts, never command-line credential arguments.
No custom domain or existing Worker routes are changed. Without all three secrets,
the deployed endpoint fails closed and the Run button is disabled.

## Execution contract

Students submit a complete `public class Cashier` with `main`. Input is subtotal,
then cash given, on separate lines. Output must contain exactly one numeric line
for each of `TAX=`, `TOTAL=`, and `CHANGE=`; other diagnostic lines are permitted.
Java version index `0` is pinned in Wrangler and verified against the provider.
Students edit the formulas in the starter. Zero-valued starter output is real Java
output and intentionally fails the checks. The UI never substitutes expected values.

One click makes one REST execution call, with no automatic retries. Test cases select
inputs; they do not execute until Run is clicked. Independent tests each consume a run.
The Worker uses a 25-second response timeout; this does not cancel the provider's job.
Provider quota exhaustion, compilation errors, runtime errors and malformed output
are separate states. The starter rounds tax to cents before total and change, so
the receipt balances even when tax initially contains half a cent. The grader uses
integer cents. This is an educational double exercise, not a production financial engine.

The classroom code gates shared quota. Cloudflare's per-IP limiter permits five
requests per minute per location, not a strict global daily budget. Students behind
one school IP share this limit. JDoodle enforces the account's actual quota. Configure
provider spending restrictions before moving beyond its free plan. No database,
student accounts, submitted-source logging or automatic batch execution is included.

## References

- https://www.jdoodle.com/pricing/api
- https://www.jdoodle.com/docs/api/rest
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
