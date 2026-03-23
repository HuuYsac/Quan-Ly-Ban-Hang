import React, { useState } from 'react';
import { AppData, Category } from '../types';
import { FolderTree, Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { Toast, ToastType, ConfirmModal } from '../components/Notification';

interface CategoriesProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collection: keyof AppData, item: any) => Promise<void>;
  updateItem: (collection: keyof AppData, id: string, item: any) => Promise<void>;
  deleteItem: (collection: keyof AppData, id: string) => Promise<void>;
}

export function Categories({ data, updateData, addItem, updateItem, deleteItem }: CategoriesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };
  const [formData, setFormData] = useState({
    name: '',
    parent: ''
  });

  const filteredCategories = data.categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteItem('categories', id);
      setConfirmingDelete(null);
      showToast('Đã xóa danh mục thành công');
    } catch (error) {
      showToast('Lỗi khi xóa danh mục', 'error');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      parent: category.parent || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const category = data.categories.find(c => c.id === editingId);
        if (category) {
          await updateItem('categories', editingId, {
            ...category,
            name: formData.name,
            parent: formData.parent || null
          });
        }
      } else {
        // Robust ID generation
        const maxId = data.categories.reduce((max, c) => {
          const idNum = parseInt(c.id.replace('DM', ''));
          return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);
        
        const newCategory: Category = {
          id: `DM${String(maxId + 1).padStart(3, '0')}`,
          name: formData.name,
          parent: formData.parent || null
        };
        
        await addItem('categories', newCategory);
      }
      
      setIsAddModalOpen(false);
      setEditingId(null);
      showToast(editingId ? 'Đã cập nhật danh mục thành công' : 'Đã thêm danh mục thành công');
      setFormData({
        name: '', parent: ''
      });
    } catch (error) {
      showToast('Lỗi khi lưu danh mục', 'error');
    }
  };

  return (
    <div>
      <div className="animate-in fade-in duration-500">
        {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng danh mục</p>
            <h3 className="text-2xl font-bold text-gray-900">{data.categories.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <FolderTree size={24} />
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
              placeholder="Tìm tên danh mục..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', parent: ''
              });
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Thêm danh mục
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Tên danh mục</th>
                <th className="p-4 font-medium">Danh mục cha</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{category.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{category.id}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {category.parent ? data.categories.find(c => c.id === category.parent)?.name || category.parent : <span className="text-gray-400 italic">Không có</span>}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(category)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Sửa thông tin"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setConfirmingDelete(category.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    Không tìm thấy danh mục nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Laptop Gaming"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục cha</label>
                  <select 
                    value={formData.parent}
                    onChange={e => setFormData({...formData, parent: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Không có (Danh mục gốc)</option>
                    {data.categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
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
                  {editingId ? 'Cập nhật' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmingDelete && (
        <ConfirmModal 
          isOpen={!!confirmingDelete}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa danh mục này? Tất cả dữ liệu liên quan sẽ bị mất."
          onConfirm={() => handleDelete(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
        />
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
}
