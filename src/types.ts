export interface Device {
  name: string;
  serial: string;
  purchaseDate: string;
  warrantyEnd: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'ca-nhan' | 'doanh-nghiep';
  phone: string;
  email: string;
  address: string;
  debt: number;
  companyName?: string;
  department?: string;
  taxCode?: string;
  notes?: string;
  totalOrders?: number;
  tags?: string[];
  devices?: Device[];
}

export interface Supplier {
  id: string;
  name: string;
  type?: 'ca-nhan' | 'doanh-nghiep';
  phone: string;
  email: string;
  address: string;
  products: string;
  debt: number;
  supplierCode?: string;
  taxCode?: string;
  legalRepresentative?: string;
  contactPosition?: string;
  bankAccount?: string;
  bankName?: string;
  bankBranch?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  importPrice?: number;
  stock: number;
  minStock: number;
  supplier?: string;
}

export interface Category {
  id: string;
  name: string;
  parent: string | null;
  level?: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount?: number;
  subtotal?: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  products: OrderItem[];
  total: number;
  status: 'Mới' | 'Đang xử lý' | 'Hoàn thành' | 'Đã giao' | 'Hủy';
  paymentMethod: string;
  paymentStatus: 'Công nợ' | 'Đã thanh toán';
  notes?: string;
}

export interface Sale {
  id: string;
  date: string;
  customer: string;
  total: number;
  status: string;
  items: number;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  website: string;
  bankAccount: string;
  bankName: string;
}

export interface Settings {
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoBackup: boolean;
  invoiceTemplate: string;
}

export interface AppData {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  sales: Sale[];
  shopInfo: ShopInfo;
  settings: Settings;
}
