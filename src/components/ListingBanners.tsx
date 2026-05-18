import { Link } from 'react-router-dom'
import { RightOutlined } from '@ant-design/icons'
import type { ListingBanner } from '../config/navigation'
import './listingBanners.css'

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:')
}

function PromoCta({ banner }: { banner: ListingBanner }) {
  if (!banner.href || !banner.ctaLabel) return null
  const cls = 'ella-listing-banner__btn hero-shop-btn'

  if (isExternalHref(banner.href)) {
    return (
      <a href={banner.href} className={cls}>
        {banner.ctaLabel}
      </a>
    )
  }

  return (
    <Link to={banner.href} className={cls}>
      {banner.ctaLabel}
    </Link>
  )
}

function TextCta({ banner }: { banner: ListingBanner }) {
  if (!banner.href || !banner.ctaLabel) return null
  const cls = 'ella-listing-banner__cta'

  if (isExternalHref(banner.href)) {
    return (
      <a href={banner.href} className={cls}>
        {banner.ctaLabel}
        <RightOutlined className="ella-listing-banner__cta-icon" aria-hidden />
      </a>
    )
  }

  return (
    <Link to={banner.href} className={cls}>
      {banner.ctaLabel}
      <RightOutlined className="ella-listing-banner__cta-icon" aria-hidden />
    </Link>
  )
}

export function ListingBanners({ banners }: { banners: ListingBanner[] }) {
  if (!banners.length) return null

  return (
    <div className="ella-listing-banners" role="region" aria-label="Promotions">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className={`ella-listing-banner ella-listing-banner--${banner.variant}`}
        >
          <div className="ella-listing-banner__body">
            <p className="ella-listing-banner__headline">{banner.headline}</p>
            {banner.subline ? (
              <p className="ella-listing-banner__subline">{banner.subline}</p>
            ) : null}
          </div>
          {banner.variant === 'promo' ? <PromoCta banner={banner} /> : <TextCta banner={banner} />}
        </div>
      ))}
    </div>
  )
}
