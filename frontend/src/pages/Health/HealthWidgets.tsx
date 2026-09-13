import { Form, Grid, Input, InputNumber, List, Select, Table, Tag, Typography } from 'antd';
import type { HealthEntry } from '@/services/workflows';
import { formatDateTime } from '@/utils/format';
export const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
export function MeasurementFields() {
  const form = Form.useFormInstance();
  const kind = Form.useWatch('kind', form);
  return <>
    <Form.Item name="kind" label="监测项目" rules={[{ required: true }]}><Select options={[{ value: '血压', label: '血压（mmHg）' }, { value: '血糖', label: '血糖（mmol/L）' }]} /></Form.Item>
    <Form.Item name="measured_at" label="测量时间" rules={[{ required: true }]}><Input type="datetime-local" step={1} /></Form.Item>
    {kind === '血压' ? <>
      <Form.Item name="systolic" label="收缩压（mmHg）" preserve={false} rules={[{ required: true }]}><InputNumber min={1} max={400} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="diastolic" label="舒张压（mmHg）" preserve={false} rules={[{ required: true }]}><InputNumber min={1} max={300} style={{ width: '100%' }} /></Form.Item>
    </> : <>
      <Form.Item name="glucose" label="血糖（mmol/L）" preserve={false} rules={[{ required: true }]}><InputNumber min={0.1} max={100} step={0.1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="context" label="测量时段" preserve={false}><Select options={['空腹', '餐后', '随机'].map(value => ({ value, label: value }))} /></Form.Item>
    </>}
    <Form.Item name="source" label="设备 / 数据来源"><Input maxLength={100} placeholder="例如：家用血压计" /></Form.Item>
    <Form.Item name="note" label="备注"><Input.TextArea maxLength={1000} rows={2} /></Form.Item>
  </>;
}
const measurementValue = (e: HealthEntry) => e.data.kind === '血压'
  ? e.data.systolic + '/' + e.data.diastolic + ' mmHg'
  : e.data.glucose + ' mmol/L ' + (e.data.context || '');
export function MeasurementTable({ entries }: { entries: HealthEntry[] }) {
  const screens = Grid.useBreakpoint();
  const measurements = entries.filter(e => e.kind === 'measurement').sort((a, b) => String(b.data.measured_at).localeCompare(String(a.data.measured_at)));
  if (!screens.md) return <List dataSource={measurements} pagination={{ pageSize: 8 }} locale={{ emptyText: '暂无监测记录' }} renderItem={e => <List.Item style={{ display: 'block' }}>
    <div><Tag>{e.data.kind}</Tag><Typography.Text strong>{measurementValue(e)}</Typography.Text></div>
    <div style={{ marginTop: 8 }}>{formatDateTime(e.data.measured_at || e.created_at)}</div>
    <div><span>{e.data.source || '手工录入'}</span>{e.actor && <Typography.Text type="secondary"> · {e.actor}</Typography.Text>}</div>
    {e.data.note && <div>{e.data.note}</div>}
  </List.Item>} />;
  return <Table size="small" rowKey="id" dataSource={measurements} pagination={{ pageSize: 8 }} scroll={{ x: 620 }} columns={[
    { title: '测量时间', render: (_, e) => formatDateTime(e.data.measured_at || e.created_at) },
    { title: '项目', render: (_, e) => <Tag>{e.data.kind}</Tag> },
    { title: '数值', render: (_, e) => measurementValue(e) },
    { title: '来源', render: (_, e) => <><span>{e.data.source || '手工录入'}</span><div>{e.actor}</div></> },
    { title: '备注', render: (_, e) => e.data.note || '—' },
  ]} />;
}
