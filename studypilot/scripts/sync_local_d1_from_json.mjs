import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import process from "node:process";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const configPath = path.join("studypilot", "wrangler.toml");
const schemaPath = path.join("studypilot", "d1", "migrations", "0001_initial_schema.sql");
const seedPath = path.join("studypilot", "d1", "migrations", "0002_seed_subjects.sql");
const importPath = path.join("studypilot", "d1", "generated", "import-current-data.sql");

await runStep("Export current StudyPilot JSON", "npm.cmd run studypilot:d1:export");
await runStep("Apply local D1 schema", `npx.cmd wrangler d1 execute studypilot --local --file ${schemaPath} --config ${configPath}`);
await runStep("Seed core subjects locally", `npx.cmd wrangler d1 execute studypilot --local --file ${seedPath} --config ${configPath}`);
await runStep("Import current StudyPilot data into local D1", `npx.cmd wrangler d1 execute studypilot --local --file ${importPath} --config ${configPath}`);

console.log("StudyPilot local D1 sync completed.");

async function runStep(label, commandLine) {
  const { stdout, stderr } = await execCommand(commandLine);

  if (stdout.trim()) {
    console.log(`[${label}]`);
    console.log(stdout.trim());
  }

  if (stderr.trim()) {
    console.warn(`[${label} stderr]`);
    console.warn(stderr.trim());
  }
}

async function execCommand(commandLine) {
  if (process.platform === "win32") {
    return execFileAsync("cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: repoRoot,
      windowsHide: true
    });
  }

  return execFileAsync("sh", ["-lc", commandLine], {
    cwd: repoRoot
  });
}
