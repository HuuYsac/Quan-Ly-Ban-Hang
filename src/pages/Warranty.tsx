import React, { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  User, 
  Phone, 
  Hash,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Wrench,
  X
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Repair } from '../types';

interface WarrantyItem {
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  serviceTag: string;
  purchaseDate: string;
  warrantyMonths: number;
  expiryDate: Date;
  daysRemaining: number;
  status: 'active' | 'expiring' | 'expired';
}

const Warranty: React.FC = () => {
  const { data, addItem } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('active');
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyItem | null>(null);
  const [repairForm, setRepairForm] = useState({
    issue: '',
    technician: '',
    notes: ''
  });

  const warranties = useMemo(() => {
    const items: WarrantyItem[] = [];
    const today = new Date();

    data.orders.forEach(order => {
      const customer = data.customers.find(c => c.id === order.customerId);
      
      order.products.forEach(product => {
        if (product.serviceTag && product.purchaseDate && product.warrantyMonths) {
          const purchaseDate = new Date(product.purchaseDate);
          const expiryDate = new Date(purchaseDate);
          expiryDate.setMonth(expiryDate.getMonth() + product.warrantyMonths);

          const diffTime = expiryDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: 'active' | 'expiring' | 'expired' = 'active';
          if (daysRemaining < 0) {
            status = 'expired';
          } else if (daysRemaining <= 30) {
            status = 'expiring';
          }

          items.push({
            orderId: order.id,
            customerId: order.customerId,
            customerName: order.customerName,
            customerPhone: customer?.phone || 'N/A',
            productName: product.name,
            serviceTag: product.serviceTag,
            purchaseDate: product.purchaseDate,
            warrantyMonths: product.warrantyMonths,
            expiryDate,
            daysRemaining,
            status
          });
        }
      });
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [data.orders, data.customers]);

  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const matchesSearch = 
        w.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.customerPhone.includes(searchTerm) ||
        w.serviceTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (searchTerm) return matchesSearch;

      if (filterStatus === 'active') return (w.status === 'active' || w.status === 'expiring') && matchesSearch;
      if (filterStatus === 'expiring') return w.status === 'expiring' && matchesSearch;
      if (filterStatus === 'expired') return w.status === 'expired' && matchesSearch;
      return matchesSearch;
    });
  }, [warranties, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: warranties.length,
      active: warranties.filter(w => w.status === 'active' || w.status === 'expiring').length,
      expiring: warranties.filter(w => w.status === 'expiring').length,
      expired: warranties.filter(w => w.status === 'expired').length
    };
  }, [warranties]);

  const handleCreateRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;

    const newRepair: Repair = {
      id: `RP${Date.now()}`,
      customerId: selectedWarranty.customerId,
      customerName: selectedWarranty.customerName,
      customerPhone: selectedWarranty.customerPhone,
      productName: selectedWarranty.productName,
      serviceTag: selectedWarranty.serviceTag,
      issue: repairForm.issue,
      receivedDate: new Date().toISOString().split('T')[0],
      technician: repairForm.technician,
      status: 'Đang sửa',
      notes: repairForm.notes,
      createdAt: new Date().toISOString()
    };

    await addItem('repairs', newRepair);
    setIsRepairModalOpen(false);
    setSelectedWarranty(null);
    setRepairForm({ issue: '', technician: '', notes: '' });
    alert('Đã tạo phiếu sửa chữa thành công!');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Bảo hành</h2>
          <p className="text-gray-500 text-sm">Theo dõi và kiểm tra thời hạn bảo hành sản phẩm</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-2xl border transition-all text-left ${filterStatus === 'all' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <ShieldCheck size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Tất cả</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </button>
        <button 
          onClick={() => setFilterStatus('active')}
          className={`p-4 rounded-2xl border transition-all text-left ${filterStatus === 'active' ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${filterStatus === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShieldCheck size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Đang hiệu lực</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </button>
        <button 
          onClick={() => setFilterStatus('expiring')}
          className={`p-4 rounded-2xl border transition-all text-left ${filterStatus === 'expiring' ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20' : 'bg-white border-gray-100 shadow-sm hover:border-amber-200'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${filterStatus === 'expiring' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldAlert size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Sắp hết hạn</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.expiring}</p>
        </button>
        <button 
          onClick={() => setFilterStatus('expired')}
          className={`p-4 rounded-2xl border transition-all text-left ${filterStatus === 'expired' ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/20' : 'bg-white border-gray-100 shadow-sm hover:border-rose-200'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${filterStatus === 'expired' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'}`}>
              <ShieldAlert size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Đã hết hạn</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.expired}</p>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên khách, SĐT, Service Tag..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Notifications for Expiring Soon */}
      {stats.expiring > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-pulse">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">Thông báo bảo hành</h4>
            <p className="text-amber-800 text-sm">
              Có {stats.expiring} sản phẩm sắp hết hạn bảo hành trong vòng 30 ngày tới. Vui lòng kiểm tra và chủ động liên hệ chăm sóc khách hàng.
            </p>
          </div>
        </div>
      )}

      {/* Warranty List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Khách hàng & Sản phẩm</th>
                <th className="p-4 font-bold">Service Tag</th>
                <th className="p-4 font-bold">Thời gian bảo hành</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWarranties.map((warranty, idx) => (
                <tr key={`${warranty.orderId}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{warranty.customerName}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {warranty.customerPhone}
                      </span>
                      <span className="text-sm text-blue-600 font-medium mt-1">{warranty.productName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold font-mono">
                      <Hash size={12} /> {warranty.serviceTag}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col text-xs space-y-1">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={12} />
                        <span>Bắt đầu: {new Date(warranty.purchaseDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <Clock size={12} />
                        <span>Kết thúc: {warranty.expiryDate.toLocaleDateString('vi-VN')}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">Thời hạn: {warranty.warrantyMonths} tháng</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {warranty.status === 'expired' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        Hết hạn
                      </span>
                    ) : warranty.status === 'expiring' ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          Sắp hết hạn
                        </span>
                        <span className="text-[10px] text-amber-600 font-medium">Còn {warranty.daysRemaining} ngày</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          Đang bảo hành
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Còn {warranty.daysRemaining} ngày</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {warranty.status !== 'expired' && (
                        <button 
                          onClick={() => {
                            setSelectedWarranty(warranty);
                            setIsRepairModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-100"
                        >
                          <Wrench size={14} />
                          Sửa chữa
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredWarranties.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <ShieldAlert size={48} className="opacity-20" />
                      <p>Không tìm thấy thông tin bảo hành nào.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repair Modal */}
      {isRepairModalOpen && selectedWarranty && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Tạo phiếu sửa chữa/bảo hành</h3>
              <button onClick={() => setIsRepairModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateRepair} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Thông tin máy</p>
                <p className="text-sm font-bold text-gray-900">{selectedWarranty.productName}</p>
                <p className="text-xs text-gray-600">S/N: {selectedWarranty.serviceTag}</p>
                <p className="text-xs text-gray-600">Khách: {selectedWarranty.customerName} - {selectedWarranty.customerPhone}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tình trạng/Lỗi cần sửa *</label>
                <textarea 
                  required
                  value={repairForm.issue}
                  onChange={e => setRepairForm({...repairForm, issue: e.target.value})}
                  placeholder="Mô tả lỗi của máy..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thợ/Đối tác nhận sửa</label>
                <input 
                  type="text"
                  value={repairForm.technician}
                  onChange={e => setRepairForm({...repairForm, technician: e.target.value})}
                  placeholder="Tên thợ hoặc đơn vị đối tác..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú thêm</label>
                <input 
                  type="text"
                  value={repairForm.notes}
                  onChange={e => setRepairForm({...repairForm, notes: e.target.value})}
                  placeholder="Ghi chú diễn giải cho khách..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsRepairModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Tạo phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warranty;
