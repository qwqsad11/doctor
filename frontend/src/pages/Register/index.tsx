import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '@/store/slices/authSlice';
import { setUser } from '@/store/slices/userSlice';
import { authService } from '@/services/auth';
import '../Login/Login.css';

interface RegisterForm {
  username: string;
  email: string;
  phone?: string;
  real_name?: string;
  password: string;
  confirm: string;
}

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: RegisterForm) => {
    setLoading(true);
    try {
      const { username, email, phone, real_name, password } = values;
      const response = await authService.register({
        username,
        email,
        phone,
        real_name,
        password,
      });
      if (!response.access_token || !response.user) throw new Error('注册响应不完整');
      dispatch(loginSuccess(response.access_token));
      dispatch(setUser(response.user));
      message.success('注册成功，已自动登录');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '注册失败，请稍后重试';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="login-header">
            <h1>注册账号</h1>
            <p>智慧医养大数据公共服务平台</p>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: '仅支持字母、数字、下划线' },
              ]}
            >
              <Input placeholder="用户名" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '邮箱格式不正确' },
              ]}
            >
              <Input placeholder="邮箱" prefix={<MailOutlined />} />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}
            >
              <Input placeholder="手机号（可选）" prefix={<PhoneOutlined />} />
            </Form.Item>

            <Form.Item name="real_name">
              <Input placeholder="真实姓名（可选）" prefix={<IdcardOutlined />} />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password placeholder="密码" prefix={<LockOutlined />} />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="确认密码" prefix={<LockOutlined />} />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <p>
              已有账号？<Link to="/login">去登录</Link>
            </p>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default RegisterPage;
