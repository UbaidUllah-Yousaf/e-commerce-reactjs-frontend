import raw from './navigation.json'

export type NavMegaLinkItem =
  | {
      label: string
      href: string
    }
  | {
      label: string
      /** Deep-link to storefront collection grid — adjust IDs to match your API. */
      collectionId: number
    }

export type NavMegaSection = {
  heading: string
  items: NavMegaLinkItem[]
}

export type PrimaryNavEntry =
  | {
      type: 'collections'
      id: string
      label: string
    }
  | {
      type: 'mega'
      id: string
      label: string
      sections: NavMegaSection[]
    }
  | {
      type: 'link'
      id: string
      label: string
      href: string
      variant?: 'text' | 'button'
    }

/** Promotional strips above the product grid on the home shop — edit in navigation.json */
export type ListingBannerVariant = 'stripe' | 'promo' | 'minimal'

export interface ListingBanner {
  id: string
  variant: ListingBannerVariant
  headline: string
  subline?: string
  /** Optional link (in-app path or URL). Relative paths use React Router. */
  href?: string
  ctaLabel?: string
}

export interface StoreNavigation {
  announcement: string
  primaryNav: PrimaryNavEntry[]
  /** Optional rows above the PLP grid; omit or use [] to hide */
  listingBanners?: ListingBanner[]
}

export const storeNavigation = raw as StoreNavigation
