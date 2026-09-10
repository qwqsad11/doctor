import React, { useState } from 'react';
import { Form, Input, Button, Card, Space, message, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    dispatch(loginStart());

    try {
      const response = await authService.login(values);
      dispatch(loginSuccess(response.access_token));
      dispatch(setUser(response.user));
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '登录失败';
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
            <h1>医生服务系统</h1>
            <p>智慧医养大数据公共服务平台</p>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
              ]}
            >
              <Input
                placeholder="用户名"
                prefix={<UserOutlined />}
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                placeholder="密码"
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
                {loading ? <Spin /> : '登录'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-footer">
            <p>© 2026 医生服务系统 v0.1.0</p>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
