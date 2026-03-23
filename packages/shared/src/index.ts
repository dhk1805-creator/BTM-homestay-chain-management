// ============================================
// HCMP Shared Types & Constants
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface DashboardStats {
  totalBuildings: number;
  totalUnits: number;
  totalBookings: number;
  occupancyRate: number;
  revenueThisMonth: number;
  todayCheckins: number;
  todayCheckouts: number;
  openIncidents: number;
  avgRating: number;
}

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
} as const;

export const UNIT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export const STAFF_ROLES = {
  CHAIN_ADMIN: 'CHAIN_ADMIN',
  BUILDING_MANAGER: 'BUILDING_MANAGER',
  STAFF: 'STAFF',
  HOUSEKEEPING: 'HOUSEKEEPING',
} as const;
