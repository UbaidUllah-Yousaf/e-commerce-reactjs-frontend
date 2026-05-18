import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  App as AntdApp,
  Breadcrumb,
  Card,
  Button,
  Form,
  Input,
  Select,
  Divider,
  Typography,
  Row,
  Col,
  Checkbox,
  Radio,
  Tooltip,
  AutoComplete,
  Spin,
  Alert,
  Space,
} from 'antd'
import { HomeOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import { parseMoney } from '../utils/catalog'
import { lineupSubtotalCheckout, formatTotalsHint } from '../utils/commerce'
import type { ProductVariant } from '../types/catalog'
import {
  createCheckout,
  createCheckoutLineItem,
  fetchCheckout,
  patchCheckout,
  completeCheckout,
  applyDiscountCheckout,
  removeDiscountCheckout,
  applyGiftCardCheckout,
  removeGiftCardCheckout,
} from '../api/checkout'
import { fetchOrders } from '../api/orders'
import { fetchCustomerProfile, fetchCustomerAddresses } from '../api/customer'
import type { CustomerAddress } from '../types/customer'
import './checkout.css'

const CK_ID = 'storefront_ck_id'
const CK_FP = 'storefront_ck_fp'

const { Title, Text } = Typography
const { Option } = Select

const cityOptions = [
  { value: 'Karachi' },
  { value: 'Lahore' },
  { value: 'Islamabad' },
  { value: 'Rawalpindi' },
  { value: 'Faisalabad' },
  { value: 'Multan' },
  { value: 'Peshawar' },
  { value: 'Quetta' },
  { value: 'Sialkot' },
  { value: 'Gujranwala' },
  { value: 'Hyderabad' },
  { value: 'Sukkur' },
]

/** Product name for summary row — prefer cart label, then API product_title, never variant-only title first. */
function checkoutLineProductTitle(
  item: { product_title?: string; variant_detail: ProductVariant },
  cartLine: { title: string } | undefined,
): string {
  const fromApi = item.product_title?.trim()
  if (fromApi) return fromApi
  const fromCart = cartLine?.title?.trim()
  if (fromCart) return fromCart
  return item.variant_detail.product_title?.trim() || ''
}

/** Second line: options, or variant title only when distinct from product title. */
function checkoutLineVariantCaption(v: ProductVariant | undefined, productTitle: string): string {
  if (!v) return ''
  const parts = (v.option_values?.map((ov) => ov.value?.trim()).filter(Boolean) as string[]) ?? []
  const fromOpts = parts.length ? parts.join(' / ') : ''
  if (fromOpts) {
    if (!productTitle || fromOpts.toLowerCase() !== productTitle.toLowerCase()) return fromOpts
    return ''
  }
  const t = v.title?.trim() ?? ''
  if (!t) return ''
  if (productTitle && t.toLowerCase() === productTitle.toLowerCase()) return ''
  return t
}

function formatDisplayMoney(amount: number, currency: string) {
  const c = (currency || 'PKR').toUpperCase()
  if (c === 'PKR') return `Rs ${Math.round(amount).toLocaleString()}`
  return `${c} ${amount.toFixed(2)}`
}

type AddressForm = {
  email: string
  firstName: string
  lastName: string
  address: string
  city: string
  postalCode?: string
  phone?: string
  country: string
}

function buildAddress(v: AddressForm): Record<string, unknown> {
  return {
    first_name: v.firstName,
    last_name: v.lastName,
    address1: v.address,
    city: v.city,
    zip: v.postalCode ?? '',
    country: v.country,
    phone: v.phone ?? '',
  }
}

function mapCountryCodeToFormCountry(code?: string | null): string {
  const c = (code ?? 'PK').toUpperCase()
  if (c === 'PK') return 'Pakistan'
  return 'Pakistan'
}

function pickDefaultCustomerAddress(addresses: CustomerAddress[] | undefined): CustomerAddress | undefined {
  if (!addresses?.length) return undefined
  const def = addresses.find((a) => a.is_default_shipping)
  return def ?? addresses[0]
}

const PaymentLogo = ({
  src,
  alt,
  label,
}: {
  src?: string
  alt?: string
  label?: string
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 8px',
      minWidth: 56,
      minHeight: 28,
      background: 'transparent',
    }}
  >
    {src ? (
      <img
        src={src}
        alt={alt}
        style={{
          width: 'auto',
          height: 24,
          objectFit: 'contain',
        }}
      />
    ) : (
      <span style={{ color: '#111827', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
        {label}
      </span>
    )}
  </div>
)

const visaLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 45'%3E%3Crect width='90' height='45' rx='8' fill='%23005EA5'/%3E%3Ctext x='45' y='30' fill='%23fff' font-family='Arial, sans-serif' font-size='20' font-weight='700' text-anchor='middle'%3EVISA%3C/text%3E%3C/svg%3E"
const mastercardLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 45'%3E%3Crect width='90' height='45' rx='8' fill='%23fff'/%3E%3Ccircle cx='36' cy='22.5' r='14' fill='%23EA001B'/%3E%3Ccircle cx='54' cy='22.5' r='14' fill='%23F79E1B' opacity='0.95'/%3E%3C/svg%3E"

const Checkout = () => {
  const { message } = AntdApp.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const checkoutPrefillPk = useRef<number | null>(null)
  const [form] = Form.useForm<AddressForm & { marketingOptIn?: boolean; saveInfo?: boolean }>()
  const [discountCode, setDiscountCode] = useState('')
  const [giftCode, setGiftCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [billingSame, setBillingSame] = useState(true)
  const [checkoutId, setCheckoutId] = useState<number | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [booting, setBooting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const cartFingerprint = useMemo(
    () =>
      [...cartState.items]
        .map((i) => `${i.id}:${i.quantity}`)
        .sort()
        .join('|'),
    [cartState.items],
  )

  const cartByVariant = useMemo(
    () => new Map(cartState.items.map((i) => [i.id, i] as const)),
    [cartState.items],
  )

  useEffect(() => {
    if (cartState.items.length === 0) {
      setCheckoutId(null)
      setBootError(null)
      setBooting(false)
      return
    }

    let cancelled = false

    async function bootstrap() {
      setBooting(true)
      setBootError(null)
      try {
        const storedFp = sessionStorage.getItem(CK_FP)
        const storedId = sessionStorage.getItem(CK_ID)
        if (storedFp === cartFingerprint && storedId) {
          const id = Number.parseInt(storedId, 10)
          if (Number.isFinite(id)) {
            try {
              const existing = await fetchCheckout(id)
              if (existing.status === 'open' && !cancelled) {
                setCheckoutId(id)
                setBooting(false)
                return
              }
            } catch {
              sessionStorage.removeItem(CK_ID)
              sessionStorage.removeItem(CK_FP)
            }
          }
        }

        const ck = await createCheckout({ currency: 'PKR' })
        for (const item of cartState.items) {
          await createCheckoutLineItem({
            checkout: ck.id,
            variant: item.id,
            quantity: item.quantity,
          })
        }
        sessionStorage.setItem(CK_FP, cartFingerprint)
        sessionStorage.setItem(CK_ID, String(ck.id))
        if (!cancelled) {
          setCheckoutId(ck.id)
        }
      } catch (e) {
        if (!cancelled) {
          setBootError(e instanceof Error ? e.message : 'Checkout could not be created.')
        }
      } finally {
        if (!cancelled) {
          setBooting(false)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [cartFingerprint])

  const {
    data: checkout,
    isLoading: checkoutLoading,
    error: checkoutQueryError,
  } = useQuery({
    queryKey: ['checkout', checkoutId],
    queryFn: () => fetchCheckout(checkoutId!),
    enabled: checkoutId != null,
  })

  const customerEnabled = Boolean(isAuthenticated && user && !authLoading)

  const customerProfileQuery = useQuery({
    queryKey: ['customer', 'me', user?.pk],
    queryFn: fetchCustomerProfile,
    enabled: customerEnabled,
    staleTime: 60 * 1000,
  })

  const customerAddressesQuery = useQuery({
    queryKey: ['customer', 'addresses', user?.pk],
    queryFn: fetchCustomerAddresses,
    enabled: customerEnabled,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      checkoutPrefillPk.current = null
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (checkout == null || checkoutId == null) return
    if (!isAuthenticated || !user || authLoading) return
    if (!customerProfileQuery.isFetched || !customerAddressesQuery.isFetched) return
    if (checkoutPrefillPk.current === user.pk) return

    const profile = customerProfileQuery.data
    const addressList = customerAddressesQuery.data
    const addr = pickDefaultCustomerAddress(addressList)

    form.setFieldsValue({
      email: profile?.email?.trim() || user.email?.trim() || '',
      firstName:
        (addr?.first_name?.trim() ||
          profile?.first_name?.trim() ||
          user.first_name?.trim() ||
          '') as string,
      lastName:
        (addr?.last_name?.trim() ||
          profile?.last_name?.trim() ||
          user.last_name?.trim() ||
          '') as string,
      address: addr?.address1?.trim() || '',
      city: addr?.city?.trim() || '',
      postalCode: addr?.zip?.trim() || '',
      phone: (profile?.phone?.trim() || addr?.phone?.trim() || '') as string,
      country: mapCountryCodeToFormCountry(addr?.country_code),
      marketingOptIn: Boolean(profile?.accepts_marketing),
    })

    checkoutPrefillPk.current = user.pk
  }, [
    checkout,
    checkoutId,
    isAuthenticated,
    user,
    authLoading,
    customerProfileQuery.isFetched,
    customerProfileQuery.data,
    customerAddressesQuery.isFetched,
    customerAddressesQuery.data,
    form,
  ])

  const currency = checkout?.currency?.toUpperCase() || 'PKR'
  const serverLines = checkout?.line_items?.length ? checkout.line_items : null
  const subtotalServer = checkout ? lineupSubtotalCheckout(checkout) : 0
  const subtotalLocal = cartState.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const subtotal = serverLines ? subtotalServer : subtotalLocal

  const shipping = parseMoney(checkout?.shipping_total) || (subtotal > 0 ? 250 : 0)
  const tax = parseMoney(checkout?.tax_total)
  const discount = parseMoney(checkout?.discount_amount)
  const giftSum =
    checkout?.gift_card_applications?.reduce((s, g) => s + parseMoney(g.amount_applied), 0) ?? 0
  const grandFromParts = Math.max(0, subtotal + shipping + tax - discount - giftSum)
  const totalsHint = formatTotalsHint(checkout?.totals)

  const handleApplyDiscount = async () => {
    if (checkoutId == null) return
    const code = discountCode.trim()
    if (!code) {
      message.warning('Enter a discount code')
      return
    }
    try {
      await applyDiscountCheckout(checkoutId, code)
      await queryClient.invalidateQueries({ queryKey: ['checkout', checkoutId] })
      message.success('Discount applied')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Discount could not be applied')
    }
  }

  const handleRemoveDiscount = async () => {
    if (checkoutId == null) return
    try {
      await removeDiscountCheckout(checkoutId)
      await queryClient.invalidateQueries({ queryKey: ['checkout', checkoutId] })
      message.success('Discount removed')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not remove discount')
    }
  }

  const handleApplyGift = async () => {
    if (checkoutId == null) return
    const code = giftCode.trim()
    if (!code) {
      message.warning('Enter a gift card code')
      return
    }
    try {
      await applyGiftCardCheckout(checkoutId, code)
      await queryClient.invalidateQueries({ queryKey: ['checkout', checkoutId] })
      message.success('Gift card applied')
      setGiftCode('')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Gift card could not be applied')
    }
  }

  const handleRemoveGiftCards = async () => {
    if (checkoutId == null) return
    try {
      await removeGiftCardCheckout(checkoutId)
      await queryClient.invalidateQueries({ queryKey: ['checkout', checkoutId] })
      message.success('Gift card removed')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not remove gift card')
    }
  }

  const handleSubmit = async () => {
    if (checkoutId == null || !checkout) {
      message.error('Checkout is not ready yet.')
      return
    }
    try {
      const values = await form.validateFields()
      const ship = buildAddress(values)
      const finalizePayload = {
        email: values.email,
        phone: values.phone,
        billing_same_as_shipping: billingSame,
        shipping_address: ship,
        billing_address: ship,
        currency: 'PKR',
        shipping_total: '250.00',
        tax_total: checkout.tax_total ?? '0.00',
      }
      setSubmitting(true)
      await patchCheckout(checkoutId, finalizePayload)
      await completeCheckout(checkoutId, finalizePayload)
      sessionStorage.removeItem(CK_ID)
      sessionStorage.removeItem(CK_FP)
      cartDispatch({ type: 'CLEAR_CART' })
      message.success('Order placed successfully!')
      try {
        const orders = await fetchOrders()
        const match = orders.find((o) => o.checkout === checkoutId)
        if (match) {
          navigate(`/orders/${match.id}`)
          return
        }
      } catch {
        /* ignore */
      }
      navigate('/account?ordered=1')
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) {
        message.error('Please complete all required fields before continuing.')
      } else {
        message.error(e instanceof Error ? e.message : 'Payment could not be completed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (cartState.items.length === 0) {
    return (
      <div className="shopify-checkout-empty">
        <Title level={2}>Your cart is empty</Title>
        <Button
          type="primary"
          onClick={() => navigate('/')}
          className="shopify-checkout-primary-btn"
        >
          Continue Shopping
        </Button>
      </div>
    )
  }

  if (bootError) {
    return (
      <div className="shopify-checkout-page" style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Checkout unavailable"
          description={bootError}
        />
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/cart')}>
          Back to cart
        </Button>
      </div>
    )
  }

  if (booting || checkoutId == null || checkoutLoading || !checkout) {
    return (
      <div className="shopify-checkout-page" style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Preparing checkout…</Text>
        </div>
      </div>
    )
  }

  if (checkoutQueryError) {
    return (
      <div className="shopify-checkout-page" style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Could not load checkout"
          description={
            checkoutQueryError instanceof Error
              ? checkoutQueryError.message
              : String(checkoutQueryError)
          }
        />
      </div>
    )
  }

  return (
    <div className="shopify-checkout-page">
      <div className="shopify-checkout-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <Breadcrumb separator="/" style={{ marginBottom: 12 }}>
              <Breadcrumb.Item>
                <Link to="/" style={{ color: '#111827' }}>
                  Home
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>Checkout</Breadcrumb.Item>
            </Breadcrumb>
            <Title level={2} style={{ margin: 0 }}>
              Express checkout
            </Title>
          </div>
          <Button
            type="default"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            className="shopify-checkout-back-btn"
          >
            Back to store
          </Button>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={14}>
            <Card className="shopify-checkout-main-card">
              <div style={{ padding: '24px', background: '#fff' }}>
                <div className="shopify-checkout-note">
                  <Text strong>Free shipping on all paid orders in Pakistan</Text>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    gap: 12,
                  }}
                >
                  <Title level={4} style={{ margin: 0 }}>
                    Contact
                  </Title>
                  {isAuthenticated ? (
                    <Link to="/account" style={{ color: '#2563eb', fontWeight: 600 }}>
                      Account
                    </Link>
                  ) : (
                    <Link to="/login" state={{ from: { pathname: '/checkout' } }} style={{ color: '#2563eb', fontWeight: 600 }}>
                      Sign in
                    </Link>
                  )}
                </div>

                <Form form={form} layout="vertical" requiredMark={false}>
                  <Form.Item
                    name="email"
                    rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input size="large" placeholder="Email" style={{ borderRadius: 14, height: 48 }} />
                  </Form.Item>
                  <Form.Item name="marketingOptIn" valuePropName="checked" style={{ marginBottom: 16 }}>
                    <Checkbox style={{ fontWeight: 500 }}>Email me with news and offers</Checkbox>
                  </Form.Item>

                  <Title level={4} style={{ marginBottom: 16 }}>
                    Delivery
                  </Title>

                  <Form.Item name="country" initialValue="Pakistan" style={{ marginBottom: 16 }}>
                    <Select size="large" style={{ borderRadius: 14, height: 48 }}>
                      <Option value="Pakistan">Pakistan</Option>
                    </Select>
                  </Form.Item>

                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="firstName"
                        rules={[{ required: true, message: 'First name is required' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input size="large" placeholder="First name" style={{ borderRadius: 14, height: 48 }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="lastName"
                        rules={[{ required: true, message: 'Last name is required' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input size="large" placeholder="Last name" style={{ borderRadius: 14, height: 48 }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="address"
                    rules={[{ required: true, message: 'Address is required' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input size="large" placeholder="Address" style={{ borderRadius: 14, height: 48 }} />
                  </Form.Item>

                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="city"
                        rules={[{ required: true, message: 'Select your city' }]}
                        style={{ marginBottom: 16 }}
                      >
                        <AutoComplete
                          options={cityOptions}
                          placeholder="Select city"
                          size="large"
                          style={{
                            height: 48,
                            borderRadius: 14,
                          }}
                          filterOption={(inputValue, option) =>
                            option!.value.toUpperCase().includes(inputValue.toUpperCase())
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="postalCode" style={{ marginBottom: 0 }}>
                        <Input
                          size="large"
                          placeholder="Postal code (optional)"
                          style={{ borderRadius: 14, height: 48 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="phone" style={{ marginBottom: 16 }}>
                    <Input size="large" placeholder="Phone" style={{ borderRadius: 14, height: 48 }} />
                  </Form.Item>

                  <Form.Item name="saveInfo" valuePropName="checked" style={{ marginBottom: 16 }}>
                    <Checkbox>Save this information for next time</Checkbox>
                  </Form.Item>

                  <Title level={4} style={{ marginBottom: 16 }}>
                    Shipping method
                  </Title>
                  <Card
                    size="small"
                    bordered
                    styles={{ body: { padding: 0 } }}
                    style={{
                      borderRadius: 14,
                      borderColor: '#d9d9d9',
                      marginBottom: 32,
                      background: '#fff',
                      height: 48,
                      width: '100%',
                      boxShadow: 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0 16px',
                        height: '100%',
                      }}
                    >
                      <Text strong style={{ fontSize: 15, lineHeight: '48px' }}>
                        COURIER SERVICES
                      </Text>
                      <Text strong style={{ lineHeight: '48px' }}>
                        Rs 250.00
                      </Text>
                    </div>
                  </Card>

                  <Title level={4} style={{ marginBottom: 16 }}>
                    Payment
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Toggle a payment option to view the gateway details.
                  </Text>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    All transactions are secure and encrypted.
                  </Text>

                  <Form.Item name="paymentMethod">
                    <Radio.Group
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <div style={{ display: 'grid' }}>
                        {[
                          {
                            value: 'cod',
                            label: 'Cash on Delivery (COD)',
                            note: 'Pay when your order arrives at your door.',
                            logos: [] as string[],
                          },
                          {
                            value: 'card',
                            label: 'Debit - Credit Card',
                            note: 'Secure card payments via Visa and Mastercard.',
                            logos: ['Visa', 'Mastercard'],
                          },
                        ].map((option) => {
                          const selected = paymentMethod === option.value
                          return (
                            <div
                              key={option.value}
                              onClick={() => setPaymentMethod(option.value)}
                              style={{
                                border: `1px solid ${selected ? '#2563eb' : '#e5e7eb'}`,
                                background: selected ? '#eff6ff' : '#fff',
                                padding: 14,
                                cursor: 'pointer',
                                transition: 'background 0.2s, border-color 0.2s',
                                minHeight: 56,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Radio value={option.value} style={{ marginRight: 8 }}>
                                  {option.label}
                                </Radio>
                                {option.logos.length > 0 && (
                                  <div>
                                    {option.logos.map((logo) => (
                                      <PaymentLogo
                                        key={logo}
                                        src={
                                          logo === 'Visa'
                                            ? visaLogo
                                            : logo === 'Mastercard'
                                              ? mastercardLogo
                                              : undefined
                                        }
                                        alt={`${logo} logo`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              {selected ? (
                                <Text type="secondary" style={{ fontSize: 13, marginTop: 12, display: 'block' }}>
                                  {option.note}
                                </Text>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </Radio.Group>
                  </Form.Item>

                  <Title level={4} style={{ marginBottom: 16 }}>
                    Billing address
                  </Title>
                  <Form.Item name="billingAddress">
                    <Radio.Group
                      value={billingSame ? 'same' : 'different'}
                      onChange={(e) => setBillingSame(e.target.value === 'same')}
                      style={{ width: '100%' }}
                    >
                      <div style={{ display: 'grid', gap: 0 }}>
                        <Card
                          size="small"
                          style={{ borderRadius: 0, borderColor: billingSame ? '#2563eb' : '#e5e7eb' }}
                        >
                          <Radio value="same">Same as shipping address</Radio>
                        </Card>
                        <Card
                          size="small"
                          style={{ borderRadius: 0, borderColor: billingSame ? '#e5e7eb' : '#2563eb' }}
                        >
                          <Radio value="different">Use a different billing address</Radio>
                        </Card>
                      </div>
                    </Radio.Group>
                  </Form.Item>

                  <Button
                    type="primary"
                    size="large"
                    className="shopify-checkout-primary-btn shopify-checkout-pay-btn"
                    loading={submitting}
                    onClick={() => void handleSubmit()}
                  >
                    Pay now
                  </Button>
                </Form>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={10}>
            <Card className="shopify-checkout-summary-card">
              <div style={{ padding: 24 }}>
                {serverLines?.map((item) => {
                  const vd = item.variant_detail
                  const cartLine = cartByVariant.get(item.variant)
                  const productTitle = checkoutLineProductTitle(item, cartLine)
                  const displayTitle =
                    productTitle || vd?.title?.trim() || cartLine?.title?.trim() || `Variant ${item.variant}`
                  const caption = checkoutLineVariantCaption(vd, displayTitle)
                  const img = vd?.image || cartLine?.image
                  const lineTotal = parseMoney(item.unit_price) * item.quantity
                  return (
                    <div
                      key={item.id}
                      style={{ display: 'flex', gap: 14, marginBottom: 22, position: 'relative' }}
                    >
                      <div style={{ position: 'relative', minWidth: 80, height: 80 }}>
                        <img
                          src={getSafeImageSrc(img)}
                          alt={displayTitle}
                          onError={handleImageError}
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 18,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#111827',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {item.quantity}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                          {displayTitle}
                        </Text>
                        {caption ? (
                          <Text type="secondary">{caption}</Text>
                        ) : null}
                      </div>
                      <Text strong style={{ whiteSpace: 'nowrap' }}>
                        {formatDisplayMoney(lineTotal, currency)}
                      </Text>
                    </div>
                  )
                })}

                {!serverLines
                  ? cartState.items.map((item) => (
                      <div
                        key={item.id}
                        style={{ display: 'flex', gap: 14, marginBottom: 22, position: 'relative' }}
                      >
                        <div style={{ position: 'relative', minWidth: 80, height: 80 }}>
                          <img
                            src={getSafeImageSrc(item.image)}
                            alt={item.title}
                            onError={handleImageError}
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 18,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#111827',
                              color: '#fff',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {item.quantity}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>
                            {item.title}
                          </Text>
                        </div>
                        <Text strong style={{ whiteSpace: 'nowrap' }}>
                          {formatDisplayMoney(item.price * item.quantity, currency)}
                        </Text>
                      </div>
                    ))
                  : null}

                <Divider />
                <div style={{ display: 'grid', gap: 16 }}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Discount code"
                      size="large"
                      style={{ borderRadius: '14px 0 0 14px', height: 48 }}
                    />
                    <Button size="large" onClick={() => void handleApplyDiscount()} style={{ height: 48 }}>
                      Apply
                    </Button>
                  </Space.Compact>
                  {(checkout.discount_code_string || checkout.discount_code != null) && discount > 0 ? (
                    <Space>
                      <Text type="success">
                        Code{' '}
                        {checkout.discount_code_string ??
                          (checkout.discount_code != null ? String(checkout.discount_code) : '')}
                      </Text>
                      <Button type="link" size="small" onClick={() => void handleRemoveDiscount()}>
                        Remove
                      </Button>
                    </Space>
                  ) : null}

                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value)}
                      placeholder="Gift card"
                      size="large"
                      style={{ borderRadius: '14px 0 0 14px', height: 48 }}
                    />
                    <Button size="large" onClick={() => void handleApplyGift()} style={{ height: 48 }}>
                      Apply
                    </Button>
                  </Space.Compact>
                  {(checkout.gift_card_applications?.length ?? 0) > 0 ? (
                    <Space>
                      <Text type="secondary">Gift cards applied</Text>
                      <Button type="link" size="small" onClick={() => void handleRemoveGiftCards()}>
                        Remove
                      </Button>
                    </Space>
                  ) : null}

                  <Divider style={{ margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Subtotal</Text>
                    <Text>{formatDisplayMoney(subtotal, currency)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Text>Shipping</Text>
                      <Tooltip title="Shipping cost is calculated at checkout.">
                        <QuestionCircleOutlined style={{ color: '#64748b' }} />
                      </Tooltip>
                    </div>
                    <Text>{formatDisplayMoney(shipping, currency)}</Text>
                  </div>
                  {tax > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Tax</Text>
                      <Text>{formatDisplayMoney(tax, currency)}</Text>
                    </div>
                  ) : null}
                  {discount > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Discount</Text>
                      <Text type="success">−{formatDisplayMoney(discount, currency)}</Text>
                    </div>
                  ) : null}
                  {giftSum > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Gift card</Text>
                      <Text type="success">−{formatDisplayMoney(giftSum, currency)}</Text>
                    </div>
                  ) : null}
                  <Divider style={{ margin: '0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                    <div>
                      <Text strong style={{ fontSize: 18 }}>
                        Total
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 14 }}>
                          {currency}
                        </Text>
                      </div>
                    </div>
                    <Title level={4} style={{ margin: 0 }}>
                      {formatDisplayMoney(grandFromParts, currency)}
                    </Title>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Checkout
