import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Bell,
  Settings as SettingsIcon,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Repair, WarrantyNotification, NotificationSettings } from '../types';
import { Toast, ToastType } from '../components/Notification';

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
  const { data, addItem, updateData } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired' | 'history'>('active');
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyItem | null>(null);
  const [repairForm, setRepairForm] = useState({
    issue: '',
    technician: '',
    notes: ''
  });
  const [settingsForm, setSettingsForm] = useState<NotificationSettings>(data.notificationSettings || {
    zaloAccessToken: '',
    zaloOaId: '',
    smsApiKey: '',
    smsProvider: 'esms',
    autoSendWarranty: false,
    daysBeforeExpiry: 7,
    messageTemplate: 'Chào {customerName}, sản phẩm {productName} (S/N: {serviceTag}) của bạn sắp hết hạn bảo hành vào ngày {expiryDate}. Vui lòng liên hệ chúng tôi để được hỗ trợ.'
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [sendingNotify, setSendingNotify] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

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
    showToast('Đã tạo phiếu sửa chữa thành công!');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateData({ notificationSettings: settingsForm });
    setIsSettingsModalOpen(false);
    showToast('Đã lưu cài đặt thông báo!');
  };

  const sendNotification = async (warranty: WarrantyItem, type: 'zalo' | 'sms') => {
    setSendingNotify(warranty.serviceTag);
    try {
      // Mock API call to send notification
      // In a real app, you would call your backend or a third-party API here
      console.log(`Sending ${type} to ${warranty.customerPhone}: ${settingsForm.messageTemplate}`);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newNotification: WarrantyNotification = {
        id: `NOTIF${Date.now()}`,
        customerId: warranty.customerId,
        orderId: warranty.orderId,
        serviceTag: warranty.serviceTag,
        sentAt: new Date().toISOString(),
        status: 'success',
        type,
        message: settingsForm.messageTemplate
          .replace('{customerName}', warranty.customerName)
          .replace('{productName}', warranty.productName)
          .replace('{serviceTag}', warranty.serviceTag)
          .replace('{expiryDate}', warranty.expiryDate.toLocaleDateString('vi-VN'))
      };

      await addItem('warrantyNotifications', newNotification);
      showToast(`Đã gửi thông báo ${type.toUpperCase()} thành công!`);
    } catch (error) {
      showToast(`Lỗi khi gửi thông báo ${type.toUpperCase()}`, 'error');
    } finally {
      setSendingNotify(null);
    }
  };

  const hasBeenNotified = (serviceTag: string) => {
    return data.warrantyNotifications?.some(n => n.serviceTag === serviceTag && n.status === 'success');
  };

  // Automatic notification check
  useEffect(() => {
    if (settingsForm.autoSendWarranty && warranties.length > 0) {
      const expiringSoon = warranties.filter(w => 
        w.status === 'expiring' && 
        w.daysRemaining <= settingsForm.daysBeforeExpiry &&
        !hasBeenNotified(w.serviceTag)
      );

      if (expiringSoon.length > 0) {
        // In a real app, we might want to batch these or ask for confirmation
        // For "automatic", we'll just process them
        const processAutoNotifications = async () => {
          for (const warranty of expiringSoon) {
            await sendNotification(warranty, 'zalo'); // Default to Zalo for auto
          }
        };
        processAutoNotifications();
      }
    }
  }, [warranties, settingsForm.autoSendWarranty, settingsForm.daysBeforeExpiry]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Bảo hành</h2>
          <p className="text-gray-500 text-sm">Theo dõi và kiểm tra thời hạn bảo hành sản phẩm</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <SettingsIcon size={18} />
            Cài đặt thông báo
          </button>
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
        <button 
          onClick={() => setFilterStatus('history')}
          className={`p-4 rounded-2xl border transition-all text-left ${filterStatus === 'history' ? 'bg-slate-50 border-slate-200 ring-2 ring-slate-500/20' : 'bg-white border-gray-100 shadow-sm hover:border-slate-200'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${filterStatus === 'history' ? 'bg-slate-600 text-white' : 'bg-slate-50 text-slate-600'}`}>
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Lịch sử gửi</span>
          </div>
          <p className="text-2xl font-bold text-slate-600">{data.warrantyNotifications?.length || 0}</p>
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
      {stats.expiring > 0 && filterStatus !== 'history' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-pulse">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-amber-900">Thông báo bảo hành</h4>
            <p className="text-amber-800 text-sm">
              Có {stats.expiring} sản phẩm sắp hết hạn bảo hành trong vòng 30 ngày tới. Vui lòng kiểm tra và chủ động liên hệ chăm sóc khách hàng.
            </p>
          </div>
          <button 
            onClick={async () => {
              const toNotify = warranties.filter(w => w.status === 'expiring' && !hasBeenNotified(w.serviceTag));
              for (const w of toNotify) {
                await sendNotification(w, 'zalo');
              }
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-sm text-sm"
          >
            Gửi tất cả Zalo
          </button>
        </div>
      )}

      {/* Warranty List or History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filterStatus === 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold">Khách hàng</th>
                  <th className="p-4 font-bold">Sản phẩm & S/N</th>
                  <th className="p-4 font-bold">Thời gian gửi</th>
                  <th className="p-4 font-bold">Loại & Trạng thái</th>
                  <th className="p-4 font-bold">Nội dung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.warrantyNotifications || []).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).map(notif => (
                  <tr key={notif.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{data.customers.find(c => c.id === notif.customerId)?.name || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-blue-600">{notif.serviceTag}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-gray-500">
                        {new Date(notif.sentAt).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${notif.type === 'zalo' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {notif.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${notif.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {notif.status === 'success' ? 'Thành công' : 'Thất bại'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">{notif.message}</p>
                    </td>
                  </tr>
                ))}
                {(data.warrantyNotifications || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-gray-400">
                      Chưa có lịch sử gửi thông báo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
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
                <tr 
                  key={`${warranty.orderId}-${idx}`} 
                  onClick={() => {
                    setSelectedWarranty(warranty);
                    setIsRepairModalOpen(true);
                  }}
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
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
                      {warranty.status === 'expiring' && (
                        <div className="flex items-center gap-1 mr-2">
                          {hasBeenNotified(warranty.serviceTag) ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                              <CheckCircle2 size={12} />
                              Đã báo
                            </span>
                          ) : (
                            <>
                              <button 
                                onClick={() => sendNotification(warranty, 'zalo')}
                                disabled={sendingNotify === warranty.serviceTag}
                                title="Gửi Zalo"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                              >
                                <MessageSquare size={16} />
                              </button>
                              <button 
                                onClick={() => sendNotification(warranty, 'sms')}
                                disabled={sendingNotify === warranty.serviceTag}
                                title="Gửi SMS"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                              >
                                <Smartphone size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredWarranties.map((warranty, idx) => (
            <div 
              key={`${warranty.orderId}-${idx}`} 
              onClick={() => {
                setSelectedWarranty(warranty);
                setIsRepairModalOpen(true);
              }}
              className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-all border-b border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900">{warranty.customerName}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone size={10} /> {warranty.customerPhone}
                  </div>
                  <div className="pt-1">
                    <span className="text-sm text-blue-600 font-bold">{warranty.productName}</span>
                    <div className="text-[10px] text-gray-400 font-mono font-bold uppercase">S/N: {warranty.serviceTag}</div>
                  </div>
                </div>
                {warranty.status === 'expired' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Hết hạn
                  </span>
                ) : warranty.status === 'expiring' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    Sắp hết hạn
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Đang bảo hành
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col text-[10px] text-gray-500 gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span>Hết hạn: {warranty.expiryDate.toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="text-blue-600 font-bold">
                    Còn {warranty.daysRemaining} ngày
                  </div>
                </div>
                {warranty.status !== 'expired' && (
                  <button 
                    onClick={() => {
                      setSelectedWarranty(warranty);
                      setIsRepairModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    <Wrench size={14} />
                    Sửa chữa
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredWarranties.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              Không tìm thấy thông tin bảo hành nào.
            </div>
          )}
        </div>
      </>
    )}
  </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Bell size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Cấu hình thông báo tự động</h3>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zalo Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-600" />
                    Zalo Official Account
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zalo OA Access Token</label>
                    <input 
                      type="password"
                      value={settingsForm.zaloAccessToken}
                      onChange={e => setSettingsForm({...settingsForm, zaloAccessToken: e.target.value})}
                      placeholder="Nhập Access Token..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zalo OA ID</label>
                    <input 
                      type="text"
                      value={settingsForm.zaloOaId}
                      onChange={e => setSettingsForm({...settingsForm, zaloOaId: e.target.value})}
                      placeholder="Nhập OA ID..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* SMS Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Smartphone size={16} className="text-emerald-600" />
                    Dịch vụ SMS
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nhà cung cấp</label>
                    <select 
                      value={settingsForm.smsProvider}
                      onChange={e => setSettingsForm({...settingsForm, smsProvider: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="esms">eSMS.vn</option>
                      <option value="twilio">Twilio</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key / Auth Token</label>
                    <input 
                      type="password"
                      value={settingsForm.smsApiKey}
                      onChange={e => setSettingsForm({...settingsForm, smsApiKey: e.target.value})}
                      placeholder="Nhập API Key..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <h4 className="text-sm font-bold text-gray-900">Cấu hình nội dung & Thời điểm</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input 
                      type="checkbox"
                      id="autoSend"
                      checked={settingsForm.autoSendWarranty}
                      onChange={e => setSettingsForm({...settingsForm, autoSendWarranty: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoSend" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Tự động gửi khi sắp hết hạn
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="text-sm font-medium text-gray-700">Gửi trước (ngày):</label>
                    <input 
                      type="number"
                      value={settingsForm.daysBeforeExpiry}
                      onChange={e => setSettingsForm({...settingsForm, daysBeforeExpiry: parseInt(e.target.value)})}
                      className="w-20 px-3 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mẫu tin nhắn</label>
                  <textarea 
                    value={settingsForm.messageTemplate}
                    onChange={e => setSettingsForm({...settingsForm, messageTemplate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm min-h-[100px]"
                    placeholder="Sử dụng {customerName}, {productName}, {serviceTag}, {expiryDate}..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    * Các biến hỗ trợ: {'{customerName}'}, {'{productName}'}, {'{serviceTag}'}, {'{expiryDate}'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repair Modal */}
      {isRepairModalOpen && selectedWarranty && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">Tạo phiếu sửa chữa/bảo hành</h3>
              <button onClick={() => setIsRepairModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateRepair} className="p-4 sm:p-6 space-y-4">
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

      {toast && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Warranty;
