import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData, Order, OrderItem } from '../types';
import { formatCurrency, numberToVietnameseWords } from '../lib/utils';
import { ShoppingCart, Plus, Search, Eye, Printer, Trash2, X, PlusCircle, Edit } from 'lucide-react';
import { Toast, ToastType, ConfirmModal } from '../components/Notification';

interface OrdersProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collectionName: string, item: any) => Promise<void>;
  updateItem: (collectionName: string, id: string, item: any) => Promise<void>;
  deleteItem: (collectionName: string, id: string) => Promise<void>;
  isAdmin?: boolean;
}

export function Orders({ data, updateData, addItem, updateItem, deleteItem, isAdmin }: OrdersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [monthFilter, setMonthFilter] = useState<string>('Tất cả');
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
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  const filteredOrders = (data.orders || []).filter(o => {
    const matchesSearch = (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.products || []).some(p => 
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.serviceTag || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesMonth = monthFilter === 'Tất cả' || (o.date && o.date.startsWith(monthFilter));
    
    if (!matchesMonth) return false;

    if (statusFilter === 'Tất cả') return matchesSearch;
    if (statusFilter === 'Đang xử lý') return matchesSearch && (o.status === 'Mới' || o.status === 'Đang xử lý');
    if (statusFilter === 'Hoàn thành') return matchesSearch && (o.status === 'Hoàn thành' || o.status === 'Đã giao');
    return matchesSearch && o.status === statusFilter;
  });

  // Get unique months from orders for the filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (data.orders || []).forEach(o => {
      if (o.date) {
        months.add(o.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [data.orders]);

  const handleDelete = async (id: string) => {
    const orderToDelete = (data.orders || []).find(o => o.id === id);
    if (!orderToDelete) return;

    try {
      // Revert stock
      for (const item of (orderToDelete.products || [])) {
        const product = (data.products || []).find(p => p.id === item.productId);
        if (product) {
          await updateItem('products', product.id, {
            ...product,
            stock: (product.stock || 0) + (item.quantity || 0)
          });
        }
      }

      // Revert debt
      if (orderToDelete.paymentStatus === 'Công nợ') {
        const customer = (data.customers || []).find(c => c.id === orderToDelete.customerId);
        if (customer) {
          await updateItem('customers', customer.id, {
            ...customer,
            debt: (customer.debt || 0) - (orderToDelete.total || 0)
          });
        }
      }

      await deleteItem('orders', id);
      setConfirmingDelete(null);
      showToast('Đã xóa đơn hàng thành công');
    } catch (error) {
      console.error('Lỗi khi xóa đơn hàng:', error);
      showToast('Có lỗi xảy ra khi xóa đơn hàng', 'error');
    }
  };

  const togglePaymentStatus = async (id: string) => {
    const order = (data.orders || []).find(o => o.id === id);
    if (!order) return;

    const newPaymentStatus = order.paymentStatus === 'Đã thanh toán' ? 'Công nợ' : 'Đã thanh toán';
    const newStatus = newPaymentStatus === 'Đã thanh toán' ? 'Chờ đóng gói' : 'Đang xử lý';

    try {
      // Update debt
      const customer = (data.customers || []).find(c => c.id === order.customerId);
      if (customer) {
        const debtChange = newPaymentStatus === 'Công nợ' ? (order.total || 0) : -(order.total || 0);
        await updateItem('customers', customer.id, {
          ...customer,
          debt: (customer.debt || 0) + debtChange
        });
      }

      await updateItem('orders', id, {
        ...order,
        paymentStatus: newPaymentStatus,
        status: newStatus
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái thanh toán:', error);
      showToast('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    }
  };

  const updateOrderStatus = async (id: string, nextStatus: Order['status']) => {
    const order = (data.orders || []).find(o => o.id === id);
    if (!order) return;

    try {
      await updateItem('orders', id, {
        ...order,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(`Đã chuyển trạng thái đơn hàng sang ${nextStatus}`);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
      showToast('Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'Mới':
      case 'Đang xử lý':
        return 'Chờ đóng gói';
      case 'Chờ đóng gói':
        return 'Đang đóng gói';
      case 'Đang đóng gói':
        return 'Chờ giao hàng';
      case 'Chờ giao hàng':
        return 'Đang giao hàng';
      case 'Đang giao hàng':
        return 'Đã giao';
      default:
        return null;
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'Chờ đóng gói': return 'Chờ đóng gói';
      case 'Đang đóng gói': return 'Đang đóng gói';
      case 'Chờ giao hàng': return 'Chờ giao hàng';
      case 'Đang giao hàng': return 'Đang giao hàng';
      case 'Hoàn thành': return 'Hoàn thành';
      case 'Đã giao': return 'Đã giao';
      case 'Hủy': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Hoàn thành':
      case 'Đã giao':
        return 'bg-emerald-100 text-emerald-800';
      case 'Hủy':
        return 'bg-red-100 text-red-800';
      case 'Chờ đóng gói':
      case 'Đang đóng gói':
        return 'bg-blue-100 text-blue-800';
      case 'Chờ giao hàng':
      case 'Đang giao hàng':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
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
      const product = (data.products || []).find(p => p.id === value);
      if (product) {
        newItems[index] = { 
          ...newItems[index], 
          productId: product.id, 
          name: product.name, 
          price: product.price, 
          importPrice: product.importPrice,
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
      
      // Robust ID generation
      const maxId = (data.customers || []).reduce((max, c) => {
        const idNum = parseInt((c.id || '').replace('KH', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);
      const newId = `KH${String(maxId + 1).padStart(3, '0')}`;
      
      const newCustomer: any = {
        id: newId,
        name: customerFormData.name,
        phone: customerFormData.phone,
        email: customerFormData.email || '',
        address: customerFormData.address || '',
        type: customerFormData.type,
        debt: 0,
        tags: customerFormData.tags.split(',').map(t => t.trim()).filter(t => t),
        devices: [],
        createdAt: new Date().toISOString()
      };

      if (customerFormData.type === 'doanh-nghiep') {
        newCustomer.companyName = customerFormData.companyName || '';
        newCustomer.taxCode = customerFormData.taxCode || '';
      }

      await addItem('customers', newCustomer);

      // Store it locally so the select can show it immediately
      setNewlyCreatedCustomer(newCustomer);
      setFormData({ ...formData, customerId: newCustomer.id });
      setIsAddCustomerModalOpen(false);
      setCustomerFormData({
        name: '', phone: '', email: '', address: '', type: 'ca-nhan', companyName: '', taxCode: '', tags: ''
      });
      showToast('Đã thêm khách hàng mới');
    } catch (error) {
      console.error('Error creating customer:', error);
      showToast('Có lỗi xảy ra khi tạo khách hàng. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingProduct || currentOrderItemIndex === null) return;

    try {
      setIsSubmittingProduct(true);
      
      // Robust ID generation
      const maxId = (data.products || []).reduce((max, p) => {
        const idNum = parseInt((p.id || '').replace('SP', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);
      const newId = `SP${String(maxId + 1).padStart(3, '0')}`;
      
      const newProduct: any = {
        id: newId,
        name: productFormData.name,
        category: productFormData.category || 'Khác',
        price: Number(productFormData.price) || 0,
        importPrice: productFormData.importPrice ? Number(productFormData.importPrice) : null,
        stock: Number(productFormData.stock) || 0,
        minStock: Number(productFormData.minStock) || 10,
        supplier: productFormData.supplier || '',
        createdAt: new Date().toISOString()
      };

      await addItem('products', newProduct);

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
      showToast('Đã thêm sản phẩm mới');
    } catch (error) {
      console.error('Error creating product:', error);
      showToast('Có lỗi xảy ra khi tạo sản phẩm. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupplier) return;

    try {
      setIsSubmittingSupplier(true);
      
      // Robust ID generation
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
      setProductFormData({ ...productFormData, supplier: newSupplier.name });
      setIsAddSupplierModalOpen(false);
      setSupplierFormData({
        name: '', phone: '', email: '', address: '', products: '', notes: ''
      });
      showToast('Đã thêm nhà cung cấp mới');
    } catch (error) {
      console.error('Error creating supplier:', error);
      showToast('Có lỗi xảy ra khi tạo nhà cung cấp. Vui lòng thử lại.', 'error');
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
    setOrderItems((order.products || []).map(p => ({ ...p, discountType: p.discountType || 'percent' })));
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return showToast('Vui lòng chọn khách hàng', 'warning');
    
    const validItems = orderItems.filter(item => item.productId);
    if (validItems.length === 0) return showToast('Vui lòng chọn ít nhất 1 sản phẩm', 'warning');

    const customer = (data.customers || []).find(c => c.id === formData.customerId);
    if (!customer) return;

    try {
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

      if (editingId) {
        const oldOrder = (data.orders || []).find(o => o.id === editingId);
        if (!oldOrder) return;

        // 1. Revert old order stock
        for (const item of (oldOrder.products || [])) {
          const product = (data.products || []).find(p => p.id === item.productId);
          if (product) {
            await updateItem('products', product.id, {
              ...product,
              stock: (product.stock || 0) + (item.quantity || 0)
            });
          }
        }

        // 2. Revert old order debt
        if (oldOrder.paymentStatus === 'Công nợ') {
          const oldCustomer = (data.customers || []).find(c => c.id === oldOrder.customerId);
          if (oldCustomer) {
            await updateItem('customers', oldCustomer.id, {
              ...oldCustomer,
              debt: (oldCustomer.debt || 0) - (oldOrder.total || 0)
            });
          }
        }

        // 3. Apply new order stock
        for (const item of finalItems) {
          const product = (data.products || []).find(p => p.id === item.productId);
          if (product) {
            await updateItem('products', product.id, {
              ...product,
              stock: (product.stock || 0) - (item.quantity || 0)
            });
          }
        }

        // 4. Apply new order debt
        if (formData.paymentStatus === 'Công nợ') {
          const currentCustomer = (data.customers || []).find(c => c.id === customer.id);
          if (currentCustomer) {
            await updateItem('customers', currentCustomer.id, {
              ...currentCustomer,
              debt: (currentCustomer.debt || 0) + total
            });
          }
        }

        // 5. Update order
        await updateItem('orders', editingId, {
          ...oldOrder,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          products: finalItems,
          total,
          status: formData.paymentStatus === 'Đã thanh toán' ? 'Chờ đóng gói' : 'Đang xử lý',
          paymentMethod: formData.paymentMethod,
          paymentStatus: formData.paymentStatus,
          notes: formData.notes,
          updatedAt: new Date().toISOString()
        });

      } else {
        const now = new Date();
        // Robust ID generation for order
        const maxId = (data.orders || []).reduce((max, o) => {
          const idNum = parseInt((o.id || '').replace('DH', ''));
          return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);
        const newOrderId = `DH${String(maxId + 1).padStart(3, '0')}`;

        const newOrder: Order = {
          id: newOrderId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerAddress: customer.address,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0].substring(0, 5),
          products: finalItems,
          total,
          status: formData.paymentStatus === 'Đã thanh toán' ? 'Chờ đóng gói' : 'Đang xử lý',
          paymentMethod: formData.paymentMethod,
          paymentStatus: formData.paymentStatus,
          notes: formData.notes,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        // Apply new order stock
        for (const item of finalItems) {
          const product = (data.products || []).find(p => p.id === item.productId);
          if (product) {
            await updateItem('products', product.id, {
              ...product,
              stock: (product.stock || 0) - (item.quantity || 0)
            });
          }
        }

        // Apply new order debt
        if (formData.paymentStatus === 'Công nợ') {
          const currentCustomer = (data.customers || []).find(c => c.id === customer.id);
          if (currentCustomer) {
            await updateItem('customers', currentCustomer.id, {
              ...currentCustomer,
              debt: (currentCustomer.debt || 0) + total
            });
          }
        }

        await addItem('orders', newOrder);
      }

      setIsAddModalOpen(false);
      setEditingId(null);
      showToast(editingId ? 'Đã cập nhật đơn hàng thành công' : 'Đã tạo đơn hàng thành công');
      setFormData({ customerId: '', paymentMethod: 'Tiền mặt', paymentStatus: 'Đã thanh toán', notes: '' });
      setOrderItems([{ 
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
    } catch (error) {
      console.error('Error submitting order:', error);
      showToast('Có lỗi xảy ra khi lưu đơn hàng', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 print:bg-white">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-4 lg:p-8 space-y-8 print:p-0"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý <span className="text-indigo-600">Đơn hàng</span></h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Theo dõi, xử lý và quản lý lịch sử bán hàng</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingId(null);
              setFormData({ customerId: '', paymentMethod: 'Tiền mặt', paymentStatus: 'Đã thanh toán', notes: '' });
              setOrderItems([{ 
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
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/20"
          >
            <Plus size={20} />
            Tạo đơn hàng mới
          </motion.button>
        </div>

        {/* Filters & Search */}
        <div className="glass-card p-2 print:hidden">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Tìm mã đơn, khách hàng, sản phẩm, serial..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-xl border border-slate-200/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tháng:</span>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-sm font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Tất cả">Tất cả</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      {m.split('-').reverse().join('/')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 rounded-xl border border-slate-200/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-sm font-bold text-slate-700 cursor-pointer"
                >
                  {['Tất cả', 'Đang xử lý', 'Chờ đóng gói', 'Đang đóng gói', 'Chờ giao hàng', 'Đang giao hàng', 'Hoàn thành', 'Hủy'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="p-5">Mã đơn</th>
                  <th className="p-5">Khách hàng & Sản phẩm</th>
                  <th className="p-5">Thời gian</th>
                  <th className="p-5 text-right">Tổng tiền</th>
                  <th className="p-5 text-center">Trạng thái</th>
                  <th className="p-5 text-center">Thanh toán</th>
                  <th className="p-5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={order.id} 
                      onClick={() => setViewOrder(order)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-5">
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          {order.id}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="text-sm font-black text-slate-900 mb-1">{order.customerName}</div>
                        <div className="flex flex-wrap gap-1">
                          {(order.products || []).map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              {p.name} (x{p.quantity})
                              {p.serviceTag && <span className="text-indigo-600 font-mono">[{p.serviceTag}]</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="text-xs font-bold text-slate-700">{order.date}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{order.time}</div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="text-sm font-black text-indigo-600">{formatCurrency(order.total)}</div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight
                            ${getStatusColor(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                          {getNextStatus(order.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, getNextStatus(order.status)!);
                              }}
                              className="text-[9px] text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-tighter hover:underline"
                            >
                              → {getStatusLabel(getNextStatus(order.status)!)}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePaymentStatus(order.id);
                          }}
                          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm
                            ${order.paymentStatus === 'Đã thanh toán' 
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'}`}
                        >
                          {order.paymentStatus === 'Đã thanh toán' ? 'Đã xong' : 'Công nợ'}
                        </button>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewOrder(order);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Eye size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(order);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          >
                            <Edit size={18} />
                          </motion.button>
                          {isAdmin && (
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDelete(order.id);
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                          <ShoppingCart size={32} />
                        </div>
                        <p className="text-slate-400 font-bold text-sm">Không tìm thấy đơn hàng nào phù hợp</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4 print:bg-white print:p-0 print:static print:block">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between z-30 print:hidden">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{viewOrder.id}</h3>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="relative z-50 flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 text-sm sm:text-base"
                >
                  <Printer size={18} className={isPrinting ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">{isPrinting ? 'Đang chuẩn bị...' : 'In hóa đơn'}</span>
                  <span className="sm:hidden">{isPrinting ? '...' : 'In'}</span>
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
            <div className="p-4 sm:p-6 print:p-0">
              {/* Print Layout (Hidden in UI, visible in print) */}
              <div className="hidden print:block text-black p-8 bg-white min-h-screen print-container">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b-2 border-blue-600 pb-6">
                  <div className="flex items-center gap-6">
                    <img 
                      src="/Logo Huu Laptop-01.png" 
                      alt="Shop Logo" 
                      className="w-32 h-32 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (data.shopInfo?.logo) {
                          (e.target as HTMLImageElement).src = data.shopInfo.logo;
                        }
                      }}
                    />
                    <div>
                      <h1 className="text-2xl font-black text-blue-700 uppercase tracking-tight">{data.shopInfo?.name || 'Hữu Laptop'}</h1>
                      <p className="text-sm font-medium text-gray-600 mt-1">{data.shopInfo?.address}</p>
                      <p className="text-sm font-bold text-gray-800">Hotline: {data.shopInfo?.phone}</p>
                      {data.shopInfo?.website && <p className="text-xs text-blue-600">{data.shopInfo.website}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-black text-gray-900 uppercase mb-1">Hóa Đơn Bán Hàng</h2>
                    <p className="text-sm text-gray-500">Mã đơn: <span className="font-bold text-black">#{viewOrder.id}</span></p>
                    <p className="text-sm text-gray-500">Ngày lập: <span className="font-bold text-black">{viewOrder.date}</span></p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Thông tin khách hàng</h3>
                    <p className="text-base font-bold text-gray-900">{viewOrder.customerName}</p>
                    <p className="text-sm text-gray-600">{viewOrder.customerPhone}</p>
                    {viewOrder.customerEmail && <p className="text-sm text-gray-600">{viewOrder.customerEmail}</p>}
                    {viewOrder.customerAddress && <p className="text-sm text-gray-600">{viewOrder.customerAddress}</p>}
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hình thức thanh toán</h3>
                    <p className="text-base font-bold text-gray-900">{viewOrder.paymentMethod}</p>
                    <p className={`text-sm font-bold ${viewOrder.paymentStatus === 'Đã thanh toán' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {viewOrder.paymentStatus}
                    </p>
                  </div>
                </div>

                {/* Products Table */}
                <table className="w-full mb-8 overflow-hidden rounded-xl border border-gray-200 border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="p-3 text-left text-xs font-bold uppercase">Sản phẩm</th>
                      <th className="p-3 text-center text-xs font-bold uppercase w-16">SL</th>
                      <th className="p-3 text-right text-xs font-bold uppercase w-28">Đơn giá</th>
                      <th className="p-3 text-right text-xs font-bold uppercase w-24">Giảm giá</th>
                      <th className="p-3 text-right text-xs font-bold uppercase w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(viewOrder.products || []).map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          {item.serviceTag && <div className="text-[10px] text-blue-600 font-bold mt-1">S/N: {item.serviceTag}</div>}
                          {(item.cpu || item.ram || item.ssd || item.screen) && (
                            <div className="text-[10px] text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                              {item.cpu && <span>CPU: {item.cpu}</span>}
                              {item.ram && <span>RAM: {item.ram}</span>}
                              {item.ssd && <span>SSD: {item.ssd}</span>}
                              {item.screen && <span>Màn: {item.screen}</span>}
                            </div>
                          )}
                          <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                            Ngày mua: {item.purchaseDate || viewOrder.date} | Bảo hành: {item.warrantyMonths || 12} tháng
                          </div>
                        </td>
                        <td className="p-4 text-center font-medium text-gray-900">{item.quantity}</td>
                        <td className="p-4 text-right font-medium text-gray-900">{formatCurrency(item.price).replace('₫', '').trim()}</td>
                        <td className="p-4 text-right font-medium text-rose-600">
                          {item.discountType === 'amount' 
                            ? formatCurrency(item.discount || 0).replace('₫', '').trim()
                            : `${item.discount || 0}%`}
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">{formatCurrency(item.subtotal || 0).replace('₫', '').trim()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={4} className="p-4 text-right font-bold text-gray-600 uppercase">Tổng cộng:</td>
                      <td className="p-4 text-right font-black text-xl text-blue-700">{formatCurrency(viewOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in words */}
                <div className="mb-12 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-700 italic">
                    <span className="font-bold not-italic text-blue-800">Bằng chữ: </span>
                    {numberToVietnameseWords(viewOrder.total)}
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 text-center mb-20">
                  <div>
                    <p className="font-bold text-gray-900 mb-20">Người mua hàng</p>
                    <p className="text-sm text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-20">Người bán hàng</p>
                    <p className="text-sm text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                  </div>
                </div>

                {/* Payment Info & QR */}
                <div className="flex justify-between items-end pt-8 border-t border-dashed border-gray-200">
                  <div className="flex items-center gap-6 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <img 
                        src="/QR Code HLT 01.png" 
                        alt="Payment QR" 
                        className="w-24 h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Thông tin chuyển khoản</p>
                      <p className="text-sm font-black text-gray-900">{data.shopInfo?.bankName || 'Techcombank'}</p>
                      <p className="text-lg font-black text-blue-700">{data.shopInfo?.bankAccount || '95 7777 6789'}</p>
                      <p className="text-sm font-bold text-gray-700">{data.shopInfo?.taxCode || 'DIEU HUU'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 mb-1">Cảm ơn quý khách!</p>
                    <p className="text-xs text-gray-400 italic">Hẹn gặp lại quý khách lần sau.</p>
                  </div>
                </div>
              </div>

              {/* UI Layout (Visible in UI, hidden in print) */}
              <div className="print:hidden">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
                    <p className="font-medium text-gray-900">{viewOrder.customerName}</p>
                    <p className="text-xs text-gray-500">{viewOrder.customerPhone}</p>
                    {viewOrder.customerAddress && <p className="text-xs text-gray-500">{viewOrder.customerAddress}</p>}
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
                    {(viewOrder.products || []).map((item, idx) => (
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
                          <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                            Ngày mua: {item.purchaseDate || viewOrder.date} | Bảo hành: {item.warrantyMonths || 12} tháng
                          </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
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
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng *</label>
                  <div className="flex gap-2">
                    <select 
                      required
                      value={formData.customerId}
                      onChange={e => setFormData({...formData, customerId: e.target.value})}
                      className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base"
                    >
                      <option value="">Chọn khách hàng</option>
                      {(data.customers || []).map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                      ))}
                      {/* Show newly created customer if not yet in data.customers */}
                      {newlyCreatedCustomer && !(data.customers || []).find(c => c.id === newlyCreatedCustomer.id) && (
                        <option key={newlyCreatedCustomer.id} value={newlyCreatedCustomer.id}>
                          {newlyCreatedCustomer.name} - {newlyCreatedCustomer.phone} (Vừa thêm)
                        </option>
                      )}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddCustomerModalOpen(true)}
                      className="px-2 sm:px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 whitespace-nowrap text-xs sm:text-sm font-medium"
                      title="Thêm khách hàng mới"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Khách mới</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm sm:text-base"
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
                    <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-6">
                          <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Sản phẩm *</label>
                          <div className="flex gap-2">
                            <select 
                              required
                              value={item.productId}
                              onChange={e => handleItemChange(index, 'productId', e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            >
                              <option value="">Chọn sản phẩm</option>
                              {(data.products || []).map(p => (
                                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                  {p.name} - {formatCurrency(p.price)} (Còn: {p.stock})
                                </option>
                              ))}
                              {newlyCreatedProduct && !(data.products || []).find(p => p.id === newlyCreatedProduct.id) && (
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
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 flex-shrink-0"
                              title="Thêm sản phẩm mới"
                            >
                              <PlusCircle size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-5 sm:col-span-5 gap-2">
                          <div className="col-span-1">
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">SL</label>
                            <input 
                              type="number" required min="1"
                              value={item.quantity}
                              onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            />
                          </div>

                          <div className="col-span-4 flex gap-1">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Giảm giá</label>
                              <input 
                                type="number" min="0"
                                value={item.discount}
                                onChange={e => handleItemChange(index, 'discount', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                              />
                            </div>
                            <div className="w-12">
                              <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Loại</label>
                              <select
                                value={item.discountType || 'percent'}
                                onChange={e => handleItemChange(index, 'discountType', e.target.value)}
                                className="w-full px-1 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs h-[38px]"
                              >
                                <option value="percent">%</option>
                                <option value="amount">đ</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={orderItems.length === 1}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-gray-200/50">
                        <div className="col-span-2 sm:col-span-1">
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

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/50">
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
                          <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Bảo hành</label>
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
                      
                      <div className="pt-2 flex justify-between items-center text-sm">
                        <span className="text-gray-500">Thành tiền:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(
                            item.discountType === 'percent' 
                              ? item.quantity * item.price * (1 - (item.discount || 0) / 100)
                              : Math.max(0, (item.quantity * item.price) - (item.discount || 0))
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <div className="text-lg text-gray-900 w-full sm:w-auto text-center sm:text-left">
                  Tổng cộng: <span className="font-bold text-blue-600 text-xl ml-2">{formatCurrency(calculateTotal())}</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingId(null);
                    }}
                    className="flex-1 sm:flex-none px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20"
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
                {isAdmin && (
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
                )}
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
                      {(data.suppliers || []).map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      {newlyCreatedSupplier && !(data.suppliers || []).find(s => s.name === newlyCreatedSupplier.name) && (
                        <option key={newlyCreatedSupplier.id} value={newlyCreatedSupplier.name}>
                          {newlyCreatedSupplier.name} (Vừa thêm)
                        </option>
                      )}
                    </select>
                    {isAdmin && (
                      <button 
                        type="button"
                        onClick={() => setIsAddSupplierModalOpen(true)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                        title="Thêm nhà cung cấp mới"
                      >
                        <PlusCircle size={20} />
                      </button>
                    )}
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
      {confirmingDelete && (
        <ConfirmModal 
          isOpen={!!confirmingDelete}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa đơn hàng này? Tất cả dữ liệu liên quan sẽ bị mất."
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
