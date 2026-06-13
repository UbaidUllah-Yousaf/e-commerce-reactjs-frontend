# E-Commerce React Frontend

React + TypeScript storefront built with Vite, Ant Design, and React Router. Connects to a Django REST API for catalog, cart, checkout, orders, and user accounts.

## Features

- Product catalog, collections, and product detail pages
- Shopping cart and wishlist
- User authentication (login / register)
- Checkout with Stripe payment integration
- Order history and account management

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Django ecommerce API running locally or deployed (see [API-INTEGRATIONS.md](./API-INTEGRATIONS.md))

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_ORIGIN` | API base URL for production builds. Leave unset in dev to use the Vite proxy to `http://localhost:8000`. |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |

## API integration

See [API-INTEGRATIONS.md](./API-INTEGRATIONS.md) for endpoints, auth, and Stripe checkout flow.

## Tech stack

- React 19, TypeScript, Vite
- Ant Design, React Query, React Router
- Stripe Checkout (hosted payment page)
