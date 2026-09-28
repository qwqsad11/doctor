import React, { useState } from 'react';
import {
  List,
  Avatar,
  Input,
  Button,
  Space,
  Popconfirm,
  Empty,
  message,
} from 'antd';
import { DeleteOutlined, SendOutlined } from '@ant-design/icons';
import type { Comment } from '@/services/types';
import { formatDateTime } from '@/utils/format';

const { TextArea } = Input;

interface CommentSectionProps {
  comments: Comment[];
  loading?: boolean;
  onSubmit: (content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  loading,
  onSubmit,
  onDelete,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const content = value.trim();
    if (!content) {
      message.warning('Enter a comment');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(content);
      setValue('');
    } catch {
      /* 错误已由页面层提示 */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <TextArea
          rows={2}
          value={value}
          maxLength={1000}
          placeholder="Write a comment…"
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          style={{ marginTop: 8 }}
          loading={submitting}
          onClick={handleSubmit}
        >
          Comment
        </Button>
      </div>

      {comments.length === 0 && !loading ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet" />
      ) : (
        <List
          itemLayout="horizontal"
          loading={loading}
          dataSource={comments}
          locale={{ emptyText: 'No comments yet' }}
          renderItem={(c) => (
            <List.Item
              key={c.id}
              actions={
                onDelete
                  ? [
                      <Popconfirm
                        key="del"
                        title="Delete this comment?"
                        onConfirm={() => onDelete(c.id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                avatar={<Avatar>{c.author_name.slice(0, 1)}</Avatar>}
                title={
                  <Space size="small">
                    <span>{c.author_name}</span>
                    <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>
                      {formatDateTime(c.created_at)}
                    </span>
                  </Space>
                }
                description={<span style={{ color: '#333', whiteSpace: 'pre-wrap' }}>{c.content}</span>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default CommentSection;
