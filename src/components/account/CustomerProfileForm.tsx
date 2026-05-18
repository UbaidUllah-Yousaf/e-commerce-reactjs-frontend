import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Form, Input, Switch, Typography, Button, Spin, Alert, App as AntdApp } from 'antd'
import { fetchCustomerProfile, patchCustomerProfile } from '../../api/customer'
import type { PatchedCustomerProfileRequest } from '../../types/customer'

const { Title, Text } = Typography

export function CustomerProfileForm() {
  const { message } = AntdApp.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm<PatchedCustomerProfileRequest & { email?: string }>()

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: fetchCustomerProfile,
  })

  useEffect(() => {
    if (!profile) return
    form.setFieldsValue({
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      note: profile.note,
      accepts_marketing: profile.accepts_marketing ?? false,
      tax_exempt: profile.tax_exempt ?? false,
    })
  }, [profile, form])

  const mutation = useMutation({
    mutationFn: (values: PatchedCustomerProfileRequest) => patchCustomerProfile(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customer-profile'] })
      message.success('Profile saved.')
    },
  })

  const onFinish = (values: PatchedCustomerProfileRequest & { email?: string }) => {
    const { email: _omit, ...rest } = values
    mutation.mutate(rest)
  }

  if (isLoading) {
    return (
      <div className="account-loading">
        <Spin />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Could not load customer profile"
        description={error instanceof Error ? error.message : 'Try signing in again.'}
        action={
          <Button size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <Card className="account-card account-card--flush" bordered={false}>
      <div className="account-card-head">
        <Title level={4} className="account-card-title">
          Profile
        </Title>
        <Text type="secondary" className="account-card-sub">
          Store details used at checkout and for order updates (Shopify-style customer record).
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        className="account-profile-form"
        onFinish={onFinish}
        requiredMark={false}
      >
        <div className="account-two-col">
          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input maxLength={32} placeholder="Optional" />
          </Form.Item>
        </div>
        <div className="account-two-col">
          <Form.Item label="First name" name="first_name">
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item label="Last name" name="last_name">
            <Input maxLength={150} />
          </Form.Item>
        </div>
        <Form.Item label="Note" name="note">
          <Input.TextArea rows={3} placeholder="Internal note (optional)" />
        </Form.Item>
        <div className="account-two-col">
          <Form.Item label="Email marketing" name="accepts_marketing" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Tax exempt" name="tax_exempt" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {mutation.isError ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={mutation.error instanceof Error ? mutation.error.message : 'Save failed'}
          />
        ) : null}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            className="account-cta-btn"
          >
            Save changes
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
