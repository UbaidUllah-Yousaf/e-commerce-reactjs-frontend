import { createContext, useContext, useReducer, ReactNode } from 'react'

interface WishlistItem {
  /** Product id (wishlist uniqueness). */
  id: number
  /** Default variant for “move to cart”. */
  variantId: number
  title: string
  price: number
  image: string
}

interface WishlistState {
  items: WishlistItem[]
}

type WishlistAction =
  | { type: 'TOGGLE_ITEM'; payload: WishlistItem }
  | { type: 'REMOVE_ITEM'; payload: { id: number } }
  | { type: 'CLEAR_WISHLIST' }

const initialState: WishlistState = {
  items: [],
}

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'TOGGLE_ITEM': {
      const exists = state.items.some(item => item.id === action.payload.id)
      const items = exists
        ? state.items.filter(item => item.id !== action.payload.id)
        : [...state.items, action.payload]
      return { items }
    }

    case 'REMOVE_ITEM': {
      return {
        items: state.items.filter(item => item.id !== action.payload.id),
      }
    }

    case 'CLEAR_WISHLIST':
      return initialState

    default:
      return state
  }
}

const WishlistContext = createContext<{
  state: WishlistState
  dispatch: React.Dispatch<WishlistAction>
} | null>(null)

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(wishlistReducer, initialState)
  return (
    <WishlistContext.Provider value={{ state, dispatch }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}
