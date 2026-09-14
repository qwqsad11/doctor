import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { auditApi } from '@/services/business';
import type { AuditLog } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

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
    { title: 'Operator', dataIndex: 'operator', key: 'operator', render: (v: string | null) => v || '-' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag color="geekblue">{displayLabel(a)}</Tag> },
    { title: 'Target', dataIndex: 'target', key: 'target', render: (v: string | null) => v || '-' },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (r: AuditLog['result']) => <Tag color={r === '成功' ? 'green' : 'red'}>{displayLabel(r)}</Tag>,
    },
    { title: 'IP', dataIndex: 'ip', key: 'ip', render: (v: string | null) => v || '-' },
    { title: 'Time', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
  ];

  return (
    <Card title="Audit Log">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Search by operator, target, or action"
          prefix={<SearchOutlined />}
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Result"
          allowClear
          style={{ width: 120 }}
          value={result}
          onChange={(v) => {
            setResult(v);
            setPage(1);
          }}
          options={[
            { value: '成功', label: 'Success' },
            { value: '失败', label: 'Failed' },
          ]}
        />
        <span style={{ color: '#999' }}>Press Enter or change a filter to search</span>
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
    </Card>
  );
};

export default AuditPage;
