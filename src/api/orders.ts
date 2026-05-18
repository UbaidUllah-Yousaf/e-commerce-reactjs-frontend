import { apiGet } from './client'
import type { Order } from '../types/commerce'
import { normalizePaginated } from '../utils/commerce'

export async function fetchOrders(): Promise<Order[]> {
  const raw = await apiGet<unknown>('/orders/')
  return normalizePaginated<Order>(raw)
}

export async function fetchOrder(id: number): Promise<Order> {
  return apiGet<Order>(`/orders/${id}/`)
}
