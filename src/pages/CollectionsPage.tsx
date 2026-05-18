import { Link } from 'react-router-dom'
import { Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { CollectionsHomeSection } from '../components/CollectionsHomeSection'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import '../components/collectionsPage.css'

const { Text } = Typography

export default function CollectionsPage() {
  return (
    <div className="store-shell collections-page">
      <nav className="collections-page__crumb" aria-label="Breadcrumb">
        <Link to="/" className="collections-page__crumb-link">
          Home
        </Link>
        <span className="collections-page__crumb-sep" aria-hidden>
          /
        </span>
        <span className="collections-page__crumb-current">Collections</span>
      </nav>

      <div className="collections-page__actions">
        <Link to={SHOP_PRODUCTS_PATH} className="collections-page__back-products">
          <ArrowLeftOutlined aria-hidden /> All products
        </Link>
        <Text type="secondary" className="collections-page__hint">
          Pick an edit — you&apos;ll land on the product grid filtered to that collection.
        </Text>
      </div>

      <CollectionsHomeSection />
    </div>
  )
}
