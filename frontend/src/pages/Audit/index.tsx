import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { auditApi } from '@/services/business';
import type { AuditLog } from '@/services/types';
import { formatDateTime } from '@/utils/format';

const AuditPage: React.FC = () => {
  const [list, setList] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async (p: number, ps: number, kw: string, r?: string) => {
    setLoading(true);
    try {
      const data = await auditApi.list({ page: p, pageSize: ps, keyword: kw || undefined, result: r });
      setList(data.list);
      setTotal(data.total);
    } catch (e: any) {
      // 无权限或加载失败
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, pageSize, keyword, result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, result]);

  const handleSearch = () => {
    setPage(1);
    load(1, pageSize, keyword, result);
  };

  const columns: ColumnsType<AuditLog> = [
    { title: '操作人', dataIndex: 'operator', key: 'operator', render: (v: string | null) => v || '-' },
    { title: '操作类型', dataIndex: 'action', key: 'action', render: (a: string) => <Tag color="geekblue">{a}</Tag> },
    { title: '操作对象', dataIndex: 'target', key: 'target', render: (v: string | null) => v || '-' },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (r: AuditLog['result']) => <Tag color={r === '成功' ? 'green' : 'red'}>{r}</Tag>,
    },
    { title: 'IP', dataIndex: 'ip', key: 'ip', render: (v: string | null) => v || '-' },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
  ];

  return (
    <Card title="操作审计">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按操作人 / 对象 / 类型搜索"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="结果"
          allowClear
          style={{ width: 120 }}
          value={result}
          onChange={(v) => {
            setResult(v);
            setPage(1);
          }}
          options={[
            { value: '成功', label: '成功' },
            { value: '失败', label: '失败' },
          ]}
        />
        <span style={{ color: '#999' }}>按 Enter 或切换筛选查询</span>
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
  );
};

export default AuditPage;
