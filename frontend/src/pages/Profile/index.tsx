import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  Button,
  Avatar,
  Upload,
  Space,
  Tag,
  Modal,
  message,
} from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { usersApi } from '@/services/business';
import type { UserProfile } from '@/services/types';
import { setUser } from '@/store/slices/userSlice';
import { useAuth } from '@/hooks/useAuth';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const load = async () => {
    try {
      const p = await usersApi.getMe();
      setProfile(p);
      form.setFieldsValue(p);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载档案失败');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const updated = await usersApi.updateMe(values);
      dispatch(setUser(updated));
      setProfile(updated);
      message.success('档案已更新');
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePwd = async () => {
    const values = await pwdForm.validateFields();
    setPwdLoading(true);
    try {
      await usersApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('密码已修改');
      pwdForm.resetFields();
      setPwdOpen(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || '修改密码失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const avatarText = (profile?.real_name || user.username || 'U').slice(0, 1).toUpperCase();

  return (
    <div>
      <Card>
        <Row gutter={24} align="middle">
          <Col flex="160px" style={{ textAlign: 'center' }}>
            <Upload
              showUploadList={false}
              accept="image/*"
              customRequest={async (options: any) => {
                try {
                  const fd = new FormData();
                  fd.append('file', options.file);
                  const updated = await usersApi.uploadAvatar(fd);
                  dispatch(setUser(updated));
                  setProfile(updated);
                  message.success('头像已更新');
                } catch (error: any) {
                  message.error(error.response?.data?.message || '上传失败');
                }
              }}
            >
              <Avatar size={80} src={profile?.avatar || undefined} icon={<UserOutlined />}>
                {!profile?.avatar ? avatarText : null}
              </Avatar>
              <div style={{ marginTop: 8 }}>
                <Button size="small" icon={<UploadOutlined />}>
                  更换头像
                </Button>
              </div>
            </Upload>
          </Col>
          <Col flex="auto">
            <h2 style={{ margin: 0 }}>{profile?.real_name || user.username}</h2>
            <Space style={{ marginTop: 8 }}>
              {(user.roles || []).map((r) => (
                <Tag color="blue" key={r}>
                  {r === 'admin' ? '管理员' : '医生'}
                </Tag>
              ))}
              <Tag color="green">{profile?.status === 'active' ? '正常' : profile?.status}</Tag>
            </Space>
            <div style={{ marginTop: 8, color: '#888' }}>
              用户名：{profile?.username} · 邮箱：{profile?.email}
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="基本档案" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="real_name" label="真实姓名">
                <Input placeholder="真实姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select
                  allowClear
                  placeholder="选择性别"
                  options={[
                    { value: '男', label: '男' },
                    { value: '女', label: '女' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="科室">
                <Input placeholder="如：心血管内科" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label="职称">
                <Input placeholder="如：主治医师" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hospital" label="医院">
                <Input placeholder="所在医院" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[{ type: 'email', message: '邮箱格式不正确' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="手机号">
                <Input placeholder="手机号" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="bio" label="个人简介">
                <Input.TextArea rows={3} placeholder="个人简介（可选）" />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" loading={loading} onClick={handleSave}>
              保存档案
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
              修改密码
            </Button>
          </Space>
        </Form>
      </Card>

      <Modal
        title="修改密码"
        open={pwdOpen}
        onOk={handleChangePwd}
        onCancel={() => setPwdOpen(false)}
        okText="确认修改"
        cancelText="取消"
        confirmLoading={pwdLoading}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="新密码" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="确认新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
