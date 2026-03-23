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
  facebook?: string;
  debt: number;
  companyName?: string;
  department?: string;
  taxCode?: string;
  notes?: string;
  totalOrders?: number;
  tags?: string[];
  devices?: Device[];
  createdAt?: string;
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
  importPrice?: number;
  discount?: number;
  discountType?: 'percent' | 'amount';
  subtotal?: number;
  serviceTag?: string;
  cpu?: string;
  ram?: string;
  ssd?: string;
  screen?: string;
  purchaseDate?: string;
  warrantyMonths?: number;
}

export interface Repair {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  serviceTag: string;
  issue: string;
  receivedDate: string;
  returnDate?: string;
  technician?: string;
  status: 'Đang sửa' | 'Đã xong' | 'Đã trả khách' | 'Hủy';
  notes?: string;
  createdAt: string;
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
  logo?: string;
}

export interface Settings {
  currency: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoBackup: boolean;
  invoiceTemplate: string;
}

export interface CSKHSettings {
  milestone1: number; // days
  milestone2: number; // months
  milestone3: number; // months
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  facebook?: string;
  source: string;
  status: 'Mới' | 'Đã liên hệ' | 'Đang thương lượng' | 'Thành công' | 'Thất bại';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareTask {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderDate: string;
  taskDate: string; // ISO string
  type: 'milestone1' | 'milestone2' | 'milestone3';
  status: 'pending' | 'completed';
  description: string;
  completedAt?: string;
}

export interface NotificationSettings {
  zaloAccessToken: string;
  zaloOaId: string;
  smsApiKey: string;
  smsProvider: 'esms' | 'twilio' | 'other';
  autoSendWarranty: boolean;
  daysBeforeExpiry: number;
  messageTemplate: string;
}

export interface WarrantyNotification {
  id: string;
  customerId: string;
  orderId: string;
  serviceTag: string;
  sentAt: string;
  status: 'success' | 'failed';
  type: 'zalo' | 'sms';
  message: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  target: string;
  status: 'Đang chạy' | 'Đã kết thúc' | 'Đã gửi';
  type: 'Gift' | 'Promo';
  sentCount: number;
  clickCount: number;
  createdAt: string;
}

export interface AppData {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  repairs: Repair[];
  leads: Lead[];
  careTasks: CareTask[];
  promotions: Promotion[];
  sales: Sale[];
  warrantyNotifications: WarrantyNotification[];
  shopInfo: ShopInfo;
  settings: Settings;
  cskhSettings?: CSKHSettings;
  notificationSettings?: NotificationSettings;
}
