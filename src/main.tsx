import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#232323',
            colorText: '#232323',
            colorTextSecondary: 'rgba(35, 35, 35, 0.58)',
            colorBorder: 'rgba(35, 35, 35, 0.12)',
            borderRadius: 0,
            fontFamily: '"Jost", system-ui, -apple-system, sans-serif',
            boxShadow: 'none',
          },
          components: {
            Button: { borderRadius: 0, fontWeight: 500 },
            Card: { borderRadiusLG: 0 },
            Input: { borderRadius: 0 },
            Tag: { borderRadiusSM: 0 },
          },
        }}
      >
        <AntdApp>
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <App />
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
