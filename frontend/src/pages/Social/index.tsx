import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  List,
  Tag,
  Avatar,
  Space,
  Button,
  Alert,
  Typography,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
} from 'antd';
import { LikeOutlined, CommentOutlined } from '@ant-design/icons';
import { socialApi } from '@/services/business';
import type { SocialPost } from '@/services/types';
import { formatDateTime } from '@/utils/format';

const { Paragraph } = Typography;

const SocialPage: React.FC = () => {
  const [list, setList] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async (p: number, ps: number) => {
    setLoading(true);
    try {
      const data = await socialApi.list({ page: p, pageSize: ps });
      setList(data.list);
      setTotal(data.total);
    } catch (e: any) {
      message.error(e.response?.data?.message || '加载帖子失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, pageSize);
  }, [page, pageSize, load]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await socialApi.create(values);
      message.success('病例已发布（请确保已脱敏）');
      setOpen(false);
      form.resetFields();
      setPage(1);
      load(1, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || '发布失败');
    }
  };

  const handleLike = async (id: string) => {
    try {
      await socialApi.like(id);
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || '点赞失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await socialApi.remove(id);
      message.success('帖子已删除');
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="医疗数据与社交严格隔离"
        description="病例分享必须由医生人工脱敏后才能发布，患者原始病历不会自动同步到社区。"
      />

      <Card
        title="医生同行协作"
        extra={
          <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>
            发布病例
          </Button>
        }
      >
        <List
          itemLayout="vertical"
          loading={loading}
          dataSource={list}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Button key="like" type="text" size="small" onClick={() => handleLike(item.id)}>
                  <LikeOutlined /> {item.likes}
                </Button>,
                <Space key="comment"><CommentOutlined /> {item.comments}</Space>,
                <Popconfirm key="del" title="确认删除？" onConfirm={() => handleDelete(item.id)}>
                  <Button type="text" size="small" danger>删除</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar>{item.author_name.slice(0, 1)}</Avatar>}
                title={<Space>{item.title}{item.circle && <Tag color="blue">{item.circle}</Tag>}</Space>}
                description={`${item.author_name} · ${formatDateTime(item.created_at)}`}
              />
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {item.content}
              </Paragraph>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="发布病例分享"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="发布"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="病例主题" />
          </Form.Item>
          <Form.Item name="circle" label="科室 / 圈子">
            <Input placeholder="如：心血管内科" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={4} placeholder="请确保已脱敏，勿包含患者可识别信息……" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SocialPage;
