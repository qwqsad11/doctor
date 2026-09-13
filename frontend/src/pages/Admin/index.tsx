import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  conferencesApi,
  consultationsApi,
  usersApi,
} from "@/services/business";
import type {
  Conference,
  Consultation,
  TempPermission,
  UserProfile,
} from "@/services/types";
import { formatDateTime } from "@/utils/format";

const ROLE_OPTIONS = [
  "admin",
  "doctor",
  "senior_doctor",
  "consultation_expert",
].map((value) => ({ value, label: value }));

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<TempPermission[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const [userList, permissionList, consultationData, conferenceData] =
        await Promise.all([
          usersApi.list(),
          usersApi.listTempPermissions(),
          consultationsApi.list({ pageSize: 100 }),
          conferencesApi.list({ pageSize: 100 }),
        ]);
      setUsers(userList);
      setPermissions(permissionList);
      setConsultations(consultationData.list);
      setConferences(conferenceData.list);
    } catch (e: any) {
      message.error(e.response?.data?.message || "加载管理数据失败");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRoles = async (user: UserProfile, roles: string[]) => {
    try {
      await usersApi.setRoles(user.id, roles);
      message.success("角色已更新");
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || "更新角色失败");
    }
  };

  const grant = async () => {
    const values = await form.validateFields();
    try {
      await usersApi.createTempPermission({
        ...values,
        resourceType: "consultation",
        permissionType: "view",
        expiresAt: values.expiresAt.toISOString(),
      });
      message.success("临时查看权限已授予");
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || "授权失败");
    }
  };

  const userColumns: ColumnsType<UserProfile> = [
    {
      title: "用户",
      dataIndex: "username",
      render: (value, record) => record.real_name || value,
    },
    { title: "邮箱", dataIndex: "email" },
    {
      title: "科室",
      dataIndex: "department",
      filters: [
        ...new Set(
          users.map((u) => u.department).filter((v): v is string => !!v),
        ),
      ].map((value) => ({ text: value, value })),
      onFilter: (value, record) => record.department === value,
      render: (v) => v || "未设置",
    },
    { title: "职称", dataIndex: "title", render: (v) => v || "未设置" },
    {
      title: "角色",
      render: (_, user) => (
        <Select
          mode="multiple"
          value={user.roles}
          options={ROLE_OPTIONS}
          style={{ minWidth: 260 }}
          onChange={(roles) => updateRoles(user, roles)}
        />
      ),
    },
  ];
  const permissionColumns: ColumnsType<TempPermission> = [
    {
      title: "被授权用户",
      dataIndex: "userId",
      render: (id) => users.find((u) => u.id === id)?.username || id,
    },
    {
      title: "资源",
      dataIndex: "resourceId",
      render: (id) =>
        consultations.find((c) => c.id === id)?.consultation_no || id,
    },
    {
      title: "权限",
      dataIndex: "permissionType",
      render: () => <Tag color="blue">查看</Tag>,
    },
    { title: "到期时间", dataIndex: "expiresAt", render: formatDateTime },
    {
      title: "操作",
      render: (_, permission) => (
        <Popconfirm
          title="确认撤销此权限？"
          onConfirm={async () => {
            await usersApi.revokeTempPermission(permission.id);
            message.success("已撤销");
            load();
          }}
        >
          <Button type="link" danger>
            撤销
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card title="管理授权" extra={<Tag color="gold">本地课程演示流程</Tag>}>
        仅用于本地 course-demo 的角色和临时问诊查看权限管理；不会调用外部系统。
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="用户与角色">
            <Table
              rowKey="id"
              columns={userColumns}
              dataSource={users}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="授予临时问诊查看权限">
            <Form form={form} layout="vertical">
              <Form.Item
                name="userId"
                label="专家用户"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={users.map((u) => ({
                    value: u.id,
                    label: `${u.real_name || u.username} (${u.roles.join(", ")})`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="resourceId"
                label="问诊资源"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={consultations.map((c) => ({
                    value: c.id,
                    label: `${c.consultation_no} - ${c.patient_name} (${c.status})`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="expiresAt"
                label="到期时间"
                rules={[{ required: true }]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="reason" label="授权说明">
                <Select
                  allowClear
                  options={[
                    { value: "课程演示会诊支持", label: "课程演示会诊支持" },
                    { value: "临时专家意见", label: "临时专家意见" },
                  ]}
                />
              </Form.Item>
              <Button type="primary" onClick={grant}>
                授予查看权限
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
      <Card title="可用资源">
        <Space wrap>
          <Tag color="blue">问诊 {consultations.length}</Tag>
          <Tag>远程会诊 {conferences.length}</Tag>
          <span>权限严格限定为单个问诊；远程会诊仅作课程演示资源清单。</span>
        </Space>
      </Card>
      <Card title="活动中的临时权限">
        <Table
          rowKey="id"
          columns={permissionColumns}
          dataSource={permissions}
          pagination={false}
        />
      </Card>
    </Space>
  );
};

export default AdminPage;
