export type RoleSlug = 'owner' | 'supervisor' | 'cashier'

export interface Role {
  id: number
  name: string
  slug: RoleSlug
}

export interface User {
  id: number
  name: string
  email: string
  role_id: number
  role?: Role
}

export interface Category {
  id: number
  name_en: string
  name_my: string
  slug: string
  description?: string | null
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number
  name: string
  sku: string
  description?: string | null
  price: string
  quantity: number
  min_quantity: number
  image?: string | null
  is_active: boolean
  category?: Category
}

export interface ShopSetting {
  id: number
  shop_name: string
  header_text?: string | null
  logo_path?: string | null
  payment_methods?: string[]
  wallet_providers?: string[]
}

export interface SaleItemPayload {
  product_id: number
  quantity: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
