import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const projectRoot = path.resolve(process.cwd());
const secretsPath = path.join(projectRoot, "local-secrets.json");
const profileDir = path.join(projectRoot, ".playwright", "google-classroom-profile");
const classroomUrl = "https://classroom.google.com";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isAuthPage(url) {
  return url.includes("accounts.google.com") || url.includes("ServiceLogin");
}

async function pickKnownAccountIfShown(page, email) {
  const bodyText = normalizeText(await page.locator("body").innerText().catch(() => ""));
  if (!bodyText.toLowerCase().includes("choose an account")) {
    return;
  }

  const accountTile = page.getByText(email, { exact: false });
  if (await accountTile.count()) {
    await accountTile.first().click();
    await page.waitForTimeout(2000);
  }
}

async function readSecrets() {
  const raw = await fs.readFile(secretsPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const secrets = await readSecrets().catch(() => ({}));
  const email = secrets?.googleClassroom?.email || "";
  const password = secrets?.googleClassroom?.password || "";

  await fs.mkdir(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: "chrome"
  }).catch(() =>
    chromium.launchPersistentContext(profileDir, {
      headless: false
    })
  );

  const page = context.pages()[0] || await context.newPage();

  try {
    await page.goto(classroomUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    if (isAuthPage(page.url())) {
      await pickKnownAccountIfShown(page, email);

      const emailInput = page.locator('input[type="email"]');
      if (email && await emailInput.count()) {
        await emailInput.fill(email);
        await page.getByRole("button", { name: /^next$/i }).click();
        await page.waitForTimeout(2000);
      }

      const passwordInput = page.locator('input[type="password"]:visible');
      if (password && await passwordInput.count()) {
        await passwordInput.fill(password);
        await page.getByRole("button", { name: /^next$/i }).click();
        await page.waitForTimeout(3000);
      }
    }

    console.log("Complete any remaining Google login or challenge steps in the opened browser window.");
    console.log("This script will automatically save the session after Google Classroom opens.");

    const deadline = Date.now() + 5 * 60 * 1000;
    let saved = false;

    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes("classroom.google.com") && !isAuthPage(currentUrl)) {
        await page.waitForTimeout(5000);
        saved = true;
        break;
      }
    }

    if (!saved) {
      throw new Error("Google Classroom did not finish opening before the session wait timed out.");
    }

    console.log(`Saved Classroom session profile at: ${profileDir}`);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(normalizeText(error?.message || error));
  process.exitCode = 1;
});
