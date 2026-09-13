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
    await p.getByRole("combobox", { name: "筛选科室", exact: true }).press("ArrowDown");
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
      .getByText("心血管内科 · 主治医师 · 普通医生", { exact: true })
      .waitFor();
    await host.getByRole("button", { name: "发起会诊", exact: true }).click();
    await host.getByLabel("会诊主题", { exact: true }).fill(title);
    await department(host, "内分泌科");
    await host
      .getByRole("row")
      .filter({ hasText: "workflow_senior" })
      .getByRole("checkbox")
      .check();
    await department(host, "呼吸内科");
    await host
      .getByRole("row")
      .filter({ hasText: "workflow_stranger" })
      .getByRole("checkbox")
      .check();
    const selected = host.locator(".ant-modal .ant-select-selection-item");
    await selected.filter({ hasText: "workflow_senior" }).waitFor();
    await selected.filter({ hasText: "workflow_stranger" }).waitFor();
    await host
      .getByLabel("病情摘要 / 会诊目的", { exact: true })
      .fill("联合会诊页面验收");
    await host.getByRole("button", { name: "发送邀请", exact: true }).click();
    await host.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    const invited = await page(reviewer);
    await invited.goto("http://localhost:3000/conferences");
    await invited
      .locator(".main-user")
      .getByText("内分泌科 · 主任医师 · 上级医生", { exact: true })
      .waitFor();
    await invited
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("button", { name: "查看会诊" })
      .click();
    await invited.getByRole("button", { name: "接受邀请" }).click();
    await invited
      .locator(".ant-drawer")
      .getByText("已接受", { exact: true })
      .waitFor();
    await host
      .getByRole("button", { name: "开始会诊" })
      .click({ timeout: 20000 });
    await host
      .locator(".ant-drawer")
      .getByText("进行中", { exact: true })
      .waitFor();
    await invited.reload();
    await invited
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("button", { name: "查看会诊" })
      .click();
    await invited
      .getByRole("textbox", { name: "会诊意见", exact: true })
      .fill("内分泌科联合意见页面验证");
    await invited.getByRole("button", { name: "提交会诊意见" }).click();
    await invited
      .getByText("内分泌科联合意见页面验证", { exact: true })
      .first()
      .waitFor();
    await host
      .getByText("内分泌科联合意见页面验证", { exact: true })
      .waitFor({ timeout: 20000 });
    await host.getByRole("button", { name: "完成会诊", exact: true }).click();
    await host
      .getByRole("textbox", { name: "会诊总结", exact: true })
      .fill("联合会诊总结页面验证");
    await host.getByRole("button", { name: "保存总结并完成" }).click();
    await host.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await host
      .locator(".ant-drawer")
      .getByText("已完成", { exact: true })
      .waitFor();
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
