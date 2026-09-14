import React, { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, message, Popconfirm, Row, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { conferencesApi, consultationsApi, usersApi } from '@/services/business';
import type { Conference, Consultation, TempPermission, UserProfile } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const ROLE_OPTIONS = ['admin', 'doctor', 'senior_doctor', 'consultation_expert'].map((value) => ({ value, label: displayLabel(value) }));

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<TempPermission[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      const [userList, permissionList, consultationData, conferenceData] = await Promise.all([
        usersApi.list(), usersApi.listTempPermissions(), consultationsApi.list({ pageSize: 100 }), conferencesApi.list({ pageSize: 100 }),
      ]);
      setUsers(userList);
      setPermissions(permissionList);
      setConsultations(consultationData.list);
      setConferences(conferenceData.list);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to load administration data');
    }
  };

  useEffect(() => { load(); }, []);

  const updateRoles = async (user: UserProfile, roles: string[]) => {
    try {
      await usersApi.setRoles(user.id, roles);
      message.success('Roles updated');
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to update roles');
    }
  };

  const grant = async () => {
    const values = await form.validateFields();
    try {
      await usersApi.createTempPermission({
        ...values,
        resourceType: 'consultation',
        permissionType: 'view',
        expiresAt: values.expiresAt.toISOString(),
      });
      message.success('Temporary view permission granted');
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to grant permission');
    }
  };

  const userColumns: ColumnsType<UserProfile> = [
    { title: 'User', dataIndex: 'username', render: (value, record) => record.real_name || value },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Roles', render: (_, user) => <Select mode="multiple" value={user.roles} options={ROLE_OPTIONS} style={{ minWidth: 260 }} onChange={(roles) => updateRoles(user, roles)} /> },
  ];
  const permissionColumns: ColumnsType<TempPermission> = [
    { title: 'User', dataIndex: 'userId', render: (id) => users.find((u) => u.id === id)?.username || id },
    { title: 'Resource', dataIndex: 'resourceId', render: (id) => consultations.find((c) => c.id === id)?.consultation_no || id },
    { title: 'Permission', dataIndex: 'permissionType', render: () => <Tag color="blue">View</Tag> },
    { title: 'Expires', dataIndex: 'expiresAt', render: formatDateTime },
    { title: 'Actions', render: (_, permission) => <Popconfirm title="Revoke this permission?" onConfirm={async () => { await usersApi.revokeTempPermission(permission.id); message.success('Revoked'); load(); }}><Button type="link" danger>Revoke</Button></Popconfirm> },
  ];

  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Card title="Access Management" extra={<Tag color="gold">Local course demo</Tag>}>
      Manage roles and temporary consultation view permissions for the local course demo only. No external systems are used.
    </Card>
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}><Card title="Users and Roles"><Table rowKey="id" columns={userColumns} dataSource={users} pagination={false} /></Card></Col>
      <Col xs={24} xl={10}><Card title="Grant Temporary Consultation View Permission">
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="Expert user" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={users.map((u) => ({ value: u.id, label: `${u.real_name || u.username} (${u.roles.map(displayLabel).join(', ')})` }))} /></Form.Item>
          <Form.Item name="resourceId" label="Consultation resource" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={consultations.map((c) => ({ value: c.id, label: `${c.consultation_no} - ${c.patient_name} (${displayLabel(c.status)})` }))} /></Form.Item>
          <Form.Item name="expiresAt" label="Expires" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="Reason"><Select allowClear options={[{ value: '课程演示会诊支持', label: 'Course demo consultation support' }, { value: '临时专家意见', label: 'Temporary expert opinion' }]} /></Form.Item>
          <Button type="primary" onClick={grant}>Grant view permission</Button>
        </Form>
      </Card></Col>
    </Row>
    <Card title="Available Resources"><Space wrap><Tag color="blue">Consultations {consultations.length}</Tag><Tag>Remote conferences {conferences.length}</Tag><span>Permissions are limited to one consultation. Remote conferences are listed for the course demo only.</span></Space></Card>
    <Card title="Active Temporary Permissions"><Table rowKey="id" columns={permissionColumns} dataSource={permissions} pagination={false} /></Card>
  </Space>;
};

export default AdminPage;
