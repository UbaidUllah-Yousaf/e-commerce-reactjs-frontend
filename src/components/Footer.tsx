import { Input, Button } from 'antd'
import { Link } from 'react-router-dom'
import { SHOP_COLLECTIONS_PATH, SHOP_PRODUCTS_PATH } from '../constants/storeRoutes'
import './footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__newsletter">
          <div>
            <p className="site-footer__label">Newsletter</p>
            <h2 className="site-footer__headline">Be first to shop new arrivals</h2>
            <p className="site-footer__hint">Stories, launches, and private offers — sparingly.</p>
          </div>
          <div className="site-footer__signup">
            <Input size="large" placeholder="Email address" className="site-footer__input" aria-label="Email" />
            <Button size="large" type="primary" className="site-footer__subscribe">
              Subscribe
            </Button>
          </div>
        </div>

        <div className="site-footer__grid">
          <div>
            <p className="site-footer__col-title">Shop</p>
            <Link to={SHOP_PRODUCTS_PATH} className="site-footer__link">
              All products
            </Link>
            <Link to={SHOP_COLLECTIONS_PATH} className="site-footer__link">
              Collections
            </Link>
            <Link to="/cart" className="site-footer__link">
              Bag
            </Link>
          </div>
          <div>
            <p className="site-footer__col-title">Customer care</p>
            <Link to="/account" className="site-footer__link">
              My orders
            </Link>
            <span className="site-footer__link site-footer__link--muted">Shipping & returns</span>
            <span className="site-footer__link site-footer__link--muted">Size guide</span>
          </div>
          <div>
            <p className="site-footer__col-title">Brand</p>
            <span className="site-footer__link site-footer__link--muted">Our story</span>
            <span className="site-footer__link site-footer__link--muted">Sustainability</span>
            <span className="site-footer__link site-footer__link--muted">Contact</span>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Atelier Ella. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
