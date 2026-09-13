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

const alertColor: Record<HealthRecord['alert_level'], string> = {
  正常: 'green',
  预警: 'orange',
  异常: 'red',
};

const levelOptions = [
  { value: '正常', label: '正常' },
  { value: '预警', label: '预警' },
  { value: '异常', label: '异常' },
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
        message.error(e.response?.data?.message || '加载健康计划失败');
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
        message.success('计划已更新');
      } else {
        await healthApi.create(values);
        message.success('计划已制定');
      }
      setOpen(false);
      load(page, pageSize, keyword, level);
    } catch (e: any) {
      message.error(e.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await healthApi.remove(id);
      message.success('计划已删除');
      load(page, pageSize, keyword, level);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<HealthRecord> = [
    { title: '患者', dataIndex: 'patient_name', key: 'patient_name' },
    { title: '健康计划', dataIndex: 'plan', key: 'plan' },
    { title: '最新指标', dataIndex: 'metrics', key: 'metrics', render: (v: string | null) => v || '-' },
    {
      title: '预警等级',
      dataIndex: 'alert_level',
      key: 'alert_level',
      render: (a: HealthRecord['alert_level']) => <Tag color={alertColor[a]}>{a}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', render: formatDateTime },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>查看数据</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>调整计划</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="健康管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按患者搜索"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="预警等级"
          allowClear
          style={{ width: 140 }}
          options={levelOptions}
          value={level}
          onChange={(v) => {
            setLevel(v);
            setPage(1);
          }}
        />
        <Button onClick={handleSearch}>查询</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>制定健康计划</Button>
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
        title={editing ? '调整健康计划' : '制定健康计划'}
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ alert_level: '正常' }}>
          <Form.Item name="patient_id" label="患者" rules={[{ required: true, message: '请选择患者' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择患者"
              options={patients.map((p) => ({ value: p.id, label: `${p.name}（${p.patient_no}）` }))}
            />
          </Form.Item>
          <Form.Item name="plan" label="健康计划" rules={[{ required: true, message: '请输入计划' }]}>
            <Input placeholder="如：高血压控制计划" />
          </Form.Item>
          <Form.Item name="metrics" label="最新指标">
            <Input placeholder="如：血压 145/92" />
          </Form.Item>
          <Form.Item name="device_source" label="设备来源（模拟）">
            <Input placeholder="如：家用血压计（本地录入）" />
          </Form.Item>
          <Form.Item name="reminder" label="提醒规则（本地模拟）">
            <Input placeholder="如：每日 08:00 服药提醒" />
          </Form.Item>
          <Form.Item name="alert_level" label="预警等级">
            <Select options={levelOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="健康数据"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="患者">{detail.patient_name}</Descriptions.Item>
            <Descriptions.Item label="健康计划">{detail.plan}</Descriptions.Item>
            <Descriptions.Item label="最新指标">{detail.metrics || '-'}</Descriptions.Item>
            <Descriptions.Item label="设备来源">{detail.device_source || '手工/本地模拟'}</Descriptions.Item>
            <Descriptions.Item label="提醒规则">{detail.reminder || '-'}</Descriptions.Item>
            <Descriptions.Item label="预警等级">{detail.alert_level}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updated_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default HealthPage;
