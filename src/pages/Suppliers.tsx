import React, { useState } from 'react';
import { AppData, Supplier } from '../types';
import { Building2, Search, Plus, Edit, Trash2, X } from 'lucide-react';

interface SuppliersProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collection: keyof AppData, item: any) => Promise<void>;
  updateItem: (collection: keyof AppData, id: string, item: any) => Promise<void>;
  deleteItem: (collection: keyof AppData, id: string) => Promise<void>;
  isAdmin?: boolean;
}

export function Suppliers({ data, updateData, addItem, updateItem, deleteItem, isAdmin }: SuppliersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    products: '',
    notes: ''
  });

  const filteredSuppliers = data.suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm) ||
    s.products.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa nhà cung cấp này?')) {
      try {
        await deleteItem('suppliers', id);
      } catch (error) {
        console.error('Lỗi khi xóa nhà cung cấp:', error);
      }
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address || '',
      products: supplier.products || '',
      notes: supplier.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const existingSupplier = data.suppliers.find(s => s.id === editingId);
        if (!existingSupplier) return;

        await updateItem('suppliers', editingId, {
          ...existingSupplier,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          products: formData.products,
          notes: formData.notes
        });
      } else {
        // Robust ID generation
        const maxId = data.suppliers.reduce((max, s) => {
          const idNum = parseInt(s.id.replace('NCC', ''));
          return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);

        const newSupplier: Supplier = {
          id: `NCC${String(maxId + 1).padStart(3, '0')}`,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          products: formData.products,
          notes: formData.notes,
          debt: 0
        };
        
        await addItem('suppliers', newSupplier);
      }
      
      setIsAddModalOpen(false);
      setEditingId(null);
      setFormData({
        name: '', phone: '', email: '', address: '', products: '', notes: ''
      });
    } catch (error) {
      console.error('Lỗi khi lưu nhà cung cấp:', error);
    }
  };

  return (
    <div>
      <div className="animate-in fade-in duration-500">
        {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng nhà cung cấp</p>
            <h3 className="text-2xl font-bold text-gray-900">{data.suppliers.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Building2 size={24} />
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
              placeholder="Tìm tên, SĐT, hoặc sản phẩm cung cấp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '', phone: '', email: '', address: '', products: '', notes: ''
                });
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={18} />
              Thêm nhà cung cấp
            </button>
          )}
        </div>

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Nhà cung cấp</th>
                <th className="p-4 font-medium">Liên hệ</th>
                <th className="p-4 font-medium">Sản phẩm cung cấp</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSuppliers.map((supplier) => (
                <tr 
                  key={supplier.id} 
                  onClick={() => handleEdit(supplier)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{supplier.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{supplier.id}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-900">📞 {supplier.phone}</div>
                    <div className="text-sm text-gray-500 mt-1">✉️ {supplier.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full inline-block">
                      {supplier.products}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {isAdmin && (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(supplier);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Sửa thông tin"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id} 
              onClick={() => handleEdit(supplier)}
              className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{supplier.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{supplier.id}</div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(supplier);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(supplier.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-gray-400 w-5">📞</span>
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-gray-400 w-5">✉️</span>
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="mt-1">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Sản phẩm cung cấp</p>
                  <div className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full inline-block">
                    {supplier.products}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Không tìm thấy nhà cung cấp nào.
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Add Supplier Modal */}
    {isAddModalOpen && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
        <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Công ty TNHH Phân Phối ABC"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input 
                    type="email" required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: contact@abc.com"
                  />
                </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm cung cấp *</label>
                  <input 
                    type="text" required
                    value={formData.products}
                    onChange={e => setFormData({...formData, products: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Laptop, Linh kiện PC"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ghi chú thêm về nhà cung cấp..."
                    rows={3}
                  />
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
                  {editingId ? 'Cập nhật' : 'Lưu nhà cung cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
