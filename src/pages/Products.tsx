import React, { useState } from 'react';
import { AppData, Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle2, X, Facebook, MessageSquare, Copy, Loader2, Sparkles } from 'lucide-react';
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
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'newest'>('newest');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [newlyCreatedCategory, setNewlyCreatedCategory] = useState<any | null>(null);
  const [newlyCreatedSupplier, setNewlyCreatedSupplier] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [generatedAIContent, setGeneratedAIContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
    supplier: '',
    cpu: '',
    ram: '',
    ssd: '',
    screen: '',
    status_info: ''
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    parent: ''
  });
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    products: '',
    notes: ''
  });

  const filteredProducts = data.products
    .filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchesSupplier = filterSupplier === 'all' || p.supplier === filterSupplier;
      
      return matchesSearch && matchesCategory && matchesSupplier;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price-desc') {
        return b.price - a.price;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      }
      return 0;
    });

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
      supplier: product.supplier || '',
      cpu: product.cpu || '',
      ram: product.ram || '',
      ssd: product.ssd || '',
      screen: product.screen || '',
      status_info: product.status_info || ''
    });
    setGeneratedAIContent('');
    setIsAddModalOpen(true);
  };

  const generateAIContent = async (type: 'fb' | 'shorts') => {
    if (!formData.name) {
      setToast({ message: 'Vui lòng nhập tên sản phẩm để tạo content', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const systemInstruction = `
Bạn là Hữu Laptop - Một chuyên gia kỹ thuật máy tính chân thành và thực dụng.
Mục tiêu của bạn là hỗ trợ nhân viên tư vấn sản phẩm và tạo nội dung marketing chuyên sâu.

[PHONG CÁCH & ĐỊNH VỊ]
- Xưng hô: Xưng là "Hữu Laptop" hoặc "mình", gọi khách hàng là "anh em" hoặc "khách".
- Giọng văn: Chân thành, thực dụng, góc nhìn chuyên gia kỹ thuật cứng tay. Tránh từ ngữ sáo rỗng, hoa mỹ, "lùa gà".
- Trọng tâm: Nhấn mạnh độ bền bỉ, tính ổn định, nhiệt độ mát mẻ, khả năng gánh tab trình duyệt/giả lập.

[NGUYÊN TẮC VỀ DỊCH VỤ]
1. Bảo hành: Không tự bịa số tháng. Luôn ghi: "Thời gian bảo hành linh hoạt, thời hạn phụ thuộc chuẩn theo gói dịch vụ anh em lựa chọn".
2. Hệ điều hành: Máy luôn được tối ưu sâu, bung file chuẩn (Sysprep/Acronis) nên cực kỳ ổn định, không lỗi vặt.
3. Phần mềm: Có sẵn Office 2021 Standard (250K) hoặc bản Bind vĩnh viễn (1.490K) cho anh em làm việc, không lo crack virus.
4. Địa lý: Shop tại Bình Phước, nhận ship toàn quốc có video test máy kỹ càng.
`;

      const specs = `CPU: ${formData.cpu}, RAM: ${formData.ram}, SSD: ${formData.ssd}, Màn: ${formData.screen}, Tình trạng: ${formData.status_info}`;
      const prompt = type === 'fb' 
        ? `Viết bài đăng FACEBOOK bán sản phẩm: ${formData.name}. Danh mục: ${formData.category}. Cấu hình: ${specs}. Giá: ${formatCurrency(parseInt(formData.price))}. Yêu cầu: Tiêu đề in hoa, phân tích kỹ thuật chân thành, bảo hành/phần mềm chuẩn Hữu Laptop. KHÔNG dùng **.`
        : `Viết kịch bản SHORTS (video ngắn) dưới dạng bảng Markdown cho sản phẩm: ${formData.name}. Cấu hình: ${specs}. Giá: ${formatCurrency(parseInt(formData.price))}. Yêu cầu: Hook mạnh, tập trung độ bền và hiệu năng thực tế. KHÔNG dùng **.`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction,
          prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi từ máy chủ AI');
      }

      const result = await response.json();

      if (result.text) {
        setGeneratedAIContent(result.text.replace(/\*\*/g, ''));
      } else {
        throw new Error('Không nhận được phản hồi từ AI');
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      setToast({ message: 'Lỗi khi gọi AI: ' + (error.message || 'Lỗi không xác định'), type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Đã sao chép nội dung vào bộ nhớ tạm', type: 'success' });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCategory) return;

    try {
      setIsSubmittingCategory(true);
      const maxId = (data.categories || []).reduce((max, c) => {
        const idNum = parseInt((c.id || '').replace('DM', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);
      const newId = `DM${String(maxId + 1).padStart(3, '0')}`;
      const newCategory: any = {
        id: newId,
        name: categoryFormData.name,
        parent: categoryFormData.parent || null,
        createdAt: new Date().toISOString()
      };
      await addItem('categories', newCategory);
      setNewlyCreatedCategory(newCategory);
      setFormData({ ...formData, category: newCategory.name });
      setIsAddCategoryModalOpen(false);
      setCategoryFormData({ name: '', parent: '' });
      showToast('Đã thêm danh mục mới');
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Lỗi khi tạo danh mục', 'error');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupplier) return;

    try {
      setIsSubmittingSupplier(true);
      const maxId = (data.suppliers || []).reduce((max, s) => {
        const idNum = parseInt((s.id || '').replace('NCC', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);
      const newId = `NCC${String(maxId + 1).padStart(3, '0')}`;
      const newSupplier: any = {
        id: newId,
        name: supplierFormData.name,
        phone: supplierFormData.phone,
        email: supplierFormData.email || '',
        address: supplierFormData.address || '',
        products: supplierFormData.products || '',
        notes: supplierFormData.notes || '',
        debt: 0,
        createdAt: new Date().toISOString()
      };
      await addItem('suppliers', newSupplier);
      setNewlyCreatedSupplier(newSupplier);
      setFormData({ ...formData, supplier: newSupplier.name });
      setIsAddSupplierModalOpen(false);
      setSupplierFormData({ name: '', phone: '', email: '', address: '', products: '', notes: '' });
      showToast('Đã thêm nhà cung cấp mới');
    } catch (error) {
      console.error('Error creating supplier:', error);
      showToast('Lỗi khi tạo nhà cung cấp', 'error');
    } finally {
      setIsSubmittingSupplier(false);
    }
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
          importPrice: formData.importPrice ? Number(formData.importPrice) : null,
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          supplier: formData.supplier,
          cpu: formData.cpu,
          ram: formData.ram,
          ssd: formData.ssd,
          screen: formData.screen,
          status_info: formData.status_info,
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
          importPrice: formData.importPrice ? Number(formData.importPrice) : null,
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          supplier: formData.supplier,
          cpu: formData.cpu,
          ram: formData.ram,
          ssd: formData.ssd,
          screen: formData.screen,
          status_info: formData.status_info,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await addItem('products', newProduct);
      }
      
      setIsAddModalOpen(false);
      setEditingId(null);
      showToast(editingId ? 'Đã cập nhật sản phẩm thành công' : 'Đã thêm sản phẩm thành công');
      setFormData({
        name: '', category: '', price: '', importPrice: '', stock: '', minStock: '10', supplier: '', cpu: '', ram: '', ssd: '', screen: '', status_info: ''
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
        <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên, mã, danh mục, nhà cung cấp..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="all">Tất cả danh mục</option>
                {data.categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="all">Tất cả nhà cung cấp</option>
                {data.suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              >
                <option value="newest">Mới nhất</option>
                <option value="name">Tên A-Z</option>
                <option value="price-asc">Giá: Thấp đến Cao</option>
                <option value="price-desc">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', category: '', price: '', importPrice: '', stock: '', minStock: '10', supplier: '', cpu: '', ram: '', ssd: '', screen: '', status_info: ''
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
                <th className="p-4 font-medium">Nhà cung cấp</th>
                {isAdmin && <th className="p-4 font-medium text-right">Giá nhập</th>}
                <th className="p-4 font-medium text-right">Giá bán</th>
                <th className="p-4 font-medium text-center">Tồn kho</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => handleEdit(product)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
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
                  <td className="p-4 text-sm text-gray-600">{product.supplier || 'N/A'}</td>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(product);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDelete(product.id);
                        }}
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
            <div 
              key={product.id} 
              onClick={() => handleEdit(product)}
              className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-all"
            >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(product.id);
                    }}
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

    {/* Add Category Modal */}
    {isAddCategoryModalOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" />
              Thêm danh mục mới
            </h3>
            <button onClick={() => setIsAddCategoryModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tên danh mục *</label>
              <input type="text" required value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="VD: Laptop Gaming" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Danh mục cha</label>
              <select value={categoryFormData.parent} onChange={e => setCategoryFormData({...categoryFormData, parent: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">Không có (Danh mục gốc)</option>
                {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsAddCategoryModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Hủy</button>
              <button type="submit" disabled={isSubmittingCategory} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                {isSubmittingCategory ? 'Đang lưu...' : 'Lưu danh mục'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Add Supplier Modal */}
    {isAddSupplierModalOpen && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-blue-600" />
              Thêm nhà cung cấp mới
            </h3>
            <button onClick={() => setIsAddSupplierModalOpen(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tên nhà cung cấp *</label>
                <input type="text" required value={supplierFormData.name} onChange={e => setSupplierFormData({...supplierFormData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="VD: Công ty TNHH ABC" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Số điện thoại *</label>
                <input type="text" required value={supplierFormData.phone} onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="090..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Email</label>
                <input type="email" value={supplierFormData.email} onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="ncc@gmail.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Địa chỉ</label>
                <input type="text" value={supplierFormData.address} onChange={e => setSupplierFormData({...supplierFormData, address: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Số 123, Đường..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Hủy</button>
              <button type="submit" disabled={isSubmittingSupplier} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                {isSubmittingSupplier ? 'Đang lưu...' : 'Lưu nhà cung cấp'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                    placeholder="VD: MacBook Pro M3 Max"
                  />
                </div>

                <div className="md:col-span-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 space-y-4">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} /> Thông số kỹ thuật & Tình trạng
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CPU</label>
                      <input type="text" value={formData.cpu} onChange={e => setFormData({...formData, cpu: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Intel Core i7" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">RAM</label>
                      <input type="text" value={formData.ram} onChange={e => setFormData({...formData, ram: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="16Gb" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ổ cứng</label>
                      <input type="text" value={formData.ssd} onChange={e => setFormData({...formData, ssd: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="512Gb NVMe" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Màn hình</label>
                      <input type="text" value={formData.screen} onChange={e => setFormData({...formData, screen: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="14 inch FHD" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tình trạng máy (Ngoại hình, Pin...)</label>
                    <input type="text" value={formData.status_info} onChange={e => setFormData({...formData, status_info: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Máy đẹp 99%, pin 4-5h..." />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <div className="flex gap-2">
                    <select 
                      required
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Chọn danh mục</option>
                      {data.categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      {newlyCreatedCategory && !data.categories.find(c => c.name === newlyCreatedCategory.name) && (
                        <option key={newlyCreatedCategory.id} value={newlyCreatedCategory.name}>
                          {newlyCreatedCategory.name} (Vừa thêm)
                        </option>
                      )}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddCategoryModalOpen(true)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                  <div className="flex gap-2">
                    <select 
                      value={formData.supplier}
                      onChange={e => setFormData({...formData, supplier: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Chọn nhà cung cấp</option>
                      {data.suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      {newlyCreatedSupplier && !data.suppliers.find(s => s.name === newlyCreatedSupplier.name) && (
                        <option key={newlyCreatedSupplier.id} value={newlyCreatedSupplier.name}>
                          {newlyCreatedSupplier.name} (Vừa thêm)
                        </option>
                      )}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddSupplierModalOpen(true)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
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

              {/* AI Content Assistant Section */}
              <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-blue-600 flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles size={16} />
                    Trợ lý AI Content (Hữu Laptop)
                  </h4>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      disabled={isGenerating}
                      onClick={() => generateAIContent('fb')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <Facebook size={14} />
                      Tạo Content Facebook
                    </button>
                    <button 
                      type="button"
                      disabled={isGenerating}
                      onClick={() => generateAIContent('shorts')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <MessageSquare size={14} />
                      Viết Kịch Bản Shorts
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea 
                    value={generatedAIContent}
                    onChange={(e) => setGeneratedAIContent(e.target.value)}
                    placeholder="Kết quả AI Content sẽ hiển thị ở đây..."
                    className="w-full h-48 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm leading-relaxed bg-gray-50/30"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
                      <Loader2 size={24} className="animate-spin text-blue-600 mb-2" />
                      <span className="text-xs font-medium text-gray-500 italic">Đang sáng tạo...</span>
                    </div>
                  )}
                </div>

                {generatedAIContent && (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(generatedAIContent)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all shadow-md group"
                    >
                      <Copy size={14} className="group-active:scale-95" />
                      Copy Nội Dung
                    </button>
                  </div>
                )}
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
