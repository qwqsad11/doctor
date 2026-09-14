import { displayLabel, displaySystemText } from "@/utils/labels";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { emrApi, patientsApi } from "@/services/business";
import { emrWorkflow, errorMessage } from "@/services/workflows";
import type {
  EmrDetail,
  EmrTemplate,
  MedicalOrder,
} from "@/services/workflows";
import type { Emr, Patient } from "@/services/types";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/utils/format";
const colors: Record<string, string> = {
  草稿: "default",
  待审核: "orange",
  已审核: "blue",
  已归档: "green",
  已退回: "red",
};
const options = (values: string[]) =>
  values.map((value) => ({ value, label: displayLabel(value) }));
export default function EmrPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Emr[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<EmrDetail | null>(null);
  const [templates, setTemplates] = useState<EmrTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reviewers, setReviewers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [action, setAction] = useState<
    "submit" | "review" | "order" | "stop" | null
  >(null);
  const [order, setOrder] = useState<MedicalOrder | null>(null);
  const [form] = Form.useForm();
  const [actionForm] = Form.useForm();
  const templateId = Form.useWatch("template_id", form);
  const template = templates.find((t) => t.id === templateId);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await emrApi.list({ page, pageSize: 10, keyword, status });
      setList(d.list);
      setTotal(d.total);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    emrWorkflow
      .templates()
      .then(setTemplates)
      .catch((e) => message.error(errorMessage(e)));
  }, []);
  const showDetail = async (id: string) => {
    try {
      setDetail(await emrWorkflow.detail(id));
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const canAuthor =
    !!detail && (user.roles.includes("admin") || detail.doctor_id === user.id);
  const editable =
    canAuthor && !!detail && ["草稿", "已退回"].includes(detail.status);
  const canReview =
    detail?.status === "待审核" &&
    detail.reviewer_id === user.id &&
    detail.doctor_id !== user.id &&
    user.roles.includes("senior_doctor");
  const openEditor = async (record?: EmrDetail) => {
    try {
      const d = await patientsApi.list({ pageSize: 100 });
      setPatients(d.list);
      form.resetFields();
      form.setFieldsValue(
        record
          ? {
              type: record.type,
              template_id: record.template_id,
              patient_id: record.patient_id,
              diagnosis: record.diagnosis,
              content: record.content,
              structured_content: record.structured_content,
            }
          : {
              type: "门诊病历",
              template_id: "outpatient",
              structured_content: {},
            },
      );
      setEditor(record ? { id: record.id } : {});
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      setBusy(true);
      if (editor?.id) delete values.patient_id;
      if (template)
        values.structured_content = Object.fromEntries(
          template.fields.map((field) => [
            field,
            values.structured_content?.[field] || "",
          ]),
        );
      const d = await emrWorkflow.save(editor?.id, values);
      setEditor(null);
      setDetail(d);
      message.success("Medical record saved");
      void load();
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openAction = async (next: typeof action, selected?: MedicalOrder) => {
    try {
      if (next === "submit") setReviewers(await emrWorkflow.reviewers());
      setOrder(selected || null);
      actionForm.resetFields();
      actionForm.setFieldsValue(
        next === "order"
          ? selected || { category: "药物" }
          : next === "review"
            ? { decision: "approve" }
            : {},
      );
      setAction(next);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const applyAction = async () => {
    if (!detail) return;
    try {
      const v = await actionForm.validateFields();
      setBusy(true);
      let d: EmrDetail;
      if (action === "submit")
        d = await emrWorkflow.submit(detail.id, v.reviewer_id);
      else if (action === "review") d = await emrWorkflow.review(detail.id, v);
      else if (action === "stop" && order)
        d = await emrWorkflow.stop(detail.id, order.id, v.reason);
      else d = await emrWorkflow.order(detail.id, v, order?.id);
      setDetail(d);
      setAction(null);
      message.success("Operation completed");
      void load();
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      setDetail(await emrWorkflow.archive(detail.id));
      message.success("Medical record archived");
      void load();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Medical Records"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openEditor()}
        >
          Create Medical Record
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          aria-label="Search records"
          placeholder="Patient, record ID, or diagnosis"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
        <Select
          aria-label="Record status"
          placeholder="All statuses"
          allowClear
          options={options(Object.keys(colors))}
          style={{ width: 150 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Button onClick={load}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "ID", dataIndex: "emr_no", ellipsis: true, width: 170 },
          { title: "Patient", dataIndex: "patient_name" },
          { title: "Type", dataIndex: "type", render: displayLabel },
          { title: "Diagnosis", dataIndex: "diagnosis", ellipsis: true },
          { title: "Doctor", dataIndex: "doctor_name" },
          {
            title: "Status",
            dataIndex: "status",
            render: (v) => <Tag color={colors[v]}>{displayLabel(v)}</Tag>,
          },
          { title: "Updated", dataIndex: "updated_at", render: formatDateTime },
          {
            title: "Actions",
            render: (_, r) => (
              <Button type="link" onClick={() => showDetail(r.id)}>

                View / Manage
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title={detail ? detail.patient_name + " · " + displayLabel(detail.type) : "Medical Record Details"}
        width={Math.min(980, window.innerWidth)}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color={colors[detail.status]}>{displayLabel(detail.status)}</Tag>
              {editable && (
                <>
                  <Button onClick={() => openEditor(detail)}>Edit Medical Record</Button>
                  <Button type="primary" onClick={() => openAction("submit")}>

                    Submit for review
                  </Button>
                </>
              )}
              {canReview && (
                <Button type="primary" onClick={() => openAction("review")}>

                  Review record
                </Button>
              )}
              {canAuthor && detail.status === "已审核" && (
                <Popconfirm
                  title="Archiving locks the record and its orders. Archive now?"
                  onConfirm={archive}
                >
                  <Button type="primary" loading={busy}>

                    Archive record
                  </Button>
                </Popconfirm>
              )}
              {editable &&
                detail.orders.length === 0 &&
                detail.review_history.length === 0 && (
                  <Popconfirm
                    title="Delete this draft?"
                    onConfirm={async () => {
                      try {
                        await emrApi.remove(detail.id);
                        setDetail(null);
                        void load();
                      } catch (e) {
                        message.error(errorMessage(e));
                      }
                    }}
                  >
                    <Button danger>Delete draft</Button>
                  </Popconfirm>
                )}
            </Space>
            {detail.status === "已归档" && (
              <Alert
                type="success"
                showIcon
                message={
                  "Archived · " +
                  formatDateTime(detail.archived_at || detail.updated_at)
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Tabs
              items={[
                {
                  key: "record",
                  label: "Record Content",
                  children: (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="ID">
                        {detail.emr_no}
                      </Descriptions.Item>
                      <Descriptions.Item label="Author / Reviewer">
                        {detail.doctor_name} /{" "}
                        {detail.reviewer_name || "Not assigned"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Diagnosis">
                        {detail.diagnosis || "Not provided"}
                      </Descriptions.Item>
                      {Object.entries(detail.structured_content).map(
                        ([label, value]) => (
                          <Descriptions.Item key={label} label={displayLabel(label)}>
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {value || "Not provided"}
                            </span>
                          </Descriptions.Item>
                        ),
                      )}
                      <Descriptions.Item label="Additional notes">
                        <span style={{ whiteSpace: "pre-wrap" }}>
                          {detail.content || "None"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: "orders",
                  label: "Orders (" + detail.orders.length + ")",
                  children: (
                    <>
                      {editable && (
                        <Button
                          type="primary"
                          onClick={() => openAction("order")}
                          style={{ marginBottom: 16 }}
                        >

                          Create order
                        </Button>
                      )}
                      <Table
                        rowKey="id"
                        dataSource={detail.orders}
                        pagination={false}
                        expandable={{
                          expandedRowRender: (r) => (
                            <Timeline
                              items={r.history.map((h) => ({
                                children: (
                                  <>
                                    <b>{displayLabel(h.action)}</b> · {h.actor} ·{" "}
                                    {formatDateTime(h.at)}
                                    <div>{displaySystemText(h.detail)}</div>
                                  </>
                                ),
                              }))}
                            />
                          ),
                        }}
                        columns={[
                          { title: "Category", dataIndex: "category", render: displayLabel },
                          { title: "Name", dataIndex: "name" },
                          { title: "Instructions", dataIndex: "instruction" },
                          {
                            title: "Status",
                            dataIndex: "status",
                            render: (v) => (
                              <Tag color={v === "执行中" ? "blue" : "default"}>
                                {displayLabel(v)}
                              </Tag>
                            ),
                          },
                          {
                            title: "Actions",
                            render: (_, r) =>
                              editable && r.status === "执行中" ? (
                                <Space>
                                  <Button
                                    type="link"
                                    onClick={() => openAction("order", r)}
                                  >

                                    Edit
                                  </Button>
                                  <Button
                                    type="link"
                                    danger
                                    onClick={() => openAction("stop", r)}
                                  >

                                    Stop
                                  </Button>
                                </Space>
                              ) : (
                                "—"
                              ),
                          },
                        ]}
                      />
                    </>
                  ),
                },
                {
                  key: "history",
                  label: "Review history",
                  children: detail.review_history.length ? (
                    <Timeline
                      items={detail.review_history.map((h) => ({
                        children: (
                          <>
                            <Typography.Text strong>
                              {displayLabel(h.action)} · {h.actor}
                            </Typography.Text>
                            <div>{formatDateTime(h.at)}</div>
                            <p style={{ whiteSpace: "pre-wrap" }}>
                              {displaySystemText(h.comment)}
                            </p>
                          </>
                        ),
                      }))}
                    />
                  ) : (
                    <Empty description="Not submitted for review" />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
      <Modal
        title={editor?.id ? "Edit Medical Record" : "Create Medical Record"}
        open={!!editor}
        onCancel={() => setEditor(null)}
        onOk={save}
        confirmLoading={busy}
        width={800}
        okText="Save draft"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="template_id"
                label="Structured template"
                rules={[{ required: true }]}
              >
                <Select
                  options={templates.map((t) => ({
                    value: t.id,
                    label: displayLabel(t.name),
                  }))}
                  onChange={(id) => {
                    const t = templates.find((x) => x.id === id);
                    const old = form.getFieldValue("structured_content") || {};
                    form.setFieldsValue({
                      type: t?.type,
                      structured_content: Object.fromEntries(
                        (t?.fields || []).map((f) => [f, old[f] || ""]),
                      ),
                    });
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="type" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis" rules={[{ max: 5000 }]}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
          <Row gutter={16}>
            {template?.fields.map((field) => (
              <Col xs={24} md={12} key={field}>
                <Form.Item name={["structured_content", field]} label={displayLabel(field)}>
                  <Input.TextArea rows={2} maxLength={5000} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item name="content" label="Additional record content">
            <Input.TextArea rows={3} maxLength={30000} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          {
            submit: "Submit for senior review",
            review: "Review record",
            order: order ? "Edit order" : "Create order",
            stop: "Stop order",
          }[action || "submit"]
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={applyAction}
        confirmLoading={busy}
        okText="Confirm"
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical">
          {action === "submit" && (
            <>
              {!reviewers.length && (
                <Alert
                  type="info"
                  message="No senior doctors available. Assign the Senior Doctor role to another doctor in Access Management."
                />
              )}
              <Form.Item
                name="reviewer_id"
                label="Senior doctor"
                rules={[{ required: true }]}
              >
                <Select
                  options={reviewers.map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </Form.Item>
            </>
          )}
          {action === "review" && (
            <>
              <Form.Item
                name="decision"
                label="Review decision"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "approve", label: "Approve final review" },
                    { value: "reject", label: "Return for changes" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="comment"
                label="Review comments"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea maxLength={2000} rows={4} />
              </Form.Item>
            </>
          )}
          {action === "order" && (
            <>
              <Form.Item
                name="category"
                label="Order category"
                rules={[{ required: true }]}
              >
                <Select options={options(["药物", "检查", "检验"])} />
              </Form.Item>
              <Form.Item
                name="name"
                label="Order name"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item
                name="instruction"
                label="Instructions (dose, frequency, route, or examination requirements)"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea rows={4} maxLength={2000} />
              </Form.Item>
            </>
          )}
          {action === "stop" && (
            <Form.Item
              name="reason"
              label="Reason for stopping"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input.TextArea rows={3} maxLength={500} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
