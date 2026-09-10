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
        message.error(e.response?.data?.message || '加载患者列表失败');
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
        message.success('患者已更新');
      } else {
        await patientsApi.create(values);
        message.success('患者已添加');
      }
      setAddOpen(false);
      load(page, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await patientsApi.remove(id);
      message.success('患者已删除');
      // 若当前页删空则回退一页
      const nextPage = list.length === 1 && page > 1 ? page - 1 : page;
      setPage(nextPage);
      load(nextPage, pageSize, keyword);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const columns: ColumnsType<Patient> = [
    { title: '患者ID', dataIndex: 'patient_no', key: 'patient_no', width: 140 },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 70 },
    { title: '年龄', dataIndex: 'age', key: 'age', width: 70 },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '分组', dataIndex: 'group', key: 'group', render: (g: string | null) => (g ? <Tag color="blue">{g}</Tag> : '-') },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: Patient['status']) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDetail(record)}>查看档案</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该患者？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
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
            placeholder="按姓名 / 患者ID / 症状 / 分组搜索"
            prefix={<SearchOutlined />}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Button onClick={handleSearch}>查询</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增患者
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
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title={editing ? '编辑患者' : '新增患者'}
        open={addOpen}
        onOk={handleSubmit}
        onCancel={() => setAddOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ gender: '男', group: '高血压' }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="患者姓名" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
              <Select
                style={{ width: 120 }}
                options={[
                  { value: '男', label: '男' },
                  { value: '女', label: '女' },
                ]}
              />
            </Form.Item>
            <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入年龄' }]}>
              <InputNumber min={0} max={150} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="phone" label="电话">
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="group" label="病种分组">
            <Select
              options={[
                { value: '高血压', label: '高血压' },
                { value: '糖尿病', label: '糖尿病' },
                { value: '冠心病', label: '冠心病' },
                { value: '慢阻肺', label: '慢阻肺' },
                { value: '其它', label: '其它' },
              ]}
            />
          </Form.Item>
          <Form.Item name="symptom" label="主要症状">
            <Input.TextArea rows={2} placeholder="如：头晕、胸闷等" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { value: '在管', label: '在管' },
                  { value: '待随访', label: '待随访' },
                  { value: '已转出', label: '已转出' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="患者档案"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="患者ID">{detail.patient_no}</Descriptions.Item>
            <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="性别">{detail.gender}</Descriptions.Item>
            <Descriptions.Item label="年龄">{detail.age}</Descriptions.Item>
            <Descriptions.Item label="电话">{detail.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="病种分组">{detail.group || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
            <Descriptions.Item label="主要症状">{detail.symptom || '-'}</Descriptions.Item>
            <Descriptions.Item label="建档时间">{formatDateTime(detail.created_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PatientsPage;
