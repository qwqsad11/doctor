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
      if (!response.access_token || !response.user) throw new Error('Incomplete registration response');
      dispatch(loginSuccess(response.access_token));
      dispatch(setUser(response.user));
      message.success('Registration successful. You are now signed in.');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Please try again later.';
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
            <h1>Create an account</h1>
            <p>Smart Healthcare and Elderly Care Data Platform</p>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Enter a username' },
                { min: 3, message: 'Username must be at least 3 characters' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Use letters, numbers, and underscores only' },
              ]}
            >
              <Input placeholder="Username" prefix={<UserOutlined />} />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Enter an email address' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input placeholder="Email" prefix={<MailOutlined />} />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[{ pattern: /^1\d{10}$/, message: 'Enter a valid mobile number' }]}
            >
              <Input placeholder="Mobile number (optional)" prefix={<PhoneOutlined />} />
            </Form.Item>

            <Form.Item name="real_name">
              <Input placeholder="Full name (optional)" prefix={<IdcardOutlined />} />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Enter a password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password placeholder="Password" prefix={<LockOutlined />} />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Re-enter your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm password" prefix={<LockOutlined />} />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                Register
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default RegisterPage;
