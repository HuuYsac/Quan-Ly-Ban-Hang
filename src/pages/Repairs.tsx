import React, { useState, useMemo } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { 
  Search, 
  Wrench, 
  Clock, 
  User, 
  Phone, 
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  Plus,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp as TrendingUpIcon,
  PlusCircle
} from 'lucide-react';
import { Repair, Customer, Technician } from '../types';
import { formatCurrency } from '../lib/utils';
import { SearchableSelect } from '../components/SearchableSelect';
import { Toast, ToastType } from '../components/Notification';

const Repairs: React.FC = () => {
  const { data, addItem, updateItem, deleteItem } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // New Modals State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddTechnicianModalOpen, setIsAddTechnicianModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [isSubmittingTechnician, setIsSubmittingTechnician] = useState(false);

  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    type: 'ca-nhan' as const,
    email: '',
    address: ''
  });

  const [technicianFormData, setTechnicianFormData] = useState({
    name: '',
    phone: '',
    type: 'Thợ' as const
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const [formData, setFormData] = useState<Partial<Repair>>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    productName: '',
    serviceTag: '',
    issue: '',
    technician: '',
    status: 'Đang sửa',
    notes: '',
    receivedDate: new Date().toISOString().split('T')[0],
    returnDate: '',
    warrantyMonths: 0,
    partnerCost: 0,
    customerPrice: 0,
    profit: 0
  });

  const filteredRepairs = useMemo(() => {
    return data.repairs.filter(r => {
      const matchesSearch = 
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerPhone.includes(searchTerm) ||
        r.serviceTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.repairs, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: data.repairs.length,
      inProgress: data.repairs.filter(r => r.status === 'Đang sửa').length,
      completed: data.repairs.filter(r => r.status === 'Đã xong').length,
      returned: data.repairs.filter(r => r.status === 'Đã trả khách').length,
      totalProfit: data.repairs.reduce((sum, r) => sum + (r.profit || 0), 0)
    };
  }, [data.repairs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const partnerCost = Number(formData.partnerCost) || 0;
    const customerPrice = Number(formData.customerPrice) || 0;
    const profit = customerPrice - partnerCost;

    try {
      if (editingRepair) {
        await updateItem('repairs', editingRepair.id, { ...formData, profit });
      } else {
        const newRepair: Repair = {
          ...formData as Repair,
          profit,
          id: `RP${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        await addItem('repairs', newRepair);
      }
      
      setIsModalOpen(false);
      setEditingRepair(null);
      resetForm();
      alert(editingRepair ? 'Cập nhật phiếu thành công!' : 'Tạo phiếu sửa chữa thành công!');
    } catch (error) {
      console.error('Error saving repair:', error);
      alert('Có lỗi xảy ra khi lưu phiếu. Vui lòng thử lại.');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      customerPhone: '',
      productName: '',
      serviceTag: '',
      issue: '',
      technician: '',
      status: 'Đang sửa',
      notes: '',
      receivedDate: new Date().toISOString().split('T')[0],
      returnDate: '',
      partnerCost: 0,
      customerPrice: 0,
      profit: 0
    });
  };

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair);
    setFormData({
      customerId: repair.customerId || '',
      customerName: repair.customerName || '',
      customerPhone: repair.customerPhone || '',
      productName: repair.productName || '',
      serviceTag: repair.serviceTag || '',
      issue: repair.issue || '',
      technician: repair.technician || '',
      status: repair.status || 'Đang sửa',
      notes: repair.notes || '',
      receivedDate: repair.receivedDate || new Date().toISOString().split('T')[0],
      returnDate: repair.returnDate || '',
      warrantyMonths: repair.warrantyMonths || 0,
      partnerCost: repair.partnerCost || 0,
      customerPrice: repair.customerPrice || 0,
      profit: repair.profit || 0
    });
    setIsModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCustomer) return;

    try {
      setIsSubmittingCustomer(true);
      const newId = `KH${Date.now()}`;
      const newCustomer: Customer = {
        id: newId,
        ...customerFormData,
        debt: 0,
        createdAt: new Date().toISOString()
      };
      await addItem('customers', newCustomer);
      setFormData(prev => ({
        ...prev,
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        customerPhone: newCustomer.phone
      }));
      setIsAddCustomerModalOpen(false);
      setCustomerFormData({ name: '', phone: '', type: 'ca-nhan', email: '', address: '' });
      showToast('Đã thêm khách hàng mới');
    } catch (error) {
      console.error('Error creating customer:', error);
      showToast('Lỗi khi tạo khách hàng', 'error');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTechnician) return;

    try {
      setIsSubmittingTechnician(true);
      const newId = `T${Date.now()}`;
      const newTechnician: Technician = {
        id: newId,
        ...technicianFormData,
        createdAt: new Date().toISOString()
      };
      await addItem('technicians', newTechnician);
      setFormData(prev => ({ ...prev, technician: newTechnician.name }));
      setIsAddTechnicianModalOpen(false);
      setTechnicianFormData({ name: '', phone: '', type: 'Thợ' });
      showToast('Đã thêm thợ/đối tác mới');
    } catch (error) {
      console.error('Error creating technician:', error);
      showToast('Lỗi khi tạo thợ/đối tác', 'error');
    } finally {
      setIsSubmittingTechnician(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiếu sửa chữa này?')) {
      await deleteItem('repairs', id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang sửa': return 'bg-blue-100 text-blue-700';
      case 'Đã xong': return 'bg-emerald-100 text-emerald-700';
      case 'Đã trả khách': return 'bg-gray-100 text-gray-700';
      case 'Hủy': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Sửa chữa</h2>
          <p className="text-gray-500 text-sm">Theo dõi tiến độ sửa chữa và bảo hành thiết bị</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setEditingRepair(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus size={20} />
          Tạo phiếu mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wrench size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Tổng số</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Đang sửa</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Đã xong</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg">
              <ExternalLink size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Đã trả</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.returned}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUpIcon size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Lợi nhuận</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.totalProfit)}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm theo tên khách, SĐT, Service Tag..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium text-gray-700"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Đang sửa">Đang sửa</option>
          <option value="Đã xong">Đã xong</option>
          <option value="Đã trả khách">Đã trả khách</option>
          <option value="Hủy">Đã hủy</option>
        </select>
      </div>

      {/* Repairs List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Khách hàng & Thiết bị</th>
                <th className="p-4 font-bold">Tình trạng & Thợ</th>
                <th className="p-4 font-bold">Chi phí & Lợi nhuận</th>
                <th className="p-4 font-bold text-center">Trạng thái</th>
                <th className="p-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRepairs.map((repair) => (
                <tr 
                  key={repair.id} 
                  onClick={() => handleEdit(repair)}
                  className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{repair.customerName}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {repair.customerPhone}
                      </span>
                      <div className="mt-2">
                        <span className="text-sm text-blue-600 font-medium">{repair.productName}</span>
                        <div className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-tight">
                          S/N: {repair.serviceTag}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-700 line-clamp-2">{repair.issue}</span>
                      </div>
                      {repair.technician && (
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <User size={12} /> Thợ: {repair.technician}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col text-xs space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Đối tác:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(repair.partnerCost || 0)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Khách:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(repair.customerPrice || 0)}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-gray-100">
                        <span className="text-gray-500">Lợi nhuận:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(repair.profit || 0)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(repair.status)}`}>
                      {repair.status}
                    </span>
                    <div className="mt-2 flex flex-col text-[10px] text-gray-400">
                      <span>Nhận: {new Date(repair.receivedDate).toLocaleDateString('vi-VN')}</span>
                      {repair.returnDate && (
                        <span className="text-emerald-600 font-bold">Trả: {new Date(repair.returnDate).toLocaleDateString('vi-VN')}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(repair)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(repair.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRepairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Wrench size={48} className="opacity-20" />
                      <p>Không tìm thấy phiếu sửa chữa nào.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredRepairs.map((repair) => (
            <div 
              key={repair.id} 
              onClick={() => handleEdit(repair)}
              className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900">{repair.customerName}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone size={10} /> {repair.customerPhone}
                  </div>
                  <div className="pt-1">
                    <span className="text-sm text-blue-600 font-bold">{repair.productName}</span>
                    <div className="text-[10px] text-gray-400 font-mono font-bold uppercase">S/N: {repair.serviceTag}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(repair.status)}`}>
                  {repair.status}
                </span>
              </div>
              
              <div className="bg-gray-50 p-2 rounded-lg text-sm text-gray-700 flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{repair.issue}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-100">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Chi phí đối tác</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(repair.partnerCost || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Báo khách</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(repair.customerPrice || 0)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col text-[10px] text-gray-500 gap-1">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} />
                    <span>Nhận: {new Date(repair.receivedDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {repair.returnDate && (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 size={10} />
                      <span>Trả: {new Date(repair.returnDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                  <div className="mt-1 font-black text-emerald-600 uppercase">
                    Lợi nhuận: {formatCurrency(repair.profit || 0)}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEdit(repair)}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(repair.id)}
                    className="p-2 text-rose-600 bg-rose-50 rounded-lg border border-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredRepairs.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              Không tìm thấy phiếu sửa chữa nào.
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRepair ? 'Cập nhật phiếu sửa chữa' : 'Tạo phiếu sửa chữa mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thông tin khách hàng</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chọn khách hàng *</label>
                    <div className="flex gap-2">
                      <SearchableSelect 
                        className="flex-1"
                        options={(data.customers || []).map(c => ({
                          id: c.id,
                          label: c.name,
                          sublabel: c.phone
                        }))}
                        value={formData.customerId || ''}
                        onChange={(val) => {
                          const customer = data.customers.find(c => c.id === val);
                          if (customer) {
                            setFormData({
                              ...formData, 
                              customerId: customer.id,
                              customerName: customer.name,
                              customerPhone: customer.phone
                            });
                          }
                        }}
                        placeholder="Tìm khách hàng..."
                        onAddNew={() => setIsAddCustomerModalOpen(true)}
                        addNewLabel="Thêm khách mới"
                      />
                      <button 
                        type="button"
                        onClick={() => setIsAddCustomerModalOpen(true)}
                        className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 flex-shrink-0 shadow-sm"
                        title="Thêm khách hàng mới"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thông tin thiết bị</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên máy *</label>
                    <input 
                      required
                      type="text"
                      value={formData.productName}
                      onChange={e => setFormData({...formData, productName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Tag / S/N *</label>
                    <input 
                      required
                      type="text"
                      value={formData.serviceTag}
                      onChange={e => setFormData({...formData, serviceTag: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Repair Details */}
              <div className="space-y-4 mb-6">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Chi tiết sửa chữa</h4>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tình trạng / Lỗi *</label>
                  <textarea 
                    required
                    value={formData.issue}
                    onChange={e => setFormData({...formData, issue: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thợ / Đối tác nhận</label>
                    <div className="flex gap-2">
                      <SearchableSelect 
                        className="flex-1"
                        options={(data.technicians || []).map(t => ({
                          id: t.name, // Use name as ID for simplicity if technician is just a string in Repair
                          label: t.name,
                          sublabel: t.type + (t.phone ? ` - ${t.phone}` : '')
                        }))}
                        value={formData.technician || ''}
                        onChange={(val) => setFormData({...formData, technician: val})}
                        placeholder="Chọn thợ..."
                        onAddNew={() => setIsAddTechnicianModalOpen(true)}
                        addNewLabel="Thêm thợ mới"
                      />
                      <button 
                        type="button"
                        onClick={() => setIsAddTechnicianModalOpen(true)}
                        className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 flex-shrink-0 shadow-sm"
                        title="Thêm thợ mới"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trạng thái</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="Đang sửa">Đang sửa</option>
                      <option value="Đã xong">Đã xong</option>
                      <option value="Đã trả khách">Đã trả khách</option>
                      <option value="Hủy">Hủy</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày nhận</label>
                    <input 
                      type="date"
                      value={formData.receivedDate}
                      onChange={e => setFormData({...formData, receivedDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày trả khách</label>
                    <input 
                      type="date"
                      value={formData.returnDate}
                      onChange={e => setFormData({...formData, returnDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bảo hành sửa chữa</label>
                    <select 
                      value={formData.warrantyMonths}
                      onChange={e => setFormData({...formData, warrantyMonths: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value={0}>Không bảo hành</option>
                      <option value={1}>1 tháng</option>
                      <option value={3}>3 tháng</option>
                      <option value={6}>6 tháng</option>
                      <option value={12}>12 tháng</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Chi phí đối tác (VND)</label>
                    <input 
                      type="number"
                      value={formData.partnerCost}
                      onChange={e => setFormData({...formData, partnerCost: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Giá báo khách (VND)</label>
                    <input 
                      type="number"
                      value={formData.customerPrice}
                      onChange={e => setFormData({...formData, customerPrice: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                    />
                  </div>
                  <div className="md:col-span-2 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase">Lợi nhuận dự kiến:</span>
                    <span className="text-lg font-black text-emerald-600">
                      {formatCurrency((Number(formData.customerPrice) || 0) - (Number(formData.partnerCost) || 0))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú / Diễn giải</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm min-h-[60px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  {editingRepair ? 'Lưu thay đổi' : 'Tạo phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle size={20} className="text-blue-600" />
                Thêm khách hàng mới
              </h3>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Tên khách hàng *</label>
                <input type="text" required value={customerFormData.name} onChange={e => setCustomerFormData({...customerFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Họ và tên" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Số điện thoại *</label>
                <input type="text" required value={customerFormData.phone} onChange={e => setCustomerFormData({...customerFormData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="090..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Loại khách hàng</label>
                <select value={customerFormData.type} onChange={e => setCustomerFormData({...customerFormData, type: e.target.value as any})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="ca-nhan">Cá nhân</option>
                  <option value="doanh-nghiep">Doanh nghiệp</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddCustomerModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmittingCustomer} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                  {isSubmittingCustomer ? 'Đang lưu...' : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Technician Modal */}
      {isAddTechnicianModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle size={20} className="text-blue-600" />
                Thêm thợ / đối tác mới
              </h3>
              <button onClick={() => setIsAddTechnicianModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTechnician} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Tên thợ / đối tác *</label>
                <input type="text" required value={technicianFormData.name} onChange={e => setTechnicianFormData({...technicianFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Tên thợ hoặc đối tác" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Số điện thoại</label>
                <input type="text" value={technicianFormData.phone} onChange={e => setTechnicianFormData({...technicianFormData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="090..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Loại</label>
                <select value={technicianFormData.type} onChange={e => setTechnicianFormData({...technicianFormData, type: e.target.value as any})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="Thợ">Thợ</option>
                  <option value="Đối tác">Đối tác</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddTechnicianModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmittingTechnician} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                  {isSubmittingTechnician ? 'Đang lưu...' : 'Lưu thợ/đối tác'}
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

export default Repairs;
