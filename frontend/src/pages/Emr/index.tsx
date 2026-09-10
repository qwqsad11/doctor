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

const statusColor: Record<Emr['status'], string> = {
  草稿: 'default',
  待审核: 'orange',
  已归档: 'green',
  已退回: 'red',
};

const typeOptions = [
  { value: '门诊病历', label: '门诊病历' },
  { value: '住院病历', label: '住院病历' },
  { value: '体检报告', label: '体检报告' },
];

const statusOptions = [
  { value: '草稿', label: '草稿' },
  { value: '待审核', label: '待审核' },
  { value: '已归档', label: '已归档' },
  { value: '已退回', label: '已退回' },
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
        message.error(e.response?.data?.message || '加载病历列表失败');
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
        message.success('病历已更新');
      } else {
        await emrApi.create(values);
        message.success('病历已创建');
      }
      setOpen(false);
      load(page, pageSize, keyword, typeFilter);
    } catch (e: any) {
      message.error(e.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emrApi.remove(id);
      message.success('病历已删除');
      load(page, pageSize, keyword, typeFilter);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<Emr> = [
    { title: '病历编号', dataIndex: 'emr_no', key: 'emr_no', width: 100 },
    { title: '患者', dataIndex: 'patient_name', key: 'patient_name' },
    { title: '病历类型', dataIndex: 'type', key: 'type' },
    { title: '医生', dataIndex: 'doctor_name', key: 'doctor_name', render: (d: string | null) => d || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: Emr['status']) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', render: formatDateTime },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>查看</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="电子病历">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按患者 / 病历编号搜索"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="病历类型"
          allowClear
          style={{ width: 140 }}
          options={typeOptions}
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        />
        <Button onClick={handleSearch}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建病历</Button>
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
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title={editing ? '编辑病历' : '新建病历'}
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ type: '门诊病历' }}>
          <Form.Item name="patient_id" label="患者" rules={[{ required: true, message: '请选择患者' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择患者"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="type" label="病历类型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="diagnosis" label="诊断">
            <Input placeholder="如：高血压 2 级" />
          </Form.Item>
          <Form.Item name="content" label="病历内容">
            <Input.TextArea rows={3} placeholder="病历正文……" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="状态">
              <Select options={statusOptions} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="病历详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="病历编号">{detail.emr_no}</Descriptions.Item>
            <Descriptions.Item label="患者">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="医生">{detail.doctor_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">{detail.type}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="诊断">{detail.diagnosis || '-'}</Descriptions.Item>
            <Descriptions.Item label="内容">{detail.content || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default EmrPage;
