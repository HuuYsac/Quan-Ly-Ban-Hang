import { AppData } from '../types';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

export const initialData: AppData = {
  customers: [
    { 
      id: 'KH001', name: 'Nguyễn Văn A', type: 'ca-nhan', phone: '0901234567', email: 'nva@gmail.com', address: 'Hà Nội', debt: 0,
      tags: ['MacBook', 'Đồ họa', 'VIP'],
      devices: [
        { name: 'MacBook Pro M3 Max 16"', serial: 'C02X8Y9Z1A', purchaseDate: '2025-01-15', warrantyEnd: '2026-01-15' }
      ]
    },
    { 
      id: 'KH002', name: 'Trần Thị B', type: 'ca-nhan', phone: '0912345678', email: 'ttb@gmail.com', address: 'TP.HCM', debt: 500000,
      tags: ['Sinh viên', 'Văn phòng'],
      devices: [
        { name: 'Dell Inspiron 15 3530', serial: 'DL-98765432', purchaseDate: '2024-08-20', warrantyEnd: '2025-08-20' }
      ]
    },
    { 
      id: 'KH003', name: 'Lê Minh C', type: 'doanh-nghiep', companyName: 'Công ty TNHH Minh Châu', department: 'Phòng IT', phone: '0923456789', email: 'lmc@minhchau.com.vn', address: 'Đà Nẵng', taxCode: '0123456789', debt: 0,
      tags: ['Doanh nghiệp', 'PC Đồng bộ'],
      devices: [
        { name: 'PC HP OptiPlex 7010 (x5)', serial: 'HP-MULTI-001', purchaseDate: '2023-11-05', warrantyEnd: '2026-11-05' },
        { name: 'MacBook Air M2', serial: 'C02A1B2C3D', purchaseDate: '2024-02-10', warrantyEnd: '2025-02-10' }
      ]
    },
    { 
      id: 'KH004', name: 'Phạm Thu D', type: 'doanh-nghiep', companyName: 'Công ty Cổ phần Thu Đức', department: 'Phòng kế toán', phone: '0934567890', email: 'ptd@thuduc.vn', address: 'Cần Thơ', taxCode: '0987654321', debt: 300000,
      tags: ['Kế toán'],
      devices: []
    },
    { 
      id: 'KH005', name: 'Hoàng Văn E', type: 'ca-nhan', phone: '0945678901', email: 'hve@gmail.com', address: 'Hải Phòng', debt: 0,
      tags: ['Gamer', 'PC Custom'],
      devices: [
        { name: 'PC Build Core i5 13400F / RTX 4060', serial: 'CUSTOM-2024-089', purchaseDate: '2024-05-12', warrantyEnd: '2027-05-12' }
      ]
    }
  ],
  suppliers: [
    { id: 'NCC001', name: 'Công ty TNHH ABC', phone: '024-3456-7890', email: 'abc@company.vn', address: 'Hà Nội', products: 'Điện tử', debt: 15000000 },
    { id: 'NCC002', name: 'Công ty XYZ', phone: '028-3456-7891', email: 'xyz@company.vn', address: 'TP.HCM', products: 'Gia dụng', debt: 0 },
    { id: 'NCC003', name: 'Công ty DEF', phone: '0236-3456-792', email: 'def@company.vn', address: 'Đà Nẵng', products: 'Thời trang', debt: 5000000 }
  ],
  products: [
    { id: 'SP001', name: 'iPhone 15 Pro', category: 'Điện thoại', price: 28900000, importPrice: 25000000, stock: 5, minStock: 10, supplier: 'NCC001' },
    { id: 'SP002', name: 'Samsung Galaxy S24', category: 'Điện thoại', price: 24900000, importPrice: 22000000, stock: 100, minStock: 15, supplier: 'NCC001' },
    { id: 'SP003', name: 'MacBook Air M2', category: 'Laptop', price: 28900000, importPrice: 26000000, stock: 15, minStock: 5, supplier: 'NCC001' },
    { id: 'SP004', name: 'iPad Pro 11 inch', category: 'Tablet', price: 19900000, importPrice: 18000000, stock: 8, minStock: 12, supplier: 'NCC001' },
    { id: 'SP005', name: 'AirPods Pro', category: 'Phụ kiện', price: 6490000, importPrice: 5500000, stock: 25, minStock: 20, supplier: 'NCC001' },
    { id: 'SP006', name: 'Quả bóng đá FIFA', category: 'Sản phẩm > Bóng đá', price: 500000, importPrice: 350000, stock: 50, minStock: 30, supplier: 'NCC002' },
    { id: 'SP007', name: 'Vợt Pickle Ball Pro', category: 'Sản phẩm > Pickle Ball', price: 800000, importPrice: 650000, stock: 30, minStock: 10, supplier: 'NCC002' }
  ],
  categories: [
    { id: 'CAT001', name: 'Sản phẩm', parent: null },
    { id: 'CAT002', name: 'Bóng đá', parent: 'CAT001' },
    { id: 'CAT003', name: 'Pickle Ball', parent: 'CAT001' },
    { id: 'CAT004', name: 'Điện thoại', parent: null },
    { id: 'CAT005', name: 'Laptop', parent: null },
    { id: 'CAT006', name: 'Tablet', parent: null },
    { id: 'CAT007', name: 'Phụ kiện', parent: null }
  ],
  orders: [
    {
      id: 'DH007',
      customerId: 'KH003',
      customerName: 'Lê Minh C',
      date: formatDateStr(today),
      time: '17:30',
      products: [
        { productId: 'SP003', name: 'MacBook Air M2', quantity: 2, price: 28900000 }
      ],
      total: 57800000,
      status: 'Mới',
      paymentMethod: 'Chuyển khoản',
      paymentStatus: 'Công nợ'
    },
    {
      id: 'DH006',
      customerId: 'KH001',
      customerName: 'Nguyễn Văn A',
      date: formatDateStr(today),
      time: '16:45',
      products: [
        { productId: 'SP001', name: 'iPhone 15 Pro', quantity: 1, price: 28900000 }
      ],
      total: 28900000,
      status: 'Mới',
      paymentMethod: 'Chuyển khoản',
      paymentStatus: 'Công nợ'
    },
    {
      id: 'DH002',
      customerId: 'KH002',
      customerName: 'Trần Thị B',
      date: formatDateStr(today),
      time: '14:15',
      products: [
        { productId: 'SP002', name: 'Samsung Galaxy S24', quantity: 1, price: 24900000 }
      ],
      total: 24900000,
      status: 'Đang xử lý',
      paymentMethod: 'Tiền mặt',
      paymentStatus: 'Công nợ'
    },
    {
      id: 'DH001',
      customerId: 'KH001',
      customerName: 'Nguyễn Văn A',
      date: formatDateStr(today),
      time: '10:30',
      products: [
        { productId: 'SP001', name: 'iPhone 15 Pro', quantity: 1, price: 28900000 },
        { productId: 'SP005', name: 'AirPods Pro', quantity: 1, price: 6490000 }
      ],
      total: 35390000,
      status: 'Hoàn thành',
      paymentMethod: 'Chuyển khoản',
      paymentStatus: 'Đã thanh toán'
    },
    {
      id: 'DH003',
      customerId: 'KH003',
      customerName: 'Lê Minh C',
      date: formatDateStr(yesterday),
      time: '16:45',
      products: [
        { productId: 'SP003', name: 'MacBook Air M2', quantity: 1, price: 28900000 },
        { productId: 'SP004', name: 'iPad Pro 11 inch', quantity: 1, price: 19900000 }
      ],
      total: 48800000,
      status: 'Hoàn thành',
      paymentMethod: 'Chuyển khoản',
      paymentStatus: 'Đã thanh toán'
    },
    {
      id: 'DH004',
      customerId: 'KH004',
      customerName: 'Phạm Thu D',
      date: formatDateStr(twoDaysAgo),
      time: '09:20',
      products: [
        { productId: 'SP006', name: 'Quả bóng đá FIFA', quantity: 2, price: 500000 }
      ],
      total: 1000000,
      status: 'Đã giao',
      paymentMethod: 'Tiền mặt',
      paymentStatus: 'Công nợ'
    },
    {
      id: 'DH005',
      customerId: 'KH005',
      customerName: 'Hoàng Văn E',
      date: formatDateStr(threeDaysAgo),
      time: '11:30',
      products: [
        { productId: 'SP007', name: 'Vợt Pickle Ball Pro', quantity: 1, price: 800000 },
        { productId: 'SP005', name: 'AirPods Pro', quantity: 2, price: 6490000 }
      ],
      total: 13780000,
      status: 'Hủy',
      paymentMethod: 'Chuyển khoản',
      paymentStatus: 'Công nợ'
    }
  ],
  sales: [
    { id: 'DH001', date: formatDateStr(today), customer: 'Nguyễn Văn A', total: 2500000, status: 'Hoàn thành', items: 3 },
    { id: 'DH002', date: formatDateStr(today), customer: 'Trần Thị B', total: 1800000, status: 'Chờ xử lý', items: 2 },
    { id: 'DH003', date: formatDateStr(yesterday), customer: 'Lê Minh C', total: 3200000, status: 'Đang giao', items: 4 },
    { id: 'DH004', date: formatDateStr(yesterday), customer: 'Phạm Thu D', total: 950000, status: 'Hoàn thành', items: 1 },
    { id: 'DH005', date: formatDateStr(twoDaysAgo), customer: 'Hoàng Văn E', total: 4200000, status: 'Hoàn thành', items: 5 }
  ],
  shopInfo: {
    name: 'SHOP BÁN HÀNG CÔNG NGHỆ',
    address: '123 Đường Công Nghệ, Quận 1, TP.HCM',
    phone: '0909.123.456',
    email: 'contact@shopcongnghe.vn',
    taxCode: '0312345678',
    website: 'www.shopcongnghe.vn',
    bankAccount: '19031234567890',
    bankName: 'Techcombank - CN Quận 1',
    logo: ''
  },
  settings: {
    currency: 'VND',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
    notifications: true,
    autoBackup: true,
    invoiceTemplate: 'standard'
  },
  repairs: [],
  leads: [],
  careTasks: []
};
