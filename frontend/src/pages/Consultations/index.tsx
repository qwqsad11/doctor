import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Popconfirm,
  Descriptions,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { consultationsApi, patientsApi } from '@/services/business';
import type { Consultation, Patient } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const statusColor: Record<Consultation['status'], string> = {
  进行中: 'blue',
  已完成: 'green',
  待接诊: 'orange',
};

const ConsultationsPage: React.FC = () => {
  const [list, setList] = useState<Consultation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Consultation | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async (p: number, ps: number, kw: string) => {
    setLoading(true);
    try {
      const data = await consultationsApi.list({ page: p, pageSize: ps, keyword: kw || undefined });
      setList(data.list);
      setTotal(data.total);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to load consultations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, pageSize, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    load(1, pageSize, keyword);
  };

  const openCreate = async () => {
    form.resetFields();
    form.setFieldsValue({ type: '图文' });
    setOpen(true);
    try {
      const d = await patientsApi.list({ pageSize: 100 });
      setPatients(d.list);
    } catch {
      /* 忽略患者下拉加载失败 */
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await consultationsApi.create(values);
      message.success('Consultation created');
      setOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Create failed');
    }
  };

  const changeStatus = async (id: string, status: Consultation['status']) => {
    try {
      await consultationsApi.update(id, { status });
      message.success('Status updated');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const exportRecord = (record: Consultation) => {
    const blob = new Blob([`Consultation Record\nID: ${record.consultation_no}\nPatient: ${record.patient_name}\nSymptoms: ${record.symptom || '-'}\nAdvice: ${record.advice || '-'}`], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${record.consultation_no}-record.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDelete = async (id: string) => {
    try {
      await consultationsApi.remove(id);
      message.success('Consultation deleted');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<Consultation> = [
    { title: 'Consultation ID', dataIndex: 'consultation_no', key: 'consultation_no', width: 100 },
    { title: 'Patient', dataIndex: 'patient_name', key: 'patient_name' },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: Consultation['type']) => <Tag color={t === '视频' ? 'purple' : 'cyan'}>{displayLabel(t)}</Tag>,
    },
    { title: 'Doctor', dataIndex: 'doctor_name', key: 'doctor_name', render: (d: string | null) => d || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: Consultation['status']) => <Tag color={statusColor[s]}>{displayLabel(s)}</Tag>,
    },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === '待接诊' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '进行中')}>Accept</Button>
          )}
          {record.status === '进行中' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '已完成')}>Complete</Button>
          )}
          <Button type="link" size="small" onClick={() => setDetail(record)}>View record</Button>
          <Popconfirm title="Delete this consultation?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Online Consultations">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search by patient or consultation ID"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create consultation</Button>
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
        title="Create Consultation"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="Create"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ type: '图文' }}>
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: 'Select a patient' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a patient"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="type" label="Consultation Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: '图文', label: 'Text and Image' }, { value: '视频', label: 'Video' },
              ]}
            />
          </Form.Item>
          <Form.Item name="symptom" label="Symptoms">
            <Input.TextArea rows={3} placeholder="Example: recurrent dizziness for three days" />
          </Form.Item>
          <Form.Item name="attachments" label="Image/Attachment Notes (Local Demo)">
            <Input placeholder="Example: blood-pressure-photo.jpg" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Consultation Record"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={detail ? <Space><Button onClick={() => exportRecord(detail)}>Export text record</Button><Button onClick={() => setDetail(null)}>Close</Button></Space> : null}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Consultation ID">{detail.consultation_no}</Descriptions.Item>
            <Descriptions.Item label="Patient">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="Doctor">{detail.doctor_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Type">{displayLabel(detail.type)}</Descriptions.Item>
            <Descriptions.Item label="Status">{displayLabel(detail.status)}</Descriptions.Item>
            <Descriptions.Item label="Symptoms">{detail.symptom || '-'}</Descriptions.Item>
            <Descriptions.Item label="Advice">{detail.advice || '-'}</Descriptions.Item>
            <Descriptions.Item label="Attachments">{detail.attachments || '-'}</Descriptions.Item>
            <Descriptions.Item label="Video">{detail.type === '视频' ? 'Local demo video room. It records status and reports but does not connect to a real video service.' : '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(detail.created_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ConsultationsPage;
