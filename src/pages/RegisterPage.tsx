import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { App as AntdApp, Form, Input, Button, Typography } from 'antd'
import { useAuth } from '../context/AuthContext'
import './authPages.css'

const { Paragraph } = Typography

export default function RegisterPage() {
  const { message } = AntdApp.useApp()
  const { register, user, loading } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/account" replace />
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <p className="auth-panel__eyebrow">Join us</p>
        <h1 className="auth-panel__title">Register</h1>
        <Paragraph type="secondary" className="auth-panel__lede">
          Create an account to checkout faster and view your order history.
        </Paragraph>

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async (values: { email: string; password: string; password2: string }) => {
            setSubmitting(true)
            try {
              await register({
                email: values.email.trim(),
                password1: values.password,
                password2: values.password2,
              })
              message.success('Account created.')
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Registration failed.')
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
            rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
          >
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm password"
            name="password2"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Create account
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-panel-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
