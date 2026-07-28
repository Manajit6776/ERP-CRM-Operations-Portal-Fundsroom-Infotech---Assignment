import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().min(8, 'Mobile number must be at least 8 digits'),
  email: z.string().email('Invalid email address format'),
  business_name: z.string().min(2, 'Business name is required'),
  gst_number: z.string().optional().nullable(),
  customer_type: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  status: z.enum(['Lead', 'Active', 'Inactive']),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const customerFollowupSchema = z.object({
  note: z.string().min(3, 'Follow-up note cannot be empty')
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU code is required'),
  category: z.string().min(2, 'Category is required'),
  unit_price: z.number().positive('Unit price must be greater than 0'),
  current_stock: z.number().int().nonnegative('Stock cannot be negative'),
  min_stock_alert: z.number().int().nonnegative('Min stock alert cannot be negative'),
  location: z.string().min(2, 'Warehouse location is required')
});

export const manualStockAdjustmentSchema = z.object({
  quantity_changed: z.number().int().refine((val) => val !== 0, { message: 'Quantity change cannot be 0' }),
  reason: z.string().min(3, 'Adjustment reason is required')
});

export const challanItemSchema = z.object({
  product_id: z.number().int().positive('Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1')
});

export const createChallanSchema = z.object({
  customer_id: z.number().int().positive('Customer is required'),
  notes: z.string().optional().nullable(),
  items: z.array(challanItemSchema).min(1, 'Challan must contain at least one item')
});
