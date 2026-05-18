import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Drawer,
  Popover,
  Button,
  Space,
  Typography,
  Badge,
  List,
  Avatar,
  Divider,
  Empty,
  InputNumber,
  Skeleton,
  Input,
} from 'antd'
import {
  MenuOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
  UserOutlined,
  HeartOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  LoginOutlined,
} from '@ant-design/icons'
import { Link, createSearchParams, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import { fetchCollections } from '../api/catalog'
import { isCollectionListed } from '../utils/catalog'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import { SHOP_COLLECTIONS_PATH, SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import { storeNavigation } from '../config/navigation'
import type { NavMegaLinkItem, NavMegaSection, PrimaryNavEntry } from '../config/navigation'
import './navbar.css'

const { Text } = Typography

/**
 * Heart vs cart icons have different glyph bounds; offsets are tuned so the red pill
 * sits in the same visual corner for both (antd offset: [horizontal, vertical]).
 */
const NAV_TRAY_BADGE_OFFSET: Record<'wishlist' | 'cart', [number, number]> = {
  wishlist: [2, -10],
  cart: [6, -10],
}

function NavTrayBadge({
  count,
  variant,
  children,
}: {
  count: number
  variant: 'wishlist' | 'cart'
  children: React.ReactNode
}) {
  return (
    <Badge
      className={`site-count-badge nav-tray-badge nav-tray-badge--${variant}`}
      count={count}
      size="small"
      overflowCount={99}
      showZero={false}
      offset={NAV_TRAY_BADGE_OFFSET[variant]}
    >
      <span className="nav-tray-badge__trigger">{children}</span>
    </Badge>
  )
}

function megaNavLinkTo(item: NavMegaLinkItem) {
  if ('collectionId' in item) {
    return {
      pathname: SHOP_PRODUCTS_PATH,
      search: createSearchParams({ collection: String(item.collectionId) }).toString(),
    }
  }
  return item.href
}

const popoverInteract = {
  mouseEnterDelay: 0,
  mouseLeaveDelay: 0.35,
}

function CollectionsDropdownLinks({
  variant = 'mega',
  label = 'Collections',
  onNavigate,
}: {
  variant?: 'mega' | 'compact'
  label?: string
  onNavigate?: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 60 * 1000,
  })
  const list = (data ?? []).filter(isCollectionListed)
  const isCompact = variant === 'compact'

  if (isLoading) {
    return (
      <div className={isCompact ? 'collections-dropdown collections-dropdown--compact' : 'collections-mega'}>
        {isCompact ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : (
          <div style={{ padding: 24 }}>
            <Skeleton.Image active style={{ width: '100%', height: 280 }} />
            <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginTop: 14 }} />
          </div>
        )}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className={isCompact ? 'collections-dropdown collections-dropdown--compact' : 'collections-mega'}>
        <Text type="secondary">No collections yet.</Text>
      </div>
    )
  }

  const collectionHref = (id: number) => ({
    pathname: SHOP_PRODUCTS_PATH,
    search: `?${createSearchParams({ collection: String(id) }).toString()}`,
  })

  if (isCompact) {
    return (
      <div className="collections-dropdown collections-dropdown--compact">
        <Link
          to={SHOP_PRODUCTS_PATH}
          className="collections-dropdown__row collections-dropdown__row--all"
          onClick={onNavigate}
        >
          <span className="collections-dropdown__row-text">Shop all products</span>
        </Link>
        {list.map((c) => (
          <Link
            key={c.id}
            to={collectionHref(c.id)}
            className="collections-dropdown__row"
            onClick={onNavigate}
          >
            <span className="collections-dropdown__thumb-wrap">
              <img
                className="collections-dropdown__thumb"
                src={getSafeImageSrc(c.image)}
                alt=""
                onError={handleImageError}
              />
            </span>
            <span className="collections-dropdown__row-body">
              <span className="collections-dropdown__row-title">{c.title}</span>
              <span className="collections-dropdown__row-meta">{c.products_count} items</span>
            </span>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="collections-mega">
      <div className="collections-mega__header">
        <Link to={SHOP_COLLECTIONS_PATH} className="collections-mega__shop-all" onClick={onNavigate}>
          <span className="collections-mega__shop-all-kicker">{label ?? 'Collections'}</span>
          <span className="collections-mega__shop-all-line">
            <span className="collections-mega__shop-all-icon" aria-hidden>
              <AppstoreOutlined />
            </span>
            Shop everything
          </span>
          <span className="collections-mega__shop-all-hint">
            Browse the full catalog — or jump into an edit below.
          </span>
        </Link>
      </div>
      <div className="collections-mega__scroll">
        <div className="collections-mega__grid">
          {list.map((c) => (
            <Link key={c.id} to={collectionHref(c.id)} className="collections-mega__tile" onClick={onNavigate}>
              <div className="collections-mega__tile-image">
                <img src={getSafeImageSrc(c.image)} alt="" onError={handleImageError} />
                <span className="collections-mega__tile-shade" aria-hidden />
              </div>
              <div className="collections-mega__tile-caption">
                <span className="collections-mega__tile-title">{c.title}</span>
                <span className="collections-mega__tile-count">{c.products_count} products</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function MegaPanel({ sections }: { sections: NavMegaSection[] }) {
  return (
    <div className="mega-menu-dropdown">
      <div className="mega-menu-grid">
        {sections.map((section) => (
          <div key={section.heading} className="mega-menu-column">
            <span className="mega-menu-heading">{section.heading}</span>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {section.items.map((item) => (
                <Link key={`${section.heading}-${item.label}`} to={megaNavLinkTo(item)} className="mega-menu-link">
                  {item.label}
                </Link>
              ))}
            </Space>
          </div>
        ))}
      </div>
      <div className="mega-menu-cta">
        <div>
          <Text strong>Complimentary shipping</Text>
          <br />
          <Text type="secondary">Easy returns on qualifying orders.</Text>
        </div>
        <Link to={SHOP_PRODUCTS_PATH}>
          <Button type="primary">Shop now</Button>
        </Link>
      </div>
    </div>
  )
}

function renderPrimaryNavDesktop(entry: PrimaryNavEntry) {
  switch (entry.type) {
    case 'collections':
      return (
        <span key={entry.id} className="nav-hover-bridge">
          <Popover
            content={<CollectionsDropdownLinks variant="mega" label={entry.label} />}
            trigger="hover"
            placement="bottom"
            overlayClassName="collections-menu-popover"
            zIndex={1200}
            {...popoverInteract}
          >
            <button type="button" className="nav-link-button nav-link-button--collections">
              <AppstoreOutlined style={{ marginRight: 6, fontSize: 14 }} />
              {entry.label}
            </button>
          </Popover>
        </span>
      )
    case 'mega':
      return (
        <span key={entry.id} className="nav-hover-bridge">
          <Popover
            content={<MegaPanel sections={entry.sections} />}
            trigger="hover"
            placement="bottom"
            overlayClassName="mega-menu-popover"
            zIndex={1200}
            {...popoverInteract}
          >
            <button type="button" className="nav-link-button">
              {entry.label}
            </button>
          </Popover>
        </span>
      )
    case 'link':
      return (
        <Link key={entry.id} to={entry.href} className="nav-link">
          {entry.label}
        </Link>
      )
    default:
      return null
  }
}

function renderPrimaryNavDrawer(
  entry: PrimaryNavEntry,
  onNavigate: () => void,
): ReactNode {
  switch (entry.type) {
    case 'collections':
      return (
        <div key={entry.id}>
          <Text className="drawer-category-title">
            <AppstoreOutlined style={{ marginRight: 8 }} />
            {entry.label}
          </Text>
          <div style={{ marginTop: 12 }}>
            <CollectionsDropdownLinks variant="compact" label={entry.label} onNavigate={onNavigate} />
          </div>
        </div>
      )
    case 'mega':
      return (
        <div key={entry.id} className="drawer-category">
          <Text className="drawer-category-title">{entry.label}</Text>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {entry.sections.map((section) => (
              <div key={section.heading}>
                <Text type="secondary" strong>
                  {section.heading}
                </Text>
                <div className="drawer-links">
                  {section.items.map((link) => (
                    <Link key={link.label} to={megaNavLinkTo(link)} className="drawer-link" onClick={onNavigate}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        </div>
      )
    case 'link':
      return (
        <Link key={entry.id} to={entry.href} className="drawer-link" onClick={onNavigate}>
          {entry.label}
        </Link>
      )
    default:
      return null
  }
}

const Navbar = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchPopoverOpen, setSearchPopoverOpen] = useState(false)
  const [navSearchDraft, setNavSearchDraft] = useState('')
  const { state: cartState, dispatch: cartDispatch } = useCart()
  const { state: wishlistState } = useWishlist()

  const cartCount = cartState.items.reduce((sum, item) => sum + item.quantity, 0)
  const wishlistCount = wishlistState.items.length

  const submitNavCatalogSearch = () => {
    const q = navSearchDraft.trim()
    setSearchPopoverOpen(false)
    setDrawerOpen(false)
    setNavSearchDraft('')
    if (q) {
      navigate({ pathname: SHOP_PRODUCTS_PATH, search: createSearchParams({ q }).toString() })
    } else {
      navigate({ pathname: SHOP_PRODUCTS_PATH })
    }
  }

  const navSearchField = (
    <Input.Search
      placeholder="Search products"
      value={navSearchDraft}
      onChange={(e) => setNavSearchDraft(e.target.value)}
      onSearch={() => {
        submitNavCatalogSearch()
      }}
      allowClear
      enterButton={<SearchOutlined aria-hidden />}
    />
  )

  const handleRemoveCart = (id: number) => {
    cartDispatch({ type: 'REMOVE_ITEM', payload: { id } })
  }

  const authHref = user ? '/account' : '/login'
  const AuthIcon = user ? UserOutlined : LoginOutlined

  return (
    <header className="navbar-wrapper">
      <div className="announcement-bar">{storeNavigation.announcement}</div>
      <div className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            Ecommerce
          </Link>
        </div>

        <div className="nav-links">
          {storeNavigation.primaryNav.map((entry) => renderPrimaryNavDesktop(entry))}
        </div>

        <div className="nav-actions">
          <Popover
            open={searchPopoverOpen}
            onOpenChange={(open) => {
              setSearchPopoverOpen(open)
              if (open) setNavSearchDraft('')
            }}
            trigger="click"
            placement="bottomRight"
            overlayClassName="nav-search-popover-wrap"
            zIndex={1200}
            content={<div className="nav-search-popover">{navSearchField}</div>}
          >
            <Button
              type="text"
              icon={<SearchOutlined className="nav-action-icon" />}
              className="action-button"
              aria-label="Search"
              aria-expanded={searchPopoverOpen}
            />
          </Popover>
          <Link to="/wishlist" className="action-button" aria-label="Wishlist">
            <NavTrayBadge count={wishlistCount} variant="wishlist">
              <HeartOutlined className="nav-action-icon" aria-hidden />
            </NavTrayBadge>
          </Link>
          <Button type="text" className="action-button" onClick={() => setCartOpen(true)} aria-label="Cart">
            <NavTrayBadge count={cartCount} variant="cart">
              <ShoppingCartOutlined className="nav-action-icon" aria-hidden />
            </NavTrayBadge>
          </Button>
          <Link to={authHref}>
            <Button
              type="text"
              className="action-button"
              icon={<AuthIcon className="nav-action-icon" />}
              aria-label={user ? 'Account' : 'Sign in'}
            />
          </Link>
        </div>

        <Button
          className="mobile-menu-button"
          type="text"
          icon={<MenuOutlined style={{ fontSize: 22 }} />}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        />
      </div>

      <Drawer
        title="Ecommerce"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{ body: { padding: '1rem' } }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div className="nav-drawer-search">
            {navSearchField}
          </div>
          {storeNavigation.primaryNav.map((entry) =>
            renderPrimaryNavDrawer(entry, () => setDrawerOpen(false)),
          )}
          <Divider style={{ margin: '8px 0' }} />
          <Link to="/account" className="drawer-link" onClick={() => setDrawerOpen(false)} style={{ fontWeight: 600 }}>
            Account
          </Link>
          <Link to="/wishlist" className="drawer-link" onClick={() => setDrawerOpen(false)}>
            Wishlist
            {wishlistCount > 0 ? ` (${wishlistCount})` : ''}
          </Link>
          {!user ? (
            <Link to="/login" className="drawer-link" onClick={() => setDrawerOpen(false)}>
              Sign in
            </Link>
          ) : null}
          <Divider />
          <Link to={SHOP_PRODUCTS_PATH} onClick={() => setDrawerOpen(false)}>
            <Button type="primary" block>
              Continue shopping
            </Button>
          </Link>
        </Space>
      </Drawer>

      <Drawer title={`My Cart (${cartCount})`} placement="right" open={cartOpen} onClose={() => setCartOpen(false)} size={420}>
        {cartState.items.length === 0 ? (
          <Empty description="Your cart is empty" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={cartState.items}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveCart(item.id)} />,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar src={getSafeImageSrc(item.image)} />}
                  title={item.title}
                  description={`$${item.price.toFixed(2)} x ${item.quantity}`}
                />
                <InputNumber
                  min={1}
                  value={item.quantity}
                  onChange={(value) => {
                    if (typeof value === 'number') {
                      cartDispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.id, quantity: value } })
                    }
                  }}
                />
              </List.Item>
            )}
          />
        )}

        {cartState.items.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Total</Text>
                <Text strong>${cartState.total.toFixed(2)}</Text>
              </div>
              <Link to="/checkout">
                <Button type="primary" block>
                  Checkout
                </Button>
              </Link>
            </Space>
          </div>
        )}
      </Drawer>
    </header>
  )
}

export default Navbar
