import React, { useState } from 'react';
import { Alert, Form, Input, Button, Card, Radio, Space, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '@/store/slices/authSlice';
import { setUser } from '@/store/slices/userSlice';
import { authService } from '@/services/auth';
import './Login.css';

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const onFinish = async (values: { username: string; password: string; factor?: 'sms' | 'email' | 'face'; verification_code?: string }) => {
    setLoading(true);
    dispatch(loginStart());

    try {
      const response = await authService.login(values);
      if (response.mfa_required) {
        setMfaRequired(true);
        message.info(response.demo_note || 'Select a verification method');
        return;
      }
      if (!response.access_token || !response.user) throw new Error('Incomplete login response');
      dispatch(loginSuccess(response.access_token));
      dispatch(setUser(response.user));
      message.success('Signed in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Sign-in failed';
      dispatch(loginFailure(errorMsg));
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
            <h1>Doctor Services</h1>
            <p>Smart Healthcare and Elderly Care Data Platform</p>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Enter a username' },
                { min: 3, message: 'Username must be at least 3 characters' },
              ]}
            >
              <Input
                placeholder="Username"
                prefix={<UserOutlined />}
                disabled={loading}
              />
            </Form.Item>

            {mfaRequired && <>
              <Alert type="info" showIcon message="Local multi-factor demo" description="SMS/email demo code: 123456; face demo passphrase: FACE-DEMO. No external services are used." style={{ marginBottom: 16 }} />
              <Form.Item name="factor" initialValue="sms" rules={[{ required: true }]}>
                <Radio.Group options={[{ value: 'sms', label: 'Demo SMS' }, { value: 'email', label: 'Demo email verification' }, { value: 'face', label: 'Demo face verification' }]} />
              </Form.Item>
              <Form.Item name="verification_code" rules={[{ required: true, message: 'Enter the demo verification code or face passphrase' }]}>
                <Input placeholder="Verification code / FACE-DEMO" disabled={loading} />
              </Form.Item>
            </>}

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Enter a password' }]}
            >
              <Input.Password
                placeholder="Password"
                prefix={<LockOutlined />}
                disabled={loading}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
              >
                {loading ? <Spin /> : 'Sign in'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <p>
              No account? <Link to="/register">Register</Link>
            </p>
            <p>© 2026 Doctor Services v0.1.0</p>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
