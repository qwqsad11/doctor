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
    await page.getByRole("button", { name: /新建病历/ }).click();
    await pick(page, "患者", "回归验证患者");
    await page.getByLabel("诊断", { exact: true }).fill("浏览器流程验证");
    await page.getByLabel("主诉", { exact: true }).fill("结构化填写验证");
    await page.getByRole("button", { name: "保存草稿" }).click();
    await wait(page, "浏览器流程验证");
    await page.getByRole("tab", { name: /医嘱/ }).click();
    await page.getByRole("button", { name: "开具医嘱", exact: true }).click();
    await page.getByLabel("医嘱名称", { exact: true }).fill("页面医嘱验证");
    await page
      .getByLabel("执行说明（剂量、频次、途径或检查要求）", { exact: true })
      .fill("仅用于软件功能测试");
    await page.getByRole("button", { name: /确\s*认/, exact: true }).click();
    await wait(page, "页面医嘱验证");
    await page.screenshot({
      path: path.join(__dirname, "../../.runtime/emr-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await page.getByRole("button", { name: "提交审核", exact: true }).click();
    await pick(page, "上级医生", "workflow_senior");
    await page.getByRole("button", { name: /确\s*认/, exact: true }).click();
    await page
      .locator(".ant-drawer")
      .getByText("待审核", { exact: true })
      .waitFor();
    const seniorPage = await context(reviewer);
    await seniorPage.goto("http://localhost:3000/emr");
    const row = seniorPage
      .getByRole("row")
      .filter({ hasText: "浏览器流程验证" });
    await row.getByRole("button", { name: "查看 / 处理" }).click();
    await seniorPage
      .getByRole("button", { name: "审核病历", exact: true })
      .click();
    await seniorPage
      .getByLabel("审核意见", { exact: true })
      .fill("页面审核流程通过");
    await seniorPage
      .getByRole("button", { name: /确\s*认/, exact: true })
      .click();
    await seniorPage
      .locator(".ant-drawer")
      .getByText("已审核", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("row")
      .filter({ hasText: "浏览器流程验证" })
      .getByRole("button", { name: "查看 / 处理" })
      .click();
    await page.getByRole("button", { name: "归档病历" }).click();
    await page.getByRole("button", { name: /确\s*定/, exact: true }).click();
    await page
      .locator(".ant-drawer")
      .getByText("已归档", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "编辑病历" }).count(),
      0,
    );
    console.log(
      "PASS browser structured record, medical order, senior review and archive",
    );

    await page.goto("http://localhost:3000/health");
    await page
      .getByRole("row")
      .filter({ hasText: "调整后的计划" })
      .getByRole("button", { name: "查看 / 管理" })
      .click();
    await page.getByRole("tab", { name: "患者入口" }).click();
    await page.getByRole("button", { name: "生成 / 更新患者链接" }).click();
    const url = await page
      .getByRole("link", { name: "打开患者入口" })
      .getAttribute("href");
    const patientPage = await context(null, true);
    await patientPage.goto(url);
    await pick(patientPage, "监测项目", "血糖");
    await patientPage.getByRole("spinbutton", { name: /血糖/ }).fill("5.8");
    await patientPage
      .getByLabel("设备 / 数据来源", { exact: true })
      .fill("患者页面测试");
    await patientPage.getByRole("button", { name: "上传数据" }).click();
    await wait(patientPage, "监测数据已上传，医生可以查看");
    await patientPage.getByRole("tab", { name: "监测历史" }).click();
    await patientPage.getByText("患者页面测试", { exact: true }).waitFor();
    await patientPage.screenshot({
      path: path.join(__dirname, "../../.runtime/patient-health-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await page.getByRole("tab", { name: "健康监测" }).click();
    await page
      .getByText("患者页面测试", { exact: true })
      .waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "新增健康评估" }).click();
    await page.getByLabel("评估结论", { exact: true }).fill("页面评估测试完成");
    await page
      .getByLabel("调整后的健康建议（同步给患者）", { exact: true })
      .fill("来自页面的新健康建议");
    await page.getByRole("button", { name: /保\s*存/, exact: true }).click();
    await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await page.getByRole("tab", { name: "评估记录" }).click();
    await page.getByText("评估：页面评估测试完成", { exact: true }).waitFor();
    await page.getByRole("tab", { name: "提醒与消息" }).click();
    await page.getByRole("button", { name: "设置提醒任务" }).click();
    await page.getByLabel("提醒内容", { exact: true }).fill("页面提醒测试");
    await page.getByRole("button", { name: /保\s*存/, exact: true }).click();
    await page.locator(".ant-modal-wrap:visible").waitFor({ state: "hidden" });
    await page.getByRole("row").filter({ hasText: "页面提醒测试" }).getByText("待执行", { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(__dirname, "../../.runtime/health-ui.png"),
      fullPage: true, animations: "disabled",
    });
    await patientPage.getByRole("tab", { name: "健康提醒" }).click();
    await patientPage
      .getByText("健康评估建议：来自页面的新健康建议", { exact: true })
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
