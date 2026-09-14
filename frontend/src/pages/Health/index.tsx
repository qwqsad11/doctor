import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Popconfirm,
  Descriptions,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { healthApi, patientsApi } from '@/services/business';
import type { HealthRecord, Patient } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const alertColor: Record<HealthRecord['alert_level'], string> = {
  正常: 'green',
  预警: 'orange',
  异常: 'red',
};

const levelOptions = [
  { value: '正常', label: 'Normal' }, { value: '预警', label: 'Warning' }, { value: '异常', label: 'Abnormal' },
];

const HealthPage: React.FC = () => {
  const [list, setList] = useState<HealthRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [detail, setDetail] = useState<HealthRecord | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(
    async (p: number, ps: number, kw: string, lv?: string) => {
      setLoading(true);
      try {
        const data = await healthApi.list({ page: p, pageSize: ps, keyword: kw || undefined, alert_level: lv });
        setList(data.list);
        setTotal(data.total);
      } catch (e: any) {
        message.error(e.response?.data?.message || 'Failed to load health plans');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(page, pageSize, keyword, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, level]);

  const handleSearch = () => {
    setPage(1);
    load(1, pageSize, keyword, level);
  };

  const openCreate = async () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ alert_level: '正常' });
    setOpen(true);
    try {
      const d = await patientsApi.list({ pageSize: 100 });
      setPatients(d.list);
    } catch {
      /* 忽略 */
    }
  };

  const openEdit = async (record: HealthRecord) => {
    setEditing(record);
    form.setFieldsValue({
      patient_id: record.patient_id,
      plan: record.plan,
      metrics: record.metrics,
      device_source: record.device_source,
      reminder: record.reminder,
      alert_level: record.alert_level,
    });
    setOpen(true);
    try {
      const d = await patientsApi.list({ pageSize: 100 });
      setPatients(d.list);
    } catch {
      /* 忽略 */
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await healthApi.update(editing.id, values);
        message.success('Plan updated');
      } else {
        await healthApi.create(values);
        message.success('Plan created');
      }
      setOpen(false);
      load(page, pageSize, keyword, level);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await healthApi.remove(id);
      message.success('Plan deleted');
      load(page, pageSize, keyword, level);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<HealthRecord> = [
    { title: 'Patient', dataIndex: 'patient_name', key: 'patient_name' },
    { title: 'Health Plan', dataIndex: 'plan', key: 'plan' },
    { title: 'Latest Metrics', dataIndex: 'metrics', key: 'metrics', render: (v: string | null) => v || '-' },
    {
      title: 'Alert Level',
      dataIndex: 'alert_level',
      key: 'alert_level',
      render: (a: HealthRecord['alert_level']) => <Tag color={alertColor[a]}>{displayLabel(a)}</Tag>,
    },
    { title: 'Updated', dataIndex: 'updated_at', key: 'updated_at', render: formatDateTime },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>View data</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>Adjust plan</Button>
          <Popconfirm title="Delete this health plan?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Health Management">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search by patient"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Alert level"
          allowClear
          style={{ width: 140 }}
          options={levelOptions}
          value={level}
          onChange={(v) => {
            setLevel(v);
            setPage(1);
          }}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create health plan</Button>
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

      <Modal
        title={editing ? 'Adjust Health Plan' : 'Create Health Plan'}
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ alert_level: '正常' }}>
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: 'Select a patient' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a patient"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="plan" label="Health Plan" rules={[{ required: true, message: 'Enter a plan' }]}>
            <Input placeholder="Example: hypertension control plan" />
          </Form.Item>
          <Form.Item name="metrics" label="Latest Metrics">
            <Input placeholder="Example: blood pressure 145/92" />
          </Form.Item>
          <Form.Item name="device_source" label="Device Source (Demo)">
            <Input placeholder="Example: home blood pressure monitor (local entry)" />
          </Form.Item>
          <Form.Item name="reminder" label="Reminder Rule (Local Demo)">
            <Input placeholder="Example: medication reminder at 08:00 daily" />
          </Form.Item>
          <Form.Item name="alert_level" label="Alert Level">
            <Select options={levelOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Health Data"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Patient">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="Health Plan">{detail.plan}</Descriptions.Item>
            <Descriptions.Item label="Latest Metrics">{detail.metrics || '-'}</Descriptions.Item>
            <Descriptions.Item label="Device Source">{detail.device_source || 'Manual/local demo'}</Descriptions.Item>
            <Descriptions.Item label="Reminder Rule">{detail.reminder || '-'}</Descriptions.Item>
            <Descriptions.Item label="Alert Level">{displayLabel(detail.alert_level)}</Descriptions.Item>
            <Descriptions.Item label="Updated">{formatDateTime(detail.updated_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default HealthPage;
