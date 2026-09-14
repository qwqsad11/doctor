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
import { conferencesApi, patientsApi } from '@/services/business';
import type { Conference, Patient } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const statusColor: Record<Conference['status'], string> = {
  待会诊: 'orange',
  进行中: 'blue',
  已完成: 'green',
};

const ConferencesPage: React.FC = () => {
  const [list, setList] = useState<Conference[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Conference | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async (p: number, ps: number, kw: string) => {
    setLoading(true);
    try {
      const data = await conferencesApi.list({ page: p, pageSize: ps, keyword: kw || undefined });
      setList(data.list);
      setTotal(data.total);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to load conferences');
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
      await conferencesApi.create(values);
      message.success('Conference started');
      setOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to start conference');
    }
  };

  const changeStatus = async (id: string, status: Conference['status']) => {
    try {
      await conferencesApi.update(id, { status });
      message.success('Status updated');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await conferencesApi.remove(id);
      message.success('Conference deleted');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns: ColumnsType<Conference> = [
    { title: 'Conference ID', dataIndex: 'conference_no', key: 'conference_no', width: 100 },
    { title: 'Topic', dataIndex: 'topic', key: 'topic' },
    { title: 'Patient', dataIndex: 'patient_name', key: 'patient_name', render: (v: string | null) => v || '-' },
    { title: 'Initiator', dataIndex: 'initiator_name', key: 'initiator_name', render: (v: string | null) => v || '-' },
    {
      title: 'Experts',
      dataIndex: 'experts',
      key: 'experts',
      render: (experts: string[]) => (
        <Space size={4} wrap>
          {(experts || []).map((e) => (
            <Tag key={e} color="geekblue">{e}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: Conference['status']) => <Tag color={statusColor[s]}>{displayLabel(s)}</Tag>,
    },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === '待会诊' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '进行中')}>Join conference</Button>
          )}
          {record.status === '进行中' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '已完成')}>Complete</Button>
          )}
          <Button type="link" size="small" onClick={() => setDetail(record)}>View report</Button>
          <Popconfirm title="Delete this conference?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Remote Conferences">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search by patient or topic"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Start conference</Button>
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
        title="Start conference"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="Start"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="topic" label="Topic" rules={[{ required: true, message: 'Enter a topic' }]}>
            <Input placeholder="Example: difficult hypertension case" />
          </Form.Item>
          <Form.Item name="patient_id" label="Patient">
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Select a patient (optional)"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="experts" label="Experts">
            <Select mode="tags" placeholder="Enter an expert name and press Enter" open={false} />
          </Form.Item>
          <Form.Item name="summary" label="Notes">
            <Input.TextArea rows={3} placeholder="Purpose, case summary, and more" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Conference details"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Conference ID">{detail.conference_no}</Descriptions.Item>
            <Descriptions.Item label="Topic">{detail.topic}</Descriptions.Item>
            <Descriptions.Item label="Patient">{detail.patient_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Initiator">{detail.initiator_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Experts">{(detail.experts || []).join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status">{displayLabel(detail.status)}</Descriptions.Item>
            <Descriptions.Item label="Notes">{detail.summary || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ConferencesPage;
