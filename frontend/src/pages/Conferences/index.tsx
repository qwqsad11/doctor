import { displayLabel } from "@/utils/labels";
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
      message.success("Conference invitations sent");
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
      message.success("Operation completed");
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
      title="Multidisciplinary Conferences"
      extra={
        <Button type="primary" onClick={openCreate}>
          Create conference
        </Button>
      }
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by patient or conference topic"
          allowClear
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
        <Button onClick={load}>Refresh</Button>
        <Typography.Text type="secondary">

          Conferences I initiated or was invited to · Refreshes every 10 seconds
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
          { title: "Topic", dataIndex: "topic" },
          { title: "Patient", dataIndex: "patient_name" },
          {
            title: "Initiating doctor",
            render: (_, r) => (
              <>
                {r.initiator_name}
                <div>
                  <Tag>{displayLabel(r.initiator_department || "Department not set")}</Tag>
                </div>
              </>
            ),
          },
          {
            title: "Doctors / Departments",
            render: (_, r) => (
              <Space wrap>
                {r.participants?.length
                  ? r.participants.map((p) => (
                      <Tag key={p.id}>
                        {p.name} · {displayLabel(p.department)} · {displayLabel(p.response)}
                      </Tag>
                    ))
                  : r.experts.map((name, i) => (
                      <Tag key={i}>{name}(Historical record)</Tag>
                    ))}
              </Space>
            ),
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (v) => <Tag color={colors[v]}>{displayLabel(v)}</Tag>,
          },
          {
            title: "My role",
            render: (_, r) =>
              r.initiator_id === user.id
                ? "Initiator"
                : displayLabel(r.participants.find((p) => p.id === user.id)?.response || "Administrator view") ||
                  "Administrator view",
          },
          {
            title: "Actions",
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

                View conference
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title="Start multidisciplinary conference"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={create}
        confirmLoading={busy}
        width={900}
        okText="Send invitations"
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="topic"
            label="Topic"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="patient_id" label="Patient">
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
            label="Selected doctors (multiple departments supported)"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "Select at least one doctor",
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
                  displayLabel(d.department || "Department not set"),
              }))}
              placeholder="Select doctors from the list below"
            />
          </Form.Item>
          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              aria-label="Filter department"
              placeholder="All departments"
              allowClear
              showSearch
              value={department}
              style={{ width: 190 }}
              options={departments.map((d) => ({ value: d, label: displayLabel(d) }))}
              onChange={(v) => {
                setDepartment(v);
                setDoctorPage(1);
              }}
            />
            <Input.Search
              placeholder="Search by doctor name or title"
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
              { title: "Doctor", render: (_, d) => d.real_name || d.username },
              {
                title: "Department",
                dataIndex: "department",
                render: (v) => displayLabel(v || "Not set"),
              },
              {
                title: "Professional Title",
                dataIndex: "title",
                render: (v) => displayLabel(v || "Not set"),
              },
              {
                title: "Hospital",
                dataIndex: "hospital",
                render: (v) => displayLabel(v || "Not set"),
              },
            ]}
          />
          <Form.Item name="scheduled_at" label="Scheduled time">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="summary" label="Case summary / Conference purpose">
            <Input.TextArea rows={3} maxLength={10000} />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={detail?.topic || "Conference details"}
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
              <Tag color={colors[detail.status]}>{displayLabel(detail.status)}</Tag>
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

                      Accept invitation
                    </Button>
                    <Popconfirm
                      title="Decline this invitation?"
                      onConfirm={() =>
                        act(() => jointApi.respond(detail.id, "decline"))
                      }
                    >
                      <Button danger disabled={busy}>

                        Decline invitation
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

                  Start conference
                </Button>
              )}
              {host(detail) && detail.status === "进行中" && (
                <Button
                  onClick={() => {
                    setSummary(detail.summary || "");
                    setCompleteOpen(true);
                  }}
                >

                  Complete conference
                </Button>
              )}
            </Space>
            {host(detail) &&
              detail.status === "待会诊" &&
              !!detail.expert_ids.length &&
              !detail.participants.some((p) => p.response === "已接受") && (
                <Alert
                  type="info"
                  message="Wait for at least one doctor to accept before starting"
                  style={{ marginBottom: 16 }}
                />
              )}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Conference ID">
                {detail.conference_no}
              </Descriptions.Item>
              <Descriptions.Item label="Patient">
                {detail.patient_name || "No patient linked"}
              </Descriptions.Item>
              <Descriptions.Item label="Initiating doctor">
                {detail.initiator_name} ·{" "}
                {displayLabel(detail.initiator_department || "Department not set")}
              </Descriptions.Item>
              <Descriptions.Item label="Scheduled time">
                {detail.scheduled_at
                  ? formatDateTime(detail.scheduled_at)
                  : "Not set"}
              </Descriptions.Item>
              <Descriptions.Item label="Conference notes / summary">
                <span style={{ whiteSpace: "pre-wrap" }}>
                  {detail.summary || "Not provided"}
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
                { title: "Participating doctors", dataIndex: "name" },
                { title: "Department", dataIndex: "department", render: displayLabel },
                { title: "Professional Title", dataIndex: "title", render: displayLabel },
                {
                  title: "Invitation status",
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
                      {displayLabel(v)}
                    </Tag>
                  ),
                },
              ]}
            />
            {!detail.participants.length && (
              <Alert
                type="info"
                message={"Previous conference experts:" + detail.experts.join("、")}
              />
            )}
            <List
              header="Multidisciplinary opinions"
              dataSource={detail.opinions}
              locale={{ emptyText: "No opinions yet" }}
              renderItem={(o) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      o.name +
                      " · " +
                      displayLabel(o.department) +
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
                  aria-label="Conference opinion"
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="Enter your department's opinion"
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

                  Submit opinion
                </Button>
              </>
            )}
            {host(detail) && detail.status === "待会诊" && (
              <Popconfirm
                title="Delete this conference and cancel its invitations?"
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

                  Delete conference
                </Button>
              </Popconfirm>
            )}
          </>
        )}
      </Drawer>
      <Modal
        title="Complete conference"
        open={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        confirmLoading={busy}
        okText="Save summary and complete"
        onOk={async () => {
          if (!summary.trim()) {
            message.error("Enter a conference summary");
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
          aria-label="Conference summary"
          rows={6}
          maxLength={10000}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Summarize the departments' opinions and enter the final conference summary"
        />
      </Modal>
    </Card>
  );
}
