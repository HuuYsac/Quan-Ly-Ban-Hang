import React, { useState } from 'react';
import { AppData, Order, OrderItem } from '../types';
import { formatCurrency, numberToVietnameseWords } from '../lib/utils';
import { ShoppingCart, Plus, Search, Eye, Printer, Trash2, X, PlusCircle, Edit } from 'lucide-react';

interface OrdersProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem?: (collectionName: string, item: any) => Promise<void>;
}

export function Orders({ data, updateData, addItem }: OrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [newlyCreatedCustomer, setNewlyCreatedCustomer] = useState<any | null>(null);
  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<any | null>(null);
  const [newlyCreatedSupplier, setNewlyCreatedSupplier] = useState<any | null>(null);
  const [currentOrderItemIndex, setCurrentOrderItemIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    paymentMethod: 'Tiền mặt',
    paymentStatus: 'Đã thanh toán' as 'Công nợ' | 'Đã thanh toán',
    notes: ''
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: '',
    price: '',
    importPrice: '',
    stock: '',
    minStock: '10',
    supplier: ''
  });
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    products: '',
    notes: ''
  });
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'ca-nhan' as 'ca-nhan' | 'doanh-nghiep',
    companyName: '',
    taxCode: '',
    tags: ''
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ productId: '', name: '', quantity: 1, price: 0, discount: 0, discountType: 'percent' }]);

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

  const handleAddItem = () => setOrderItems([...orderItems, { 
    productId: '', 
    name: '', 
    quantity: 1, 
    price: 0, 
    discount: 0, 
    discountType: 'percent',
    serviceTag: '',
    cpu: '',
    ram: '',
    ssd: '',
    screen: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyMonths: 12
  }]);
  
  const handleRemoveItem = (index: number) => setOrderItems(orderItems.filter((_, i) => i !== index));
  
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...orderItems];
    if (field === 'productId') {
      const product = data.products.find(p => p.id === value);
      if (product) {
        newItems[index] = { 
          ...newItems[index], 
          productId: product.id, 
          name: product.name, 
          price: product.price, 
          discount: 0, 
          discountType: 'percent',
          serviceTag: '',
          cpu: '',
          ram: '',
          ssd: '',
          screen: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          warrantyMonths: 12
        };
      } else {
        newItems[index] = { 
          ...newItems[index], 
          productId: '', 
          name: '', 
          price: 0, 
          discount: 0, 
          discountType: 'percent',
          serviceTag: '',
          cpu: '',
          ram: '',
          ssd: '',
          screen: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          warrantyMonths: 12
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setOrderItems(newItems);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCustomer) return;

    try {
      setIsSubmittingCustomer(true);
      
      // Generate a more unique ID to avoid collisions
      const nextId = data.customers.length + 1;
      const newId = `KH${String(nextId).padStart(3, '0')}`;
      
      const newCustomer: any = {
        id: newId,
        name: customerFormData.name,
        phone: customerFormData.phone,
        email: customerFormData.email || '',
        address: customerFormData.address || '',
        type: customerFormData.type,
        debt: 0,
        tags: customerFormData.tags.split(',').map(t => t.trim()).filter(t => t),
        devices: []
      };

      if (customerFormData.type === 'doanh-nghiep') {
        newCustomer.companyName = customerFormData.companyName || '';
        newCustomer.taxCode = customerFormData.taxCode || '';
      }

      if (addItem) {
        await addItem('customers', newCustomer);
      } else {
        await updateData({
          customers: [newCustomer, ...data.customers]
        });
      }

      // Store it locally so the select can show it immediately
      setNewlyCreatedCustomer(newCustomer);
      setFormData({ ...formData, customerId: newCustomer.id });
      setIsAddCustomerModalOpen(false);
      setCustomerFormData({
        name: '', phone: '', email: '', address: '', type: 'ca-nhan', companyName: '', taxCode: '', tags: ''
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Có lỗi xảy ra khi tạo khách hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingProduct || currentOrderItemIndex === null) return;

    try {
      setIsSubmittingProduct(true);
      
      const nextId = data.products.length + 1;
      const newId = `SP${String(nextId).padStart(3, '0')}`;
      
      const newProduct: any = {
        id: newId,
        name: productFormData.name,
        category: productFormData.category || 'Khác',
        price: Number(productFormData.price) || 0,
        importPrice: productFormData.importPrice ? Number(productFormData.importPrice) : undefined,
        stock: Number(productFormData.stock) || 0,
        minStock: Number(productFormData.minStock) || 10,
        supplier: productFormData.supplier || ''
      };

      if (addItem) {
        await addItem('products', newProduct);
      } else {
        await updateData({
          products: [newProduct, ...data.products]
        });
      }

      setNewlyCreatedProduct(newProduct);
      
      // Update the specific order item
      const newItems = [...orderItems];
      newItems[currentOrderItemIndex] = {
        ...newItems[currentOrderItemIndex],
        productId: newProduct.id,
        name: newProduct.name,
        price: newProduct.price
      };
      setOrderItems(newItems);
      
      setIsAddProductModalOpen(false);
      setProductFormData({
        name: '', category: '', price: '', importPrice: '', stock: '', minStock: '10', supplier: ''
      });
      setCurrentOrderItemIndex(null);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Có lỗi xảy ra khi tạo sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupplier) return;

    try {
      setIsSubmittingSupplier(true);
      
      const nextId = data.suppliers.length + 1;
      const newId = `NCC${String(nextId).padStart(3, '0')}`;
      
      const newSupplier: any = {
        id: newId,
        name: supplierFormData.name,
        phone: supplierFormData.phone,
        email: supplierFormData.email || '',
        address: supplierFormData.address || '',
        products: supplierFormData.products || '',
        notes: supplierFormData.notes || '',
        debt: 0
      };

      if (addItem) {
        await addItem('suppliers', newSupplier);
      } else {
        await updateData({
          suppliers: [newSupplier, ...data.suppliers]
        });
      }

      setNewlyCreatedSupplier(newSupplier);
      setProductFormData({ ...productFormData, supplier: newSupplier.name });
      setIsAddSupplierModalOpen(false);
      setSupplierFormData({
        name: '', phone: '', email: '', address: '', products: '', notes: ''
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert('Có lỗi xảy ra khi tạo nhà cung cấp. Vui lòng thử lại.');
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsPrinting(true);
    setTimeout(() => setIsPrinting(false), 2000);
    window.focus();
    window.print();
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      let subtotal = item.quantity * item.price;
      if (item.discountType === 'percent') {
        subtotal = subtotal * (1 - (item.discount || 0) / 100);
      } else {
        subtotal = Math.max(0, subtotal - (item.discount || 0));
      }
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
    setOrderItems(order.products.map(p => ({ ...p, discountType: p.discountType || 'percent' })));
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
      let subtotal = item.quantity * item.price;
      if (item.discountType === 'percent') {
        subtotal = subtotal * (1 - (item.discount || 0) / 100);
      } else {
        subtotal = Math.max(0, subtotal - (item.discount || 0));
      }
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
    setOrderItems([{ 
      productId: '', 
      name: '', 
      quantity: 1, 
      price: 0, 
      discount: 0,
      serviceTag: '',
      cpu: '',
      ram: '',
      ssd: '',
      screen: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyMonths: 12
    }]);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 print:bg-white">
      <div className="animate-in fade-in duration-500 print:hidden">
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
              setOrderItems([{ 
                productId: '', 
                name: '', 
                quantity: 1, 
                price: 0, 
                discount: 0,
                serviceTag: '',
                cpu: '',
                ram: '',
                ssd: '',
                screen: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                warrantyMonths: 12
              }]);
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
                          setTimeout(handlePrint, 300);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200" 
                        title="In hóa đơn"
                      >
                        <Printer size={14} />
                        <span>In</span>
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
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 print:bg-white print:p-0 print:static print:block">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30 print:hidden">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{viewOrder.id}</h3>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="relative z-50 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Printer size={18} className={isPrinting ? 'animate-pulse' : ''} />
                  <span>{isPrinting ? 'Đang chuẩn bị...' : 'In hóa đơn'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setViewOrder(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 print:p-0">
              {/* Print Layout (Hidden in UI, visible in print) */}
              <div className="hidden print:block text-black font-serif p-8 bg-white min-h-screen print-container">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-1/3"></div>
                  <div className="w-1/3 text-center">
                    <h1 className="text-2xl font-bold uppercase tracking-wider">HÓA ĐƠN BÁN HÀNG</h1>
                    <p className="text-sm italic mt-1">
                      Ngày {viewOrder.date.split('/')[0]} tháng {viewOrder.date.split('/')[1]} năm {viewOrder.date.split('/')[2]}
                    </p>
                  </div>
                  <div className="w-1/3 text-right text-sm">
                    <p>Mã số: {viewOrder.id}</p>
                    <p>Ký hiệu: </p>
                    <p>Số: {viewOrder.id.slice(-4)}</p>
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-sm">
                  <p><span className="font-semibold">Đơn vị bán hàng:</span> {data.shopInfo?.name || 'Hữu Laptop'}</p>
                  <p><span className="font-semibold">Điện thoại:</span> {data.shopInfo?.phone}</p>
                  <p><span className="font-semibold">Địa chỉ:</span> {data.shopInfo?.address}</p>
                </div>

                <div className="border-t border-black my-4"></div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
                  <div className="col-span-1 space-y-1">
                    <p><span className="font-semibold">Họ tên người mua hàng:</span> {viewOrder.customerName}</p>
                    <p><span className="font-semibold">Tên đơn vị:</span> {data.customers.find(c => c.id === viewOrder.customerId)?.companyName || ''}</p>
                    <p><span className="font-semibold">Địa chỉ:</span> {data.customers.find(c => c.id === viewOrder.customerId)?.address || ''}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p><span className="font-semibold">Số điện thoại:</span> {data.customers.find(c => c.id === viewOrder.customerId)?.phone || ''}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black mb-4 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-center w-10">STT</th>
                      <th className="border border-black p-2 text-left">Tên hàng hóa, dịch vụ</th>
                      <th className="border border-black p-2 text-center w-16">ĐVT</th>
                      <th className="border border-black p-2 text-center w-12">SL</th>
                      <th className="border border-black p-2 text-right w-24">Đơn giá</th>
                      <th className="border border-black p-2 text-center w-20">Giảm giá</th>
                      <th className="border border-black p-2 text-right w-28">Thành tiền</th>
                    </tr>
                    <tr className="bg-gray-50 text-[10px]">
                      <th className="border border-black p-1 text-center italic">1</th>
                      <th className="border border-black p-1 text-center italic">2</th>
                      <th className="border border-black p-1 text-center italic">3</th>
                      <th className="border border-black p-1 text-center italic">4</th>
                      <th className="border border-black p-1 text-center italic">5</th>
                      <th className="border border-black p-1 text-center italic">6</th>
                      <th className="border border-black p-1 text-center italic">7=4x5-6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2">
                          <div className="font-semibold">{item.name}</div>
                          {(item.serviceTag || item.cpu || item.ram || item.ssd || item.screen) && (
                            <div className="text-[10px] mt-1 flex flex-wrap gap-x-2 border-t border-gray-200 pt-1">
                              {item.serviceTag && <span className="font-bold">S/N: {item.serviceTag}</span>}
                              {item.cpu && <span>CPU: {item.cpu}</span>}
                              {item.ram && <span>RAM: {item.ram}</span>}
                              {item.ssd && <span>SSD: {item.ssd}</span>}
                              {item.screen && <span>Màn: {item.screen}</span>}
                            </div>
                          )}
                        </td>
                        <td className="border border-black p-2 text-center">Cái</td>
                        <td className="border border-black p-2 text-center">{item.quantity}</td>
                        <td className="border border-black p-2 text-right">{formatCurrency(item.price).replace('₫', '').trim()}</td>
                        <td className="border border-black p-2 text-center">
                          {item.discountType === 'amount' 
                            ? formatCurrency(item.discount || 0).replace('₫', '').trim() 
                            : `${item.discount || 0}%`}
                        </td>
                        <td className="border border-black p-2 text-right">{formatCurrency(item.subtotal || 0).replace('₫', '').trim()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="border border-black p-2 text-right font-bold">Cộng tiền hàng hóa, dịch vụ:</td>
                      <td className="border border-black p-2 text-right font-bold">{formatCurrency(viewOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="text-sm mb-6 space-y-2">
                  <p><span className="font-semibold italic">Số tiền viết bằng chữ:</span> {numberToVietnameseWords(viewOrder.total)}</p>
                  <p>
                    {viewOrder.paymentStatus === 'Đã thanh toán' 
                      ? `Khách đã thanh toán qua ${viewOrder.paymentMethod}.` 
                      : `Đơn hàng chưa thanh toán (Công nợ).`}
                  </p>
                </div>

                <div className="grid grid-cols-2 text-center mb-16">
                  <div>
                    <p className="font-bold">Người mua hàng</p>
                    <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="font-bold">Người bán hàng</p>
                    <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
                    <div className="mt-6">
                      <p className="text-rose-600 font-bold uppercase text-lg">{data.shopInfo?.name || 'Hữu Laptop'}</p>
                      <p className="text-[10px] text-gray-500 italic">Đã được ký điện tử bởi hệ thống quản lý</p>
                      <p className="text-xs mt-1">Ngày {viewOrder.date}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-12 pt-6 border-t border-dashed border-gray-300">
                  <div className="border-2 border-rose-500 rounded-2xl p-4 flex gap-6 items-center bg-rose-50/30">
                    <div className="text-sm space-y-1">
                      <p className="font-bold text-blue-800">Ngân hàng {data.shopInfo?.bankName || 'Techcombank'}</p>
                      <p className="font-bold">STK: {data.shopInfo?.bankAccount || '95 7777 6789'}</p>
                      <p className="font-bold">Tên: {data.shopInfo?.taxCode || 'DIEU HUU'}</p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-gray-200">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=vietqr://payment?bank=${data.shopInfo?.bankName || 'Techcombank'}&account=${data.shopInfo?.bankAccount || '9577776789'}&amount=${viewOrder.total}`} 
                        alt="Payment QR" 
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                  <div className="text-xs italic text-gray-500 max-w-[250px] text-right">
                    * Lưu ý: Quý khách vui lòng kiểm tra kỹ thông tin hàng hóa và số tiền trước khi thanh toán.
                  </div>
                </div>
              </div>

              {/* UI Layout (Visible in UI, hidden in print) */}
              <div className="print:hidden">
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
                    <tr className="bg-gray-50 text-gray-500 text-sm">
                      <th className="p-3 font-medium rounded-tl-lg">Tên sản phẩm</th>
                      <th className="p-3 font-medium text-center">Số lượng</th>
                      <th className="p-3 font-medium text-right">Đơn giá</th>
                      <th className="p-3 font-medium text-center">Giảm giá</th>
                      <th className="p-3 font-medium text-right rounded-tr-lg">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewOrder.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 text-sm text-gray-900">
                          <div className="font-medium">{item.name}</div>
                          {(item.serviceTag || item.cpu || item.ram || item.ssd || item.screen) && (
                            <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-2">
                              {item.serviceTag && <span className="text-blue-600 font-bold">S/N: {item.serviceTag}</span>}
                              {item.cpu && <span>CPU: {item.cpu}</span>}
                              {item.ram && <span>RAM: {item.ram}</span>}
                              {item.ssd && <span>SSD: {item.ssd}</span>}
                              {item.screen && <span>Màn: {item.screen}</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="p-3 text-sm text-gray-900 text-right">{formatCurrency(item.price)}</td>
                        <td className="p-3 text-sm text-gray-900 text-center">
                          {item.discountType === 'amount' 
                            ? formatCurrency(item.discount || 0) 
                            : `${item.discount || 0}%`}
                        </td>
                        <td className="p-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.subtotal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="p-3 text-right font-medium text-gray-900">Tổng cộng:</td>
                      <td className="p-3 text-right font-bold text-blue-600 text-lg">{formatCurrency(viewOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>
                
                {viewOrder.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ghi chú</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{viewOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
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
                  <div className="flex gap-2">
                    <select 
                      required
                      value={formData.customerId}
                      onChange={e => setFormData({...formData, customerId: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Chọn khách hàng</option>
                      {data.customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                      ))}
                      {/* Show newly created customer if not yet in data.customers */}
                      {newlyCreatedCustomer && !data.customers.find(c => c.id === newlyCreatedCustomer.id) && (
                        <option key={newlyCreatedCustomer.id} value={newlyCreatedCustomer.id}>
                          {newlyCreatedCustomer.name} - {newlyCreatedCustomer.phone} (Vừa thêm)
                        </option>
                      )}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddCustomerModalOpen(true)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 whitespace-nowrap text-sm font-medium"
                      title="Thêm khách hàng mới"
                    >
                      <Plus size={16} />
                      Khách mới
                    </button>
                  </div>
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
                    <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                      <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                        <div className="w-full md:flex-1">
                          <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Sản phẩm *</label>
                          <div className="flex gap-2">
                            <select 
                              required
                              value={item.productId}
                              onChange={e => handleItemChange(index, 'productId', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            >
                              <option value="">Chọn sản phẩm</option>
                              {data.products.map(p => (
                                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                  {p.name} - {formatCurrency(p.price)} (Còn: {p.stock})
                                </option>
                              ))}
                              {newlyCreatedProduct && !data.products.find(p => p.id === newlyCreatedProduct.id) && (
                                <option key={newlyCreatedProduct.id} value={newlyCreatedProduct.id}>
                                  {newlyCreatedProduct.name} - {formatCurrency(newlyCreatedProduct.price)} (Vừa thêm)
                                </option>
                              )}
                            </select>
                            <button 
                              type="button"
                              onClick={() => {
                                setCurrentOrderItemIndex(index);
                                setIsAddProductModalOpen(true);
                              }}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                              title="Thêm sản phẩm mới"
                            >
                              <PlusCircle size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Số lượng</label>
                          <input 
                            type="number" required min="1"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                          />
                        </div>

                        <div className="w-44 flex gap-1">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Giảm giá</label>
                            <input 
                              type="number" min="0"
                              value={item.discount}
                              onChange={e => handleItemChange(index, 'discount', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="w-16">
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Loại</label>
                            <select
                              value={item.discountType || 'percent'}
                              onChange={e => handleItemChange(index, 'discountType', e.target.value)}
                              className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs h-[38px]"
                            >
                              <option value="percent">%</option>
                              <option value="amount">đ</option>
                            </select>
                          </div>
                        </div>

                        <div className="w-32">
                          <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Thành tiền</label>
                          <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              item.discountType === 'percent' 
                                ? item.quantity * item.price * (1 - (item.discount || 0) / 100)
                                : Math.max(0, (item.quantity * item.price) - (item.discount || 0))
                            )}
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

                      {/* Hardware Specs Row */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3 border-t border-gray-200/50">
                        <div>
                          <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Service Tag *</label>
                          <input 
                            type="text" required
                            placeholder="Bắt buộc"
                            value={item.serviceTag}
                            onChange={e => handleItemChange(index, 'serviceTag', e.target.value)}
                            className="w-full px-3 py-1.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs bg-blue-50/30"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">CPU</label>
                          <input 
                            type="text"
                            placeholder="Core i5..."
                            value={item.cpu}
                            onChange={e => handleItemChange(index, 'cpu', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">RAM</label>
                          <input 
                            type="text"
                            placeholder="8GB..."
                            value={item.ram}
                            onChange={e => handleItemChange(index, 'ram', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">SSD</label>
                          <input 
                            type="text"
                            placeholder="256GB..."
                            value={item.ssd}
                            onChange={e => handleItemChange(index, 'ssd', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Màn hình</label>
                          <input 
                            type="text"
                            placeholder="14 inch..."
                            value={item.screen}
                            onChange={e => handleItemChange(index, 'screen', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                          />
                        </div>
                      </div>

                      {/* Warranty Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200/50">
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Ngày mua hàng</label>
                          <input 
                            type="date"
                            value={item.purchaseDate}
                            onChange={e => handleItemChange(index, 'purchaseDate', e.target.value)}
                            className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs bg-emerald-50/30"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Thời gian bảo hành</label>
                          <select
                            value={item.warrantyMonths}
                            onChange={e => handleItemChange(index, 'warrantyMonths', Number(e.target.value))}
                            className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs bg-emerald-50/30"
                          >
                            <option value={1}>1 tháng</option>
                            <option value={3}>3 tháng</option>
                            <option value={6}>6 tháng</option>
                            <option value={12}>12 tháng</option>
                            <option value={24}>24 tháng</option>
                            <option value={36}>36 tháng</option>
                          </select>
                        </div>
                      </div>
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

      {/* Add Supplier Modal (Nested) */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="text-blue-600" size={20} />
                Thêm nhà cung cấp mới
              </h3>
              <button 
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label>
                  <input 
                    type="text" required
                    value={supplierFormData.name}
                    onChange={e => setSupplierFormData({...supplierFormData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Công ty TNHH Phân Phối ABC"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label>
                  <input 
                    type="tel" required
                    value={supplierFormData.phone}
                    onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 0901234567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={supplierFormData.email}
                    onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: contact@abc.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input 
                    type="text"
                    value={supplierFormData.address}
                    onChange={e => setSupplierFormData({...supplierFormData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm cung cấp</label>
                  <input 
                    type="text"
                    value={supplierFormData.products}
                    onChange={e => setSupplierFormData({...supplierFormData, products: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="VD: Laptop, Linh kiện PC"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea 
                    value={supplierFormData.notes}
                    onChange={e => setSupplierFormData({...supplierFormData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Ghi chú thêm về nhà cung cấp..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingSupplier}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingSupplier ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang lưu...
                    </>
                  ) : 'Lưu & Chọn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal (Nested) */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="text-blue-600" size={20} />
                Thêm sản phẩm mới
              </h3>
              <button 
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tên sản phẩm *</label>
                  <input 
                    type="text" required
                    value={productFormData.name}
                    onChange={e => setProductFormData({...productFormData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Laptop Dell XPS 13..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Danh mục</label>
                  <input 
                    type="text"
                    value={productFormData.category}
                    onChange={e => setProductFormData({...productFormData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Laptop, Linh kiện..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Giá bán *</label>
                  <input 
                    type="number" required min="0"
                    value={productFormData.price}
                    onChange={e => setProductFormData({...productFormData, price: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Giá nhập</label>
                  <input 
                    type="number" min="0"
                    value={productFormData.importPrice}
                    onChange={e => setProductFormData({...productFormData, importPrice: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tồn kho ban đầu</label>
                  <input 
                    type="number" min="0"
                    value={productFormData.stock}
                    onChange={e => setProductFormData({...productFormData, stock: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Nhà cung cấp</label>
                  <div className="flex gap-2">
                    <select 
                      value={productFormData.supplier}
                      onChange={e => setProductFormData({...productFormData, supplier: e.target.value})}
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
                      title="Thêm nhà cung cấp mới"
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingProduct ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang lưu...
                    </>
                  ) : 'Lưu & Chọn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal (Nested) */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Thêm khách hàng mới</h3>
              <button 
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tên khách hàng *</label>
                  <input 
                    type="text" required
                    value={customerFormData.name}
                    onChange={e => setCustomerFormData({...customerFormData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Số điện thoại *</label>
                  <input 
                    type="tel" required
                    value={customerFormData.phone}
                    onChange={e => setCustomerFormData({...customerFormData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="090..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Địa chỉ</label>
                  <input 
                    type="text"
                    value={customerFormData.address}
                    onChange={e => setCustomerFormData({...customerFormData, address: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Địa chỉ khách hàng"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Loại</label>
                  <select 
                    value={customerFormData.type}
                    onChange={e => setCustomerFormData({...customerFormData, type: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="ca-nhan">Cá nhân</option>
                    <option value="doanh-nghiep">Doanh nghiệp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Thẻ (Tags)</label>
                  <input 
                    type="text"
                    value={customerFormData.tags}
                    onChange={e => setCustomerFormData({...customerFormData, tags: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Gamer, VIP..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingCustomer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang lưu...
                    </>
                  ) : 'Lưu & Chọn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
