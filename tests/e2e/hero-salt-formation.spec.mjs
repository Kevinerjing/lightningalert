import { test, expect } from "playwright/test";

const WORKER_URL = "https://element-heroes-worker.jingkevin0408.workers.dev";

async function stubWorkerApi(page) {
  await page.route(`${WORKER_URL}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, rooms: [] }),
    });
  });
}

async function gotoHero(page) {
  await page.goto("/index.html");
  await expect(page.locator("#lobbyPanel")).toBeVisible();
}

async function startPractice(page) {
  await page.getByRole("button", { name: "Practice Mode vs Computer" }).click();
  await expect(page.locator("#gamePanel")).toBeVisible();
  await expect(page.locator("#roomStateText")).toContainText("Your turn.");
}

async function seedSaltFormationDemo(page) {
  await page.evaluate(() => {
    const makeCard = (cardId) => cloneCard(cardId);

    playerId = 1;
    isPracticeMode = true;
    roomCode = "PRACTICE";
    selectedCardIndex = null;
    selectedFieldIndex = null;
    pendingLocalEffect = null;

    gameState = {
      turn: 1,
      currentPlayer: 1,
      players: {
        1: {
          id: 1,
          hp: 10,
          maxHp: 10,
          energy: 3,
          maxEnergy: 3,
          deck: [],
          hand: [makeCard("saltFormation")],
          field: [makeCard("sodium"), makeCard("chlorine")],
          discard: [],
          statuses: ["Wet"],
        },
        2: {
          id: 2,
          hp: 10,
          maxHp: 10,
          energy: 3,
          maxEnergy: 3,
          deck: [],
          hand: [],
          field: [],
          discard: [],
          statuses: [],
        },
      },
      log: ["Salt Formation demo ready."],
      winner: null,
    };

    render();
  });
}

test("salt formation shows ionic bonding animation and crystal finale", async ({ page }) => {
  await stubWorkerApi(page);
  await gotoHero(page);
  await startPractice(page);
  await seedSaltFormationDemo(page);

  const saltCard = page.locator('#p1Hand .card[data-index="0"]');
  await expect(saltCard).toContainText("Salt Formation");
  await saltCard.click({ force: true });
  await expect(page.locator("#playCardBtn")).toBeEnabled();

  await page.getByRole("button", { name: "Play Selected Card" }).click({ force: true });

  const stage = page.locator(".ehx-ionic-stage");
  await expect(stage).toBeVisible();
  await expect(stage).toContainText("Ionic Bonding");

  await expect(stage.locator(".ehx-ionic-transfer.active")).toBeVisible();
  await page.waitForTimeout(1700);
  await expect(stage.locator(".ehx-ionic-crystal.visible")).toBeVisible();

  await stage.screenshot({ path: "output/playwright/salt-formation-ionic-bonding.png" });
});
