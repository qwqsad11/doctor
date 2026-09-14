import { displayLabel, displaySystemText } from "@/utils/labels";
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
  label: displayLabel(value),
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
          setUpdated(new Date().toLocaleTimeString("en-US", { hour12: false }));
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
      message.success("Health plan saved");
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
      message.success("Saved");
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
      title="Patient Health Management"
      extra={
        <Button type="primary" onClick={() => openEditor()}>
          Create Health Plan
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by patient or plan"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          aria-label="Alert Level"
          placeholder="All levels"
          options={levels}
          allowClear
          value={level}
          onChange={(v) => {
            setLevel(v);
            setPage(1);
          }}
          style={{ width: 140 }}
        />
        <Button onClick={load}>Refresh</Button>
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
          { title: "Patient", dataIndex: "patient_name" },
          { title: "Health Plan", dataIndex: "plan" },
          {
            title: "Latest measurement",
            dataIndex: "metrics",
            render: (v) => v ? displaySystemText(v) : "No uploads yet",
          },
          {
            title: "Assessment level",
            dataIndex: "alert_level",
            render: (v) => <Tag color={colors[v]}>{displayLabel(v)}</Tag>,
          },
          {
            title: "Next assessment",
            render: (_, r) => {
              const due = (r as HealthDetail).next_assessment_at;
              return due ? (
                <Tag color={new Date(due) <= new Date() ? "red" : "blue"}>
                  {formatDateTime(due)}
                </Tag>
              ) : (
                "Not scheduled"
              );
            },
          },
          {
            title: "Actions",
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

                View / Manage
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title={detail ? detail.patient_name + " · Health Management" : "Loading health plan"}
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
              <Tag color={colors[detail.alert_level]}>{displayLabel(detail.alert_level)}</Tag>
              <Button onClick={() => openEditor(detail)}>Adjust plan</Button>
              <Button onClick={() => openAction("assessment")}>

                Add health assessment
              </Button>
              <Typography.Text type="secondary">

                Refreshes every 10 seconds · {updated}
              </Typography.Text>
            </Space>
            <Tabs
              items={[
                {
                  key: "monitor",
                  label: "Health monitoring",
                  children: (
                    <>
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        style={{ marginBottom: 16 }}
                      >
                        <Descriptions.Item label="Management plan">
                          {detail.plan}
                        </Descriptions.Item>
                        <Descriptions.Item label="Personal goals">
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {detail.goals || "Not provided"}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Lifestyle and health guidance">
                          <span style={{ whiteSpace: "pre-wrap" }}>
                            {detail.guidance || "Not provided"}
                          </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Latest Metrics">
                          {displaySystemText(detail.metrics) === "-" ? "No measurements yet" : displaySystemText(detail.metrics)}
                        </Descriptions.Item>
                      </Descriptions>
                      <Button
                        onClick={() => openAction("measurement")}
                        style={{ marginBottom: 16 }}
                      >

                        Record measurements
                      </Button>
                      <MeasurementTable entries={detail.entries} />
                    </>
                  ),
                },
                {
                  key: "reminders",
                  label: "Reminders and messages",
                  children: (
                    <>
                      <Space style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          onClick={() => openAction("reminder")}
                        >

                          Schedule reminder
                        </Button>
                        <Typography.Text type="secondary">

                          Automatically delivered to the patient portal when due
                        </Typography.Text>
                      </Space>
                      <Table
                        size="small"
                        rowKey="id"
                        dataSource={detail.reminders}
                        pagination={{ pageSize: 5 }}
                        columns={[
                          { title: "Reminder message", dataIndex: "message" },
                          {
                            title: "Scheduled time",
                            dataIndex: "next_run_at",
                            render: formatDateTime,
                          },
                          {
                            title: "Frequency",
                            dataIndex: "interval_days",
                            render: (v) => (v ? "Every " + v + " days" : "Once"),
                          },
                          {
                            title: "Status",
                            render: (_, r) => (
                              <Tag>
                                {r.enabled
                                  ? "Pending"
                                  : r.last_sent_at
                                    ? "Sent / Finished"
                                    : "Cancelled"}
                              </Tag>
                            ),
                          },
                          {
                            title: "Actions",
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
                                  Cancel
                                </Button>
                              ),
                          },
                        ]}
                      />
                      <List
                        header="Messages delivered to the patient"
                        dataSource={detail.entries.filter(
                          (e) => e.kind === "notification",
                        )}
                        locale={{ emptyText: "No messages yet" }}
                        pagination={{ pageSize: 5 }}
                        renderItem={(e) => (
                          <List.Item>
                            <List.Item.Meta
                              title={displaySystemText(e.data.message)}
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
                  label: "Assessment history",
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
                            ? "Next assessment:" +
                              formatDateTime(detail.next_assessment_at)
                            : "Next assessment has not been scheduled"
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
                                  <p>Assessment:{e.data.conclusion}</p>
                                  <p>Advice:{e.data.advice}</p>
                                  <p>Level:{displayLabel(e.data.alert_level)}</p>
                                  {e.data.revised_plan && (
                                    <p>

                                      Plan change:{e.data.previous_plan} →{" "}
                                      {e.data.revised_plan}
                                    </p>
                                  )}
                                  <p>

                                    Next assessment:
                                    {formatDateTime(
                                      e.data.next_assessment_at || "",
                                    )}
                                  </p>
                                </>
                              ),
                            }))}
                        />
                      ) : (
                        <Empty description="No assessments yet" />
                      )}
                    </>
                  ),
                },
                {
                  key: "access",
                  label: "Patient portal",
                  children: (
                    <>
                      <Alert
                        type="info"
                        showIcon
                        message="Create a patient link for this plan"
                        description="Patients can upload blood pressure and glucose readings and view reminders. Links expire in 7 days. Generating a new link invalidates the previous link."
                        style={{ marginBottom: 16 }}
                      />
                      <Space>
                        <Button
                          type="primary"
                          loading={busy}
                          onClick={generateLink}
                        >

                          Generate / Renew patient link
                        </Button>
                        {detail.patient_access_expires_at && (
                          <Button
                            danger
                            onClick={async () => {
                              try {
                                await healthWorkflow.revoke(detail.id);
                                setLink("");
                                await refreshDetail();
                                message.success("Link revoked");
                              } catch (e) {
                                message.error(errorMessage(e));
                              }
                            }}
                          >

                            Revoke link
                          </Button>
                        )}
                      </Space>
                      {detail.patient_access_expires_at && (
                        <p>

                          Expires:
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

                            Open patient portal
                          </a>
                        </Card>
                      )}
                    </>
                  ),
                },
              ]}
            />
            <Popconfirm
              title="Delete this plan and its measurements, assessments, and reminders?"
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

                Delete plan
              </Button>
            </Popconfirm>
          </>
        )}
      </Drawer>
      <Modal
        title={editor?.id ? "Adjust Health Plan" : "Create Health Plan"}
        open={!!editor}
        onCancel={() => setEditor(null)}
        onOk={save}
        confirmLoading={busy}
        okText="Save"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="patient_id"
            label="Patient"
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
            label="Plan name"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="goals" label="Personal health goals">
            <Input.TextArea maxLength={5000} rows={3} />
          </Form.Item>
          <Form.Item name="guidance" label="Lifestyle, monitoring, and follow-up advice">
            <Input.TextArea maxLength={5000} rows={4} />
          </Form.Item>
          <Form.Item name="alert_level" label="Current assessment level">
            <Select options={levels} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          action === "measurement"
            ? "Record measurements"
            : action === "reminder"
              ? "Set health reminder"
              : "Health assessment"
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={apply}
        confirmLoading={busy}
        okText="Save"
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical">
          {action === "measurement" && <MeasurementFields />}
          {action === "reminder" && (
            <>
              <Form.Item
                name="message"
                label="Reminder message"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={500} rows={3} />
              </Form.Item>
              <Form.Item
                name="next_run_at"
                label="First reminder time"
                rules={[{ required: true }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
              <Form.Item
                name="interval_days"
                label="Repeat interval (days, 0 for once)"
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
                label="Assessment conclusion"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={5000} rows={3} />
              </Form.Item>
              <Form.Item
                name="advice"
                label="Updated health advice (shared with the patient)"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={5000} rows={3} />
              </Form.Item>
              <Form.Item
                name="alert_level"
                label="Assessment level"
                rules={[{ required: true }]}
              >
                <Select options={levels} />
              </Form.Item>
              <Form.Item name="revised_plan" label="Revised plan name (optional)">
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item
                name="next_assessment_at"
                label="Next assessment time"
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
