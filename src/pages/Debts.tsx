import React, { useState } from 'react';
import { AppData, Customer, Supplier } from '../types';
import { CreditCard, Search, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface DebtsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collection: keyof AppData, item: any) => Promise<void>;
  updateItem: (collection: keyof AppData, id: string, item: any) => Promise<void>;
  deleteItem: (collection: keyof AppData, id: string) => Promise<void>;
  isAdmin?: boolean;
}

export function Debts({ data, updateData, addItem, updateItem, deleteItem, isAdmin }: DebtsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [collectAmount, setCollectAmount] = useState('');

  const handleCollect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedSupplier(null);
    setCollectAmount(customer.debt.toString());
    setIsCollectModalOpen(true);
  };

  const handlePay = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSelectedCustomer(null);
    setCollectAmount(supplier.debt.toString());
    setIsCollectModalOpen(true);
  };

  const submitCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(collectAmount);

    try {
      if (selectedCustomer) {
        if (amount <= 0 || amount > selectedCustomer.debt) {
          alert('Số tiền thu không hợp lệ');
          return;
        }
        await updateItem('customers', selectedCustomer.id, {
          ...selectedCustomer,
          debt: selectedCustomer.debt - amount
        });
      } else if (selectedSupplier) {
        if (amount <= 0 || amount > selectedSupplier.debt) {
          alert('Số tiền trả không hợp lệ');
          return;
        }
        await updateItem('suppliers', selectedSupplier.id, {
          ...selectedSupplier,
          debt: selectedSupplier.debt - amount
        });
      }

      setIsCollectModalOpen(false);
      setSelectedCustomer(null);
      setSelectedSupplier(null);
      setCollectAmount('');
    } catch (error) {
      console.error('Lỗi khi cập nhật công nợ:', error);
    }
  };

  const filteredCustomers = data.customers.filter(c => 
    c.debt > 0 && (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    )
  );

  const filteredSuppliers = data.suppliers.filter(s => 
    s.debt > 0 && (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone.includes(searchTerm)
    )
  );

  const totalCustomerDebt = data.customers.reduce((sum, c) => sum + c.debt, 0);
  const totalSupplierDebt = data.suppliers.reduce((sum, s) => sum + (s.debt || 0), 0);

  return (
    <div>
      <div className="animate-in fade-in duration-500">
        {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Khách hàng nợ (Phải thu)</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalCustomerDebt)}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <ArrowDownRight size={24} />
          </div>
        </div>
        
        {isAdmin && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-rose-500">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Nợ nhà cung cấp (Phải trả)</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalSupplierDebt)}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
              <ArrowUpRight size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Actions & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <button 
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'customers' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Phải thu khách hàng
            </button>
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('suppliers')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Phải trả nhà cung cấp
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === 'customers' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Khách hàng</th>
                  <th className="p-4 font-medium">Liên hệ</th>
                  <th className="p-4 font-medium text-right">Số tiền nợ</th>
                  <th className="p-4 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{customer.id}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {customer.phone}
                    </td>
                    <td className="p-4 text-right font-semibold text-rose-600">
                      {formatCurrency(customer.debt)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleCollect(customer)}
                        className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                      >
                        Thu nợ
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Không có khách hàng nào đang nợ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Nhà cung cấp</th>
                  <th className="p-4 font-medium">Liên hệ</th>
                  <th className="p-4 font-medium text-right">Số tiền nợ</th>
                  <th className="p-4 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{supplier.id}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {supplier.phone}
                    </td>
                    <td className="p-4 text-right font-semibold text-rose-600">
                      {formatCurrency(supplier.debt)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handlePay(supplier)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                      >
                        Trả nợ
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Không có nhà cung cấp nào đang nợ.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        </div>
      </div>

      {/* Collect Debt Modal */}
      {isCollectModalOpen && (selectedCustomer || selectedSupplier) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedCustomer ? 'Thu nợ khách hàng' : 'Trả nợ nhà cung cấp'}
              </h3>
              <button 
                onClick={() => {
                  setIsCollectModalOpen(false);
                  setSelectedCustomer(null);
                  setSelectedSupplier(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={submitCollect} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    {selectedCustomer ? 'Khách hàng' : 'Nhà cung cấp'}
                  </p>
                  <p className="font-medium text-gray-900">
                    {selectedCustomer ? selectedCustomer.name : selectedSupplier?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tổng nợ hiện tại</p>
                  <p className="font-bold text-rose-600">
                    {formatCurrency(selectedCustomer ? selectedCustomer.debt : (selectedSupplier?.debt || 0))}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedCustomer ? 'Số tiền thu (VNĐ) *' : 'Số tiền trả (VNĐ) *'}
                  </label>
                  <input 
                    type="number" required min="1" max={selectedCustomer ? selectedCustomer.debt : (selectedSupplier?.debt || 0)}
                    value={collectAmount}
                    onChange={e => setCollectAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsCollectModalOpen(false);
                    setSelectedCustomer(null);
                    setSelectedSupplier(null);
                  }}
                  className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-600/20"
                >
                  {selectedCustomer ? 'Xác nhận thu' : 'Xác nhận trả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
