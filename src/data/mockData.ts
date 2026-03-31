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
  users: [],
  warrantyNotifications: [],
  customers: [],
  suppliers: [],
  products: [],
  categories: [],
  orders: [],
  sales: [],
  shopInfo: {
    name: 'Hữu Laptop',
    address: '',
    phone: '',
    email: '',
    taxCode: '',
    website: '',
    bankAccount: '',
    bankName: '',
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
  careTasks: [],
  promotions: [],
  messages: [],
  groups: [],
  internalTasks: []
};
