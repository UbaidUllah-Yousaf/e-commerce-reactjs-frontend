import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Typography, Skeleton, Badge } from 'antd'
import { Link, createSearchParams } from 'react-router-dom'
import { ArrowRightOutlined } from '@ant-design/icons'
import { fetchCollections } from '../api/catalog'
import { getSafeImageSrc, handleImageError } from '../utils/image'
import { isCollectionListed } from '../utils/catalog'

import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'

import './collectionsHomeSection.css'

const { Title, Paragraph } = Typography

export function CollectionsHomeSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections,
    staleTime: 60 * 1000,
  })

  const list = (data ?? []).filter(isCollectionListed)

  if (isError) {
    return null
  }

  if (isLoading) {
    return (
      <section id="shop-collections" className="collections-home">
        <Skeleton active title={{ width: 220 }} paragraph={{ rows: 1 }} />
        <Row gutter={[16, 20]} style={{ marginTop: 28 }}>
          {[1, 2, 3, 4].map((key) => (
            <Col key={key} xs={24} sm={12} md={8} lg={6}>
              <Skeleton active avatar={{ shape: 'square', size: 224 }} paragraph={{ rows: 3 }} />
            </Col>
          ))}
        </Row>
      </section>
    )
  }

  if (list.length === 0) {
    return null
  }

  return (
    <section id="shop-collections" className="collections-home">
      <div className="collections-home__intro">
        <p className="collections-home__eyebrow">Shop by mood</p>
        <Title level={2} className="collections-home__title">
          Shop the collections
        </Title>
        <Paragraph type="secondary" className="collections-home__lede">
          Choose an edit — you&apos;ll open the product catalog filtered to that collection.
        </Paragraph>
      </div>

      <Row gutter={[16, 20]}>
        {list.map((c) => (
          <Col key={c.id} xs={24} sm={12} md={8} lg={6}>
            <Link
              to={{
                pathname: SHOP_PRODUCTS_PATH,
                search: `?${createSearchParams({ collection: String(c.id) }).toString()}`,
              }}
              className="collection-home-card-link"
            >
              <Badge.Ribbon text={`${c.products_count} pieces`} color="black">
                <Card
                  hoverable
                  className="collection-home-card"
                  cover={
                    <div className="collection-home-card-cover">
                      <img alt="" src={getSafeImageSrc(c.image)} onError={handleImageError} />
                      <span className="collection-home-card-shade" />
                    </div>
                  }
                >
                  <Title level={4} className="collection-home-card__heading">
                    {c.title}
                  </Title>
                  <Paragraph type="secondary" ellipsis={{ rows: 2 }} className="collection-home-card__desc">
                    {c.description || 'Discover the edit.'}
                  </Paragraph>
                  <div className="collection-home-cta">
                    View collection <ArrowRightOutlined style={{ marginInlineStart: 6 }} />
                  </div>
                </Card>
              </Badge.Ribbon>
            </Link>
          </Col>
        ))}
      </Row>
    </section>
  )
}
