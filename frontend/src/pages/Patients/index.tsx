import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Popconfirm,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { patientsApi } from '@/services/business';
import type { Patient } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const statusColor: Record<Patient['status'], string> = {
  在管: 'green',
  待随访: 'orange',
  已转出: 'default',
};

const PatientsPage: React.FC = () => {
  const [list, setList] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [detail, setDetail] = useState<Patient | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(
    async (p: number, ps: number, kw: string) => {
      setLoading(true);
      try {
        const data = await patientsApi.list({ page: p, pageSize: ps, keyword: kw || undefined });
        setList(data.list);
        setTotal(data.total);
      } catch (e: any) {
        message.error(e.response?.data?.message || 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(page, pageSize, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    load(1, pageSize, keyword);
  };

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ gender: '男', group: '高血压' });
    setAddOpen(true);
  };

  const openEdit = (record: Patient) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      gender: record.gender,
      age: record.age,
      phone: record.phone,
      group: record.group,
      symptom: record.symptom,
      status: record.status,
    });
    setAddOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await patientsApi.update(editing.id, values);
        message.success('Patient updated');
      } else {
        await patientsApi.create(values);
        message.success('Patient added');
      }
      setAddOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await patientsApi.remove(id);
      message.success('Patient deleted');
      // 若当前页删空则回退一页
      const nextPage = list.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      load(nextPage, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<Patient> = [
    { title: 'Patient ID', dataIndex: 'patient_no', key: 'patient_no', width: 140 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Gender', dataIndex: 'gender', key: 'gender', width: 70, render: displayLabel },
    { title: 'Age', dataIndex: 'age', key: 'age', width: 70 },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Group', dataIndex: 'group', key: 'group', render: (g: string | null) => (g ? <Tag color="blue">{displayLabel(g)}</Tag> : '-') },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: Patient['status']) => <Tag color={statusColor[s]}>{displayLabel(s)}</Tag>,
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>View profile</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this patient?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search by name, ID, symptom, or group"
            prefix={<SearchOutlined />}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Button onClick={handleSearch}>Search</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add patient
          </Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `${t} total`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title={editing ? 'Edit Patient' : 'Add Patient'}
        open={addOpen}
        onOk={handleSubmit}
        onCancel={() => setAddOpen(false)}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ gender: '男', group: '高血压' }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter a name' }]}>
            <Input placeholder="Patient name" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
              <Select
                style={{ width: 120 }}
                options={[
                  { value: '男', label: 'Male' },
                  { value: '女', label: 'Female' },
                ]}
              />
            </Form.Item>
            <Form.Item name="age" label="Age" rules={[{ required: true, message: 'Enter an age' }]}>
              <InputNumber min={0} max={150} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Mobile number" />
          </Form.Item>
          <Form.Item name="group" label="Condition Group">
            <Select
              options={[
                { value: '高血压', label: 'Hypertension' }, { value: '糖尿病', label: 'Diabetes' }, { value: '冠心病', label: 'Coronary Heart Disease' }, { value: '慢阻肺', label: 'Chronic Obstructive Pulmonary Disease' }, { value: '其它', label: 'Other' },
              ]}
            />
          </Form.Item>
          <Form.Item name="symptom" label="Primary Symptoms">
            <Input.TextArea rows={2} placeholder="Example: dizziness or chest tightness" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: '在管', label: 'Active' }, { value: '待随访', label: 'Follow-up Due' }, { value: '已转出', label: 'Transferred' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Patient Profile"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Patient ID">{detail.patient_no}</Descriptions.Item>
            <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="Gender">{displayLabel(detail.gender)}</Descriptions.Item>
            <Descriptions.Item label="Age">{detail.age}</Descriptions.Item>
            <Descriptions.Item label="Phone">{detail.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Condition Group">{displayLabel(detail.group)}</Descriptions.Item>
            <Descriptions.Item label="Status">{displayLabel(detail.status)}</Descriptions.Item>
            <Descriptions.Item label="Primary Symptoms">{detail.symptom || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(detail.created_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PatientsPage;
