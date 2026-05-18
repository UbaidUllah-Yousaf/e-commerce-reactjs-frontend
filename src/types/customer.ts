/** OpenAPI: CustomerProfile, CustomerAddress, request bodies. */

export interface CustomerAddress {
  id: number
  first_name?: string
  last_name?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province_code?: string
  country_code: string
  zip: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
  created_at: string
  updated_at: string
}

export interface CustomerAddressRequest {
  first_name?: string
  last_name?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province_code?: string
  country_code: string
  zip: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export type PatchedCustomerAddressRequest = Partial<CustomerAddressRequest>

export interface CustomerProfile {
  id: number
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  note?: string
  accepts_marketing?: boolean
  tax_exempt?: boolean
  /** OpenAPI may advertise `string`; runtime may be JSON array */
  addresses?: unknown
  created_at: string
  updated_at: string
}

export interface CustomerProfileRequest {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  note?: string
  accepts_marketing?: boolean
  tax_exempt?: boolean
}

export type PatchedCustomerProfileRequest = Partial<Omit<CustomerProfileRequest, 'email'>> & {
  email?: string
}
