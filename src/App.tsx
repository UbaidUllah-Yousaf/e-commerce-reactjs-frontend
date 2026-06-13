import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/navbar'
import ProductDetail from './components/ProductDetail'
import Cart from './components/Cart'
import UserProfile from './components/UserProfile'
import Checkout from './components/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import CheckoutCancel from './pages/CheckoutCancel'
import OrderDetail from './components/OrderDetail'
import Footer from './components/Footer'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WishlistPage from './pages/WishlistPage'
import HomeGate from './pages/HomeGate'
import CollectionsPage from './pages/CollectionsPage'
import ProductsPage from './pages/ProductsPage'
import { SHOP_COLLECTIONS_PATH, SHOP_PRODUCTS_PATH } from './constants/storeRoutes'

function App() {
  return (
    <div className="store-root">
      <Navbar />
      <main className="store-main">
        <Routes>
          <Route path="/" element={<HomeGate />} />
          <Route path={SHOP_COLLECTIONS_PATH} element={<CollectionsPage />} />
          <Route path={SHOP_PRODUCTS_PATH} element={<ProductsPage />} />
          {/* Legacy storefront URLs → products PLP */}
          <Route path="/shop" element={<Navigate to={SHOP_PRODUCTS_PATH} replace />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/account/*" element={<UserProfile />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<Navigate to="/account" replace />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
