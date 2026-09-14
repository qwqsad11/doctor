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
      message.error(e.response?.data?.message || 'Failed to load posts');
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
      message.success('Case published. Ensure it is de-identified.');
      setOpen(false);
      form.resetFields();
      setPage(1);
      load(1, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Publish failed');
    }
  };

  const handleLike = async (id: string) => {
    try {
      await socialApi.like(id);
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Could not add like');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await socialApi.remove(id);
      message.success('Post deleted');
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Medical data and social features are strictly separated"
        description="Doctors must de-identify case shares before publishing. Original patient records are never automatically synced to the community."
      />

      <Card
        title="Doctor Collaboration"
        extra={
          <Button type="primary" onClick={() => { form.resetFields(); setOpen(true); }}>
            Publish case
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
            showTotal: (t) => `${t} total`,
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
                <Popconfirm key="del" title="Delete this post?" onConfirm={() => handleDelete(item.id)}>
                  <Button type="text" size="small" danger>Delete</Button>
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
        title="Publish Case Share"
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        okText="Publish"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter a title' }]}>
            <Input placeholder="Case topic" />
          </Form.Item>
          <Form.Item name="circle" label="Department / Circle">
            <Input placeholder="Example: Cardiology" />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true, message: 'Enter content' }]}>
            <Input.TextArea rows={4} placeholder="Ensure the case is de-identified and contains no patient-identifying information." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SocialPage;
