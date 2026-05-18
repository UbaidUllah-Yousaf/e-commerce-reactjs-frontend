import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client'
import type {
  CustomerAddress,
  CustomerAddressRequest,
  CustomerProfile,
  CustomerProfileRequest,
  PatchedCustomerAddressRequest,
  PatchedCustomerProfileRequest,
} from '../types/customer'

function normalizeList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (
    raw &&
    typeof raw === 'object' &&
    'results' in raw &&
    Array.isArray((raw as { results: unknown }).results)
  ) {
    return (raw as { results: T[] }).results
  }
  throw new Error('Unexpected list response')
}

export async function fetchCustomerProfile(): Promise<CustomerProfile> {
  return apiGet<CustomerProfile>('/customers/me/')
}

export async function patchCustomerProfile(
  patch: PatchedCustomerProfileRequest,
): Promise<CustomerProfile> {
  return apiPatch<CustomerProfile>('/customers/me/', patch)
}

export async function putCustomerProfile(body: CustomerProfileRequest): Promise<CustomerProfile> {
  return apiPut<CustomerProfile>('/customers/me/', body)
}

export async function fetchCustomerAddresses(): Promise<CustomerAddress[]> {
  const raw = await apiGet<unknown>('/customers/me/addresses/')
  return normalizeList<CustomerAddress>(raw)
}

export async function createCustomerAddress(body: CustomerAddressRequest): Promise<CustomerAddress> {
  return apiPost<CustomerAddress>('/customers/me/addresses/', body)
}

export async function patchCustomerAddress(
  id: string | number,
  patch: PatchedCustomerAddressRequest,
): Promise<CustomerAddress> {
  const sid = encodeURIComponent(String(id))
  return apiPatch<CustomerAddress>(`/customers/me/addresses/${sid}/`, patch)
}

export async function putCustomerAddress(
  id: string | number,
  body: CustomerAddressRequest,
): Promise<CustomerAddress> {
  const sid = encodeURIComponent(String(id))
  return apiPut<CustomerAddress>(`/customers/me/addresses/${sid}/`, body)
}

export async function deleteCustomerAddress(id: string | number): Promise<void> {
  const sid = encodeURIComponent(String(id))
  return apiDelete(`/customers/me/addresses/${sid}/`)
}
