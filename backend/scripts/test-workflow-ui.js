const assertEnglishControls = require("./assert-english-controls");
const assert = require("node:assert/strict");
const path = require("node:path");
module.exports = async function browserRegression({ base, doctor, reviewer }) {
  const { chromium } = require(
    path.join(__dirname, "../../.runtime/browser/node_modules/playwright-core"),
  );
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const errors = [];
  const contexts = [];
  async function context(token, mobile = false) {
    const c = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    });
    contexts.push(c);
    await c.route("**/api/v1/**", async (route) => {
      const original = new URL(route.request().url());
      const response = await route.fetch({
        url: base + original.pathname.replace("/api/v1", "") + original.search,
      });
      await route.fulfill({ response });
    });
    if (token)
      await c.addInitScript((t) => localStorage.setItem("token", t), token);
    const page = await c.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  }
  async function pick(page, label, text) {
    await page.getByLabel(label, { exact: true }).press("ArrowDown");
    await page
      .locator(".ant-select-dropdown:visible .ant-select-item-option-content")
      .filter({ hasText: text })
      .first()
      .click();
  }
  const wait = async (page, text) =>
    page.getByText(text, { exact: true }).first().waitFor();
  try {
    const page = await context(doctor);
    await page.goto("http://localhost:3000/emr");
    await page.getByRole("button", { name: "Create Medical Record" }).click();
    await pick(page, "Patient", "回归验证患者");
    await page.getByLabel("Diagnosis", { exact: true }).fill("浏览器流程验证");
    await page.getByLabel("Chief complaint", { exact: true }).fill("结构化填写验证");
    await page.getByRole("button", { name: "Save draft" }).click();
    await wait(page, "浏览器流程验证");
    await page.getByRole("tab", { name: /Orders/ }).click();
    await page.getByRole("button", { name: "Create order", exact: true }).click();
    await page.getByLabel("Order name", { exact: true }).fill("页面医嘱验证");
    await page
      .getByLabel("Instructions (dose, frequency, route, or examination requirements)", { exact: true })
      .fill("仅用于软件功能测试");
    await page.getByRole("button", { name: /Confirm/, exact: true }).click();
    await wait(page, "页面医嘱验证");
    await assertEnglishControls(page);
    await page.screenshot({
      path: path.join(__dirname, "../../.runtime/emr-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await pick(page, "Senior doctor", "workflow_senior");
    await page.getByRole("button", { name: /Confirm/, exact: true }).click();
    await page
      .locator(".ant-drawer")
      .getByText("Pending Review", { exact: true })
      .waitFor();
    const seniorPage = await context(reviewer);
    await seniorPage.goto("http://localhost:3000/emr");
    const row = seniorPage
      .getByRole("row")
      .filter({ hasText: "浏览器流程验证" });
    await row.getByRole("button", { name: "View / Manage" }).click();
    await seniorPage
      .getByRole("button", { name: "Review record", exact: true })
      .click();
    await seniorPage
      .getByLabel("Review comments", { exact: true })
      .fill("页面审核流程通过");
    await seniorPage
      .getByRole("button", { name: /Confirm/, exact: true })
      .click();
    await seniorPage
      .locator(".ant-drawer")
      .getByText("Reviewed", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("row")
      .filter({ hasText: "浏览器流程验证" })
      .getByRole("button", { name: "View / Manage" })
      .click();
    await page.getByRole("button", { name: "Archive record" }).click();
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page
      .locator(".ant-drawer")
      .getByText("Archived", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Edit Medical Record" }).count(),
      0,
    );
    console.log(
      "PASS browser structured record, medical order, senior review and archive",
    );

    await page.goto("http://localhost:3000/health");
    await page
      .getByRole("row")
      .filter({ hasText: "调整后的计划" })
      .getByRole("button", { name: "View / Manage" })
      .click();
    await page.getByRole("tab", { name: "Patient portal" }).click();
    await page.getByRole("button", { name: "Generate / Renew patient link" }).click();
    const url = await page
      .getByRole("link", { name: "Open patient portal" })
      .getAttribute("href");
    const patientPage = await context(null, true);
    await patientPage.goto(url);
    await pick(patientPage, "Measurement type", "Blood glucose");
    await patientPage.getByRole("spinbutton", { name: /Blood glucose/ }).fill("5.8");
    await patientPage
      .getByLabel("Device / Data source", { exact: true })
      .fill("患者页面测试");
    await patientPage.getByRole("button", { name: "Upload data" }).click();
    await wait(patientPage, "Measurements uploaded and available to your doctor");
    await patientPage.getByRole("tab", { name: "Measurement history" }).click();
    await patientPage.getByText("患者页面测试", { exact: true }).waitFor();
    await assertEnglishControls(patientPage);
    await patientPage.screenshot({
      path: path.join(__dirname, "../../.runtime/patient-health-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await page.getByRole("tab", { name: "Health monitoring" }).click();
    await page
      .getByText("患者页面测试", { exact: true })
      .waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Add health assessment" }).click();
    await page.getByLabel("Assessment conclusion", { exact: true }).fill("页面评估测试完成");
    await page
      .getByLabel("Updated health advice (shared with the patient)", { exact: true })
      .fill("来自页面的新健康建议");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await page.getByRole("tab", { name: "Assessment history" }).click();
    await page.getByText("Assessment:页面评估测试完成", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "Reminders and messages" }).click();
    await page.getByRole("button", { name: "Schedule reminder" }).click();
    await page.getByLabel("Reminder message", { exact: true }).fill("页面提醒测试");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await page.getByRole("row").filter({ hasText: "页面提醒测试" }).getByText("Pending", { exact: true }).waitFor();
    await assertEnglishControls(page);
    await page.screenshot({
      path: path.join(__dirname, "../../.runtime/health-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await patientPage.getByRole("tab", { name: "Health reminders" }).click();
    await patientPage
      .getByText("Health assessment advice: 来自页面的新健康建议", { exact: true })
      .waitFor({ timeout: 20000 });
    checkNoErrors();
    console.log(
      "PASS browser patient upload, automatic refresh, assessment and reminder forms (desktop + mobile)",
    );
  } catch (error) {
    for (const c of contexts)
      for (const p of c.pages()) {
        console.error(p.url(), await p.locator("body").innerText(), errors);
        await p.screenshot({
          path: path.join(__dirname, "../../.runtime/browser-failure.png"),
          fullPage: true, animations: "disabled",
        });
      }
    throw error;
  } finally {
    await browser.close();
  }
  function checkNoErrors() {
    assert.deepEqual(errors, [], "No browser runtime errors");
  }
};
