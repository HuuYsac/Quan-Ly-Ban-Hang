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
  ExternalLink
} from 'lucide-react';
import { Repair } from '../types';

const Repairs: React.FC = () => {
  const { data, addItem, updateItem, deleteItem } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);

  const [formData, setFormData] = useState<Partial<Repair>>({
    customerName: '',
    customerPhone: '',
    productName: '',
    serviceTag: '',
    issue: '',
    technician: '',
    status: 'Đang sửa',
    notes: '',
    receivedDate: new Date().toISOString().split('T')[0],
    returnDate: ''
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
      returned: data.repairs.filter(r => r.status === 'Đã trả khách').length
    };
  }, [data.repairs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRepair) {
      await updateItem('repairs', editingRepair.id, formData);
    } else {
      const newRepair: Repair = {
        ...formData as Repair,
        id: `RP${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      await addItem('repairs', newRepair);
    }
    
    setIsModalOpen(false);
    setEditingRepair(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      productName: '',
      serviceTag: '',
      issue: '',
      technician: '',
      status: 'Đang sửa',
      notes: '',
      receivedDate: new Date().toISOString().split('T')[0],
      returnDate: ''
    });
  };

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair);
    setFormData(repair);
    setIsModalOpen(true);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <span className="text-sm font-medium text-gray-500">Đã trả khách</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.returned}</p>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Khách hàng & Thiết bị</th>
                <th className="p-4 font-bold">Tình trạng & Thợ</th>
                <th className="p-4 font-bold">Thời gian</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRepairs.map((repair) => (
                <tr key={repair.id} className="hover:bg-gray-50/50 transition-colors group">
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
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar size={12} />
                        <span>Nhận: {new Date(repair.receivedDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {repair.returnDate && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold">
                          <CheckCircle2 size={12} />
                          <span>Trả: {new Date(repair.returnDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(repair.status)}`}>
                      {repair.status}
                    </span>
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
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingRepair ? 'Cập nhật phiếu sửa chữa' : 'Tạo phiếu sửa chữa mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thông tin khách hàng</h4>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên khách hàng *</label>
                    <input 
                      required
                      type="text"
                      value={formData.customerName}
                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số điện thoại *</label>
                    <input 
                      required
                      type="text"
                      value={formData.customerPhone}
                      onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
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
                    <input 
                      type="text"
                      value={formData.technician}
                      onChange={e => setFormData({...formData, technician: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
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
    </div>
  );
};

export default Repairs;
