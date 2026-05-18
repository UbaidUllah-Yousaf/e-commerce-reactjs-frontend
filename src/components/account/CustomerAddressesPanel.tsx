import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Typography, Button, Spin, Alert, Tag, Popconfirm } from 'antd'
import { deleteCustomerAddress, fetchCustomerAddresses } from '../../api/customer'
import type { CustomerAddress } from '../../types/customer'

const { Title, Text } = Typography

function formatAddressLine(a: CustomerAddress): string {
  const parts = [a.address1, a.address2].filter(Boolean)
  return parts.join(', ')
}

export function CustomerAddressesPanel() {
  const qc = useQueryClient()

  const {
    data: addresses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: fetchCustomerAddresses,
  })

  const invalidateAddresses = () => {
    void qc.invalidateQueries({ queryKey: ['customer-addresses'] })
    void qc.invalidateQueries({ queryKey: ['customer-profile'] })
  }

  const deleteMut = useMutation({
    mutationFn: (id: string | number) => deleteCustomerAddress(id),
    onSuccess: () => invalidateAddresses(),
  })

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
        description={error instanceof Error ? error.message : 'Try again later.'}
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
      <div className="account-card-head account-header">
        <div>
          <Title level={4} className="account-card-title">
            Addresses
          </Title>
          <Text type="secondary" className="account-card-sub">
            Addresses used at checkout and for delivery — add, edit, or remove saved locations.
          </Text>
        </div>
        <Link to="/account/addresses/new">
          <Button type="primary" className="account-cta-btn">
            Add address
          </Button>
        </Link>
      </div>

      {!addresses?.length ? (
        <Text type="secondary">No saved addresses yet.</Text>
      ) : (
        <ul className="account-address-cards" aria-label="Saved addresses">
          {addresses.map((row) => (
            <li key={row.id} className="account-address-card">
              <div className="account-address-card__main">
                <p className="account-address-card__name">
                  {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="account-address-card__line">{formatAddressLine(row)}</p>
                <p className="account-address-card__line account-address-card__line--muted">
                  {row.city}
                  {row.province_code ? `, ${row.province_code}` : ''} {row.zip}
                </p>
                <p className="account-address-card__line account-address-card__country">{row.country_code}</p>
              </div>
              <div className="account-address-card__defaults">
                <p className="account-address-card__defaults-label">Defaults</p>
                <div className="account-address-card__tags">
                  {row.is_default_shipping ? <Tag className="account-address-tag">Shipping</Tag> : null}
                  {row.is_default_billing ? <Tag className="account-address-tag">Billing</Tag> : null}
                  {!row.is_default_shipping && !row.is_default_billing ? (
                    <Text type="secondary" className="account-address-card__dash">
                      —
                    </Text>
                  ) : null}
                </div>
              </div>
              <div className="account-address-card__actions">
                <Link to={`/account/addresses/${row.id}/edit`} className="account-order-link">
                  Edit
                </Link>
                <Popconfirm
                  title="Delete this address?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteMut.mutate(row.id)}
                >
                  <button type="button" className="account-address-card__remove">
                    Remove
                  </button>
                </Popconfirm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
