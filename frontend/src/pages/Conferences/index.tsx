import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { conferencesApi, patientsApi } from "@/services/business";
import { directoryApi, jointApi } from "@/services/doctor-directory";
import type {
  DoctorSummary,
  JointConference,
} from "@/services/doctor-directory";
import type { Patient } from "@/services/types";
import { errorMessage } from "@/services/workflows";
import { formatDateTime } from "@/utils/format";
import { useAuth } from "@/hooks/useAuth";
const colors: Record<string, string> = {
  待会诊: "orange",
  进行中: "blue",
  已完成: "green",
};
export default function ConferencesPage() {
  const { user } = useAuth();
  const [list, setList] = useState<JointConference[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [department, setDepartment] = useState<string>();
  const [search, setSearch] = useState("");
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [doctorTotal, setDoctorTotal] = useState(0);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, DoctorSummary>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JointConference | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const [opinion, setOpinion] = useState("");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [form] = Form.useForm();
  const selected: string[] = Form.useWatch("expert_ids", form) || [];
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await jointApi.list({ page, pageSize: 10, keyword });
      setList(r.list);
      setTotal(r.total);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const refresh = async () => {
      try {
        const d = await jointApi.detail(selectedId);
        if (active) {
          setDetail(d);
          setRefreshError("");
        }
      } catch (e) {
        if (active) setRefreshError(errorMessage(e));
      }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setDoctorLoading(true);
    directoryApi
      .doctors({ department, keyword: search, page: doctorPage, pageSize: 6 })
      .then((r) => {
        if (active) {
          setDoctors(r.list);
          setDoctorTotal(r.total);
          setCache((c) => ({
            ...c,
            ...Object.fromEntries(r.list.map((d) => [d.id, d])),
          }));
        }
      })
      .catch((e) => {
        if (active) message.error(errorMessage(e));
      })
      .finally(() => {
        if (active) setDoctorLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, department, search, doctorPage]);
  const host = (c: JointConference) =>
    user.roles.includes("admin") || c.initiator_id === user.id;
  const openCreate = async () => {
    try {
      const [p, d] = await Promise.all([
        patientsApi.list({ pageSize: 100 }),
        directoryApi.departments(),
      ]);
      setPatients(p.list);
      setDepartments(d);
      form.resetFields();
      form.setFieldsValue({ expert_ids: [] });
      setDepartment(undefined);
      setSearch("");
      setDoctorPage(1);
      setOpen(true);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };
  const create = async () => {
    try {
      const values = await form.validateFields();
      setBusy(true);
      if (values.scheduled_at)
        values.scheduled_at = new Date(values.scheduled_at).toISOString();
      const d = await jointApi.create(values);
      setOpen(false);
      setDetail(d);
      setSelectedId(d.id);
      message.success("会诊邀请已发送");
      void load();
    } catch (e) {
      if (!(e as { errorFields?: unknown }).errorFields)
        message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const act = async (operation: () => Promise<JointConference>) => {
    setBusy(true);
    try {
      const d = await operation();
      setDetail(d);
      message.success("操作成功");
      void load();
      return true;
    } catch (e) {
      message.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const participant = detail?.participants.find((p) => p.id === user.id);
  const canComment =
    detail?.status === "进行中" &&
    (host(detail) || participant?.response === "已接受");
  return (
    <Card
      title="跨科室联合会诊"
      extra={
        <Button type="primary" onClick={openCreate}>
          发起会诊
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="按患者 / 会诊主题搜索"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
        <Button onClick={load}>刷新</Button>
        <Typography.Text type="secondary">
          我发起或受邀的会诊 · 每 10 秒刷新
        </Typography.Text>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "主题", dataIndex: "topic" },
          { title: "患者", dataIndex: "patient_name" },
          {
            title: "发起医生",
            render: (_, r) => (
              <>
                {r.initiator_name}
                <div>
                  <Tag>{r.initiator_department || "未设置科室"}</Tag>
                </div>
              </>
            ),
          },
          {
            title: "参会医生 / 科室",
            render: (_, r) => (
              <Space wrap>
                {r.participants?.length
                  ? r.participants.map((p) => (
                      <Tag key={p.id}>
                        {p.name} · {p.department} · {p.response}
                      </Tag>
                    ))
                  : r.experts.map((name, i) => (
                      <Tag key={i}>{name}（历史记录）</Tag>
                    ))}
              </Space>
            ),
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (v) => <Tag color={colors[v]}>{v}</Tag>,
          },
          {
            title: "我的身份",
            render: (_, r) =>
              r.initiator_id === user.id
                ? "发起人"
                : r.participants.find((p) => p.id === user.id)?.response ||
                  "管理员查看",
          },
          {
            title: "操作",
            render: (_, r) => (
              <Button
                type="link"
                onClick={() => {
                  setDetail(null);
                  setRefreshError("");
                  setOpinion("");
                  setSelectedId(r.id);
                }}
              >
                查看会诊
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title="发起跨科室会诊"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={create}
        confirmLoading={busy}
        width={900}
        okText="发送邀请"
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="topic"
            label="会诊主题"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="patient_id" label="患者">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={patients.map((p) => ({
                value: p.id,
                label: p.name + "（" + p.patient_no + "）",
              }))}
            />
          </Form.Item>
          <Form.Item
            name="expert_ids"
            label="已选参会医生（可跨多个科室）"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "至少选择一名医生",
              },
            ]}
          >
            <Select
              mode="multiple"
              open={false}
              options={Object.values(cache).map((d) => ({
                value: d.id,
                label:
                  (d.real_name || d.username) +
                  " · " +
                  (d.department || "未设置科室"),
              }))}
              placeholder="在下方医生列表中勾选"
            />
          </Form.Item>
          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              aria-label="筛选科室"
              placeholder="全部科室"
              allowClear
              showSearch
              value={department}
              style={{ width: 190 }}
              options={departments.map((d) => ({ value: d, label: d }))}
              onChange={(v) => {
                setDepartment(v);
                setDoctorPage(1);
              }}
            />
            <Input.Search
              placeholder="搜索医生姓名 / 职称"
              allowClear
              onSearch={(v) => {
                setSearch(v);
                setDoctorPage(1);
              }}
              style={{ width: 250 }}
            />
          </Space>
          <Table
            size="small"
            rowKey="id"
            dataSource={doctors}
            loading={doctorLoading}
            rowSelection={{
              selectedRowKeys: selected,
              preserveSelectedRowKeys: true,
              onChange: (keys) => form.setFieldsValue({ expert_ids: keys }),
            }}
            pagination={{
              current: doctorPage,
              pageSize: 6,
              total: doctorTotal,
              onChange: setDoctorPage,
              showSizeChanger: false,
            }}
            columns={[
              { title: "医生", render: (_, d) => d.real_name || d.username },
              {
                title: "科室",
                dataIndex: "department",
                render: (v) => v || "未设置",
              },
              {
                title: "职称",
                dataIndex: "title",
                render: (v) => v || "未设置",
              },
              {
                title: "医院",
                dataIndex: "hospital",
                render: (v) => v || "未设置",
              },
            ]}
          />
          <Form.Item name="scheduled_at" label="预约时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="summary" label="病情摘要 / 会诊目的">
            <Input.TextArea rows={3} maxLength={10000} />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={detail?.topic || "会诊详情"}
        open={!!selectedId}
        width={Math.min(900, window.innerWidth)}
        onClose={() => {
          setSelectedId(null);
          setDetail(null);
        }}
      >
        {refreshError && <Alert type="error" message={refreshError} />}
        {detail && (
          <>
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag color={colors[detail.status]}>{detail.status}</Tag>
              {detail.status === "待会诊" &&
                participant?.response === "待响应" && (
                  <>
                    <Button
                      type="primary"
                      loading={busy}
                      onClick={() =>
                        act(() => jointApi.respond(detail.id, "accept"))
                      }
                    >
                      接受邀请
                    </Button>
                    <Popconfirm
                      title="确认拒绝本次邀请？"
                      onConfirm={() =>
                        act(() => jointApi.respond(detail.id, "decline"))
                      }
                    >
                      <Button danger disabled={busy}>
                        拒绝邀请
                      </Button>
                    </Popconfirm>
                  </>
                )}
              {host(detail) && detail.status === "待会诊" && (
                <Button
                  type="primary"
                  loading={busy}
                  disabled={
                    !!detail.expert_ids.length &&
                    !detail.participants.some((p) => p.response === "已接受")
                  }
                  onClick={() =>
                    act(() => jointApi.update(detail.id, { status: "进行中" }))
                  }
                >
                  开始会诊
                </Button>
              )}
              {host(detail) && detail.status === "进行中" && (
                <Button
                  onClick={() => {
                    setSummary(detail.summary || "");
                    setCompleteOpen(true);
                  }}
                >
                  完成会诊
                </Button>
              )}
            </Space>
            {host(detail) &&
              detail.status === "待会诊" &&
              !!detail.expert_ids.length &&
              !detail.participants.some((p) => p.response === "已接受") && (
                <Alert
                  type="info"
                  message="等待至少一名医生接受邀请后开始会诊"
                  style={{ marginBottom: 16 }}
                />
              )}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="会诊编号">
                {detail.conference_no}
              </Descriptions.Item>
              <Descriptions.Item label="患者">
                {detail.patient_name || "未关联患者"}
              </Descriptions.Item>
              <Descriptions.Item label="发起医生">
                {detail.initiator_name} ·{" "}
                {detail.initiator_department || "未设置科室"}
              </Descriptions.Item>
              <Descriptions.Item label="预约时间">
                {detail.scheduled_at
                  ? formatDateTime(detail.scheduled_at)
                  : "未设置"}
              </Descriptions.Item>
              <Descriptions.Item label="会诊说明 / 总结">
                <span style={{ whiteSpace: "pre-wrap" }}>
                  {detail.summary || "未填写"}
                </span>
              </Descriptions.Item>
            </Descriptions>
            <Table
              style={{ marginTop: 20 }}
              rowKey="id"
              size="small"
              dataSource={detail.participants}
              pagination={false}
              columns={[
                { title: "参会医生", dataIndex: "name" },
                { title: "科室", dataIndex: "department" },
                { title: "职称", dataIndex: "title" },
                {
                  title: "邀请状态",
                  dataIndex: "response",
                  render: (v) => (
                    <Tag
                      color={
                        v === "已接受"
                          ? "green"
                          : v === "已拒绝"
                            ? "red"
                            : "orange"
                      }
                    >
                      {v}
                    </Tag>
                  ),
                },
              ]}
            />
            {!detail.participants.length && (
              <Alert
                type="info"
                message={"历史会诊专家：" + detail.experts.join("、")}
              />
            )}
            <List
              header="联合会诊意见"
              dataSource={detail.opinions}
              locale={{ emptyText: "暂无会诊意见" }}
              renderItem={(o) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      o.name +
                      " · " +
                      o.department +
                      " · " +
                      formatDateTime(o.created_at)
                    }
                    description={
                      <span style={{ whiteSpace: "pre-wrap", color: "#333" }}>
                        {o.content}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
            {canComment && (
              <>
                <Input.TextArea
                  aria-label="会诊意见"
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="填写本科室的会诊意见"
                />
                <Button
                  style={{ marginTop: 12 }}
                  type="primary"
                  disabled={!opinion.trim()}
                  loading={busy}
                  onClick={async () => {
                    if (await act(() => jointApi.opinion(detail.id, opinion)))
                      setOpinion("");
                  }}
                >
                  提交会诊意见
                </Button>
              </>
            )}
            {host(detail) && detail.status === "待会诊" && (
              <Popconfirm
                title="删除此会诊并取消邀请？"
                onConfirm={async () => {
                  try {
                    await conferencesApi.remove(detail.id);
                    setSelectedId(null);
                    setDetail(null);
                    void load();
                  } catch (e) {
                    message.error(errorMessage(e));
                  }
                }}
              >
                <Button danger style={{ marginTop: 24 }}>
                  删除会诊
                </Button>
              </Popconfirm>
            )}
          </>
        )}
      </Drawer>
      <Modal
        title="完成会诊"
        open={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        confirmLoading={busy}
        okText="保存总结并完成"
        onOk={async () => {
          if (!summary.trim()) {
            message.error("请填写会诊总结");
            return;
          }
          if (
            detail &&
            (await act(() =>
              jointApi.update(detail.id, { summary, status: "已完成" }),
            ))
          )
            setCompleteOpen(false);
        }}
      >
        <Input.TextArea
          aria-label="会诊总结"
          rows={6}
          maxLength={10000}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="汇总各科室意见，填写最终会诊总结"
        />
      </Modal>
    </Card>
  );
}
