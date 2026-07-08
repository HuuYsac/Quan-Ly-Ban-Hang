import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Printer, 
  ArrowLeft, 
  Copy, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  PlusCircle, 
  Calendar, 
  DollarSign, 
  Percent, 
  Eye, 
  FileSpreadsheet, 
  ExternalLink,
  Briefcase
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { Quotation, OrderItem, Customer, Product, Order } from '../types';
import { formatCurrency, formatDate, numberToVietnameseWords } from '../lib/utils';
import { auth } from '../firebase';
import { SearchableSelect } from '../components/SearchableSelect';

interface QuotationsProps {
  data: any;
  updateData: (newData: any) => Promise<void>;
  addItem: (collectionName: string, item: any) => Promise<void>;
  updateItem: (collectionName: string, id: string, item: any) => Promise<void>;
  deleteItem: (collectionName: string, id: string) => Promise<void>;
  isAdmin: boolean;
  onNavigate?: (page: string) => void;
}

export function Quotations({ data, updateData, addItem, updateItem, deleteItem, isAdmin, onNavigate }: QuotationsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('amount');
  const [vatPercent, setVatPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Status Badge Colors
  const statusColors: Record<string, string> = {
    'Nháp': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    'Đã gửi': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    'Đã duyệt': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
    'Từ chối': 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900',
    'Hết hạn': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900'
  };

  const statusIcons: Record<string, any> = {
    'Nháp': Clock,
    'Đã gửi': FileText,
    'Đã duyệt': CheckCircle2,
    'Từ chối': XCircle,
    'Hết hạn': AlertTriangle
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Safe Quotation List extraction
  const quotationList = useMemo(() => {
    return data.quotations || [];
  }, [data.quotations]);

  // Handle customer search & select in form
  const customerOptions = useMemo(() => {
    const list = data.customers || [];
    return list.map((c: Customer) => ({
      id: c.id,
      label: c.name,
      sublabel: `${c.phone} ${c.companyName ? ` - ${c.companyName}` : ''}`,
      customer: c
    }));
  }, [data.customers]);

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    const selected = customerOptions.find(o => o.id === id);
    if (selected && selected.customer) {
      const c = selected.customer;
      setCustomerName(c.name);
      setCustomerPhone(c.phone || '');
      setCustomerEmail(c.email || '');
      setCustomerAddress(c.address || '');
      setCompanyName(c.companyName || '');
      setTaxCode(c.taxCode || '');
    }
  };

  // Handle product select
  const productOptions = useMemo(() => {
    const list = data.products || [];
    return list.map((p: Product) => ({
      id: p.id,
      label: p.name,
      sublabel: `Giá lẻ: ${formatCurrency(p.price)} - Kho: ${p.stock}`,
      product: p
    }));
  }, [data.products]);

  // Generate Quotation ID
  const generateNewQuotationId = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BG-${todayStr}`;
    const todayQuotes = quotationList.filter((q: Quotation) => q.id.startsWith(prefix));
    
    let maxNum = 0;
    todayQuotes.forEach((q: Quotation) => {
      const parts = q.id.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNumStr = String(maxNum + 1).padStart(2, '0');
    return `${prefix}-${nextNumStr}`;
  };

  // Default terms template
  const defaultNotesTemplate = () => {
    return `1. Thời gian giao hàng: Trong vòng 1-3 ngày làm việc kể từ ngày nhận được tạm ứng/xác nhận đặt hàng.
2. Địa điểm giao hàng: Miễn phí vận chuyển nội thành Hồ Chí Minh. Khách hàng ngoại tỉnh thanh toán chi phí theo cước bưu điện.
3. Điều khoản thanh toán: 
   - Tạm ứng 100-500K ngay sau khi ký duyệt báo giá.
   - Thanh toán phần còn lại sau khi bàn giao đầy đủ thiết bị và chứng từ bảo hành.
4. Tài khoản thụ hưởng:
   - Chủ tài khoản: Điểu Hữu
   - Số tài khoản: 95 7777 6789 - Ngân hàng Techcombank
5. Thời hạn bảo hành: Đảm bảo theo chính sách bảo hành chính hãng của cửa hàng đối với từng sản phẩm.`;
  };

  const sanitizeNotes = (text: string) => {
    if (!text) return '';
    return text
      .replace(/Hộ\s+Kinh\s+Doanh\s+Hữu\s+Laptop/gi, 'HỮU LAPTOP')
      .replace(/Hữu\s+Laptop/gi, 'HỮU LAPTOP')
      .replace(/Nguyễn\s+Đức\s+Hữu/gi, 'Điểu Hữu')
      .replace(/Nguyện\s+Đức\s+Hữu/gi, 'Điểu Hữu')
      .replace(/nội\s+thành\s+Hà\s+Nội/gi, 'nội thành Hồ Chí Minh')
      .replace(/Tạm\s+ứng\s+30%/gi, 'Tạm ứng 100-500K')
      .replace(/Thanh\s+toán\s+70%\s+còn\s+lại\s+ngay\s+khi/gi, 'Thanh toán phần còn lại sau khi')
      .replace(/Thanh\s+toán\s+70%\s+còn\s+lại/gi, 'Thanh toán phần còn lại')
      .replace(/Chủ\s+tài\s+khoản:\s*(NGUYỄN ĐỨC HỮU|Nguyễn Đức Hữu|Nguyện Đức Hữu)/gi, 'Chủ tài khoản: Điểu Hữu')
      .replace(/Số\s+tài\s+khoản:\s*\d+\s*-\s*Ngân\s+hàng\s+Quân\s+Đội\s*\(MB\s+Bank\)/gi, 'Số tài khoản: 95 7777 6789 - Ngân hàng Techcombank')
      .replace(/1234567890\s*-\s*Ngân\s+hàng\s+Quân\s+Đội\s*\(MB\s+Bank\)/gi, '95 7777 6789 - Ngân hàng Techcombank')
      .replace(/Ngân\s+hàng\s+Quân\s+Đội\s*\(MB\s+Bank\)/gi, 'Ngân hàng Techcombank')
      .replace(/1234567890/g, '95 7777 6789');
  };

  const sanitizeText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/Nguyễn Đức Hữu/gi, 'Điểu Hữu')
      .replace(/Nguyện Đức Hữu/gi, 'Điểu Hữu')
      .replace(/Hộ\s+Kinh\s+Doanh\s+Hữu\s+Laptop/gi, 'HỮU LAPTOP')
      .replace(/Hữu\s+Laptop/gi, 'HỮU LAPTOP');
  };

  const handleCreateNew = () => {
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCompanyName('');
    setTaxCode('');
    setDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setValidUntil(d.toISOString().split('T')[0]);
    setProducts([]);
    setDiscount(0);
    setDiscountType('amount');
    setVatPercent(10); // Default to 10% VAT
    setNotes(defaultNotesTemplate());
    setViewMode('create');
  };

  const handleEdit = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setCustomerId(quote.customerId);
    setCustomerName(quote.customerName);
    setCustomerPhone(quote.customerPhone || '');
    setCustomerEmail(quote.customerEmail || '');
    setCustomerAddress(quote.customerAddress || '');
    setCompanyName(quote.companyName || '');
    setTaxCode(quote.taxCode || '');
    setDate(quote.date);
    setValidUntil(quote.validUntil);
    setProducts(quote.products || []);
    setDiscount(quote.discount || 0);
    setDiscountType(quote.discountType || 'amount');
    setVatPercent(quote.vatPercent ?? 0);
    setNotes(sanitizeNotes(quote.notes || ''));
    setViewMode('edit');
  };

  const handleDuplicate = (quote: Quotation) => {
    setCustomerId(quote.customerId);
    setCustomerName(quote.customerName);
    setCustomerPhone(quote.customerPhone || '');
    setCustomerEmail(quote.customerEmail || '');
    setCustomerAddress(quote.customerAddress || '');
    setCompanyName(quote.companyName || '');
    setTaxCode(quote.taxCode || '');
    setDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setValidUntil(d.toISOString().split('T')[0]);
    
    // Copy products but clean serviceTags/SNs because they will be new
    const duplicatedProducts = quote.products.map(item => ({
      ...item,
      serviceTag: ''
    }));
    setProducts(duplicatedProducts);
    
    setDiscount(quote.discount || 0);
    setDiscountType(quote.discountType || 'amount');
    setVatPercent(quote.vatPercent ?? 0);
    setNotes(sanitizeNotes(quote.notes || ''));
    setViewMode('create');
    showToast('Đã sao chép cấu hình báo giá cũ!', 'success');
  };

  const handleAddProductRow = (prodId?: string) => {
    if (prodId) {
      const match = productOptions.find(o => o.id === prodId);
      if (match && match.product) {
        const p = match.product;
        // Check if product is already in rows
        const existingIdx = products.findIndex(item => item.productId === p.id);
        if (existingIdx > -1) {
          const updated = [...products];
          updated[existingIdx].quantity += 1;
          // Recalculate subtotal
          const row = updated[existingIdx];
          row.subtotal = calculateRowSubtotal(row);
          setProducts(updated);
          return;
        }

        const newItem: OrderItem = {
          productId: p.id,
          name: p.name,
          quantity: 1,
          price: p.price,
          importPrice: p.importPrice || 0,
          discount: 0,
          discountType: 'amount',
          cpu: p.cpu || '',
          ram: p.ram || '',
          ssd: p.ssd || '',
          screen: p.screen || '',
          warrantyMonths: p.warrantyMonths || 12,
          subtotal: p.price,
          isGift: false
        };
        setProducts([...products, newItem]);
      }
    } else {
      // Manual/Custom item
      const newItem: OrderItem = {
        productId: 'custom_' + Date.now(),
        name: '',
        quantity: 1,
        price: 0,
        importPrice: 0,
        discount: 0,
        discountType: 'amount',
        subtotal: 0,
        warrantyMonths: 12,
        isGift: false
      };
      setProducts([...products, newItem]);
    }
  };

  const handleRemoveProductRow = (index: number) => {
    const updated = products.filter((_, idx) => idx !== index);
    setProducts(updated);
  };

  const handleUpdateProductRow = (index: number, fields: Partial<OrderItem>) => {
    const updated = [...products];
    const item = { ...updated[index], ...fields };
    
    // Recalculate subtotal for this item row
    item.subtotal = calculateRowSubtotal(item);
    
    updated[index] = item;
    setProducts(updated);
  };

  const calculateRowSubtotal = (item: OrderItem) => {
    if (item.isGift) return 0;
    const baseTotal = item.quantity * item.price;
    if (!item.discount) return baseTotal;

    if (item.discountType === 'percent') {
      const discountPercent = Math.min(100, Math.max(0, item.discount));
      return baseTotal * (1 - discountPercent / 100);
    } else {
      const discountAmount = Math.min(baseTotal, Math.max(0, item.discount));
      return baseTotal - discountAmount;
    }
  };

  // Quote Level Summary calculations
  const summaryCalculations = useMemo(() => {
    let subtotalValue = products.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    
    let discountValue = 0;
    if (discountType === 'percent') {
      discountValue = subtotalValue * (Math.min(100, Math.max(0, discount)) / 100);
    } else {
      discountValue = Math.min(subtotalValue, Math.max(0, discount));
    }

    const valueAfterDiscount = Math.max(0, subtotalValue - discountValue);
    const vatValue = valueAfterDiscount * (Math.max(0, vatPercent) / 100);
    const totalValue = valueAfterDiscount + vatValue;

    return {
      subtotal: subtotalValue,
      discountAmount: discountValue,
      vatAmount: vatValue,
      total: totalValue
    };
  }, [products, discount, discountType, vatPercent]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!customerName) {
      showToast('Vui lòng chọn hoặc điền tên khách hàng', 'error');
      return;
    }
    if (products.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 sản phẩm vào bảng báo giá', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = viewMode === 'create' ? generateNewQuotationId() : selectedQuotation!.id;
      const quoteData: Quotation = {
        id: newId,
        customerId: customerId || 'guest_' + Date.now(),
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        companyName,
        taxCode,
        date,
        validUntil,
        products,
        subtotal: summaryCalculations.subtotal,
        discount,
        discountType,
        vatPercent,
        vatAmount: summaryCalculations.vatAmount,
        total: summaryCalculations.total,
        status: isDraft ? 'Nháp' : (viewMode === 'create' ? 'Đã gửi' : selectedQuotation!.status),
        notes,
        createdByUid: auth.currentUser?.uid || '',
        createdByName: auth.currentUser?.displayName || auth.currentUser?.email || 'HỮU LAPTOP Staff',
        createdAt: viewMode === 'create' ? new Date().toISOString() : selectedQuotation!.createdAt,
        updatedAt: new Date().toISOString()
      };

      if (viewMode === 'create') {
        await addItem('quotations', quoteData);
        showToast('Tạo báo giá thành công!', 'success');
      } else {
        await updateItem('quotations', selectedQuotation!.id, quoteData);
        showToast('Cập nhật báo giá thành công!', 'success');
      }

      setViewMode('list');
      setSelectedQuotation(null);
    } catch (error) {
      console.error(error);
      showToast('Có lỗi xảy ra, không thể lưu báo giá.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (quote: Quotation) => {
    if (window.confirm(`Bạn có chắc muốn xóa báo giá ${quote.id}?`)) {
      try {
        await deleteItem('quotations', quote.id);
        showToast('Đã xóa báo giá thành công!', 'success');
        if (selectedQuotation?.id === quote.id) {
          setViewMode('list');
          setSelectedQuotation(null);
        }
      } catch (error) {
        console.error(error);
        showToast('Lỗi khi xóa báo giá', 'error');
      }
    }
  };

  // Convert Quotation to Order flow
  const handleConvertToOrder = async (quote: Quotation) => {
    if (window.confirm(`Xác nhận chuyển đổi báo giá ${quote.id} thành Đơn hàng chính thức?`)) {
      try {
        const orderId = `DH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`;
        
        const newOrder: Order = {
          id: orderId,
          customerId: quote.customerId,
          customerName: quote.customerName,
          customerPhone: quote.customerPhone,
          customerEmail: quote.customerEmail,
          customerAddress: quote.customerAddress,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
          products: quote.products.map(p => ({
            ...p,
            purchaseDate: new Date().toISOString().split('T')[0]
          })),
          // Store the calculations direct
          total: quote.total,
          status: 'Mới',
          paymentMethod: 'Chuyển khoản',
          paymentStatus: 'Đã thanh toán',
          notes: `Được tạo tự động từ báo giá ${quote.id}. \n` + (quote.notes || ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 1. Add new Order
        await addItem('orders', newOrder);
        
        // 2. Mark this Quotation as approved/duyet
        const updatedQuote = { ...quote, status: 'Đã duyệt' as const, updatedAt: new Date().toISOString() };
        await updateItem('quotations', quote.id, updatedQuote);
        
        showToast(`Đã chuyển đổi thành đơn hàng ${orderId} thành công!`, 'success');
        
        if (onNavigate) {
          onNavigate('orders');
        }
      } catch (err) {
        console.error(err);
        showToast('Có lỗi xảy ra khi chuyển đổi thành đơn hàng.', 'error');
      }
    }
  };

  // Custom Iframe Print Helper
  const handlePrintQuote = (quote: Quotation) => {
    const printContent = document.getElementById('printable-quote-a4');
    if (!printContent) {
      showToast('Không tìm thấy bản in', 'error');
      return;
    }

    try {
      const printWindow = document.createElement('iframe');
      printWindow.style.position = 'absolute';
      printWindow.style.top = '-1000px';
      printWindow.style.left = '-1000px';
      printWindow.style.width = '100%';
      printWindow.style.height = '100%';
      document.body.appendChild(printWindow);

      const doc = printWindow.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Báo giá ${quote.id}</title>
              <style>
                @media print {
                  @page { size: A4 portrait; margin: 1.2cm; }
                  body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                body { 
                  font-family: "system-ui", -apple-system, "Segoe UI", Roboto, sans-serif; 
                  background-color: white !important;
                  color: #1e293b !important;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              </style>
            </head>
            <body class="bg-white text-slate-900">
              <div class="w-full">
                ${printContent.innerHTML}
              </div>
            </body>
          </html>
        `);

        // Copy all style & link tags to iframe head to maintain perfect layout
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        stylesheets.forEach((style) => {
          doc.head.appendChild(style.cloneNode(true));
        });

        doc.close();

        // Wait for all images and stylesheets to fully load to prevent unstyled printing or missing logo
        const images = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

        const imagePromises = images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        });

        const linkPromises = links.map((link) => {
          return new Promise<void>((resolve) => {
            link.onload = () => resolve();
            link.onerror = () => resolve();
          });
        });

        const loadTimeout = new Promise<void>((resolve) => setTimeout(resolve, 1200));

        Promise.race([
          Promise.all([...imagePromises, ...linkPromises]),
          loadTimeout
        ]).then(() => {
          // Add a short delay for CSS rendering calculations
          setTimeout(() => {
            try {
              printWindow.contentWindow?.focus();
              printWindow.contentWindow?.print();
            } catch (e) {
              console.error('Print blocked by iframe settings', e);
              window.print();
            }
            setTimeout(() => {
              if (document.body.contains(printWindow)) {
                document.body.removeChild(printWindow);
              }
            }, 1500);
          }, 300);
        });
      } else {
        window.print();
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  // Filter quotation list based on query and status
  const filteredQuotations = useMemo(() => {
    return quotationList.filter((q: Quotation) => {
      const matchQuery = 
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.customerPhone && q.customerPhone.includes(searchQuery));
      
      const matchStatus = statusFilter === 'All' || q.status === statusFilter;
      
      return matchQuery && matchStatus;
    });
  }, [quotationList, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-white text-sm font-bold animate-slide-up ${
          toast.type === 'success' 
            ? 'bg-emerald-600 border-emerald-500 shadow-emerald-200 dark:shadow-none' 
            : 'bg-rose-600 border-rose-500 shadow-rose-200 dark:shadow-none'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="space-y-4 print:hidden">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Báo Giá Khách Hàng</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lập bảng chào giá xịn sò, chuyên nghiệp gửi đối tác doanh nghiệp và khách hàng lớn</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
            >
              <Plus size={18} />
              Tạo báo giá mới
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Tất cả', count: quotationList.length, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
              { label: 'Nháp', count: quotationList.filter((q: any) => q.status === 'Nháp').length, color: 'text-gray-600', bg: 'bg-gray-100/50' },
              { label: 'Đã gửi', count: quotationList.filter((q: any) => q.status === 'Đã gửi').length, color: 'text-blue-600', bg: 'bg-blue-50/50' },
              { label: 'Đã duyệt', count: quotationList.filter((q: any) => q.status === 'Đã duyệt').length, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
              { label: 'Từ chối / Hết hạn', count: quotationList.filter((q: any) => q.status === 'Từ chối' || q.status === 'Hết hạn').length, color: 'text-rose-600', bg: 'bg-rose-50/50' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">{stat.label}</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{stat.count}</span>
                </div>
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <FileText className={`${stat.color}`} size={20} />
                </div>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tìm mã báo giá, tên khách hàng hoặc SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
              />
            </div>
            
            {/* Status Select */}
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'Nháp', 'Đã gửi', 'Đã duyệt', 'Từ chối', 'Hết hạn'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    statusFilter === status 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {status === 'All' ? 'Tất cả' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Quotations List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mã báo giá</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Khách hàng / Công ty</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ngày lập</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Hiệu lực</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Tổng giá trị</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Trạng thái</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                        <span className="font-medium text-sm">Chưa có bảng báo giá nào phù hợp bộ lọc</span>
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((quote: Quotation) => {
                      const StatusIcon = statusIcons[quote.status] || FileText;
                      return (
                        <tr key={quote.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="p-4">
                            <span 
                              onClick={() => { setSelectedQuotation(quote); setViewMode('detail'); }}
                              className="font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                            >
                              {quote.id}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{quote.customerName}</div>
                            {quote.companyName ? (
                              <div className="text-[10px] text-slate-400 font-medium">{quote.companyName}</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-mono">{quote.customerPhone}</div>
                            )}
                          </td>
                          <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(quote.date)}</td>
                          <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{formatDate(quote.validUntil)}</td>
                          <td className="p-4 text-sm font-black text-slate-800 dark:text-slate-100 text-right">{formatCurrency(quote.total)}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${statusColors[quote.status] || ''}`}>
                              <StatusIcon size={12} />
                              {quote.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View details */}
                              <button
                                onClick={() => { setSelectedQuotation(quote); setViewMode('detail'); }}
                                title="Xem chi tiết"
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              >
                                <Eye size={16} />
                              </button>
                              
                              {/* Edit quote */}
                              <button
                                onClick={() => handleEdit(quote)}
                                title="Chỉnh sửa"
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              >
                                <Edit size={16} />
                              </button>

                              {/* Convert to Order */}
                              {quote.status !== 'Đã duyệt' && (
                                <button
                                  onClick={() => handleConvertToOrder(quote)}
                                  title="Chuyển thành Đơn hàng"
                                  className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}

                              {/* Duplicate quote */}
                              <button
                                onClick={() => handleDuplicate(quote)}
                                title="Sao chép báo giá"
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              >
                                <Copy size={16} />
                              </button>

                              {/* Delete quote */}
                              <button
                                onClick={() => handleDelete(quote)}
                                title="Xóa"
                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE / EDIT FORM VIEW --- */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 print:hidden">
          {/* Form Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setViewMode('list'); setSelectedQuotation(null); }}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {viewMode === 'create' ? 'Tạo Báo Giá Mới' : `Chỉnh Sửa Báo Giá ${selectedQuotation?.id}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {viewMode === 'create' ? 'Tạo hồ sơ chào hàng chi tiết gửi khách hàng' : 'Cập nhật lại các thiết lập và điều khoản báo giá'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-all"
              >
                Lưu Nháp
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu & Phát hành'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer & Info Card */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Briefcase size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Thông tin khách hàng</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Customer */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Chọn khách hàng từ danh bạ</label>
                    <SearchableSelect
                      options={customerOptions}
                      value={customerId}
                      onChange={handleSelectCustomer}
                      placeholder="Tìm kiếm khách hàng theo tên hoặc SĐT..."
                    />
                  </div>

                  {/* Manual Inputs in case needed */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tên khách hàng *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Họ và tên khách hàng"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Số điện thoại</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Số điện thoại liên hệ"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email khách hàng"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Địa chỉ nhận hàng</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Địa chỉ giao nhận"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  {/* Corporate Client Info */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tên Công ty / Đơn vị</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ví dụ: Công ty TNHH Giải pháp Phần mềm"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Mã số thuế doanh nghiệp</label>
                    <input
                      type="text"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      placeholder="Mã số thuế doanh nghiệp"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Products/Items Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Danh mục sản phẩm & Thiết bị</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddProductRow()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                    >
                      + Thiết bị tự định nghĩa
                    </button>
                  </div>
                </div>

                {/* Quick Add Product bar */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Thêm sản phẩm từ Kho của HỮU LAPTOP</label>
                  <SearchableSelect
                    options={productOptions}
                    value=""
                    onChange={(id) => handleAddProductRow(id)}
                    placeholder="Tìm thiết bị trong kho để thêm nhanh vào báo giá..."
                  />
                </div>

                {/* Products Table Rows */}
                <div className="space-y-4 pt-4">
                  {products.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 p-8 text-center rounded-xl text-slate-400">
                      Chưa có sản phẩm nào. Chọn sản phẩm ở trên hoặc bấm "Thiết bị tự định nghĩa".
                    </div>
                  ) : (
                    products.map((item, idx) => (
                      <div key={item.productId} className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative space-y-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveProductRow(idx)}
                          className="absolute top-4 right-4 p-1.5 hover:bg-rose-100 hover:text-rose-600 text-slate-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pr-8">
                          {/* Item Name */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên sản phẩm *</label>
                            <input
                              type="text"
                              required
                              value={item.name}
                              onChange={(e) => handleUpdateProductRow(idx, { name: e.target.value })}
                              placeholder="Nhập tên sản phẩm chào giá"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đơn giá (₫)</label>
                            <input
                              type="number"
                              value={item.price || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { price: parseFloat(e.target.value) || 0 })}
                              placeholder="Giá bán"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
                            />
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số lượng</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Specs Options */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">CPU</label>
                            <input
                              type="text"
                              value={item.cpu || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { cpu: e.target.value })}
                              placeholder="Ví dụ: i5 1240P"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">RAM</label>
                            <input
                              type="text"
                              value={item.ram || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { ram: e.target.value })}
                              placeholder="16GB"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">SSD</label>
                            <input
                              type="text"
                              value={item.ssd || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { ssd: e.target.value })}
                              placeholder="512GB"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Màn hình</label>
                            <input
                              type="text"
                              value={item.screen || ''}
                              onChange={(e) => handleUpdateProductRow(idx, { screen: e.target.value })}
                              placeholder="14 FHD"
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Bảo hành</label>
                            <select
                              value={item.warrantyMonths || 12}
                              onChange={(e) => handleUpdateProductRow(idx, { warrantyMonths: parseInt(e.target.value, 10) })}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                            >
                              <option value="0">Không BH</option>
                              <option value="3">3 tháng</option>
                              <option value="6">6 tháng</option>
                              <option value="12">12 tháng</option>
                              <option value="24">24 tháng</option>
                              <option value="36">36 tháng</option>
                            </select>
                          </div>
                          <div className="flex items-center pt-5">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-600">
                              <input
                                type="checkbox"
                                checked={item.isGift || false}
                                onChange={(e) => handleUpdateProductRow(idx, { isGift: e.target.checked })}
                                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                              />
                              Quà tặng
                            </label>
                          </div>
                        </div>

                        {/* Row Total */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1">
                              <span>Chiết khấu:</span>
                              <input
                                type="number"
                                value={item.discount || ''}
                                onChange={(e) => handleUpdateProductRow(idx, { discount: parseFloat(e.target.value) || 0 })}
                                className="w-16 px-1 py-0.5 border rounded text-center text-xs dark:bg-slate-900 dark:text-white"
                              />
                              <select
                                value={item.discountType || 'amount'}
                                onChange={(e) => handleUpdateProductRow(idx, { discountType: e.target.value as 'percent' | 'amount' })}
                                className="px-1 py-0.5 border rounded text-xs dark:bg-slate-900"
                              >
                                <option value="amount">₫</option>
                                <option value="percent">%</option>
                              </select>
                            </div>
                          </div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Thành tiền: <span className="text-sm font-black text-indigo-600">{formatCurrency(item.subtotal || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quote Settings & T&C card */}
            <div className="space-y-6">
              {/* Timeline Card */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Calendar size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Hiệu lực báo giá</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Ngày lập bảng</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Hạn hiệu lực báo giá</label>
                    <input
                      type="date"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <DollarSign size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Tổng giá trị chào hàng</h3>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Cộng tiền thiết bị:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(summaryCalculations.subtotal)}</span>
                  </div>

                  {/* General Discount */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Tổng chiết khấu/giảm giá chung</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none dark:text-white"
                        placeholder="Số tiền hoặc %"
                      />
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none dark:text-white"
                      >
                        <option value="amount">VNĐ</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>

                  {/* VAT option */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Thuế suất giá trị gia tăng (VAT)</label>
                    <select
                      value={vatPercent}
                      onChange={(e) => setVatPercent(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none dark:text-white"
                    >
                      <option value="0">0% (Không chịu thuế)</option>
                      <option value="5">5%</option>
                      <option value="8">8% (Thuế VAT ưu đãi)</option>
                      <option value="10">10% (VAT phổ thông)</option>
                    </select>
                  </div>

                  {/* Calculated summary lines */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    {summaryCalculations.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Đã giảm giá:</span>
                        <span className="font-bold">- {formatCurrency(summaryCalculations.discountAmount)}</span>
                      </div>
                    )}
                    {summaryCalculations.vatAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Thuế VAT ({vatPercent}%):</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">+ {formatCurrency(summaryCalculations.vatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-base pt-2 border-t-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl">
                      <span className="font-bold text-slate-900 dark:text-white">Tổng cộng chào giá:</span>
                      <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(summaryCalculations.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <FileText size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Điều khoản & Điều kiện</h3>
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nhập ghi chú điều khoản báo giá..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs leading-relaxed focus:outline-none dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* --- DETAIL VIEW (INVOICE/PDF & STATS) --- */}
      {viewMode === 'detail' && selectedQuotation && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setViewMode('list'); setSelectedQuotation(null); }}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chi Tiết Báo Giá {selectedQuotation.id}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${statusColors[selectedQuotation.status] || ''}`}>
                    {selectedQuotation.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Lập bởi: {sanitizeText(selectedQuotation.createdByName || 'Nhân viên HỮU LAPTOP')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Print Button */}
              <button
                onClick={() => handlePrintQuote(selectedQuotation)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
              >
                <Printer size={15} />
                In / Xuất PDF báo giá
              </button>

              {/* Edit Button */}
              <button
                onClick={() => handleEdit(selectedQuotation)}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <Edit size={15} />
                Sửa báo giá
              </button>

              {/* Convert to Order Button */}
              {selectedQuotation.status !== 'Đã duyệt' && (
                <button
                  onClick={() => handleConvertToOrder(selectedQuotation)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  <CheckCircle2 size={15} />
                  Chuyển thành Đơn hàng
                </button>
              )}

              {/* Duplicate Button */}
              <button
                onClick={() => handleDuplicate(selectedQuotation)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                <Copy size={15} />
                Nhân bản
              </button>

              {/* Status Manager */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase">Trạng thái:</span>
                <select
                  value={selectedQuotation.status}
                  onChange={async (e) => {
                    const statusVal = e.target.value as any;
                    try {
                      const updated = { ...selectedQuotation, status: statusVal, updatedAt: new Date().toISOString() };
                      await updateItem('quotations', selectedQuotation.id, updated);
                      setSelectedQuotation(updated);
                      showToast('Cập nhật trạng thái báo giá thành công!', 'success');
                    } catch (err) {
                      showToast('Lỗi khi cập nhật trạng thái', 'error');
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 border-none p-0 focus:ring-0 cursor-pointer"
                >
                  <option value="Nháp">Nháp</option>
                  <option value="Đã gửi">Đã gửi</option>
                  <option value="Đã duyệt">Đã duyệt</option>
                  <option value="Từ chối">Từ chối</option>
                  <option value="Hết hạn">Hết hạn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Elegant Screen Preview Card (Mimicking A4 layout) */}
          <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-md max-w-4xl mx-auto overflow-hidden">
            <div id="printable-quote-a4" className="w-full">
              
              {/* 1. Header Information (Shop details) */}
              <div className="flex flex-row justify-between items-start border-b-2 border-blue-600 pb-5 gap-6">
                <div className="flex-1">
                  <h1 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-tight">HỮU LAPTOP</h1>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium">Hệ thống phân phối Laptop, Linh phụ kiện chính hãng & Sửa chữa phần cứng</p>
                  
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs text-slate-600 dark:text-slate-400">
                    <div><span className="font-bold">Địa chỉ:</span> {data.shopInfo?.address || '123 Đường Láng, Đống Đa, Hà Nội'}</div>
                    <div><span className="font-bold">Hotline:</span> {data.shopInfo?.phone || '0988.888.888'}</div>
                    <div><span className="font-bold">Email:</span> {data.shopInfo?.email || 'huulaptop@gmail.com'}</div>
                    <div><span className="font-bold">Website:</span> {data.shopInfo?.website || 'huulaptop.vn'}</div>
                    {data.shopInfo?.taxCode && (
                      <div className="col-span-2"><span className="font-bold">Mã số thuế:</span> {data.shopInfo?.taxCode}</div>
                    )}
                  </div>
                </div>

                {data.shopInfo?.logo && (
                  <div className="w-24 h-24 bg-white rounded-xl border border-slate-150 p-2 flex items-center justify-center shadow-inner flex-shrink-0">
                    <img src={data.shopInfo.logo} alt="Shop Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              {/* 2. Document Title */}
              <div className="text-center my-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Bảng Báo Giá Chi Tiết</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Số: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedQuotation.id}</span> | Ngày lập: {formatDate(selectedQuotation.date)}</p>
              </div>

              {/* 3. Customer & Quote metadata GRID */}
              <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
                {/* Client Information */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/10">
                  <h3 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2.5 border-b border-slate-150 dark:border-slate-800 pb-1.5">Thông tin khách hàng</h3>
                  <div className="space-y-1.5">
                    <div className="flex"><span className="font-semibold text-slate-500 w-24">Khách hàng:</span> <span className="font-bold text-slate-800 dark:text-slate-100">{selectedQuotation.customerName}</span></div>
                    {selectedQuotation.companyName && (
                      <div className="flex"><span className="font-semibold text-slate-500 w-24">Đơn vị:</span> <span className="font-medium text-slate-800 dark:text-slate-100">{selectedQuotation.companyName}</span></div>
                    )}
                    {selectedQuotation.customerPhone && (
                      <div className="flex"><span className="font-semibold text-slate-500 w-24">Điện thoại:</span> <span>{selectedQuotation.customerPhone}</span></div>
                    )}
                    {selectedQuotation.customerEmail && (
                      <div className="flex"><span className="font-semibold text-slate-500 w-24">Email:</span> <span>{selectedQuotation.customerEmail}</span></div>
                    )}
                    {selectedQuotation.customerAddress && (
                      <div className="flex"><span className="font-semibold text-slate-500 w-24">Địa chỉ:</span> <span>{selectedQuotation.customerAddress}</span></div>
                    )}
                    {selectedQuotation.taxCode && (
                      <div className="flex"><span className="font-semibold text-slate-500 w-24">Mã số thuế:</span> <span className="font-mono">{selectedQuotation.taxCode}</span></div>
                    )}
                  </div>
                </div>

                {/* Terms of Quotation */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/10">
                  <h3 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2.5 border-b border-slate-150 dark:border-slate-800 pb-1.5">Thông tin chào hàng</h3>
                  <div className="space-y-1.5">
                    <div className="flex"><span className="font-semibold text-slate-500 w-28">Đơn vị lập:</span> <span>HỮU LAPTOP</span></div>
                    <div className="flex"><span className="font-semibold text-slate-500 w-28">Người đại diện:</span> <span>Điểu Hữu</span></div>
                    <div className="flex"><span className="font-semibold text-slate-500 w-28">Nhân viên lập:</span> <span>{sanitizeText(selectedQuotation.createdByName)}</span></div>
                    <div className="flex"><span className="font-semibold text-slate-500 w-28">Ngày phát hành:</span> <span>{formatDate(selectedQuotation.date)}</span></div>
                    <div className="flex"><span className="font-semibold text-slate-500 w-28 text-rose-600">Hiệu lực đến:</span> <span className="font-bold text-rose-600">{formatDate(selectedQuotation.validUntil)}</span></div>
                  </div>
                </div>
              </div>

              {/* 4. Products Table */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-blue-600 text-white font-bold">
                      <th className="p-3 text-center w-10">STT</th>
                      <th className="p-3">Sản phẩm / Cấu hình thiết bị</th>
                      <th className="p-3 text-center w-12">SL</th>
                      <th className="p-3 text-right w-24">Đơn giá</th>
                      <th className="p-3 text-right w-20">Chiết khấu</th>
                      <th className="p-3 text-right w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {(selectedQuotation.products || []).map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/20">
                        <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.name}
                            {item.isGift && (
                              <span className="gift-badge">Quà tặng</span>
                            )}
                          </div>
                          {(item.cpu || item.ram || item.ssd || item.screen) && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3">
                              {item.cpu && <span>CPU: {item.cpu}</span>}
                              {item.ram && <span>RAM: {item.ram}</span>}
                              {item.ssd && <span>SSD: {item.ssd}</span>}
                              {item.screen && <span>Màn: {item.screen}</span>}
                            </div>
                          )}
                          <div className="text-[9px] text-emerald-600 font-medium mt-0.5">
                            Bảo hành: {item.isGift ? 'Không bảo hành' : `${item.warrantyMonths || 12} tháng`}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right">
                          {item.isGift ? 'Quà tặng' : formatCurrency(item.price).replace('₫', '').trim()}
                        </td>
                        <td className="p-3 text-right text-rose-600">
                          {item.isGift ? '' : (
                            item.discount ? (
                              item.discountType === 'amount' 
                                ? formatCurrency(item.discount).replace('₫', '').trim()
                                : `${item.discount}%`
                            ) : '-'
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                          {item.isGift ? '0' : formatCurrency(item.subtotal || 0).replace('₫', '').trim()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. Summary calculations */}
              <div className="flex flex-row justify-between items-start gap-6 mb-8 text-xs">
                {/* Space holder or terms overview */}
                <div className="flex-1 border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/10">
                  <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Thanh toán & Giao dịch</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Khách hàng có thể thanh toán bằng tiền mặt trực tiếp tại shop hoặc chuyển khoản 24/7. Vui lòng xác nhận phê duyệt báo giá qua Hotline trước khi đến nhận máy hoặc yêu cầu chuyển giao.
                  </p>
                </div>

                <div className="w-80 flex-shrink-0">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="py-2 text-slate-500">Cộng tiền hàng (chưa VAT):</td>
                        <td className="py-2 text-right font-bold">{formatCurrency(selectedQuotation.subtotal)}</td>
                      </tr>
                      {selectedQuotation.discount > 0 && (
                        <tr>
                          <td className="py-2 text-rose-600">Giảm giá tổng chiết khấu:</td>
                          <td className="py-2 text-right font-bold text-rose-600">
                            - {selectedQuotation.discountType === 'percent' 
                              ? `${selectedQuotation.discount}%` 
                              : formatCurrency(selectedQuotation.discount)}
                          </td>
                        </tr>
                      )}
                      {selectedQuotation.vatAmount > 0 && (
                        <tr>
                          <td className="py-2 text-slate-500">Thuế GTGT VAT ({selectedQuotation.vatPercent}%):</td>
                          <td className="py-2 text-right font-bold">+{formatCurrency(selectedQuotation.vatAmount)}</td>
                        </tr>
                      )}
                      <tr className="bg-blue-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-black text-sm">
                        <td className="p-3 border-t-2 border-blue-600 rounded-l-xl">Tổng thanh toán:</td>
                        <td className="p-3 text-right text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 rounded-r-xl">
                          {formatCurrency(selectedQuotation.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. Money in Words */}
              <div className="border border-dashed border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs mb-8">
                <span className="font-bold text-slate-500">Bằng chữ: </span>
                <span className="font-bold text-slate-800 dark:text-slate-100 italic">
                  {numberToVietnameseWords(selectedQuotation.total)}
                </span>
              </div>

              {/* 7. Terms & Notes */}
              {selectedQuotation.notes && (
                <div className="mb-8">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Điều kiện thương mại & Ghi chú đi kèm:</h4>
                  <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-800/10 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                    {sanitizeNotes(selectedQuotation.notes)}
                  </div>
                </div>
              )}

              {/* 8. Signature Blocks */}
              <div className="grid grid-cols-2 text-center mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 page-break-inside-avoid text-xs">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider mb-20">Đại diện khách hàng</h5>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Xác nhận chấp nhận giá</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">(Ký, ghi rõ họ tên & đóng dấu)</div>
                </div>
                <div>
                  <h5 className="font-bold text-blue-600 uppercase tracking-wider mb-20">Đại diện HỮU LAPTOP</h5>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Điểu Hữu</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">(Người lập bảng chào giá)</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
