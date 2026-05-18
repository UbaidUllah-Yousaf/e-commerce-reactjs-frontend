import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { App as AntdApp, Form, Input, Button, Typography } from 'antd'
import { useAuth } from '../context/AuthContext'
import './authPages.css'

const { Paragraph } = Typography

export default function LoginPage() {
  const { message } = AntdApp.useApp()
  const { login, user, loading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const redirectAfterLogin =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  if (!loading && user) {
    const to =
      redirectAfterLogin && redirectAfterLogin.startsWith('/') && !redirectAfterLogin.startsWith('//')
        ? redirectAfterLogin
        : '/account'
    return <Navigate to={to} replace />
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <p className="auth-panel__eyebrow">Customer login</p>
        <h1 className="auth-panel__title">Sign in</h1>
        <Paragraph type="secondary" className="auth-panel__lede">
          Access your orders and saved details with your account.
        </Paragraph>

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async (values: { email: string; password: string }) => {
            setSubmitting(true)
            try {
              await login({
                email: values.email.trim(),
                password: values.password,
                redirectTo:
                  redirectAfterLogin &&
                  redirectAfterLogin.startsWith('/') &&
                  !redirectAfterLogin.startsWith('//')
                    ? redirectAfterLogin
                    : undefined,
              })
              message.success('Welcome back.')
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Sign in failed.')
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input size="large" placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password required' }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-panel-footer">
          New here?{' '}
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
