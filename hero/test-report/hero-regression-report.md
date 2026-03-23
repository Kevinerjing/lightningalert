# Hero E2E Regression Report

Generated: 2026-03-23T16:20:30.130Z
Overall status: FAIL
Specs: 4
Passed: 3
Failed: 1
Total duration: 9.3s

## Spec Results

- PASSED - hero-regression.spec.mjs > lobby boots cleanly with core controls (1.1s)
- PASSED - hero-regression.spec.mjs > practice mode renders the playable board state (1.2s)
- PASSED - hero-regression.spec.mjs > playing a hand card triggers the curved travel animation and updates board state (2.7s)
- FAILED - hero-regression.spec.mjs > playing an attack or reaction card triggers the forward push and recoil motion (4.3s)

## Failures

### hero-regression.spec.mjs > playing an attack or reaction card triggers the forward push and recoil motion

```text
Error: [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoBeNull[2m()[22m

Received: [31mnull[39m
```

## Artifacts

- Deployable HTML report: `hero/test-report/index.html`
- Local generated HTML report: `output/playwright/hero-regression-html/index.html`
- JSON results: `output/playwright/hero-regression-results.json`
- Playwright artifacts: `output/playwright/artifacts/`

