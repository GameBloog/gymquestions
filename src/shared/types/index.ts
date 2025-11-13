export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
