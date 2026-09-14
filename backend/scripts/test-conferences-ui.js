const assertEnglishControls = require("./assert-english-controls");
const assert = require("node:assert/strict");
const path = require("node:path");
module.exports = async function ({ base, doctor, reviewer }) {
  const { chromium } = require(
    path.join(__dirname, "../../.runtime/browser/node_modules/playwright-core"),
  );
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const pages = [],
    errors = [];
  async function page(token) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript((t) => localStorage.setItem("token", t), token);
    await context.route("**/api/v1/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: base + url.pathname.replace("/api/v1", "") + url.search,
      });
      await route.fulfill({ response });
    });
    const p = await context.newPage();
    pages.push(p);
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  }
  async function department(p, name) {
    await p.getByRole("combobox", { name: "Filter department", exact: true }).press("ArrowDown");
    await p
      .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
      .getByText(name, { exact: true })
      .click();
  }
  const title = "浏览器跨科室验收";
  try {
    const host = await page(doctor);
    await host.goto("http://localhost:3000/conferences");
    await host
      .locator(".main-user")
      .getByText("Cardiology · Attending Physician · Doctor", { exact: true })
      .waitFor();
    await host.getByRole("button", { name: "Create conference", exact: true }).click();
    await host.getByLabel("Topic", { exact: true }).fill(title);
    await department(host, "Endocrinology");
    await host
      .getByRole("row")
      .filter({ hasText: "workflow_senior" })
      .getByRole("checkbox")
      .check();
    await department(host, "Respiratory Medicine");
    await host
      .getByRole("row")
      .filter({ hasText: "workflow_stranger" })
      .getByRole("checkbox")
      .check();
    const selected = host.locator(".ant-modal .ant-select-selection-item");
    await selected.filter({ hasText: "workflow_senior" }).waitFor();
    await selected.filter({ hasText: "workflow_stranger" }).waitFor();
    await host
      .getByLabel("Case summary / Conference purpose", { exact: true })
      .fill("联合会诊页面验收");
    await host.getByRole("button", { name: "Send invitations", exact: true }).click();
    await host.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    const invited = await page(reviewer);
    await invited.goto("http://localhost:3000/conferences");
    await invited
      .locator(".main-user")
      .getByText("Endocrinology · Chief Physician · Senior Doctor", { exact: true })
      .waitFor();
    await invited
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("button", { name: "View conference" })
      .click();
    await invited.getByRole("button", { name: "Accept invitation" }).click();
    await invited
      .locator(".ant-drawer")
      .getByText("Accepted", { exact: true })
      .waitFor();
    await host
      .getByRole("button", { name: "Start conference" })
      .click({ timeout: 20000 });
    await host
      .locator(".ant-drawer")
      .getByText("In Progress", { exact: true })
      .waitFor();
    await invited.reload();
    await invited
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("button", { name: "View conference" })
      .click();
    await invited
      .getByRole("textbox", { name: "Conference opinion", exact: true })
      .fill("内分泌科联合意见页面验证");
    await invited.getByRole("button", { name: "Submit opinion" }).click();
    await invited
      .getByText("内分泌科联合意见页面验证", { exact: true })
      .first()
      .waitFor();
    await host
      .getByText("内分泌科联合意见页面验证", { exact: true })
      .waitFor({ timeout: 20000 });
    await host.getByRole("button", { name: "Complete conference", exact: true }).click();
    await host
      .getByRole("textbox", { name: "Conference summary", exact: true })
      .fill("联合会诊总结页面验证");
    await host.getByRole("button", { name: "Save summary and complete" }).click();
    await host.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await host
      .locator(".ant-drawer")
      .getByText("Completed", { exact: true })
      .waitFor();
    await assertEnglishControls(host);
    await assertEnglishControls(invited);
    await host.screenshot({
      path: path.join(__dirname, "../../.runtime/joint-conference-ui.png"),
      fullPage: true,
      animations: "disabled",
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser department identity, cross-department multi-select, invited acceptance and joint opinions",
    );
  } catch (e) {
    for (let i = 0; i < pages.length; i++) {
      console.error(
        "Conference UI:",
        await pages[i].locator("body").innerText(),
      );
      await pages[i].screenshot({
        path: path.join(
          __dirname,
          "../../.runtime/conference-failure-" + i + ".png",
        ),
        fullPage: true,
      });
    }
    throw e;
  } finally {
    await browser.close();
  }
};
