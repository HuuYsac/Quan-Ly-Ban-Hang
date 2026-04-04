import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search, ShieldCheck, Calendar, User, Phone, Laptop, AlertCircle, ArrowLeft, Sparkles, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
      
      const phoneVariations = new Set<string>();
      phoneVariations.add(rawPhone);
      if (digitsOnly) {
        phoneVariations.add(digitsOnly);
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

      const allOrders: any[] = [];
      const orderDocIds = new Set<string>();

      if (customerIds.size > 0) {
        const ids = Array.from(customerIds);
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
        const products = (orderData.products || []).filter((p: any) => {
          if (p.isGift) return false;
          if (formData.serviceTag && p.serviceTag) {
            return p.serviceTag.toLowerCase().includes(formData.serviceTag.trim().toLowerCase());
          }
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 mb-6"
          >
            <ShieldCheck size={40} />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tra cứu <span className="text-indigo-600">Bảo hành</span></h1>
          <p className="text-slate-500 text-sm mt-3 font-medium">Hệ thống kiểm tra thời hạn bảo hành sản phẩm chính hãng</p>
        </div>

        {/* Search Form */}
        <div className="glass-card overflow-hidden shadow-2xl shadow-slate-200/80">
          <form onSubmit={handleSearch} className="p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Số điện thoại tra cứu <span className="text-rose-500">*</span></label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0912345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Số Serial / Service Tag</label>
                <div className="relative group">
                  <Laptop className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="VD: ABC123XYZ"
                    value={formData.serviceTag}
                    onChange={(e) => setFormData({ ...formData, serviceTag: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Họ tên khách hàng</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-70 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <Search size={20} />
              )}
              {loading ? 'Đang xử lý dữ liệu...' : 'Kiểm tra bảo hành'}
            </motion.button>
          </form>

          {/* Results Section */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t border-slate-100 bg-slate-50/30 p-6 md:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-50/30 backdrop-blur-sm py-2 z-10">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                    <Sparkles className="text-amber-500" size={18} />
                    Kết quả tìm kiếm ({results.length})
                  </h3>
                </div>
                
                <div className="space-y-8">
                  {results.map((res, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={idx} 
                      className="space-y-5 pb-8 border-b border-slate-200 last:border-0 last:pb-0"
                    >
                      {/* Customer Info Section */}
                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-100/50 rounded-full blur-xl group-hover:bg-indigo-200/50 transition-colors"></div>
                        <div className="flex items-center gap-2 text-indigo-600 mb-3 relative z-10">
                          <User size={14} className="font-bold" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Thông tin khách hàng</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Họ và tên</p>
                            <p className="text-sm font-black text-slate-900">{res.order.customerName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số điện thoại</p>
                            <p className="text-sm font-black text-slate-900">{res.order.customerPhone}</p>
                          </div>
                          {res.order.customerEmail && (
                            <div className="sm:col-span-2 space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email liên hệ</p>
                              <p className="text-sm font-black text-slate-900">{res.order.customerEmail}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Info Section */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 text-slate-400 mb-3">
                          <Laptop size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Thông tin sản phẩm</span>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg tracking-tight leading-tight mb-3">{res.product.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase border border-indigo-100">
                            S/N: {res.product.serviceTag || 'N/A'}
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase border border-emerald-100">
                            BH: {res.product.warrantyMonths || 12} tháng
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngày mua hàng</p>
                            <p className="text-sm font-black text-slate-900">{res.purchaseDate}</p>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngày hết hạn</p>
                            <p className="text-sm font-black text-slate-900">{res.expiryDate}</p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-5 rounded-2xl border-2 flex items-center justify-between ${res.isExpired ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className="flex items-center gap-3">
                          {res.isExpired ? (
                            <Clock className="text-rose-500" size={24} />
                          ) : (
                            <CheckCircle2 className="text-emerald-500" size={24} />
                          )}
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${res.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>Trạng thái bảo hành</p>
                            <p className={`text-sm font-black uppercase ${res.isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {res.isExpired ? 'Đã hết hạn bảo hành' : 'Đang trong thời hạn'}
                            </p>
                          </div>
                        </div>
                        {!res.isExpired && (
                          <div className="text-right">
                            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Còn lại</p>
                            <p className="text-lg font-black text-emerald-700">{res.daysRemaining} ngày</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onBack && (
          <motion.button
            whileHover={{ x: -5 }}
            onClick={onBack}
            className="mt-10 w-full flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={18} />
            Quay lại trang đăng nhập
          </motion.button>
        )}

        <div className="mt-16 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} Hữu Laptop • Professional Warranty System
          </p>
        </div>
      </motion.div>
    </div>
  );
}
