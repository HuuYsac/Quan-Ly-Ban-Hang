import React, { useMemo, useState } from 'react';
import { AppData, Order, Customer, Product, Repair } from '../types';
import { formatCurrency, numberToVietnameseWords } from '../lib/utils';
import { 
  DollarSign, 
  ClipboardList, 
  Users, 
  Package, 
  FileText, 
  UserPlus, 
  PlusCircle, 
  BarChart2, 
  TrendingUp, 
  AlertTriangle, 
  Wrench, 
  ShieldAlert,
  ArrowUpRight,
  ChevronRight,
  Clock,
  HeartHandshake,
  ShieldCheck,
  X,
  Printer,
  Eye,
  Laptop,
  Tag,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { subDays, format, isSameDay, parseISO } from 'date-fns';

import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  data: AppData;
  onNavigate: (page: string) => void;
  isAdmin?: boolean;
}

export function Dashboard({ data, onNavigate, isAdmin }: DashboardProps) {
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewRepair, setViewRepair] = useState<Repair | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => setIsPrinting(false), 2000);
    window.print();
  };

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Revenue & Orders
    const todayOrders = data.orders?.filter(o => o.date === todayStr) || [];
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    
    const paidOrders = data.orders?.filter(o => o.paymentStatus === 'Đã thanh toán') || [];
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    // Low Stock
    const lowStockProducts = data.products?.filter(p => p.stock <= p.minStock) || [];

    // Pending Repairs
    const pendingRepairs = data.repairs?.filter(r => r.status === 'Đang sửa') || [];

    // Expiring Warranties (within 30 days)
    const expiringWarranties: any[] = [];
    data.orders?.forEach(order => {
      order.products?.forEach(product => {
        if (product.serviceTag && product.purchaseDate && product.warrantyMonths) {
          const purchaseDate = new Date(product.purchaseDate);
          const expiryDate = new Date(purchaseDate);
          expiryDate.setMonth(expiryDate.getMonth() + product.warrantyMonths);
          
          const diffTime = expiryDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysRemaining >= 0 && daysRemaining <= 30) {
            expiringWarranties.push({
              customerId: order.customerId,
              customerName: order.customerName,
              productName: product.name,
              expiryDate,
              daysRemaining
            });
          }
        }
      });
    });

    // Pending Users
    const pendingUsers = data.users?.filter(u => u.approved === false) || [];

    // Last 7 days chart data
    const chartData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayRevenue = (data.orders || [])
        .filter(o => o.date === dateStr && o.paymentStatus === 'Đã thanh toán')
        .reduce((sum, o) => sum + o.total, 0);
      
      return {
        name: format(date, 'dd/MM'),
        revenue: dayRevenue
      };
    });

    return {
      todayRevenue,
      todayOrdersCount: todayOrders.length,
      totalRevenue,
      customerCount: data.customers?.length || 0,
      productCount: data.products?.length || 0,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 3),
      pendingRepairsCount: pendingRepairs.length,
      pendingRepairs: pendingRepairs.slice(0, 3),
      expiringWarrantiesCount: expiringWarranties.length,
      expiringWarranties: expiringWarranties.slice(0, 3),
      pendingUsersCount: pendingUsers.length,
      pendingUsers: pendingUsers.slice(0, 3),
      chartData
    };
  }, [data]);

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Chào buổi sáng, <span className="text-indigo-600">Hữu!</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Đây là những gì đang diễn ra tại cửa hàng của bạn hôm nay.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-white/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
          <Calendar size={16} className="text-indigo-500" />
          <span className="uppercase tracking-wider">{format(new Date(), 'eeee, dd/MM/yyyy')}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {isAdmin && stats.pendingUsersCount > 0 ? (
          <StatCard 
            title="Thành viên mới" 
            value={stats.pendingUsersCount.toString()} 
            icon={UserPlus} 
            trend="Chờ phê duyệt" 
            trendUp={false} 
            color="rose"
            onClick={() => onNavigate('members')}
          />
        ) : (
          <StatCard 
            title="Doanh thu ngày" 
            value={formatCurrency(stats.todayRevenue)} 
            icon={DollarSign} 
            trend="+12.5%" 
            trendUp={true} 
            color="blue"
            onClick={() => onNavigate('orders')}
          />
        )}
        <StatCard 
          title="Đơn hàng mới" 
          value={stats.todayOrdersCount.toString()} 
          icon={ClipboardList} 
          trend="+2 đơn" 
          trendUp={true} 
          color="indigo"
          onClick={() => onNavigate('orders')}
        />
        <StatCard 
          title="Khách hàng" 
          value={stats.customerCount.toString()} 
          icon={Users} 
          trend="+5 mới" 
          trendUp={true} 
          color="emerald"
          onClick={() => onNavigate('customers')}
        />
        <StatCard 
          title="Sản phẩm" 
          value={stats.productCount.toString()} 
          icon={Package} 
          trend={`${stats.lowStockCount} sắp hết`} 
          trendUp={false} 
          color="amber"
          onClick={() => onNavigate('products')}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Hiệu suất doanh thu</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Thống kê 7 ngày gần nhất</p>
              </div>
            </div>
            <motion.button 
              whileHover={{ x: 3 }}
              onClick={() => onNavigate('reports')}
              className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              Chi tiết báo cáo <ChevronRight size={14} />
            </motion.button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                  formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={32}>
                  {stats.chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 6 ? '#4f46e5' : '#e2e8f0'} 
                      className="transition-all duration-300 hover:fill-indigo-400"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Thao tác nhanh</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <QuickAction icon={FileText} title="Tạo đơn" color="blue" onClick={() => onNavigate('orders')} />
            <QuickAction icon={UserPlus} title="+ Khách" color="emerald" onClick={() => onNavigate('customers')} />
            <QuickAction icon={PlusCircle} title="+ SP" color="amber" onClick={() => onNavigate('products')} />
            <QuickAction icon={Wrench} title="Sửa chữa" color="rose" onClick={() => onNavigate('repairs')} />
            <QuickAction icon={HeartHandshake} title="CRM" color="indigo" onClick={() => onNavigate('crm')} />
            <QuickAction icon={ShieldCheck} title="Bảo hành" color="emerald" onClick={() => onNavigate('warranty')} />
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('orders')}
            className="mt-8 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl shadow-slate-900/20 cursor-pointer group overflow-hidden relative"
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <BarChart2 size={16} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng doanh thu hệ thống</span>
            </div>
            <p className="text-2xl font-black text-white tracking-tight relative z-10">{formatCurrency(stats.totalRevenue)}</p>
            <div className="flex items-center gap-1 mt-2 relative z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[10px] text-slate-400 font-medium">Dữ liệu thời gian thực từ các đơn đã thanh toán</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Low Stock */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div 
              className="flex items-center justify-between mb-6 cursor-pointer group"
              onClick={() => onNavigate('products')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Sắp hết hàng</h3>
              </div>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-lg">
                {stats.lowStockCount}
              </span>
            </div>
            <div className="space-y-2">
              {stats.lowStockProducts.length > 0 ? stats.lowStockProducts.map(p => (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={p.id} 
                  onClick={() => setViewProduct(p)}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-100"
                >
                  <span className="text-xs text-slate-600 font-bold truncate max-w-[150px] group-hover:text-indigo-600">{p.name}</span>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">Còn {p.stock}</span>
                </motion.div>
              )) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Tồn kho đang ở mức an toàn ✨</p>
              )}
            </div>
          </motion.div>

          {/* Pending Repairs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div 
              className="flex items-center justify-between mb-6 cursor-pointer group"
              onClick={() => onNavigate('repairs')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Đang sửa chữa</h3>
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded-lg">
                {stats.pendingRepairsCount}
              </span>
            </div>
            <div className="space-y-2">
              {stats.pendingRepairs.length > 0 ? stats.pendingRepairs.map(r => (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={r.id} 
                  onClick={() => setViewRepair(r)}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-100"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-bold truncate max-w-[150px] group-hover:text-indigo-600">{r.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{r.productName}</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">ĐANG XỬ LÝ</span>
                </motion.div>
              )) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Không có máy đang sửa chữa.</p>
              )}
            </div>
          </motion.div>

          {/* Expiring Warranties */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6"
          >
            <div 
              className="flex items-center justify-between mb-6 cursor-pointer group"
              onClick={() => onNavigate('customers')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Bảo hành sắp hết</h3>
              </div>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-1 rounded-lg">
                {stats.expiringWarrantiesCount}
              </span>
            </div>
            <div className="space-y-2">
              {stats.expiringWarranties.length > 0 ? stats.expiringWarranties.map((w, i) => (
                <motion.div 
                  whileHover={{ x: 4 }}
                  key={i} 
                  onClick={() => {
                    const customer = data.customers?.find(c => c.id === w.customerId);
                    if (customer) setViewCustomer(customer);
                  }}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-slate-100"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-600 font-bold truncate max-w-[150px] group-hover:text-indigo-600">{w.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{w.productName}</span>
                  </div>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">CÒN {w.daysRemaining} NGÀY</span>
                </motion.div>
              )) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Không có bảo hành sắp hết hạn.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Hoạt động gần đây</h2>
            </div>
            <motion.button 
              whileHover={{ x: 3 }}
              onClick={() => onNavigate('orders')}
              className="text-xs text-indigo-600 font-bold hover:underline uppercase tracking-wider"
            >
              Xem tất cả
            </motion.button>
          </div>
          <div className="space-y-2">
            {(data.orders || []).slice(0, 6).map((order, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (idx * 0.05) }}
                key={order.id} 
                onClick={() => setViewOrder(order)}
                className="flex items-center gap-4 p-4 hover:bg-slate-50/80 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-slate-100"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm ${
                  order.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <ClipboardList size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 
                      className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const customer = data.customers?.find(c => c.id === order.customerId);
                        if (customer) setViewCustomer(customer);
                      }}
                    >
                      {order.customerName}
                    </h4>
                    <span className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {order.paymentStatus === 'Đã thanh toán' ? 'Đã thanh toán đơn hàng' : 'Đặt hàng mới'} <span className="text-slate-500 font-bold">#{order.id}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {order.date} • {order.time}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4 print:bg-white print:p-0 print:static print:block">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:max-h-none print:overflow-visible print:w-full print:max-w-none relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30 print:hidden">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{viewOrder.id}</h3>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="relative z-50 flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Printer size={18} className={isPrinting ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">{isPrinting ? 'Đang chuẩn bị...' : 'In hóa đơn'}</span>
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
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-start gap-4">
                    <img 
                      src="https://storage.googleapis.com/static.antigravity.dev/dieuhuu1995@gmail.com/610176597039/dieuhuu1995@gmail.com_1742636402000_1.png" 
                      alt="Shop Logo" 
                      className="w-24 h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-lg uppercase">{data.shopInfo?.name || 'Hữu Laptop'}</p>
                      <p><span className="font-semibold">Điện thoại:</span> {data.shopInfo?.phone}</p>
                      <p><span className="font-semibold">Địa chỉ:</span> {data.shopInfo?.address}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-xl uppercase mb-2">HÓA ĐƠN BÁN HÀNG</p>
                    <p>Mã số: <span className="font-bold">{viewOrder.id}</span></p>
                    <p>Ngày: {viewOrder.date}</p>
                  </div>
                </div>

                <div className="border-t border-black my-4"></div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-sm">
                  <div className="col-span-1 space-y-1">
                    <p><span className="font-semibold">Họ tên người mua hàng:</span> {viewOrder.customerName}</p>
                    <p><span className="font-semibold">Tên đơn vị:</span> {data.customers?.find(c => c.id === viewOrder.customerId)?.companyName || ''}</p>
                    <p><span className="font-semibold">Địa chỉ:</span> {data.customers?.find(c => c.id === viewOrder.customerId)?.address || ''}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p><span className="font-semibold">Số điện thoại:</span> {data.customers?.find(c => c.id === viewOrder.customerId)?.phone || ''}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black mb-6 text-sm">
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
                  </thead>
                  <tbody>
                    {(viewOrder.products || []).map((item, idx) => (
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
                      <td colSpan={6} className="border border-black p-2 text-right font-bold uppercase">Tổng cộng tiền hàng:</td>
                      <td className="border border-black p-2 text-right font-bold">{formatCurrency(viewOrder.total)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="text-sm mb-8 space-y-2">
                  <p><span className="font-semibold italic">Số tiền viết bằng chữ:</span> {numberToVietnameseWords(viewOrder.total)}</p>
                  <p>
                    {viewOrder.paymentStatus === 'Đã thanh toán' 
                      ? `Hình thức thanh toán: ${viewOrder.paymentMethod}.` 
                      : `Hình thức thanh toán: Công nợ.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 text-center mb-24">
                  <div>
                    <p className="font-bold">Người mua hàng</p>
                    <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="font-bold">Người bán hàng</p>
                    <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
                    <div className="mt-8">
                      <p className="text-rose-600 font-bold uppercase text-lg">{data.shopInfo?.name || 'Hữu Laptop'}</p>
                      <p className="text-[10px] text-gray-500 italic">Đã được ký điện tử bởi hệ thống quản lý</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-12 pt-6 border-t border-dashed border-gray-300">
                  <div className="border-2 border-rose-500 rounded-2xl p-4 flex gap-6 items-center bg-rose-50/30">
                    <div className="text-sm space-y-1">
                      <p className="font-bold text-blue-800">Ngân hàng {data.shopInfo?.bankName || 'Techcombank'}</p>
                      <p className="font-bold">STK: {data.shopInfo?.bankAccount || '95 7777 6789'}</p>
                      <p className="font-bold">Tên: {data.shopInfo?.taxCode || 'DIEU HUU'}</p>
                      <p className="text-xs text-gray-500 mt-2 italic">* Quét mã để thanh toán nhanh</p>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-gray-200">
                      <img 
                        src="https://storage.googleapis.com/static.antigravity.dev/dieuhuu1995@gmail.com/610176597039/dieuhuu1995@gmail.com_1742636402000_0.png" 
                        alt="Payment QR" 
                        className="w-24 h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 italic">
                    Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ!
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
                    <p className="text-sm text-gray-500 mb-1">Ngày đặt hàng</p>
                    <p className="font-medium text-gray-900">{viewOrder.date} {viewOrder.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Trạng thái thanh toán</p>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      viewOrder.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {viewOrder.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Hình thức thanh toán</p>
                    <p className="font-medium text-gray-900">{viewOrder.paymentMethod}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 mb-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">Sản phẩm</h4>
                  <div className="space-y-3">
                    {(viewOrder.products || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} x {formatCurrency(item.price)}
                            {item.discount && item.discount > 0 && (
                              <span className="ml-2 text-rose-500">
                                -{item.discountType === 'amount' ? formatCurrency(item.discount) : `${item.discount}%`}
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="text-sm font-black text-gray-900 ml-4">
                          {formatCurrency(item.subtotal || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Tổng cộng</span>
                    <span className="text-2xl font-black">{formatCurrency(viewOrder.total)}</span>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    {numberToVietnameseWords(viewOrder.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết khách hàng</h3>
              <button 
                onClick={() => setViewCustomer(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">{viewCustomer.name}</h2>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      viewCustomer.type === 'doanh-nghiep' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {viewCustomer.type === 'doanh-nghiep' ? 'Doanh nghiệp' : 'Cá nhân'}
                    </span>
                    {viewCustomer.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{viewCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{viewCustomer.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin size={18} className="text-gray-400" />
                    <span className="text-sm font-medium">{viewCustomer.address || 'Chưa có địa chỉ'}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
                  <p className="text-xs text-gray-500 mb-1">Tổng nợ hiện tại</p>
                  <p className={`text-2xl font-black ${viewCustomer.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(viewCustomer.debt)}
                  </p>
                </div>
              </div>

              {viewCustomer.devices && viewCustomer.devices.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Laptop size={18} className="text-blue-600" />
                    Thiết bị đang sử dụng
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(viewCustomer.devices || []).map((device, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-gray-900">{device.name}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                            {device.serial}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <p>Ngày mua: <span className="text-gray-900 font-medium">{device.purchaseDate}</span></p>
                          <p>Bảo hành: <span className="text-gray-900 font-medium">{device.warrantyEnd}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setViewCustomer(null);
                    onNavigate('customers');
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Quản lý khách hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-md h-full sm:h-auto animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Package size={24} />
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
                  <p className="text-lg font-bold text-rose-600">{viewProduct.stock}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Giá bán</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(viewProduct.price)}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setViewProduct(null);
                  onNavigate('inventory');
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
              >
                Xem trong kho
              </button>
            </div>
          </div>
        </div>
      )}

      {viewRepair && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-md h-full sm:h-auto animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench size={24} />
                </div>
                <button 
                  onClick={() => setViewRepair(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{viewRepair.productName}</h3>
              <p className="text-sm text-blue-600 font-medium mb-6">Khách hàng: {viewRepair.customerName}</p>
              
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Tình trạng máy</p>
                  <p className="text-sm font-medium text-gray-900">{viewRepair.issue}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Ngày nhận</p>
                    <p className="text-sm font-bold text-gray-900">{viewRepair.receivedDate}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                      {viewRepair.status}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setViewRepair(null);
                  onNavigate('repairs');
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                Quản lý sửa chữa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color, onClick }: any) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500 shadow-blue-200 text-white',
    indigo: 'bg-indigo-500 shadow-indigo-200 text-white',
    emerald: 'bg-emerald-500 shadow-emerald-200 text-white',
    amber: 'bg-amber-500 shadow-amber-200 text-white',
    rose: 'bg-rose-500 shadow-rose-200 text-white',
  };

  const lightColorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <motion.div 
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`glass-card p-6 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50/50 rounded-full blur-2xl group-hover:bg-slate-100/50 transition-colors"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3 ${colorMap[color] || colorMap.blue}`}>
          <Icon size={22} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <AlertTriangle size={12} />}
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
}

function QuickAction({ icon: Icon, title, color, onClick }: any) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 hover:bg-blue-600',
    emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-600',
    amber: 'text-amber-600 bg-amber-50 hover:bg-amber-600',
    rose: 'text-rose-600 bg-rose-50 hover:bg-rose-600',
    indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-600',
  };

  return (
    <motion.button 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:text-white shadow-sm hover:shadow-xl group ${colorMap[color]}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-white/50 group-hover:bg-transparent transition-colors">
        <Icon size={20} className="transition-transform group-hover:scale-110" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
    </motion.button>
  );
}
