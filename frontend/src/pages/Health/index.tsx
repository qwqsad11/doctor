import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { healthApi, patientsApi } from "@/services/business";
import { healthWorkflow, errorMessage } from "@/services/workflows";
import type { HealthDetail } from "@/services/workflows";
import type { HealthRecord, Patient } from "@/services/types";
import { formatDateTime } from "@/utils/format";
import {
  localDateTime,
  MeasurementFields,
  MeasurementTable,
} from "./HealthWidgets";
const levels = ["正常", "预警", "异常"].map((value) => ({
  value,
  label: value,
}));
const colors: Record<string, string> = {
  正常: "green",
  预警: "orange",
  异常: "red",
};
export default function HealthPage() {
  const [list, setList] = useState<HealthRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HealthDetail | null>(null);
  const [liveError, setLiveError] = useState("");
  const [updated, setUpdated] = useState("");
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [action, setAction] = useState<
    "measurement" | "reminder" | "assessment" | null
  >(null);
  const [link, setLink] = useState("");
  const [form] = Form.useForm();
  const [actionForm] = Form.useForm();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await healthApi.list({
        page,
        pageSize: 10,
        keyword,
        alert_level: level,
      });
      setList(data.list);
      setTotal(data.total);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, keyword, level]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const refresh = async () => {
      try {
        const d = await healthWorkflow.detail(selectedId);
        if (active) {
          setDetail(d);
          setUpdated(new Date().toLocaleTimeString());
          setLiveError("");
        }
      } catch (e) {
        if (active) setLiveError(errorMessage(e));
      }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);
  const refreshDetail = async () => {
    if (selectedId) setDetail(await healthWorkflow.detail(selectedId));
    void load();
  };
  const openEditor = async (record?: HealthDetail) => {
    try {
      setPatients((await patientsApi.list({ pageSize: 100 })).list);
      form.resetFields();
      form.setFieldsValue(
        record
          ? {
              patient_id: record.patient_id,
              plan: record.plan,
              goals: record.goals,
              guidance: record.guidance,
              alert_level: record.alert_level,
            }
          : { alert_level: "正常" },
      );
      setEditor(record ? { id: record.id } : {});
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const save = async () => {
    try {
      const v = await form.validateFields();
      setBusy(true);
      if (editor?.id) {
        delete v.patient_id;
        await healthApi.update(editor.id, v);
      } else await healthApi.create(v);
      setEditor(null);
      await refreshDetail();
      message.success("健康计划已保存");
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openAction = (next: typeof action) => {
    actionForm.resetFields();
    actionForm.setFieldsValue(
      next === "measurement"
        ? { kind: "血压", measured_at: localDateTime() }
        : next === "reminder"
          ? {
              interval_days: 0,
              next_run_at: localDateTime(new Date(Date.now() + 120000)),
            }
          : {
              alert_level: detail?.alert_level,
              next_assessment_at: localDateTime(
                new Date(Date.now() + 7 * 86400000),
              ),
            },
    );
    setAction(next);
  };
  const apply = async () => {
    if (!detail) return;
    try {
      const v = await actionForm.validateFields();
      setBusy(true);
      if (action === "measurement") {
        v.measured_at = new Date(v.measured_at).toISOString();
        await healthWorkflow.measurement(detail.id, v);
      } else if (action === "reminder") {
        v.next_run_at = new Date(v.next_run_at).toISOString();
        await healthWorkflow.reminder(detail.id, v);
      } else {
        v.next_assessment_at = new Date(v.next_assessment_at).toISOString();
        if (!v.revised_plan) delete v.revised_plan;
        await healthWorkflow.assessment(detail.id, v);
      }
      setAction(null);
      await refreshDetail();
      message.success("已保存");
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const generateLink = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const d = await healthWorkflow.access(detail.id);
      setLink(window.location.origin + "/patient-health#" + d.token);
      await refreshDetail();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="患者健康管理"
      extra={
        <Button type="primary" onClick={() => openEditor()}>
          制定健康计划
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索患者或计划"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          aria-label="预警等级"
          placeholder="全部等级"
          options={levels}
          allowClear
          value={level}
          onChange={(v) => {
            setLevel(v);
            setPage(1);
          }}
          style={{ width: 140 }}
        />
        <Button onClick={load}>刷新</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        scroll={{ x: 850 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "患者", dataIndex: "patient_name" },
          { title: "健康计划", dataIndex: "plan" },
          {
            title: "最新监测",
            dataIndex: "metrics",
            render: (v) => v || "暂无上传",
          },
          {
            title: "评估等级",
            dataIndex: "alert_level",
            render: (v) => <Tag color={colors[v]}>{v}</Tag>,
          },
          {
            title: "下次评估",
            render: (_, r) => {
              const due = (r as HealthDetail).next_assessment_at;
              return due ? (
                <Tag color={new Date(due) <= new Date() ? "red" : "blue"}>
                  {formatDateTime(due)}
                </Tag>
              ) : (
                "待安排"
              );
            },
          },
          {
            title: "操作",
            render: (_, r) => (
              <Button
                type="link"
                onClick={() => {
                  setDetail(null);
                  setLink("");
                  setLiveError("");
                  setSelectedId(r.id);
                }}
              >
                查看 / 管理
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title={detail ? detail.patient_name + " · 健康管理" : "加载健康计划"}
        width={Math.min(1000, window.innerWidth)}
        open={!!selectedId}
        onClose={() => {
          setSelectedId(null);
          setDetail(null);
          setLink("");
        }}
      >
        {liveError && <Alert type="error" message={liveError} showIcon />}
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color={colors[detail.alert_level]}>{detail.alert_level}</Tag>
              <Button onClick={() => openEditor(detail)}>调整计划</Button>
              <Button onClick={() => openAction("assessment")}>
                新增健康评估
              </Button>
              <Typography.Text type="secondary">
                每 10 秒刷新 · {updated}
              </Typography.Text>
            </Space>
            <Tabs
              items={[
                {
                  key: "monitor",
                  label: "健康监测",
                  children: (
                    <>
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        style={{ marginBottom: 16 }}
                      >
                        <Descriptions.Item label="管理计划">
                          {detail.plan}
                        </Descriptions.Item>
                        <Descriptions.Item label="个性化目标">
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {detail.goals || "未填写"}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="生活与健康指导">
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {detail.guidance || "未填写"}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="最新指标">
                          {detail.metrics || "暂无监测"}
                        </Descriptions.Item>
                      </Descriptions>
                      <Button
                        onClick={() => openAction("measurement")}
                        style={{ marginBottom: 16 }}
                      >
                        代录监测数据
                      </Button>
                      <MeasurementTable entries={detail.entries} />
                    </>
                  ),
                },
                {
                  key: "reminders",
                  label: "提醒与消息",
                  children: (
                    <>
                      <Space style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          onClick={() => openAction("reminder")}
                        >
                          设置提醒任务
                        </Button>
                        <Typography.Text type="secondary">
                          到期后自动送达患者入口消息列表
                        </Typography.Text>
                      </Space>
                      <Table
                        size="small"
                        rowKey="id"
                        dataSource={detail.reminders}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "提醒内容", dataIndex: "message" },
                          {
                            title: "计划时间",
                            dataIndex: "next_run_at",
                            render: formatDateTime,
                          },
                          {
                            title: "周期",
                            dataIndex: "interval_days",
                            render: (v) => (v ? "每 " + v + " 天" : "一次"),
                          },
                          {
                            title: "状态",
                            render: (_, r) => (
                              <Tag>
                                {r.enabled
                                  ? "待执行"
                                  : r.last_sent_at
                                    ? "已发送 / 已结束"
                                    : "已取消"}
                              </Tag>
                            ),
                          },
                          {
                            title: "操作",
                            render: (_, r) =>
                              r.enabled && (
                                <Button
                                  type="link"
                                  danger
                                  onClick={async () => {
                                    try {
                                      await healthWorkflow.cancelReminder(
                                        detail.id,
                                        r.id,
                                      );
                                      await refreshDetail();
                                    } catch (e) {
                                      message.error(errorMessage(e));
                                    }
                                  }}
                                >
                                  取消
                                </Button>
                              ),
                          },
                        ]}
                      />
                      <List
                        header="患者已收到的消息"
                        dataSource={detail.entries.filter(
                          (e) => e.kind === "notification",
                        )}
                        locale={{ emptyText: "暂无消息" }}
                        pagination={{ pageSize: 5 }}
                        renderItem={(e) => (
                          <List.Item>
                            <List.Item.Meta
                              title={e.data.message}
                              description={formatDateTime(e.created_at)}
                            />
                          </List.Item>
                        )}
                      />
                    </>
                  ),
                },
                {
                  key: "assessment",
                  label: "评估记录",
                  children: (
                    <>
                      <Alert
                        style={{ marginBottom: 20 }}
                        type={
                          detail.next_assessment_at &&
                          new Date(detail.next_assessment_at) <= new Date()
                            ? "warning"
                            : "info"
                        }
                        message={
                          detail.next_assessment_at
                            ? "下次评估：" +
                              formatDateTime(detail.next_assessment_at)
                            : "尚未安排下次评估"
                        }
                      />
                      {detail.entries.some((e) => e.kind === "assessment") ? (
                        <Timeline
                          items={detail.entries
                            .filter((e) => e.kind === "assessment")
                            .map((e) => ({
                              children: (
                                <>
                                  <b>
                                    {e.actor} · {formatDateTime(e.created_at)}
                                  </b>
                                  <p>评估：{e.data.conclusion}</p>
                                  <p>建议：{e.data.advice}</p>
                                  <p>等级：{e.data.alert_level}</p>
                                  {e.data.revised_plan && (
                                    <p>
                                      计划调整：{e.data.previous_plan} →{" "}
                                      {e.data.revised_plan}
                                    </p>
                                  )}
                                  <p>
                                    下次评估：
                                    {formatDateTime(
                                      e.data.next_assessment_at || "",
                                    )}
                                  </p>
                                </>
                              ),
                            }))}
                        />
                      ) : (
                        <Empty description="暂无评估记录" />
                      )}
                    </>
                  ),
                },
                {
                  key: "access",
                  label: "患者入口",
                  children: (
                    <>
                      <Alert
                        type="info"
                        showIcon
                        message="为本计划生成患者专属链接"
                        description="患者可通过链接上传血压、血糖并查看健康提醒。链接有效期为 7 天；重新生成会使旧链接失效。"
                        style={{ marginBottom: 16 }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          loading={busy}
                          onClick={generateLink}
                        >
                          生成 / 更新患者链接
                        </Button>
                        {detail.patient_access_expires_at && (
                          <Button
                            danger
                            onClick={async () => {
                              try {
                                await healthWorkflow.revoke(detail.id);
                                setLink("");
                                await refreshDetail();
                                message.success("链接已撤销");
                              } catch (e) {
                                message.error(errorMessage(e));
                              }
                            }}
                          >
                            撤销链接
                          </Button>
                        )}
                      </Space>
                      {detail.patient_access_expires_at && (
                        <p>
                          到期时间：
                          {formatDateTime(detail.patient_access_expires_at)}
                        </p>
                      )}
                      {link && (
                        <Card size="small" style={{ marginTop: 16 }}>
                          <Typography.Paragraph
                            copyable={{ text: link }}
                            style={{ wordBreak: "break-all" }}
                          >
                            {link}
                          </Typography.Paragraph>
                          <a href={link} target="_blank" rel="noreferrer">
                            打开患者入口
                          </a>
                        </Card>
                      )}
                    </>
                  ),
                },
              ]}
            />
            <Popconfirm
              title="删除此计划及其监测、评估、提醒记录？"
              onConfirm={async () => {
                try {
                  await healthApi.remove(detail.id);
                  setSelectedId(null);
                  setDetail(null);
                  void load();
                } catch (e) {
                  message.error(errorMessage(e));
                }
              }}
            >
              <Button danger style={{ marginTop: 32 }}>
                删除计划
              </Button>
            </Popconfirm>
          </>
        )}
      </Drawer>
      <Modal
        title={editor?.id ? "调整健康计划" : "制定健康计划"}
        open={!!editor}
        onCancel={() => setEditor(null)}
        onOk={save}
        confirmLoading={busy}
        okText="保存"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="patient_id"
            label="患者"
            rules={[{ required: true }]}
          >
            <Select
              disabled={!!editor?.id}
              showSearch
              optionFilterProp="label"
              options={patients.map((p) => ({
                value: p.id,
                label: p.name + "（" + p.patient_no + "）",
              }))}
            />
          </Form.Item>
          <Form.Item
            name="plan"
            label="计划名称"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="goals" label="个性化健康目标">
            <Input.TextArea maxLength={5000} rows={3} />
          </Form.Item>
          <Form.Item name="guidance" label="生活方式、监测与随访建议">
            <Input.TextArea maxLength={5000} rows={4} />
          </Form.Item>
          <Form.Item name="alert_level" label="当前评估等级">
            <Select options={levels} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          action === "measurement"
            ? "代录监测数据"
            : action === "reminder"
              ? "设置健康提醒"
              : "健康评估"
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={apply}
        confirmLoading={busy}
        okText="保存"
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical">
          {action === "measurement" && <MeasurementFields />}
          {action === "reminder" && (
            <>
              <Form.Item
                name="message"
                label="提醒内容"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={500} rows={3} />
              </Form.Item>
              <Form.Item
                name="next_run_at"
                label="首次提醒时间"
                rules={[{ required: true }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
              <Form.Item
                name="interval_days"
                label="重复间隔（天，0 为一次）"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={365} precision={0} />
              </Form.Item>
            </>
          )}
          {action === "assessment" && (
            <>
              <Form.Item
                name="conclusion"
                label="评估结论"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={5000} rows={3} />
              </Form.Item>
              <Form.Item
                name="advice"
                label="调整后的健康建议（同步给患者）"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={5000} rows={3} />
              </Form.Item>
              <Form.Item
                name="alert_level"
                label="评估等级"
                rules={[{ required: true }]}
              >
                <Select options={levels} />
              </Form.Item>
              <Form.Item name="revised_plan" label="调整计划名称（选填）">
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item
                name="next_assessment_at"
                label="下次评估时间"
                rules={[{ required: true }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
