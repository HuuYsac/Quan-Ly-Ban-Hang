import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, ShieldCheck, Calendar, User, Phone, Laptop, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export function PublicWarrantyCheck({ onBack }: { onBack?: () => void }) {
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    serviceTag: ''
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) {
      setError('Vui lòng nhập số điện thoại tra cứu.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const customersRef = collection(db, 'customers');
      const ordersRef = collection(db, 'orders');
      
      const rawPhone = formData.phone.trim();
      const digitsOnly = rawPhone.replace(/\D/g, '');
      
      // Create variations of the phone number to increase match chance
      const phoneVariations = new Set<string>();
      phoneVariations.add(rawPhone);
      if (digitsOnly) {
        phoneVariations.add(digitsOnly);
        // Try with/without leading zero
        if (digitsOnly.startsWith('0')) {
          phoneVariations.add(digitsOnly.substring(1));
          phoneVariations.add('+84' + digitsOnly.substring(1));
          phoneVariations.add('84' + digitsOnly.substring(1));
        } else {
          phoneVariations.add('0' + digitsOnly);
          phoneVariations.add('+84' + digitsOnly);
        }
      }
      
      const uniquePhones = Array.from(phoneVariations).filter(p => p.length >= 8);

      // 1. Find the customer(s) by phone number variations
      // We use multiple queries to avoid 'in' query limitations and potential index issues
      const customerIds = new Set<string>();
      const customerNames = new Set<string>();

      for (const phone of uniquePhones) {
        const q = query(customersRef, where('phone', '==', phone), limit(5));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          customerIds.add(doc.id);
          if (doc.data().name) customerNames.add(doc.data().name);
        });
      }

      // 2. Query orders
      const allOrders: any[] = [];
      const orderDocIds = new Set<string>();

      // A. Query by customer IDs
      if (customerIds.size > 0) {
        const ids = Array.from(customerIds);
        // Firestore 'in' limit is 10, but we likely have few customers per phone
        const chunkedIds = [];
        for (let i = 0; i < ids.length; i += 10) {
          chunkedIds.push(ids.slice(i, i + 10));
        }

        for (const chunk of chunkedIds) {
          const q = query(ordersRef, where('customerId', 'in', chunk), limit(50));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            if (!orderDocIds.has(doc.id)) {
              allOrders.push({ id: doc.id, ...doc.data() });
              orderDocIds.add(doc.id);
            }
          });
        }
      }

      // B. Query by phone variations directly in orders
      for (const phone of uniquePhones) {
        const q = query(ordersRef, where('customerPhone', '==', phone), limit(20));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          if (!orderDocIds.has(doc.id)) {
            allOrders.push({ id: doc.id, ...doc.data() });
            orderDocIds.add(doc.id);
          }
        });
      }
      
      // C. Query by customer names found from customer records
      if (customerNames.size > 0) {
        for (const name of Array.from(customerNames)) {
          const q = query(ordersRef, where('customerName', '==', name), limit(20));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            if (!orderDocIds.has(doc.id)) {
              allOrders.push({ id: doc.id, ...doc.data() });
              orderDocIds.add(doc.id);
            }
          });
        }
      }

      // D. If still no results and name is provided manually, try by that name
      if (allOrders.length === 0 && formData.customerName) {
        const q = query(ordersRef, where('customerName', '==', formData.customerName.trim()), limit(50));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          if (!orderDocIds.has(doc.id)) {
            allOrders.push({ id: doc.id, ...doc.data() });
            orderDocIds.add(doc.id);
          }
        });
      }

      const foundItems: any[] = [];
      const today = new Date();

      allOrders.forEach((orderData) => {
        // Filter products in this order
        const products = (orderData.products || []).filter((p: any) => {
          // If service tag is provided, it must match (partial match)
          if (formData.serviceTag && p.serviceTag) {
            return p.serviceTag.toLowerCase().includes(formData.serviceTag.trim().toLowerCase());
          }
          // If no service tag provided, include all products with warranty info
          // We are more permissive here to show results even if some fields are missing
          return p.purchaseDate || p.warrantyMonths;
        });
        
        products.forEach((product: any) => {
          const pDate = product.purchaseDate || orderData.date || orderData.createdAt?.split('T')[0];
          const wMonths = product.warrantyMonths || 12;

          if (!pDate) return;

          const purchaseDate = new Date(pDate);
          const expiryDate = new Date(purchaseDate);
          expiryDate.setMonth(expiryDate.getMonth() + wMonths);
          
          const isExpired = today > expiryDate;
          const diffTime = expiryDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          foundItems.push({
            product,
            order: orderData,
            purchaseDate: pDate,
            expiryDate: expiryDate.toLocaleDateString('vi-VN'),
            isExpired,
            daysRemaining: isExpired ? 0 : daysRemaining
          });
        });
      });

      if (foundItems.length > 0) {
        // Sort by purchase date descending
        foundItems.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setResults(foundItems);
      } else {
        setError('Không tìm thấy thông tin bảo hành. Vui lòng kiểm tra lại số điện thoại hoặc thử nhập thêm Tên khách hàng / Số Serial.');
      }
    } catch (err: any) {
      console.error('Error searching warranty:', err);
      setError('Có lỗi xảy ra trong quá trình tra cứu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Tra cứu Bảo hành</h1>
          <p className="text-gray-500 text-sm mt-2">Nhập số điện thoại để kiểm tra thời hạn bảo hành</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <form onSubmit={handleSearch} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Số điện thoại <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  required
                  placeholder="VD: 0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Số Serial / Service Tag (Tùy chọn)</label>
                <div className="relative">
                  <Laptop className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="VD: ABC123XYZ"
                    value={formData.serviceTag}
                    onChange={(e) => setFormData({ ...formData, serviceTag: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Họ tên (Tùy chọn)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {loading ? 'Đang tra cứu...' : 'Kiểm tra ngay'}
            </button>
          </form>

          {/* Results Section */}
          {results.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-4 duration-300 max-h-[60vh] overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 sticky top-0 bg-slate-50/50 py-1">
                <ShieldCheck className="text-emerald-500" size={18} />
                Tìm thấy {results.length} sản phẩm
              </h3>
              <div className="space-y-6">
                {results.map((res, idx) => (
                  <div key={idx} className="space-y-4 pb-6 border-b border-slate-200 last:border-0 last:pb-0">
                    {/* Customer Info Section */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex items-center gap-2 text-blue-800 mb-1">
                        <User size={14} className="text-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Thông tin khách hàng</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <p className="text-sm font-bold text-gray-900 flex justify-between">
                          <span className="text-gray-500 font-medium">Họ tên:</span>
                          {res.order.customerName}
                        </p>
                        <p className="text-sm font-bold text-gray-900 flex justify-between">
                          <span className="text-gray-500 font-medium">SĐT:</span>
                          {res.order.customerPhone}
                        </p>
                        {res.order.customerEmail && (
                          <p className="text-sm font-bold text-gray-900 flex justify-between">
                            <span className="text-gray-500 font-medium">Email:</span>
                            {res.order.customerEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Product Info Section */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Laptop size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Thông tin sản phẩm</span>
                      </div>
                      <p className="font-bold text-gray-900 text-base">{res.product.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">
                          SN: {res.product.serviceTag || 'N/A'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-100">
                          BH: {res.product.warrantyMonths || 12} tháng
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Calendar size={14} />
                          <span className="text-[10px] font-bold uppercase">Ngày mua</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{res.purchaseDate}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <ShieldCheck size={14} />
                          <span className="text-[10px] font-bold uppercase">Hết hạn</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{res.expiryDate}</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${res.isExpired ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium ${res.isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>Trạng thái:</span>
                        <span className={`text-xs font-black uppercase ${res.isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {res.isExpired ? 'Hết hạn bảo hành' : `Còn bảo hành (${res.daysRemaining} ngày)`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-8 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors"
          >
            <ArrowLeft size={18} />
            Quay lại trang đăng nhập
          </button>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Hữu Laptop. Hệ thống quản lý bảo hành thông minh.
          </p>
        </div>
      </div>
    </div>
  );
}
