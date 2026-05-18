import { Navigate, useSearchParams } from 'react-router-dom'
import { SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import HomePage from './HomePage'

/**
 * Sends old storefront URLs (?collection=) to the products PLP; otherwise shows the editorial home hero.
 */
export default function HomeGate() {
  const [searchParams] = useSearchParams()
  const collection = searchParams.get('collection')
  if (collection != null && collection !== '') {
    const next = new URLSearchParams(searchParams)
    return <Navigate to={{ pathname: SHOP_PRODUCTS_PATH, search: next.toString() }} replace />
  }
  return <HomePage />
}
