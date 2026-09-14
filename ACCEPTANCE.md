# 手动验收与账号

打开 http://localhost:3000 。账号已初始化：

- 管理员：admin / admin123，用于管理授权及查看全部数据。
- 普通医生甲：doctor_demo / Doctor123!，负责验收患者甲。
- 上级医生：senior_demo / Doctor123!，负责指定病历的审核。
- 普通医生乙：doctor_other / Doctor123!，负责验收患者乙，用于验证数据隔离。

登录选择短信或邮箱，演示验证码均为 123456。请用不同浏览器或普通窗口与无痕窗口分别登录；同一浏览器的普通标签页共享登录状态。不要在不同普通标签页同时切换账号。

## 验证第 4 点

1. doctor_demo 登录，进入电子病历，打开“验收草稿病历”。编辑模板字段和诊断并保存，再打开检查内容仍在。
2. 在医嘱标签中，修改已有检查医嘱，再停止它并填写原因。展开行查看历史；尝试新增药物和检验医嘱。
3. 点击提交审核，选择“演示上级医生”。待审核时应无法编辑正文或医嘱。
4. senior_demo 登录，打开该病历，填写意见并退回。
5. doctor_demo 修改后重新提交；senior_demo 审核通过。
6. doctor_demo 归档。归档后不再显示编辑入口，不能更改或删除病历。
7. doctor_other 登录，应看不到医生甲的病历。即使取得病历 ID，接口也会返回 403。

“验收待审核病历”已经提交，可直接用 senior_demo 体验审核，无需先走第 1～3 步。

## 验证第 6 点

1. doctor_demo 进入健康管理，打开“验收健康计划”，应看到两条模拟监测数据。
2. 在患者入口标签点击生成链接，用独立窗口打开链接。患者入口无需医生账号。
3. 上传一条新的血压或血糖。回到医生的健康详情，约 10 秒内应出现数据。
4. 在提醒与消息标签设置提醒：首次时间选当前时间之后约 1～2 分钟，重复间隔填 0。
5. 到期后，后端在约 15 秒内处理；患者入口在随后约 10 秒内刷新出消息。必须保持服务运行。提醒为站内消息，不是短信。
6. 点击新增健康评估，填写结论、建议、评估等级、下次评估时间，可调整计划名称。
7. 评估记录应保留结果，患者的健康提醒中应收到新建议。
8. 撤销患者链接，再刷新患者页面，应提示链接无效或过期。

## 重新初始化

在 F:\xiangmu\backend 运行：

```powershell
npm run seed:acceptance
```

脚本保留已有密码、角色、病历状态及数据，重复执行不会把已完成审核的病历改回待审核。如果已有演示账号被修改了密码或角色，脚本会提示并停止，不自动覆盖。

如果服务未运行，先在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## 自动回归

在 backend 目录运行 `npm run test:workflows`。它在独立测试库中验证接口及权限，不改动上述验收账号和数据。

如要同时运行浏览器验收（本机已安装所需工具）：

```powershell
$env:WORKFLOW_BROWSER_TEST = '1'
npm run test:workflows
Remove-Item Env:WORKFLOW_BROWSER_TEST
```

已有详细功能说明见 FEATURES_4_6.md。

## 科室分类与跨科室联合会诊

演示账号的初始科室和职称：
- doctor_demo：心血管内科 · 主治医师 · 普通医生。
- senior_demo：内分泌科 · 主任医师 · 上级医生。
- doctor_other：呼吸内科 · 住院医师 · 普通医生。

密码和验证码保持不变。登录后右上角显示科室、职称与角色；可在个人档案里选择科室、职称。职称不自动赋予审核权限。管理员可在用户列表按科室筛选。

1. 使用 doctor_demo 登录，进入远程会诊，点击发起会诊。
2. 按“内分泌科”筛选，勾选演示上级医生，再切换“呼吸内科”勾选演示医生乙。已选医生会保留，可同时邀请多个科室，最多20人。
3. 填写主题、患者、预约时间和摘要，发送邀请。
4. 使用独立浏览器登录受邀账号，在远程会诊中查看邀请并接受或拒绝。列表每10秒刷新。
5. 至少一位医生接受后，发起人可开始会诊。接受邀请的医生可提交本科室意见，双方每10秒自动刷新查看。
6. 发起人汇总意见并完成会诊。受邀医生不能修改主持信息、结束或删除会诊，未受邀账号不能访问；会诊邀请不会开放患者完整档案和其他病历权限。

初始化已准备“跨科室联合会诊演示”，可直接登录 senior_demo、doctor_other 处理邀请。重复运行 seed:acceptance 只补齐空科室或旧的“演示科室”，保留已修改的科室、密码和会诊状态。

此次新增的是账号邀请和会诊意见协作；现有项目尚未接入真实多人音视频通话。

## 2026-09-15 本地整合

整合上游 master 0ee2b84 与功能分支 c123a4d。原功能分支保留；当前分支 integrate/latest-master-20260915 未创建合并提交或推送。

本机访问 http://127.0.0.1:3000；前端监听 0.0.0.0，局域网设备可使用本机局域网 IP 和 3000 端口（需网络及防火墙允许）。API 和头像走同源代理。沿用本机数据库，备份在 .runtime/before-integration-20260915.dump。

病历审核、医嘱、健康监测、提醒、患者链接、科室及联合会诊功能保留。上游英文界面已合入，新增业务流程仍有部分中文。新建病历入口现为 Create Medical Record，发起会诊为 Start conference。

验证：后端构建、前端类型检查及构建、124 项接口断言和桌面/移动端浏览器回归通过；部署后的同源登录和五个鉴权接口通过。Docker 配置已整合并补充头像代理及构建忽略文件；本机未安装 Docker，未执行容器构建。


## English interface update (2026-09-15)

System controls, forms, messages, department and professional-title labels, workflow statuses, structured-template labels, and API errors now use English. Date/time formatting uses English. Existing patient names and clinical text are preserved, and legacy database enum values and structured field keys remain compatible. English professional-title search is supported.

Verification: backend build, frontend type-check/build, 161 workflow assertions, and desktop/mobile browser regressions passed, including checks for English system controls and API errors. No Git commit or push was created.
