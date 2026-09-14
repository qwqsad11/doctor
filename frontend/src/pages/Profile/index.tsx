import { displayLabel } from "@/utils/labels";
import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  Button,
  Avatar,
  Alert,
  Upload,
  Space,
  Tag,
  Modal,
  message,
} from "antd";
import { UserOutlined, UploadOutlined, LockOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { directoryApi, roleLabels } from "@/services/doctor-directory";
import { usersApi } from "@/services/business";
import type { UserProfile } from "@/services/types";
import { setUser } from "@/store/slices/userSlice";
import { useAuth } from "@/hooks/useAuth";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [departments, setDepartments] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const load = async () => {
    try {
      const [p, choices] = await Promise.all([
        usersApi.getMe(),
        directoryApi.departments(),
      ]);
      setDepartments(choices);
      setProfile(p);
      form.setFieldsValue(p);
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to load profile");
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
      message.success("Profile updated");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Save failed");
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
      message.success("Password changed");
      pwdForm.resetFields();
      setPwdOpen(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPwdLoading(false);
    }
  };

  const avatarText = (profile?.real_name || user.username || "U")
    .slice(0, 1)
    .toUpperCase();

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Access Scope"
        description="Your role determines the data you can see. The data model supports temporary view/edit permissions by patient, record, or consultation with expiry dates. The course demo shows only data assigned to you by default."
      />
      <Card>
        <Row gutter={24} align="middle">
          <Col flex="160px" style={{ textAlign: "center" }}>
            <Upload
              showUploadList={false}
              accept="image/*"
              customRequest={async (options: any) => {
                try {
                  const fd = new FormData();
                  fd.append("file", options.file);
                  const updated = await usersApi.uploadAvatar(fd);
                  dispatch(setUser(updated));
                  setProfile(updated);
                  message.success("Avatar updated");
                } catch (error: any) {
                  message.error(error.response?.data?.message || "Upload failed");
                }
              }}
            >
              <Avatar
                size={80}
                src={profile?.avatar || undefined}
                icon={<UserOutlined />}
              >
                {!profile?.avatar ? avatarText : null}
              </Avatar>
              <div style={{ marginTop: 8 }}>
                <Button size="small" icon={<UploadOutlined />}>
                  Change avatar
                </Button>
              </div>
            </Upload>
          </Col>
          <Col flex="auto">
            <h2 style={{ margin: 0 }}>{profile?.real_name || user.username}</h2>
            <Space style={{ marginTop: 8 }}>
              {(user.roles || []).map((r) => (
                <Tag color="blue" key={r}>
                  {roleLabels[r] || r}
                </Tag>
              ))}
              <Tag color="green">
                {profile?.status === "active" ? "Active" : displayLabel(profile?.status)}
              </Tag>
            </Space>
            <div style={{ marginTop: 8, color: "#888" }}>
              Username:{profile?.username} · Email:{profile?.email}
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="Profile" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="real_name" label="Full name">
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Gender">
                <Select
                  allowClear
                  placeholder="Select gender"
                  options={[
                    { value: "男", label: "Male" },
                    { value: "女", label: "Female" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Select
                  showSearch
                  allowClear
                  placeholder="Select department"
                  options={departments.map((value) => ({
                    value,
                    label: displayLabel(value),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="title" label="Professional Title">
                <Select
                  showSearch
                  allowClear
                  placeholder="Select professional title"
                  options={[
                    ...new Set(
                      [
                        "医师",
                        "住院医师",
                        "主治医师",
                        "副主任医师",
                        "主任医师",
                        profile?.title,
                      ].filter((v): v is string => !!v),
                    ),
                  ].map((value) => ({ value, label: displayLabel(value) }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hospital" label="Hospital">
                <Input placeholder="Hospital" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: "email", message: "Enter a valid email address" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Mobile number">
                <Input placeholder="Mobile number" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="bio" label="Bio">
                <Input.TextArea rows={3} placeholder="Bio (optional)" />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" loading={loading} onClick={handleSave}>
              Save profile
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setPwdOpen(true)}>
              Change Password
            </Button>
          </Space>
        </Form>
      </Card>

      <Modal
        title="Change Password"
        open={pwdOpen}
        onOk={handleChangePwd}
        onCancel={() => setPwdOpen(false)}
        okText="Change password"
        cancelText="Cancel"
        confirmLoading={pwdLoading}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="old_password"
            label="Current password"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password placeholder="Current password" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="New password"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="New password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm new password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Re-enter your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
