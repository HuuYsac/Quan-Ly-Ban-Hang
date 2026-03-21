import React, { useState } from 'react';
import { AppData, Order, OrderItem } from '../types';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart, Plus, Search, Eye, Printer, Trash2, X, PlusCircle, Edit } from 'lucide-react';

interface OrdersProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function Orders({ data, updateData }: OrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    paymentMethod: 'Tiền mặt',
    paymentStatus: 'Đã thanh toán' as 'Công nợ' | 'Đã thanh toán',
    notes: ''
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ productId: '', name: '', quantity: 1, price: 0, discount: 0 }]);

  const filteredOrders = data.orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
      const orderToDelete = data.orders.find(o => o.id === id);
      if (!orderToDelete) return;

      // Revert stock
      const updatedProducts = [...data.products];
      orderToDelete.products.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + item.quantity };
        }
      });

      // Revert debt
      const updatedCustomers = [...data.customers];
      if (orderToDelete.paymentStatus === 'Công nợ') {
        const cIdx = updatedCustomers.findIndex(c => c.id === orderToDelete.customerId);
        if (cIdx > -1) {
          updatedCustomers[cIdx] = { ...updatedCustomers[cIdx], debt: updatedCustomers[cIdx].debt - orderToDelete.total };
        }
      }

      updateData({
        orders: data.orders.filter(o => o.id !== id),
        products: updatedProducts,
        customers: updatedCustomers
      });
    }
  };

  const togglePaymentStatus = (id: string) => {
    const order = data.orders.find(o => o.id === id);
    if (!order) return;

    const newPaymentStatus = order.paymentStatus === 'Đã thanh toán' ? 'Công nợ' : 'Đã thanh toán';
    const newStatus = newPaymentStatus === 'Đã thanh toán' ? 'Hoàn thành' : 'Đang xử lý';

    // Update debt
    const updatedCustomers = [...data.customers];
    const cIdx = updatedCustomers.findIndex(c => c.id === order.customerId);
    if (cIdx > -1) {
      const debtChange = newPaymentStatus === 'Công nợ' ? order.total : -order.total;
      updatedCustomers[cIdx] = { ...updatedCustomers[cIdx], debt: updatedCustomers[cIdx].debt + debtChange };
    }

    updateData({
      orders: data.orders.map(o => o.id === id ? { ...o, paymentStatus: newPaymentStatus, status: newStatus } : o),
      customers: updatedCustomers
    });
  };

  const handleAddItem = () => setOrderItems([...orderItems, { productId: '', name: '', quantity: 1, price: 0, discount: 0 }]);
  
  const handleRemoveItem = (index: number) => setOrderItems(orderItems.filter((_, i) => i !== index));
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...orderItems];
    if (field === 'productId') {
      const product = data.products.find(p => p.id === value);
      if (product) {
        newItems[index] = { ...newItems[index], productId: product.id, name: product.name, price: product.price };
      } else {
        newItems[index] = { ...newItems[index], productId: '', name: '', price: 0 };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.price * (1 - (item.discount || 0) / 100);
      return sum + subtotal;
    }, 0);
  };

  const handleEdit = (order: Order) => {
    setEditingId(order.id);
    setFormData({
      customerId: order.customerId,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes || ''
    });
    setOrderItems(order.products.map(p => ({ ...p })));
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert('Vui lòng chọn khách hàng');
    
    const validItems = orderItems.filter(item => item.productId);
    if (validItems.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm');

    const customer = data.customers.find(c => c.id === formData.customerId);
    if (!customer) return;

    let total = 0;
    const finalItems = validItems.map(item => {
      const subtotal = item.quantity * item.price * (1 - (item.discount || 0) / 100);
      total += subtotal;
      return { ...item, subtotal };
    });

    const updatedProducts = [...data.products];
    const updatedCustomers = [...data.customers];
    let newOrders = [...data.orders];

    if (editingId) {
      const oldOrder = data.orders.find(o => o.id === editingId);
      if (!oldOrder) return;

      // 1. Revert old order stock
      oldOrder.products.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock + item.quantity };
        }
      });

      // 2. Revert old order debt
      if (oldOrder.paymentStatus === 'Công nợ') {
        const cIdx = updatedCustomers.findIndex(c => c.id === oldOrder.customerId);
        if (cIdx > -1) {
          updatedCustomers[cIdx] = { ...updatedCustomers[cIdx], debt: updatedCustomers[cIdx].debt - oldOrder.total };
        }
      }

      // 3. Apply new order stock
      finalItems.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock - item.quantity };
        }
      });

      // 4. Apply new order debt
      if (formData.paymentStatus === 'Công nợ') {
        const cIdx = updatedCustomers.findIndex(c => c.id === customer.id);
        if (cIdx > -1) {
          updatedCustomers[cIdx] = { ...updatedCustomers[cIdx], debt: updatedCustomers[cIdx].debt + total };
        }
      }

      // 5. Update order
      newOrders = newOrders.map(o => o.id === editingId ? {
        ...o,
        customerId: customer.id,
        customerName: customer.name,
        products: finalItems,
        total,
        status: formData.paymentStatus === 'Đã thanh toán' ? 'Hoàn thành' : 'Đang xử lý',
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes
      } : o);

    } else {
      const now = new Date();
      const newOrder: Order = {
        id: `DH${String(data.orders.length + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        products: finalItems,
        total,
        status: formData.paymentStatus === 'Đã thanh toán' ? 'Hoàn thành' : 'Đang xử lý',
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes
      };

      // Apply new order stock
      finalItems.forEach(item => {
        const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
        if (pIdx > -1) {
          updatedProducts[pIdx] = { ...updatedProducts[pIdx], stock: updatedProducts[pIdx].stock - item.quantity };
        }
      });

      // Apply new order debt
      if (formData.paymentStatus === 'Công nợ') {
        const cIdx = updatedCustomers.findIndex(c => c.id === customer.id);
        if (cIdx > -1) {
          updatedCustomers[cIdx] = { ...updatedCustomers[cIdx], debt: updatedCustomers[cIdx].debt + total };
        }
      }

      newOrders = [newOrder, ...newOrders];
    }

    updateData({
      orders: newOrders,
      products: updatedProducts,
      customers: updatedCustomers
    });

    setIsAddModalOpen(false);
    setEditingId(null);
    setFormData({ customerId: '', paymentMethod: 'Tiền mặt', paymentStatus: 'Đã thanh toán', notes: '' });
    setOrderItems([{ productId: '', name: '', quantity: 1, price: 0, discount: 0 }]);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Actions & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã đơn, khách hàng..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ customerId: '', paymentMethod: 'Tiền mặt', paymentStatus: 'Đã thanh toán', notes: '' });
              setOrderItems([{ productId: '', name: '', quantity: 1, price: 0, discount: 0 }]);
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Tạo đơn hàng mới
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Mã đơn</th>
                <th className="p-4 font-medium">Khách hàng</th>
                <th className="p-4 font-medium">Thời gian</th>
                <th className="p-4 font-medium text-right">Tổng tiền</th>
                <th className="p-4 font-medium text-center">Trạng thái</th>
                <th className="p-4 font-medium text-center">Thanh toán</th>
                <th className="p-4 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{order.id}</td>
                  <td className="p-4 text-sm text-gray-700">{order.customerName}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {order.date} <span className="text-xs ml-1">{order.time}</span>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${order.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-800' : 
                        order.status === 'Hủy' ? 'bg-red-100 text-red-800' : 
                        'bg-amber-100 text-amber-800'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onDoubleClick={() => togglePaymentStatus(order.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold transition-colors
                        ${order.paymentStatus === 'Đã thanh toán' 
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                          : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                      title="Double click để đổi trạng thái"
                    >
                      {order.paymentStatus === 'Đã thanh toán' ? '✓ Đã TT' : 'Công nợ'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => {
                          setViewOrder(order);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="In hóa đơn"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => setViewOrder(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Sửa"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(order.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Không tìm thấy đơn hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-h-none print:overflow-visible">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 print:hidden">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{viewOrder.id}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                  title="In hóa đơn"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setViewOrder(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 print:p-0">
              <div className="hidden print:block text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">HÓA ĐƠN BÁN HÀNG</h1>
                <p className="text-gray-500">Mã đơn: {viewOrder.id}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
                  <p className="font-medium text-gray-900">{viewOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Thời gian</p>
                  <p className="font-medium text-gray-900">{viewOrder.date} {viewOrder.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                  <p className="font-medium text-gray-900">{viewOrder.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Thanh toán</p>
                  <p className="font-medium text-gray-900">{viewOrder.paymentStatus} ({viewOrder.paymentMethod})</p>
                </div>
              </div>
              
              <h4 className="font-medium text-gray-900 mb-3">Sản phẩm</h4>
              <table className="w-full text-left border-collapse mb-6">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm print:bg-gray-100">
                    <th className="p-3 font-medium rounded-tl-lg print:border print:border-gray-300">Tên sản phẩm</th>
                    <th className="p-3 font-medium text-center print:border print:border-gray-300">Số lượng</th>
                    <th className="p-3 font-medium text-right print:border print:border-gray-300">Đơn giá</th>
                    <th className="p-3 font-medium text-center print:border print:border-gray-300">Giảm giá</th>
                    <th className="p-3 font-medium text-right rounded-tr-lg print:border print:border-gray-300">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                  {viewOrder.products.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 text-sm text-gray-900 print:border print:border-gray-300">{item.name}</td>
                      <td className="p-3 text-sm text-gray-900 text-center print:border print:border-gray-300">{item.quantity}</td>
                      <td className="p-3 text-sm text-gray-900 text-right print:border print:border-gray-300">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-sm text-gray-900 text-center print:border print:border-gray-300">{item.discount || 0}%</td>
                      <td className="p-3 text-sm font-medium text-gray-900 text-right print:border print:border-gray-300">{formatCurrency(item.subtotal || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="p-3 text-right font-medium text-gray-900 print:border print:border-gray-300">Tổng cộng:</td>
                    <td className="p-3 text-right font-bold text-blue-600 text-lg print:border print:border-gray-300">{formatCurrency(viewOrder.total)}</td>
                  </tr>
                </tfoot>
              </table>
              
              {viewOrder.notes && (
                <div className="print:mt-8">
                  <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">{viewOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</h3>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                  <select 
                    required
                    value={formData.customerId}
                    onChange={e => setFormData({...formData, customerId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Chọn khách hàng</option>
                    {data.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Thẻ tín dụng">Thẻ tín dụng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái thanh toán</label>
                  <select 
                    value={formData.paymentStatus}
                    onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Công nợ">Công nợ</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <input 
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ghi chú đơn hàng..."
                  />
                </div>
              </div>

              {/* Products List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Sản phẩm *</label>
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <PlusCircle size={16} /> Thêm dòng
                  </button>
                </div>
                
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="w-full md:flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Sản phẩm</label>
                        <select 
                          required
                          value={item.productId}
                          onChange={e => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        >
                          <option value="">Chọn sản phẩm</option>
                          {data.products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                              {p.name} - {formatCurrency(p.price)} (Còn: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Số lượng</label>
                        <input 
                          type="number" required min="1"
                          value={item.quantity}
                          onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Giảm %</label>
                        <input 
                          type="number" min="0" max="100"
                          value={item.discount}
                          onChange={e => handleItemChange(index, 'discount', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div className="w-32">
                        <label className="block text-xs text-gray-500 mb-1">Thành tiền</label>
                        <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900">
                          {formatCurrency(item.quantity * item.price * (1 - (item.discount || 0) / 100))}
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={orderItems.length === 1}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-lg text-gray-900">
                  Tổng cộng: <span className="font-bold text-blue-600 text-xl ml-2">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="flex gap-3">
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
                    {editingId ? 'Cập nhật' : 'Tạo đơn hàng'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
