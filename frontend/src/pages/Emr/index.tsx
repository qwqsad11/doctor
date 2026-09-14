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
import { emrApi, patientsApi } from '@/services/business';
import type { Emr, Patient } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const statusColor: Record<Emr['status'], string> = {
  草稿: 'default',
  待审核: 'orange',
  已归档: 'green',
  已退回: 'red',
};

const typeOptions = [
  { value: '门诊病历', label: 'Outpatient Record' },
  { value: '住院病历', label: 'Inpatient Record' },
  { value: '体检报告', label: 'Physical Examination Report' },
];

const statusOptions = [
  { value: '草稿', label: 'Draft' }, { value: '待审核', label: 'Pending Review' }, { value: '已归档', label: 'Archived' }, { value: '已退回', label: 'Returned' },
];

const EmrPage: React.FC = () => {
  const [list, setList] = useState<Emr[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emr | null>(null);
  const [detail, setDetail] = useState<Emr | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(
    async (p: number, ps: number, kw: string, tf?: string) => {
      setLoading(true);
      try {
        const data = await emrApi.list({ page: p, pageSize: ps, keyword: kw || undefined, type: tf });
        setList(data.list);
        setTotal(data.total);
      } catch (e: any) {
        message.error(e.response?.data?.message || 'Failed to load medical records');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(page, pageSize, keyword, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, typeFilter]);

  const handleSearch = () => {
    setPage(1);
    load(1, pageSize, keyword, typeFilter);
  };

  const openCreate = async () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: '门诊病历' });
    setOpen(true);
    try {
      const d = await patientsApi.list({ pageSize: 100 });
      setPatients(d.list);
    } catch {
      /* 忽略 */
    }
  };

  const openEdit = async (record: Emr) => {
    setEditing(record);
    form.setFieldsValue({
      patient_id: record.patient_id,
      type: record.type,
      diagnosis: record.diagnosis,
      content: record.content,
      status: record.status,
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
        await emrApi.update(editing.id, values);
        message.success('Medical record updated');
      } else {
        await emrApi.create(values);
        message.success('Medical record created');
      }
      setOpen(false);
      load(page, pageSize, keyword, typeFilter);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrApi.remove(id);
      message.success('Medical record deleted');
      load(page, pageSize, keyword, typeFilter);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<Emr> = [
    { title: 'Record ID', dataIndex: 'emr_no', key: 'emr_no', width: 100 },
    { title: 'Patient', dataIndex: 'patient_name', key: 'patient_name' },
    { title: 'Record Type', dataIndex: 'type', key: 'type', render: displayLabel },
    { title: 'Doctor', dataIndex: 'doctor_name', key: 'doctor_name', render: (d: string | null) => d || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: Emr['status']) => <Tag color={statusColor[s]}>{displayLabel(s)}</Tag>,
    },
    { title: 'Updated', dataIndex: 'updated_at', key: 'updated_at', render: formatDateTime },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>View</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this medical record?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Medical Records">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search by patient or record ID"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Record type"
          allowClear
          style={{ width: 140 }}
          options={typeOptions}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create record</Button>
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
        title={editing ? 'Edit Medical Record' : 'Create Medical Record'}
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ type: '门诊病历' }}>
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: 'Select a patient' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a patient"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="type" label="Record Type" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="diagnosis" label="Diagnosis">
            <Input placeholder="Example: stage 2 hypertension" />
          </Form.Item>
          <Form.Item name="content" label="Record Content">
            <Input.TextArea rows={3} placeholder="Record details" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Select options={statusOptions} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Medical Record Details"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Record ID">{detail.emr_no}</Descriptions.Item>
            <Descriptions.Item label="Patient">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="Doctor">{detail.doctor_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Type">{displayLabel(detail.type)}</Descriptions.Item>
            <Descriptions.Item label="Status">{displayLabel(detail.status)}</Descriptions.Item>
            <Descriptions.Item label="Diagnosis">{detail.diagnosis || '-'}</Descriptions.Item>
            <Descriptions.Item label="Content">{detail.content || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default EmrPage;
