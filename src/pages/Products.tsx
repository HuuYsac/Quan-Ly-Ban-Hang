import React, { useState } from 'react';
import { AppData, Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Toast, ToastType, ConfirmModal } from '../components/Notification';

interface ProductsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collectionName: string, item: any) => Promise<void>;
  updateItem: (collectionName: string, id: string, item: any) => Promise<void>;
  deleteItem: (collectionName: string, id: string) => Promise<void>;
  isAdmin?: boolean;
}

export function Products({ data, updateData, addItem, updateItem, deleteItem, isAdmin }: ProductsProps) {
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
    category: '',
    price: '',
    importPrice: '',
    stock: '',
    minStock: '10',
    supplier: ''
  });

  const filteredProducts = data.products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = data.products.filter(p => p.stock < p.minStock).length;

  const handleDelete = async (id: string) => {
    try {
      await deleteItem('products', id);
      setConfirmingDelete(null);
      showToast('Đã xóa sản phẩm thành công');
    } catch (error) {
      console.error('Lỗi khi xóa sản phẩm:', error);
      showToast('Có lỗi xảy ra khi xóa sản phẩm', 'error');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      importPrice: product.importPrice ? product.importPrice.toString() : '',
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      supplier: product.supplier || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const productToUpdate = data.products.find(p => p.id === editingId);
        if (!productToUpdate) return;

        const updatedProduct = {
          ...productToUpdate,
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          importPrice: formData.importPrice ? Number(formData.importPrice) : undefined,
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          supplier: formData.supplier,
          updatedAt: new Date().toISOString()
        };

        await updateItem('products', editingId, updatedProduct);
      } else {
        // Robust ID generation: find max ID and increment
        const maxId = data.products.reduce((max, p) => {
          const idNum = parseInt(p.id.replace('SP', ''));
          return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);

        const newProduct: Product = {
          id: `SP${String(maxId + 1).padStart(3, '0')}`,
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          importPrice: formData.importPrice ? Number(formData.importPrice) : undefined,
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          supplier: formData.supplier,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await addItem('products', newProduct);
      }
      
      setIsAddModalOpen(false);
      setEditingId(null);
      showToast(editingId ? 'Đã cập nhật sản phẩm thành công' : 'Đã thêm sản phẩm thành công');
      setFormData({
        name: '', category: '', price: '', importPrice: '', stock: '', minStock: '10', supplier: ''
      });
    } catch (error) {
      console.error('Lỗi khi lưu sản phẩm:', error);
      showToast('Có lỗi xảy ra khi lưu sản phẩm', 'error');
    }
  };

  return (
    <div>
      <div className="animate-in fade-in duration-500">
        {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng sản phẩm</p>
            <h3 className="text-2xl font-bold text-gray-900">{data.products.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Package size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sắp hết hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <AlertTriangle size={24} />
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
              placeholder="Tìm kiếm sản phẩm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', category: '', price: '', importPrice: '', stock: '', minStock: '10', supplier: ''
              });
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Thêm sản phẩm
          </button>
        </div>

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Sản phẩm</th>
                <th className="p-4 font-medium">Danh mục</th>
                {isAdmin && <th className="p-4 font-medium text-right">Giá nhập</th>}
                <th className="p-4 font-medium text-right">Giá bán</th>
                <th className="p-4 font-medium text-center">Tồn kho</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{product.category}</td>
                  {isAdmin && (
                    <td className="p-4 text-sm font-medium text-gray-500 text-right">
                      {product.importPrice ? formatCurrency(product.importPrice) : 'N/A'}
                    </td>
                  )}
                  <td className="p-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {product.stock < product.minStock ? (
                        <AlertTriangle size={14} className="text-amber-500" />
                      ) : (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      )}
                      {product.stock}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => setConfirmingDelete(product.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <Package size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEdit(product)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => setConfirmingDelete(product.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Danh mục</p>
                  <p className="text-gray-700 font-medium">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Giá bán</p>
                  <p className="text-blue-600 font-bold">{formatCurrency(product.price)}</p>
                </div>
                {isAdmin && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Giá nhập</p>
                    <p className="text-gray-700 font-medium">{product.importPrice ? formatCurrency(product.importPrice) : 'N/A'}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tồn kho</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {product.stock < product.minStock ? (
                      <AlertTriangle size={14} className="text-amber-500" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    )}
                    {product.stock}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Nhà cung cấp</p>
                  <p className="text-gray-700 truncate">{product.supplier || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Không tìm thấy sản phẩm nào.
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Add Product Modal */}
    {isAddModalOpen && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
        <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-gray-900">
              {editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: MacBook Pro M3 Max"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Chọn danh mục</option>
                    {data.categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                  <select 
                    value={formData.supplier}
                    onChange={e => setFormData({...formData, supplier: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {data.suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VNĐ) *</label>
                  <input 
                    type="number" required min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 25000000"
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (VNĐ)</label>
                    <input 
                      type="number" min="0"
                      value={formData.importPrice}
                      onChange={e => setFormData({...formData, importPrice: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="VD: 20000000"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho ban đầu *</label>
                  <input 
                    type="number" required min="0"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho tối thiểu (Cảnh báo) *</label>
                  <input 
                    type="number" required min="0"
                    value={formData.minStock}
                    onChange={e => setFormData({...formData, minStock: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="VD: 5"
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
                  {editingId ? 'Cập nhật' : 'Lưu sản phẩm'}
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
          message="Bạn có chắc chắn muốn xóa sản phẩm này? Tất cả dữ liệu liên quan sẽ bị mất."
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
