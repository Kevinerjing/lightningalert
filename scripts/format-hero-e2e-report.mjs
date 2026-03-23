import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const resultsPath = path.join(repoRoot, "output/playwright/hero-regression-results.json");
const reportPath = path.join(repoRoot, "output/playwright/hero-regression-report.md");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function flattenSpecs(suites, prefix = []) {
  const results = [];

  for (const suite of suites || []) {
    const nextPrefix = suite.title ? [...prefix, suite.title] : prefix;

    for (const spec of suite.specs || []) {
      const titlePath = [...nextPrefix, spec.title].filter(Boolean);
      results.push({
        title: titlePath.join(" > "),
        tests: spec.tests || [],
      });
    }

    results.push(...flattenSpecs(suite.suites || [], nextPrefix));
  }

  return results;
}

function summarizeStatus(tests) {
  if (!tests.length) return "unknown";
  if (tests.some((test) => test.results?.some((result) => result.status === "failed"))) return "failed";
  if (tests.some((test) => test.results?.some((result) => result.status === "timedOut"))) return "timedOut";
  if (tests.every((test) => test.results?.some((result) => result.status === "passed"))) return "passed";
  return tests[0]?.results?.[0]?.status || "unknown";
}

function collectDurationMs(tests) {
  return tests.reduce((sum, test) => {
    return sum + (test.results || []).reduce((inner, result) => inner + (result.duration || 0), 0);
  }, 0);
}

function collectErrors(tests) {
  const errors = [];
  for (const test of tests) {
    for (const result of test.results || []) {
      if (result.error?.message) {
        errors.push(result.error.message.trim());
      }
    }
  }
  return errors;
}

function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function main() {
  if (!fs.existsSync(resultsPath)) {
    console.error(`Missing Playwright JSON results: ${resultsPath}`);
    process.exit(1);
  }

  const json = readJson(resultsPath);
  const specs = flattenSpecs(json.suites || []);
  const passed = specs.filter((spec) => summarizeStatus(spec.tests) === "passed");
  const failed = specs.filter((spec) => summarizeStatus(spec.tests) !== "passed");
  const totalDurationMs = specs.reduce((sum, spec) => sum + collectDurationMs(spec.tests), 0);
  const generatedAt = new Date().toISOString();

  const lines = [];
  lines.push("# Hero E2E Regression Report");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Overall status: ${failed.length ? "FAIL" : "PASS"}`);
  lines.push(`Specs: ${specs.length}`);
  lines.push(`Passed: ${passed.length}`);
  lines.push(`Failed: ${failed.length}`);
  lines.push(`Total duration: ${formatMs(totalDurationMs)}`);
  lines.push("");
  lines.push("## Spec Results");
  lines.push("");

  for (const spec of specs) {
    const status = summarizeStatus(spec.tests);
    lines.push(`- ${status.toUpperCase()} - ${spec.title} (${formatMs(collectDurationMs(spec.tests))})`);
  }

  if (failed.length) {
    lines.push("");
    lines.push("## Failures");
    lines.push("");

    for (const spec of failed) {
      lines.push(`### ${spec.title}`);
      const errors = collectErrors(spec.tests);
      if (errors.length) {
        lines.push("");
        lines.push("```text");
        lines.push(errors.join("\n\n"));
        lines.push("```");
      } else {
        lines.push("");
        lines.push("No error message captured.");
      }
      lines.push("");
    }
  }

  lines.push("## Artifacts");
  lines.push("");
  lines.push("- HTML report: `output/playwright/hero-regression-html/index.html`");
  lines.push("- JSON results: `output/playwright/hero-regression-results.json`");
  lines.push("- Playwright artifacts: `output/playwright/artifacts/`");
  lines.push("");

  ensureDir(reportPath);
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Hero E2E markdown report written to ${path.relative(repoRoot, reportPath)}`);
}

main();
