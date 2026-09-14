import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import {
  TeamOutlined,
  MessageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { patientsApi, consultationsApi, emrApi, conferencesApi, auditApi } from '@/services/business';
import type { AuditLog } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import { displayLabel } from '@/utils/labels';

const { Title, Paragraph } = Typography;

interface Stats {
  patients: number;
  waitingConsultations: number;
  pendingEmr: number;
  pendingConferences: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<AuditLog[]>([]);

  useEffect(() => {
    // 统计卡片：四个模块的实时计数
    Promise.all([
      patientsApi.list({ pageSize: 1 }),
      consultationsApi.list({ pageSize: 1, status: '待接诊' }),
      emrApi.list({ pageSize: 1, status: '待审核' }),
      conferencesApi.list({ pageSize: 1, status: '待会诊' }),
    ])
      .then(([p, c, e, cf]) => {
        setStats({
          patients: p.total,
          waitingConsultations: c.total,
          pendingEmr: e.total,
          pendingConferences: cf.total,
        });
      })
      .catch(() => {
        /* 统计失败时保持占位 */
      });

    // 最近业务动态：最近 5 条审计日志
    auditApi
      .list({ pageSize: 5 })
      .then((d) => setRecords(d.list))
      .catch(() => setRecords([]));
  }, []);

  const statCards = [
    { title: 'Total Patients', value: stats?.patients, icon: <TeamOutlined />, color: '#1890ff' },
    { title: 'Awaiting Consultations', value: stats?.waitingConsultations, icon: <MessageOutlined />, color: '#52c41a' },
    { title: 'Pending Records', value: stats?.pendingEmr, icon: <FileTextOutlined />, color: '#faad14' },
    { title: 'Awaiting Conferences', value: stats?.pendingConferences, icon: <VideoCameraOutlined />, color: '#722ed1' },
  ];

  const columns = [
    { title: 'Target', dataIndex: 'target', key: 'target', render: (v: string | null) => v || '-' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (a: string) => <Tag color="geekblue">{displayLabel(a)}</Tag> },
    { title: 'Operator', dataIndex: 'operator', key: 'operator', render: (v: string | null) => v || '-' },
    { title: 'Time', dataIndex: 'created_at', key: 'created_at', render: formatDateTime },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (r: string) => <Tag color={r === '成功' ? 'green' : 'red'}>{displayLabel(r)}</Tag>,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        Welcome back, {user.username}!
      </Title>
      <Paragraph type="secondary">
        Use this workspace to manage patients, consultations, medical records, conferences, and health plans.
      </Paragraph>

      <Row gutter={16} style={{ marginTop: 8 }}>
        {statCards.map((s) => (
          <Col xs={12} sm={12} md={6} key={s.title}>
            <Card>
              <Statistic
                title={s.title}
                value={s.value ?? '-'}
                prefix={<span style={{ color: s.color, marginRight: 8 }}>{s.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Recent Activity" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
