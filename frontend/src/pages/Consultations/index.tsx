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
      message.error(e.response?.data?.message || '加载问诊列表失败');
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
      message.success('问诊已创建');
      setOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '创建失败');
    }
  };

  const changeStatus = async (id: string, status: Consultation['status']) => {
    try {
      await consultationsApi.update(id, { status });
      message.success('状态已更新');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const exportRecord = (record: Consultation) => {
    const blob = new Blob([`问诊记录\n编号：${record.consultation_no}\n患者：${record.patient_name}\n主诉：${record.symptom || '-'}\n医嘱：${record.advice || '-'}`], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${record.consultation_no}-record.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDelete = async (id: string) => {
    try {
      await consultationsApi.remove(id);
      message.success('问诊已删除');
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<Consultation> = [
    { title: '问诊编号', dataIndex: 'consultation_no', key: 'consultation_no', width: 100 },
    { title: '患者', dataIndex: 'patient_name', key: 'patient_name' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: Consultation['type']) => <Tag color={t === '视频' ? 'purple' : 'cyan'}>{t}</Tag>,
    },
    { title: '医生', dataIndex: 'doctor_name', key: 'doctor_name', render: (d: string | null) => d || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: Consultation['status']) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === '待接诊' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '进行中')}>接诊</Button>
          )}
          {record.status === '进行中' && (
            <Button type="link" size="small" onClick={() => changeStatus(record.id, '已完成')}>完成</Button>
          )}
          <Button type="link" size="small" onClick={() => setDetail(record)}>查看记录</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="在线问诊">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按患者 / 问诊编号搜索"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Button onClick={handleSearch}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建问诊</Button>
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
        title="新建问诊"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ type: '图文' }}>
          <Form.Item name="patient_id" label="患者" rules={[{ required: true, message: '请选择患者' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择患者"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="type" label="问诊类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: '图文', label: '图文' },
                { value: '视频', label: '视频' },
              ]}
            />
          </Form.Item>
          <Form.Item name="symptom" label="主诉">
            <Input.TextArea rows={3} placeholder="如：反复头晕三天" />
          </Form.Item>
          <Form.Item name="attachments" label="图片/附件说明（本地模拟）">
            <Input placeholder="如：blood-pressure-photo.jpg" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="问诊记录"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={detail ? <Space><Button onClick={() => exportRecord(detail)}>导出文本记录</Button><Button onClick={() => setDetail(null)}>关闭</Button></Space> : null}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="问诊编号">{detail.consultation_no}</Descriptions.Item>
            <Descriptions.Item label="患者">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="医生">{detail.doctor_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">{detail.type}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="主诉">{detail.symptom || '-'}</Descriptions.Item>
            <Descriptions.Item label="医嘱">{detail.advice || '-'}</Descriptions.Item>
            <Descriptions.Item label="附件">{detail.attachments || '-'}</Descriptions.Item>
            <Descriptions.Item label="视频">{detail.type === '视频' ? '本地模拟视频房间，可记录状态和报告，不连接真实视频服务' : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(detail.created_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ConsultationsPage;
