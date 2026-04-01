import React, { useState } from 'react';
import { AppData } from '../types';
import { ClipboardList, Search, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface InventoryProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  isAdmin?: boolean;
}

export function Inventory({ data, updateData, isAdmin }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [viewProduct, setViewProduct] = useState<any | null>(null);

  const filteredProducts = data.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'low') return p.stock > 0 && p.stock < p.minStock;
    if (filter === 'out') return p.stock === 0;
    return true;
  });

  const totalValue = data.products.reduce((sum, p) => sum + (p.stock * (p.importPrice || p.price * 0.8)), 0);
  const lowStockCount = data.products.filter(p => p.stock > 0 && p.stock < p.minStock).length;
  const outOfStockCount = data.products.filter(p => p.stock === 0).length;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {isAdmin && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Tổng giá trị tồn kho (Ước tính)</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <ClipboardList size={24} />
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sắp hết hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Hết hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{outOfStockCount}</h3>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
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
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Sắp hết
            </button>
            <button 
              onClick={() => setFilter('out')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === 'out' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Hết hàng
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Sản phẩm</th>
                <th className="p-4 font-medium">Danh mục</th>
                <th className="p-4 font-medium text-center">Tồn kho</th>
                <th className="p-4 font-medium text-center">Tối thiểu</th>
                <th className="p-4 font-medium text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => setViewProduct(product)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{product.id}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{product.category}</td>
                  <td className="p-4 text-center font-semibold text-gray-900">
                    {product.stock}
                  </td>
                  <td className="p-4 text-center text-gray-500">
                    {product.minStock}
                  </td>
                  <td className="p-4 text-center">
                    {product.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <AlertTriangle size={14} /> Hết hàng
                      </span>
                    ) : product.stock < product.minStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <AlertTriangle size={14} /> Sắp hết
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={14} /> Đủ hàng
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              onClick={() => setViewProduct(product)}
              className="p-4 space-y-3 cursor-pointer hover:bg-gray-50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.id}</div>
                </div>
                {product.stock === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    Hết hàng
                  </span>
                ) : product.stock < product.minStock ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                    Sắp hết
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Đủ hàng
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Danh mục: {product.category}</span>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Tồn</div>
                    <div className="font-bold text-gray-900">{product.stock}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 uppercase font-bold">Tối thiểu</div>
                    <div className="text-gray-500">{product.minStock}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-md h-full sm:h-auto animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ClipboardList size={24} />
                </div>
                <button 
                  onClick={() => setViewProduct(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{viewProduct.name}</h3>
              <p className="text-sm text-gray-500 mb-6">{viewProduct.category}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Tồn kho</p>
                  <p className={`text-lg font-bold ${viewProduct.stock < viewProduct.minStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {viewProduct.stock}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Giá bán</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(viewProduct.price)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Tối thiểu</p>
                  <p className="text-lg font-bold text-gray-500">{viewProduct.minStock}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Mã SP</p>
                  <p className="text-sm font-mono font-bold text-gray-900">{viewProduct.id}</p>
                </div>
              </div>

              <button 
                onClick={() => setViewProduct(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
