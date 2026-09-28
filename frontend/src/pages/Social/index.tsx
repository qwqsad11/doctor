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
  Drawer,
  Divider,
  message,
} from 'antd';
import { LikeOutlined, LikeFilled, CommentOutlined, EyeOutlined } from '@ant-design/icons';
import { socialApi } from '@/services/business';
import type { SocialPost, Comment } from '@/services/types';
import { formatDateTime } from '@/utils/format';
import CommentSection from '@/components/CommentSection';

const { Paragraph } = Typography;

const SocialPage: React.FC = () => {
  const [list, setList] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const [detail, setDetail] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

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

  const loadComments = useCallback(async (id: string) => {
    setCommentsLoading(true);
    try {
      const data = await socialApi.listComments(id);
      setComments(data.list);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const openDetail = async (post: SocialPost) => {
    setDetail(post);
    setComments([]);
    try {
      const [d, c] = await Promise.all([socialApi.detail(post.id), socialApi.listComments(post.id)]);
      setDetail(d);
      setComments(c.list);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to load post');
    }
  };

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
      const r = await socialApi.like(id);
      if (detail?.id === id) {
        setDetail({ ...detail, likes: r.likes, liked: r.liked });
      }
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Could not update like');
    }
  };

  const submitComment = async (content: string) => {
    if (!detail) return;
    try {
      await socialApi.addComment(detail.id, content);
      message.success('Comment added');
      await loadComments(detail.id);
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to add comment');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!detail) return;
    try {
      await socialApi.removeComment(detail.id, commentId);
      message.success('Comment deleted');
      await loadComments(detail.id);
      load(page, pageSize);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Failed to delete comment');
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
        title="Doctor Community"
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
                <Button key="comment" type="text" size="small" onClick={() => openDetail(item)}>
                  <CommentOutlined /> {item.comments}
                </Button>,
                <Button key="view" type="text" size="small" onClick={() => openDetail(item)}>
                  <EyeOutlined /> View
                </Button>,
                <Popconfirm key="del" title="Delete this post?" onConfirm={() => handleDelete(item.id)}>
                  <Button type="text" size="small" danger>Delete</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar>{item.author_name.slice(0, 1)}</Avatar>}
                title={
                  <a onClick={() => openDetail(item)}>
                    <Space>{item.title}{item.circle && <Tag color="blue">{item.circle}</Tag>}</Space>
                  </a>
                }
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

      <Drawer
        title={detail?.title || 'Post'}
        open={!!detail}
        onClose={() => setDetail(null)}
        width={520}
      >
        {detail && (
          <>
            <Space>
              <Avatar>{detail.author_name.slice(0, 1)}</Avatar>
              <div>
                <div>{detail.author_name}</div>
                <div style={{ color: '#999', fontSize: 12 }}>{formatDateTime(detail.created_at)}</div>
              </div>
            </Space>
            {detail.circle && <Tag color="blue" style={{ marginTop: 12 }}>{detail.circle}</Tag>}
            <Paragraph style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{detail.content}</Paragraph>
            <Button
              type={detail.liked ? 'primary' : 'default'}
              icon={detail.liked ? <LikeFilled /> : <LikeOutlined />}
              onClick={() => handleLike(detail.id)}
            >
              {detail.liked ? 'Liked' : 'Like'} {detail.likes}
            </Button>
            <Divider>Comments ({detail.comments})</Divider>
            <CommentSection
              comments={comments}
              loading={commentsLoading}
              onSubmit={submitComment}
              onDelete={deleteComment}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default SocialPage;
