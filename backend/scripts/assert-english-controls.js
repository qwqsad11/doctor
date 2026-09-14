const assert = require("node:assert/strict");
module.exports = async function assertEnglishControls(page) {
  // User-entered clinical content is intentionally excluded.
  const controls = await page.locator('button:visible, label:visible, th:visible, .ant-tabs-tab:visible, .ant-menu-title-content:visible, .ant-descriptions-item-label:visible').allTextContents();
  assert.deepEqual(controls.filter(text => /\p{Script=Han}/u.test(text)), [], "All visible system controls use English");
};
