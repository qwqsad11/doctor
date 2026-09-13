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
        message.info(response.demo_note || '请选择验证方式');
        return;
      }
      if (!response.access_token || !response.user) throw new Error('登录响应不完整');
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

            {mfaRequired && <>
              <Alert type="info" showIcon message="本地多因素演示" description="短信/邮箱演示码：123456；人脸模拟口令：FACE-DEMO。不会调用任何外部服务。" style={{ marginBottom: 16 }} />
              <Form.Item name="factor" initialValue="sms" rules={[{ required: true }]}>
                <Radio.Group options={[{ value: 'sms', label: '模拟短信' }, { value: 'email', label: '模拟邮箱验证' }, { value: 'face', label: '模拟人脸' }]} />
              </Form.Item>
              <Form.Item name="verification_code" rules={[{ required: true, message: '请输入演示验证码或人脸口令' }]}>
                <Input placeholder="验证码 / FACE-DEMO" disabled={loading} />
              </Form.Item>
            </>}

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
            <p>
              没有账号？<Link to="/register">去注册</Link>
            </p>
            <p>© 2026 医生服务系统 v0.1.0</p>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;
