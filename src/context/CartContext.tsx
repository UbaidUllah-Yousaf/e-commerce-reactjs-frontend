import { createContext, useContext, useEffect, useReducer } from 'react'
import type { ReactNode } from 'react'

interface CartItem {
  /** Product variant id (line identity). */
  id: number
  productId: number
  title: string
  price: number
  image: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  total: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }

const initialState: CartState = {
  items: [],
  total: 0,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { quantity: addQtyRaw, ...line } = action.payload
      const addQty = addQtyRaw != null && addQtyRaw > 0 ? addQtyRaw : 1
      const existingItem = state.items.find((item) => item.id === line.id)
      let newItems: CartItem[]

      if (existingItem) {
        newItems = state.items.map((item) =>
          item.id === line.id
            ? { ...item, quantity: item.quantity + addQty }
            : item
        )
      } else {
        newItems = [...state.items, { ...(line as Omit<CartItem, 'quantity'>), quantity: addQty }]
      }

      const total = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { items: newItems, total }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id)
      const total = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { items: newItems, total }
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { id: action.payload.id } })
      }

      const newItems = state.items.map((item) =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      )
      const total = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      return { items: newItems, total }
    }

    case 'CLEAR_CART':
      return initialState

    default:
      return state
  }
}

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
} | null>(null)

const loadInitialState = (): CartState => {
  if (typeof window === 'undefined') {
    return initialState
  }

  try {
    const stored = localStorage.getItem('cartState')
    if (!stored) return initialState

    const parsed = JSON.parse(stored)
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((item: Record<string, unknown>) => ({
          id: Number(item.id),
          productId: Number(item.productId ?? item.id),
          title: String(item.title),
          price: Number(item.price),
          image: String(item.image),
          quantity: Number(item.quantity),
        }))
      : []

    const total = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
    return { items, total }
  } catch {
    return initialState
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, loadInitialState)

  useEffect(() => {
    localStorage.setItem('cartState', JSON.stringify(state))
  }, [state])

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}