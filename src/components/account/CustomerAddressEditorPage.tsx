import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Checkbox, Form, Input, Select, Spin, Typography } from 'antd'
import {
  createCustomerAddress,
  fetchCustomerAddresses,
  patchCustomerAddress,
} from '../../api/customer'
import type { CustomerAddressRequest } from '../../types/customer'
import { ISO3166_COUNTRY_SELECT_OPTIONS } from '../../data/iso3166CountryOptions'
import '../account.css'
import './customerAddressEditor.css'

const { Title, Text } = Typography

export function CustomerAddressEditorPage() {
  const { addressId } = useParams<{ addressId?: string }>()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form] = Form.useForm<CustomerAddressRequest>()

  const isEdit = pathname.endsWith('/edit')
  const parsedId = useMemo(() => {
    if (!isEdit || addressId == null) return null
    const n = Number.parseInt(addressId, 10)
    return Number.isFinite(n) ? n : null
  }, [addressId, isEdit])

  const {
    data: addresses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: fetchCustomerAddresses,
  })

  const editing = useMemo(() => {
    if (parsedId == null) return undefined
    return addresses?.find((a) => a.id === parsedId)
  }, [addresses, parsedId])

  useEffect(() => {
    if (!isEdit || !editing) return
    form.setFieldsValue({
      first_name: editing.first_name,
      last_name: editing.last_name,
      company: editing.company,
      address1: editing.address1,
      address2: editing.address2,
      city: editing.city,
      province_code: editing.province_code,
      country_code: editing.country_code,
      zip: editing.zip,
      phone: editing.phone,
      is_default_shipping: editing.is_default_shipping,
      is_default_billing: editing.is_default_billing,
    })
  }, [isEdit, editing, form])

  useEffect(() => {
    if (isEdit) return
    form.setFieldsValue({
      country_code: 'US',
      is_default_shipping: false,
      is_default_billing: false,
    })
  }, [isEdit, form])

  const invalidateAddresses = () => {
    void qc.invalidateQueries({ queryKey: ['customer-addresses'] })
    void qc.invalidateQueries({ queryKey: ['customer-profile'] })
  }

  const createMut = useMutation({
    mutationFn: (body: CustomerAddressRequest) => createCustomerAddress(body),
    onSuccess: () => {
      invalidateAddresses()
      void navigate('/account/addresses', { replace: true })
    },
  })

  const patchMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number
      body: CustomerAddressRequest
    }) => patchCustomerAddress(id, body),
    onSuccess: () => {
      invalidateAddresses()
      void navigate('/account/addresses', { replace: true })
    },
  })

  const normalizeBody = (values: CustomerAddressRequest): CustomerAddressRequest => ({
    ...values,
    country_code:
      typeof values.country_code === 'string'
        ? values.country_code.trim().toUpperCase().slice(0, 2)
        : 'US',
  })

  const onFinish = (values: CustomerAddressRequest) => {
    const body = normalizeBody(values)
    if (isEdit && parsedId != null) {
      patchMut.mutate({ id: parsedId, body })
    } else {
      createMut.mutate(body)
    }
  }

  const mutationError = createMut.error ?? patchMut.error
  const submitting = createMut.isPending || patchMut.isPending

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
        message="Could not load addresses"
        description={error instanceof Error ? error.message : undefined}
        action={
          <Button size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    )
  }

  if (isEdit && parsedId == null) {
    return (
      <Alert
        type="error"
        showIcon
        message="Invalid address link"
        action={
          <Link to="/account/addresses">
            <Button size="small">Back to addresses</Button>
          </Link>
        }
      />
    )
  }

  if (isEdit && addresses != null && editing == null) {
    return (
      <Alert
        type="info"
        showIcon
        message="Address not found"
        description="It may have been removed."
        action={
          <Link to="/account/addresses">
            <Button size="small">Back to addresses</Button>
          </Link>
        }
      />
    )
  }

  const pageTitle = isEdit ? 'Edit address' : 'Add address'

  return (
    <Card className="account-card account-card--flush" bordered={false}>
      <nav className="account-address-editor__crumb account-breadcrumb" aria-label="Breadcrumb">
        <Link to="/account/addresses" className="account-address-editor__crumb-link">
          Addresses
        </Link>
        <span className="account-address-editor__crumb-sep" aria-hidden>
          /
        </span>
        <span className="account-address-editor__crumb-current">{pageTitle}</span>
      </nav>

      <div className="account-card-head">
        <Title level={4} className="account-card-title">
          {pageTitle}
        </Title>
        <Text type="secondary" className="account-card-sub">
          {isEdit
            ? 'Store details used at checkout — update anytime.'
            : 'Save a shipping or billing address for faster checkout (same record style as profile).'}
        </Text>
      </div>

      {mutationError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={mutationError instanceof Error ? mutationError.message : 'Request failed'}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="account-profile-form"
        onFinish={onFinish}
      >
        <div className="account-two-col">
          <Form.Item label="First name" name="first_name">
            <Input maxLength={150} placeholder="Optional" />
          </Form.Item>
          <Form.Item label="Last name" name="last_name">
            <Input maxLength={150} placeholder="Optional" />
          </Form.Item>
        </div>
        <Form.Item label="Company" name="company">
          <Input maxLength={255} placeholder="Optional" />
        </Form.Item>
        <Form.Item label="Address line 1" name="address1" rules={[{ required: true, message: 'Required' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item label="Address line 2" name="address2">
          <Input maxLength={255} placeholder="Optional" />
        </Form.Item>
        <div className="account-two-col">
          <Form.Item label="City" name="city" rules={[{ required: true, message: 'Required' }]}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item label="ZIP / Postal" name="zip" rules={[{ required: true, message: 'Required' }]}>
            <Input maxLength={32} />
          </Form.Item>
        </div>
        <div className="account-two-col">
          <Form.Item label="Province / State code" name="province_code">
            <Input maxLength={32} placeholder="e.g. CA" />
          </Form.Item>
          <Form.Item
            label="Country"
            name="country_code"
            rules={[{ required: true, message: 'Select a country' }]}
          >
            <Select
              showSearch
              placeholder="Search country or code"
              optionFilterProp="label"
              options={ISO3166_COUNTRY_SELECT_OPTIONS}
              popupMatchSelectWidth={false}
              className="account-country-select"
              popupClassName="account-country-select-dropdown"
              filterOption={(input, option) => {
                const q = input.trim().toLowerCase()
                const label = String(option?.label ?? '').toLowerCase()
                const val = String(option?.value ?? '').toLowerCase()
                return label.includes(q) || val.includes(q)
              }}
            />
          </Form.Item>
        </div>
        <Form.Item label="Phone" name="phone">
          <Input maxLength={32} placeholder="Optional" />
        </Form.Item>
        <Form.Item name="is_default_shipping" valuePropName="checked">
          <Checkbox>Default shipping</Checkbox>
        </Form.Item>
        <Form.Item name="is_default_billing" valuePropName="checked">
          <Checkbox>Default billing</Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <div className="account-address-editor__actions">
            <Link to="/account/addresses">
              <Button htmlType="button" className="account-cta-btn account-cta-btn--outline">
                Cancel
              </Button>
            </Link>
            <Button type="primary" htmlType="submit" loading={submitting} className="account-cta-btn">
              Save address
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  )
}
