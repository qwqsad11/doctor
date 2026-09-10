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
      message.error(e.response?.data?.message || '加载会诊列表失败');
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
      message.success('会诊已发起');
      setOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '发起失败');
    }
  };

  const changeStatus = async (id: string, status: Conference['status']) => {
    try {
      await conferencesApi.update(id, { status });
      message.success('状态已更新');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await conferencesApi.remove(id);
      message.success('会诊已删除');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<Conference> = [
    { title: '会诊编号', dataIndex: 'conference_no', key: 'conference_no', width: 100 },
    { title: '会诊主题', dataIndex: 'topic', key: 'topic' },
    { title: '患者', dataIndex: 'patient_name', key: 'patient_name', render: (v: string | null) => v || '-' },
    { title: '发起人', dataIndex: 'initiator_name', key: 'initiator_name', render: (v: string | null) => v || '-' },
    {
      title: '参会专家',
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: Conference['status']) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    { title: '发起时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === '待会诊' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '进行中')}>进入会诊</Button>
          )}
          {record.status === '进行中' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '已完成')}>完成</Button>
          )}
          <Button type="link" size="small" onClick={() => setDetail(record)}>查看报告</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="远程会诊">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按患者 / 主题搜索"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Button onClick={handleSearch}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>发起会诊</Button>
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
        title="发起会诊"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="发起"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="topic" label="会诊主题" rules={[{ required: true, message: '请输入主题' }]}>
            <Input placeholder="如：张伟高血压疑难病例会诊" />
          </Form.Item>
          <Form.Item name="patient_id" label="患者">
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="选择患者（可选）"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="experts" label="参会专家">
            <Select mode="tags" placeholder="输入专家姓名后回车" open={false} />
          </Form.Item>
          <Form.Item name="summary" label="会诊说明">
            <Input.TextArea rows={3} placeholder="会诊目的、病情摘要等" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="会诊详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="会诊编号">{detail.conference_no}</Descriptions.Item>
            <Descriptions.Item label="主题">{detail.topic}</Descriptions.Item>
            <Descriptions.Item label="患者">{detail.patient_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="发起人">{detail.initiator_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="参会专家">{(detail.experts || []).join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="说明">{detail.summary || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ConferencesPage;
