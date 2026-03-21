import React, { useState } from 'react';
import { AppData, Customer } from '../types';
import { formatCurrency } from '../lib/utils';
import { Users, Search, Plus, Edit, Trash2, Laptop, ShieldCheck, ShieldAlert, Wrench, Tag, X } from 'lucide-react';

interface CustomersProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function Customers({ data, updateData }: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'ca-nhan' as 'ca-nhan' | 'doanh-nghiep',
    companyName: '',
    taxCode: '',
    tags: ''
  });

  const filteredCustomers = data.customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.tags && c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      updateData({
        customers: data.customers.filter(c => c.id !== id)
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      type: customer.type,
      companyName: customer.companyName || '',
      taxCode: customer.taxCode || '',
      tags: customer.tags ? customer.tags.join(', ') : ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateData({
        customers: data.customers.map(c => 
          c.id === editingId 
            ? {
                ...c,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                type: formData.type,
                companyName: formData.type === 'doanh-nghiep' ? formData.companyName : undefined,
                taxCode: formData.type === 'doanh-nghiep' ? formData.taxCode : undefined,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
              }
            : c
        )
      });
    } else {
      const newCustomer: Customer = {
        id: `KH${String(data.customers.length + 1).padStart(3, '0')}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        type: formData.type,
        companyName: formData.type === 'doanh-nghiep' ? formData.companyName : undefined,
        taxCode: formData.type === 'doanh-nghiep' ? formData.taxCode : undefined,
        debt: 0,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        devices: []
      };
      
      updateData({
        customers: [newCustomer, ...data.customers]
      });
    }
    
    setIsAddModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '', phone: '', email: '', address: '', type: 'ca-nhan', companyName: '', taxCode: '', tags: ''
    });
  };

  const getWarrantyStatus = (customer: Customer) => {
    if (!customer.devices || customer.devices.length === 0) return null;
    
    const today = new Date();
    let activeWarranty = 0;
    let expiredWarranty = 0;

    customer.devices.forEach(device => {
      const endDate = new Date(device.warrantyEnd);
      if (endDate >= today) {
        activeWarranty++;
      } else {
        expiredWarranty++;
      }
    });

    return { activeWarranty, expiredWarranty, total: customer.devices.length };
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng khách hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{data.customers.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Máy đang bảo hành</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.customers.reduce((acc, c) => acc + (getWarrantyStatus(c)?.activeWarranty || 0), 0)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng công nợ</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.customers.reduce((acc, c) => acc + c.debt, 0))}
            </h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
            <Wrench size={24} />
          </div>
        </div>
      </div>

      {/* Actions & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, SĐT, hoặc thẻ (VD: Gamer, MacBook)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', phone: '', email: '', address: '', type: 'ca-nhan', companyName: '', taxCode: '', tags: ''
              });
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Thêm khách hàng
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Khách hàng</th>
                <th className="p-4 font-medium">Phân loại / Thẻ</th>
                <th className="p-4 font-medium">Thiết bị & Bảo hành</th>
                <th className="p-4 font-medium text-right">Công nợ</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => {
                const warrantyStatus = getWarrantyStatus(customer);
                
                return (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📞 {customer.phone}
                      </div>
                      {customer.type === 'doanh-nghiep' && customer.companyName && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          🏢 {customer.companyName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags && customer.tags.length > 0 ? (
                          customer.tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa phân loại</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {warrantyStatus ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Laptop size={14} className="text-gray-400" />
                            {warrantyStatus.total} thiết bị
                          </div>
                          <div className="flex gap-2">
                            {warrantyStatus.activeWarranty > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <ShieldCheck size={12} />
                                {warrantyStatus.activeWarranty} còn BH
                              </span>
                            )}
                            {warrantyStatus.expiredWarranty > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                <ShieldAlert size={12} />
                                {warrantyStatus.expiredWarranty} hết BH
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có thiết bị</span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-semibold text-right">
                      {customer.debt > 0 ? (
                        <span className="text-rose-600">{formatCurrency(customer.debt)}</span>
                      ) : (
                        <span className="text-gray-400">0 đ</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Sửa thông tin"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(customer.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Không tìm thấy khách hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingId(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <input 
                    type="tel" required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 0901234567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại khách hàng</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="ca-nhan">Cá nhân</option>
                    <option value="doanh-nghiep">Doanh nghiệp</option>
                  </select>
                </div>

                {formData.type === 'doanh-nghiep' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên công ty</label>
                      <input 
                        type="text"
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="VD: Công ty TNHH ABC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                      <input 
                        type="text"
                        value={formData.taxCode}
                        onChange={e => setFormData({...formData, taxCode: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="VD: 0123456789"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thẻ phân loại (Tags)</label>
                  <input 
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({...formData, tags: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Gamer, Sinh viên, MacBook (cách nhau bằng dấu phẩy)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Giúp bạn dễ dàng tìm kiếm và lọc khách hàng sau này.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20"
                >
                  {editingId ? 'Cập nhật' : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
