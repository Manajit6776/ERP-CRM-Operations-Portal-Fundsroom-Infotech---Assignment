import { Request } from 'express';

export type UserRole = 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number?: string | null;
  customer_type: 'Retail' | 'Wholesale' | 'Distributor';
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  follow_up_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerFollowup {
  id: number;
  customer_id: number;
  note: string;
  author_id: number;
  author_name: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  quantity_changed: number;
  movement_type: 'IN' | 'OUT';
  reason: string;
  created_by_user_id: number;
  created_by_user_name: string;
  timestamp: string;
}

export interface ChallanItemInput {
  product_id: number;
  quantity: number;
}

export interface ChallanItemSnapshot {
  id?: number;
  challan_id?: number;
  product_id: number;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
}

export interface Challan {
  id: number;
  challan_number: string;
  customer_id: number;
  customer_name_snapshot: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  total_amount: number;
  notes?: string | null;
  created_by_user_id: number;
  created_at?: string;
  updated_at?: string;
  items?: ChallanItemSnapshot[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  type?: string;
}
