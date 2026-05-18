import { Link, NavLink, Route, Routes, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Spin, Alert, Typography, Button, Space } from 'antd'
import { EnvironmentOutlined, UserOutlined, InboxOutlined, LogoutOutlined } from '@ant-design/icons'
import { fetchOrders } from '../api/orders'
import { useAuth } from '../context/AuthContext'
import { AccountOrdersList } from './AccountOrdersList'
import { CustomerProfileForm } from './account/CustomerProfileForm'
import { CustomerAddressesPanel } from './account/CustomerAddressesPanel'
import { CustomerAddressEditorPage } from './account/CustomerAddressEditorPage'
import './account.css'

const { Title, Text } = Typography

function AccountOrders() {
  const { user } = useAuth()
  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['orders', user?.pk],
    queryFn: fetchOrders,
  })

  return (
    <Card className="account-card account-card--flush" bordered={false}>
      <div className="account-card-head">
        <Title level={4} className="account-card-title">
          Order history
        </Title>
        <Text type="secondary" className="account-card-sub">
          Track packages and view order details.
        </Text>
      </div>

      <AccountOrdersList
        orders={orders}
        isLoading={ordersLoading}
        error={ordersError instanceof Error ? ordersError : ordersError ? new Error(String(ordersError)) : null}
      />
    </Card>
  )
}

export default function UserProfile() {
  const [params] = useSearchParams()
  const ordered = params.get('ordered') === '1'
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth()

  if (authLoading) {
    return (
      <div className="account-page account-page--centered">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="account-page">
        <p className="account-eyebrow">Customer account</p>
        <Title level={2} className="account-title">
          Sign in to continue
        </Title>
        <Text type="secondary" style={{ display: 'block', maxWidth: 420, marginBottom: 28 }}>
          Your bag and catalog are always available. Sign in to view orders and manage your profile.
        </Text>
        <Space wrap>
          <Link to="/login">
            <Button type="primary" className="account-cta-btn">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button className="account-cta-btn account-cta-btn--outline">Create account</Button>
          </Link>
        </Space>
      </div>
    )
  }

  const greet = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email

  return (
    <div className="account-page">
      <p className="account-eyebrow">Customer account</p>
      <Title level={2} className="account-title">
        Welcome back{greet ? `, ${greet}` : ''}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Signed in as <Text strong>{user.email}</Text>
      </Text>

      {ordered ? (
        <Alert
          className="account-alert"
          type="success"
          showIcon
          message="Thank you. Your order has been received."
        />
      ) : null}

      <div className="account-layout">
        <aside className="account-nav" aria-label="Account">
          <NavLink to="/account" end className={({ isActive }) => (isActive ? 'account-nav-active' : '')}>
            <InboxOutlined style={{ marginRight: 10, fontSize: 16 }} />
            Orders
          </NavLink>
          <NavLink
            to="/account/addresses"
            className={({ isActive }) => (isActive ? 'account-nav-active' : '')}
          >
            <EnvironmentOutlined style={{ marginRight: 10, fontSize: 16 }} />
            Addresses
          </NavLink>
          <NavLink
            to="/account/profile"
            className={({ isActive }) => (isActive ? 'account-nav-active' : '')}
          >
            <UserOutlined style={{ marginRight: 10, fontSize: 16 }} />
            Profile
          </NavLink>
          <button type="button" className="account-nav-logout" onClick={() => void logout()}>
            <LogoutOutlined style={{ marginRight: 10, fontSize: 16 }} />
            Log out
          </button>
        </aside>

        <div className="account-main">
          <Routes>
            <Route index element={<AccountOrders />} />
            <Route path="addresses/new" element={<CustomerAddressEditorPage />} />
            <Route path="addresses/:addressId/edit" element={<CustomerAddressEditorPage />} />
            <Route path="addresses" element={<CustomerAddressesPanel />} />
            <Route path="profile" element={<CustomerProfileForm />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
