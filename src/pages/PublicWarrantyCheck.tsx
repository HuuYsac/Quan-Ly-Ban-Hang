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
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone || !formData.serviceTag) {
      setError('Vui lòng nhập đầy đủ thông tin tra cứu.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Find the order that contains this service tag
      const ordersRef = collection(db, 'orders');
      
      // We'll try to query by phone first (more specific)
      // If no results, we'll try by name
      let q = query(
        ordersRef,
        where('customerPhone', '==', formData.phone.trim()),
        limit(50)
      );

      let querySnapshot = await getDocs(q);
      
      // If no results by phone (maybe old order), try by name
      if (querySnapshot.empty) {
        q = query(
          ordersRef,
          where('customerName', '==', formData.customerName.trim()),
          limit(50)
        );
        querySnapshot = await getDocs(q);
      }

      let foundProduct = null;
      let foundOrder = null;

      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Double check phone if it's an old order (where customerPhone might be missing)
        // We might not have the phone in the order, so we might have to skip this check
        // but for security we should at least match the name.
        
        // Check if this order has the product with the matching service tag
        const product = (orderData.products || []).find((p: any) => 
          p.serviceTag?.toLowerCase() === formData.serviceTag.trim().toLowerCase()
        );
        
        if (product) {
          foundProduct = product;
          foundOrder = orderData;
        }
      });

      if (foundProduct && foundOrder) {
        const purchaseDate = new Date(foundProduct.purchaseDate);
        const expiryDate = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + foundProduct.warrantyMonths);
        
        const today = new Date();
        const isExpired = today > expiryDate;
        const diffTime = expiryDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setResult({
          product: foundProduct,
          order: foundOrder,
          expiryDate: expiryDate.toLocaleDateString('vi-VN'),
          isExpired,
          daysRemaining: isExpired ? 0 : daysRemaining
        });
      } else {
        setError('Không tìm thấy thông tin bảo hành. Vui lòng kiểm tra lại thông tin nhập vào.');
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
          <p className="text-gray-500 text-sm mt-2">Nhập thông tin để kiểm tra thời hạn bảo hành của bạn</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <form onSubmit={handleSearch} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Họ tên khách hàng</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Số điện thoại</label>
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

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Số Serial / Service Tag</label>
              <div className="relative">
                <Laptop className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="VD: ABC123XYZ"
                  value={formData.serviceTag}
                  onChange={(e) => setFormData({ ...formData, serviceTag: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
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
          {result && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className={result.isExpired ? "text-rose-500" : "text-emerald-500"} size={18} />
                Kết quả tra cứu
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                  <p className="font-bold text-gray-900">{result.product.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      SN: {result.product.serviceTag}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase">Ngày mua</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{result.product.purchaseDate}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-bold uppercase">Hết hạn</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{result.expiryDate}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${result.isExpired ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${result.isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>Trạng thái:</span>
                    <span className={`text-xs font-black uppercase ${result.isExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {result.isExpired ? 'Hết hạn bảo hành' : `Còn bảo hành (${result.daysRemaining} ngày)`}
                    </span>
                  </div>
                </div>
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
