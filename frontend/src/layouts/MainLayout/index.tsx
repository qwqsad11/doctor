import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  MessageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  HeartOutlined,
  ShareAltOutlined,
  AuditOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { clearUser, setUser } from '@/store/slices/userSlice';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/services/business';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

interface MenuEntry {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const MENU_ITEMS: MenuEntry[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/patients', icon: <TeamOutlined />, label: 'Patients' },
  { key: '/consultations', icon: <MessageOutlined />, label: 'Consultations' },
  { key: '/emr', icon: <FileTextOutlined />, label: 'Medical Records' },
  { key: '/conferences', icon: <VideoCameraOutlined />, label: 'Conferences' },
  { key: '/health', icon: <HeartOutlined />, label: 'Health Management' },
  { key: '/social', icon: <ShareAltOutlined />, label: 'Doctor Community' },
  { key: '/audit', icon: <AuditOutlined />, label: 'Audit Log' },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user.id) return;

    // Restore the header identity after a browser refresh from the saved token.
    usersApi.getMe().then((profile) => dispatch(setUser(profile))).catch(() => undefined);
  }, [dispatch, isAuthenticated, user.id]);

  const menuItems = user.roles?.includes('admin')
    ? [...MENU_ITEMS, { key: '/admin', icon: <SettingOutlined />, label: 'Access Management' }]
    : MENU_ITEMS;
  const titles = Object.fromEntries(menuItems.map((m) => [m.key, m.label]));

  const selectedKey = useMemo(() => {
    const match = menuItems.find((m) => location.pathname.startsWith(m.key));
    return match?.key ?? '/dashboard';
  }, [location.pathname, menuItems]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearUser());
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
    },
  ];

  const onUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') {
      navigate('/profile');
    }
    if (key === 'logout') {
      handleLogout();
    }
  };

  return (
    <Layout className="main-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        className="main-sider"
      >
        <div className="main-logo">
          <span className="main-logo-icon">🏥</span>
          {!collapsed && <span className="main-logo-text">Doctor Services</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems.map((m) => ({ key: m.key, icon: m.icon, label: m.label }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header className="main-header">
          <Space size="middle">
            <span
              className="main-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <span className="main-breadcrumb">{titles[selectedKey] ?? 'Dashboard'}</span>
          </Space>

          <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }}>
            <Space className="main-user">
              <Avatar size="small" src={user.avatar || undefined} icon={<UserOutlined />} />
              <span>{user.real_name || user.username || 'Not signed in'}</span>
            </Space>
          </Dropdown>
        </Header>

        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
