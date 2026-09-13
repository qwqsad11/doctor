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
  values.map((value) => ({ value, label: value }));
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
      message.success("病历已保存");
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
      message.success("操作成功");
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
      message.success("病历已归档");
      void load();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="电子病历"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openEditor()}
        >
          新建病历
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          aria-label="搜索病历"
          placeholder="患者、病历编号或诊断"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
        <Select
          aria-label="病历状态"
          placeholder="全部状态"
          allowClear
          options={options(Object.keys(colors))}
          style={{ width: 150 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Button onClick={load}>刷新</Button>
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
          { title: "编号", dataIndex: "emr_no", ellipsis: true, width: 170 },
          { title: "患者", dataIndex: "patient_name" },
          { title: "类型", dataIndex: "type" },
          { title: "诊断", dataIndex: "diagnosis", ellipsis: true },
          { title: "医生", dataIndex: "doctor_name" },
          {
            title: "状态",
            dataIndex: "status",
            render: (v) => <Tag color={colors[v]}>{v}</Tag>,
          },
          { title: "更新", dataIndex: "updated_at", render: formatDateTime },
          {
            title: "操作",
            render: (_, r) => (
              <Button type="link" onClick={() => showDetail(r.id)}>
                查看 / 处理
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title={detail ? detail.patient_name + " · " + detail.type : "病历详情"}
        width={Math.min(980, window.innerWidth)}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color={colors[detail.status]}>{detail.status}</Tag>
              {editable && (
                <>
                  <Button onClick={() => openEditor(detail)}>编辑病历</Button>
                  <Button type="primary" onClick={() => openAction("submit")}>
                    提交审核
                  </Button>
                </>
              )}
              {canReview && (
                <Button type="primary" onClick={() => openAction("review")}>
                  审核病历
                </Button>
              )}
              {canAuthor && detail.status === "已审核" && (
                <Popconfirm
                  title="归档后病历及医嘱将锁定，确认归档？"
                  onConfirm={archive}
                >
                  <Button type="primary" loading={busy}>
                    归档病历
                  </Button>
                </Popconfirm>
              )}
              {editable &&
                detail.orders.length === 0 &&
                detail.review_history.length === 0 && (
                  <Popconfirm
                    title="删除此草稿？"
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
                    <Button danger>删除草稿</Button>
                  </Popconfirm>
                )}
            </Space>
            {detail.status === "已归档" && (
              <Alert
                type="success"
                showIcon
                message={
                  "已归档 · " +
                  formatDateTime(detail.archived_at || detail.updated_at)
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Tabs
              items={[
                {
                  key: "record",
                  label: "病历内容",
                  children: (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="编号">
                        {detail.emr_no}
                      </Descriptions.Item>
                      <Descriptions.Item label="作者 / 审核人">
                        {detail.doctor_name} /{" "}
                        {detail.reviewer_name || "尚未指定"}
                      </Descriptions.Item>
                      <Descriptions.Item label="诊断">
                        {detail.diagnosis || "未填写"}
                      </Descriptions.Item>
                      {Object.entries(detail.structured_content).map(
                        ([label, value]) => (
                          <Descriptions.Item key={label} label={label}>
                            <span style={{ whiteSpace: "pre-wrap" }}>
                              {value || "未填写"}
                            </span>
                          </Descriptions.Item>
                        ),
                      )}
                      <Descriptions.Item label="补充病历">
                        <span style={{ whiteSpace: "pre-wrap" }}>
                          {detail.content || "无"}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: "orders",
                  label: "医嘱（" + detail.orders.length + "）",
                  children: (
                    <>
                      {editable && (
                        <Button
                          type="primary"
                          onClick={() => openAction("order")}
                          style={{ marginBottom: 16 }}
                        >
                          开具医嘱
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
                                    <b>{h.action}</b> · {h.actor} ·{" "}
                                    {formatDateTime(h.at)}
                                    <div>{h.detail}</div>
                                  </>
                                ),
                              }))}
                            />
                          ),
                        }}
                        columns={[
                          { title: "类别", dataIndex: "category" },
                          { title: "名称", dataIndex: "name" },
                          { title: "执行说明", dataIndex: "instruction" },
                          {
                            title: "状态",
                            dataIndex: "status",
                            render: (v) => (
                              <Tag color={v === "执行中" ? "blue" : "default"}>
                                {v}
                              </Tag>
                            ),
                          },
                          {
                            title: "操作",
                            render: (_, r) =>
                              editable && r.status === "执行中" ? (
                                <Space>
                                  <Button
                                    type="link"
                                    onClick={() => openAction("order", r)}
                                  >
                                    修改
                                  </Button>
                                  <Button
                                    type="link"
                                    danger
                                    onClick={() => openAction("stop", r)}
                                  >
                                    停止
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
                  label: "审核记录",
                  children: detail.review_history.length ? (
                    <Timeline
                      items={detail.review_history.map((h) => ({
                        children: (
                          <>
                            <Typography.Text strong>
                              {h.action} · {h.actor}
                            </Typography.Text>
                            <div>{formatDateTime(h.at)}</div>
                            <p style={{ whiteSpace: "pre-wrap" }}>
                              {h.comment}
                            </p>
                          </>
                        ),
                      }))}
                    />
                  ) : (
                    <Empty description="尚未提交审核" />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
      <Modal
        title={editor?.id ? "编辑病历" : "新建病历"}
        open={!!editor}
        onCancel={() => setEditor(null)}
        onOk={save}
        confirmLoading={busy}
        width={800}
        okText="保存草稿"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="template_id"
                label="结构化模板"
                rules={[{ required: true }]}
              >
                <Select
                  options={templates.map((t) => ({
                    value: t.id,
                    label: t.name,
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
          <Form.Item name="diagnosis" label="诊断" rules={[{ max: 5000 }]}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
          <Row gutter={16}>
            {template?.fields.map((field) => (
              <Col xs={24} md={12} key={field}>
                <Form.Item name={["structured_content", field]} label={field}>
                  <Input.TextArea rows={2} maxLength={5000} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <Form.Item name="content" label="补充病历内容">
            <Input.TextArea rows={3} maxLength={30000} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          {
            submit: "提交上级审核",
            review: "审核病历",
            order: order ? "修改医嘱" : "开具医嘱",
            stop: "停止医嘱",
          }[action || "submit"]
        }
        open={!!action}
        onCancel={() => setAction(null)}
        onOk={applyAction}
        confirmLoading={busy}
        okText="确认"
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical">
          {action === "submit" && (
            <>
              {!reviewers.length && (
                <Alert
                  type="info"
                  message="暂无可选上级医生，请在管理授权中为另一位医生赋予 senior_doctor 角色。"
                />
              )}
              <Form.Item
                name="reviewer_id"
                label="上级医生"
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
                label="审核结果"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "approve", label: "通过最终审核" },
                    { value: "reject", label: "退回修改" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="comment"
                label="审核意见"
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
                label="医嘱类别"
                rules={[{ required: true }]}
              >
                <Select options={options(["药物", "检查", "检验"])} />
              </Form.Item>
              <Form.Item
                name="name"
                label="医嘱名称"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input maxLength={200} />
              </Form.Item>
              <Form.Item
                name="instruction"
                label="执行说明（剂量、频次、途径或检查要求）"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input.TextArea rows={4} maxLength={2000} />
              </Form.Item>
            </>
          )}
          {action === "stop" && (
            <Form.Item
              name="reason"
              label="停止原因"
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
