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
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/patients', icon: <TeamOutlined />, label: '患者管理' },
  { key: '/consultations', icon: <MessageOutlined />, label: '在线问诊' },
  { key: '/emr', icon: <FileTextOutlined />, label: '电子病历' },
  { key: '/conferences', icon: <VideoCameraOutlined />, label: '远程会诊' },
  { key: '/health', icon: <HeartOutlined />, label: '健康管理' },
  { key: '/social', icon: <ShareAltOutlined />, label: '医生社交' },
  { key: '/audit', icon: <AuditOutlined />, label: '操作审计' },
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
    ? [...MENU_ITEMS, { key: '/admin', icon: <SettingOutlined />, label: '管理授权' }]
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
      label: '个人档案',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
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
          {!collapsed && <span className="main-logo-text">医生服务系统</span>}
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
            <span className="main-breadcrumb">{titles[selectedKey] ?? '工作台'}</span>
          </Space>

          <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }}>
            <Space className="main-user">
              <Avatar size="small" src={user.avatar || undefined} icon={<UserOutlined />} />
              <span>{user.real_name || user.username || '未登录'}</span>
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
