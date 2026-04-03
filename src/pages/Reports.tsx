import React, { useMemo, useState } from 'react';
import { AppData } from '../types';
import { BarChart3, TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, Calendar, Lightbulb, Target, Zap } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfWeek, endOfWeek, startOfYear, endOfYear, subWeeks, subYears } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReportsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

type TimeFilter = 'week' | 'month' | 'year';

export function Reports({ data, updateData }: ReportsProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Helper to get import price for profit calculation
  const getImportPrice = (productId: string, itemImportPrice?: number) => {
    if (itemImportPrice !== undefined) return itemImportPrice;
    const product = (data.products || []).find(p => p.id === productId);
    return product?.importPrice || 0;
  };

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (timeFilter === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      prevStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    } else if (timeFilter === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      prevStartDate = startOfMonth(subMonths(now, 1));
      prevEndDate = endOfMonth(subMonths(now, 1));
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      prevStartDate = startOfYear(subYears(now, 1));
      prevEndDate = endOfYear(subYears(now, 1));
    }

    const paidOrders = (data.orders || []).filter(o => o.paymentStatus === 'Đã thanh toán');
    
    const currentPeriodOrders = paidOrders.filter(o => {
      const orderDate = parseISO(o.date);
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    });

    const prevPeriodOrders = paidOrders.filter(o => {
      const orderDate = parseISO(o.date);
      return isWithinInterval(orderDate, { start: prevStartDate, end: prevEndDate });
    });

    const totalRevenue = currentPeriodOrders.reduce((sum, o) => sum + o.total, 0);
    const prevRevenue = prevPeriodOrders.reduce((sum, o) => sum + o.total, 0);
    
    const totalCost = currentPeriodOrders.reduce((sum, o) => {
      return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
    }, 0);
    const prevCost = prevPeriodOrders.reduce((sum, o) => {
      return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const prevProfit = prevRevenue - prevCost;
    
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitGrowth = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;

    // Category profitability
    const categoryProfitData = (data.categories || []).map(cat => {
      const catProducts = (data.products || []).filter(p => p.category === cat.name);
      const catOrders = currentPeriodOrders.filter(o => 
        (o.products || []).some(op => catProducts.some(cp => cp.id === op.productId))
      );

      const revenue = catOrders.reduce((sum, o) => {
        const catItems = (o.products || []).filter(op => catProducts.some(cp => cp.id === op.productId));
        return sum + catItems.reduce((s, i) => s + i.subtotal, 0);
      }, 0);

      const cost = catOrders.reduce((sum, o) => {
        const catItems = (o.products || []).filter(op => catProducts.some(cp => cp.id === op.productId));
        return sum + catItems.reduce((s, i) => s + (getImportPrice(i.productId, i.importPrice) * i.quantity), 0);
      }, 0);

      const profit = revenue - cost;
      return { name: cat.name, revenue, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 };
    }).filter(c => c.revenue > 0).sort((a, b) => b.profit - a.profit);

    // Most profitable products
    const profitableProducts = (data.products || []).map(p => {
      const productOrders = currentPeriodOrders.filter(o => (o.products || []).some(op => op.productId === p.id));
      const revenue = productOrders.reduce((sum, o) => {
        const items = (o.products || []).filter(op => op.productId === p.id);
        return sum + items.reduce((s, i) => s + i.subtotal, 0);
      }, 0);
      const cost = productOrders.reduce((sum, o) => {
        const items = (o.products || []).filter(op => op.productId === p.id);
        return sum + items.reduce((s, i) => s + (getImportPrice(i.productId, i.importPrice) * i.quantity), 0);
      }, 0);
      const profit = revenue - cost;
      const quantitySold = productOrders.reduce((sum, o) => {
        const items = (o.products || []).filter(op => op.productId === p.id);
        return sum + items.reduce((s, i) => s + i.quantity, 0);
      }, 0);
      return { ...p, revenue, profit, quantitySold };
    }).filter(p => p.revenue > 0).sort((a, b) => b.profit - a.profit).slice(0, 5);

    // Chart data based on filter
    let chartData = [];
    if (timeFilter === 'week') {
      chartData = Array.from({ length: 7 }).map((_, i) => {
        const date = subWeeks(now, 0); // current week
        const day = startOfWeek(date, { weekStartsOn: 1 });
        const currentDay = new Date(day);
        currentDay.setDate(day.getDate() + i);
        const dayLabel = format(currentDay, 'eeee', { locale: vi });

        const dayOrders = currentPeriodOrders.filter(o => o.date === format(currentDay, 'yyyy-MM-dd'));
        const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
        const cost = dayOrders.reduce((sum, o) => {
          return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
        }, 0);
        return { name: dayLabel, revenue, profit: revenue - cost };
      });
    } else if (timeFilter === 'month') {
      chartData = Array.from({ length: 4 }).map((_, i) => {
        const weekStart = startOfWeek(subWeeks(now, 3 - i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, 3 - i), { weekStartsOn: 1 });
        const weekLabel = `Tuần ${i + 1}`;

        const weekOrders = paidOrders.filter(o => {
          const orderDate = parseISO(o.date);
          return isWithinInterval(orderDate, { start: weekStart, end: weekEnd });
        });

        const revenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
        const cost = weekOrders.reduce((sum, o) => {
          return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
        }, 0);
        return { name: weekLabel, revenue, profit: revenue - cost };
      });
    } else {
      chartData = Array.from({ length: 12 }).map((_, i) => {
        const monthDate = startOfMonth(new Date(now.getFullYear(), i, 1));
        const monthLabel = format(monthDate, 'MM/yyyy');

        const monthOrders = paidOrders.filter(o => {
          const orderDate = parseISO(o.date);
          return isWithinInterval(orderDate, { start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
        });

        const revenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
        const cost = monthOrders.reduce((sum, o) => {
          return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
        }, 0);
        return { name: monthLabel, revenue, profit: revenue - cost };
      });
    }

    return {
      totalRevenue,
      totalProfit,
      profitMargin,
      revenueGrowth,
      profitGrowth,
      categoryProfitData,
      profitableProducts,
      chartData,
      totalOrders: currentPeriodOrders.length,
      totalProductsSold: currentPeriodOrders.reduce((sum, o) => sum + (o.products || []).reduce((s, p) => s + p.quantity, 0), 0),
    };
  }, [data, timeFilter]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const solutions = useMemo(() => {
    const list = [];
    
    // 1. Profitability Recommendation
    if (stats.categoryProfitData.length > 0) {
      const topCat = stats.categoryProfitData[0];
      list.push({
        title: 'Tối ưu hóa danh mục lợi nhuận cao',
        desc: `Danh mục "${topCat.name}" đang mang lại lợi nhuận tốt nhất (${topCat.margin.toFixed(1)}%). Nên tập trung ngân sách quảng cáo và nhập thêm hàng cho nhóm này.`,
        icon: <Target className="text-indigo-600" size={18} />,
        color: 'bg-indigo-50'
      });
    }

    // 2. Growth Recommendation
    if (stats.revenueGrowth < 0) {
      list.push({
        title: 'Cải thiện doanh thu',
        desc: `Doanh thu giảm ${Math.abs(stats.revenueGrowth).toFixed(1)}% so với kỳ trước. Cần triển khai các chương trình khuyến mãi hoặc tri ân khách hàng cũ để kích cầu.`,
        icon: <Zap className="text-rose-600" size={18} />,
        color: 'bg-rose-50'
      });
    } else {
      list.push({
        title: 'Duy trì đà tăng trưởng',
        desc: `Doanh thu tăng ${stats.revenueGrowth.toFixed(1)}%. Đây là thời điểm tốt để mở rộng tệp khách hàng mới thông qua các kênh marketing online.`,
        icon: <Zap className="text-emerald-600" size={18} />,
        color: 'bg-emerald-50'
      });
    }

    // 3. Inventory/Product Recommendation
    if (stats.profitableProducts.length > 0) {
      const topProduct = stats.profitableProducts[0];
      list.push({
        title: 'Chiến lược sản phẩm chủ lực',
        desc: `Sản phẩm "${topProduct.name}" là "con gà đẻ trứng vàng" với lợi nhuận ${formatCurrency(topProduct.profit)}. Hãy đảm bảo nguồn cung ổn định và không để đứt hàng.`,
        icon: <Lightbulb className="text-amber-600" size={18} />,
        color: 'bg-amber-50'
      });
    }

    return list;
  }, [stats]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Phân tích báo cáo</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dữ liệu kinh doanh thời gian thực</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {(['week', 'month', 'year'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                timeFilter === f 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full blur-xl group-hover:bg-blue-100 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doanh thu</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-[10px] font-black uppercase tracking-widest ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.revenueGrowth >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
            <span>{Math.abs(stats.revenueGrowth).toFixed(1)}% so với kỳ trước</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full blur-xl group-hover:bg-emerald-100 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lợi nhuận</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalProfit)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-[10px] font-black uppercase tracking-widest ${stats.profitGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.profitGrowth >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
            <span>{Math.abs(stats.profitGrowth).toFixed(1)}% so với kỳ trước</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full blur-xl group-hover:bg-indigo-100 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ suất LN</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{stats.profitMargin.toFixed(1)}%</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <PieChartIcon size={18} />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Hiệu quả kinh doanh ròng
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-50 rounded-full blur-xl group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đơn hàng</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{stats.totalOrders}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {stats.totalProductsSold} sản phẩm đã bán
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Biểu đồ tăng trưởng</h3>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  width={35}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                <Bar name="Doanh thu" dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar name="Lợi nhuận" dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PieChartIcon size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cơ cấu lợi nhuận</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryProfitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="profit"
                >
                  {stats.categoryProfitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {stats.categoryProfitData.slice(0, 4).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate max-w-[120px]">{cat.name}</span>
                </div>
                <span className="text-xs font-black text-slate-900">{formatCurrency(cat.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Solutions & Recommendations */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lightbulb size={16} />
          </div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Giải pháp tăng trưởng doanh thu</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {solutions.map((s, i) => (
            <div key={i} className={`${s.color} p-5 rounded-2xl border border-white/50 relative overflow-hidden group`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {s.icon}
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{s.title}</h4>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sản phẩm lợi nhuận cao</h3>
          </div>
          <div className="space-y-4">
            {stats.profitableProducts.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Đã bán: {product.quantitySold} cái</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">+{formatCurrency(product.profit)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">DT: {formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Xu hướng doanh thu</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
              <PieChartIcon size={18} />
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Dựa trên dữ liệu {timeFilter === 'week' ? 'tuần' : timeFilter === 'month' ? 'tháng' : 'năm'} qua, doanh thu có xu hướng <span className="text-emerald-600 font-black">tăng trưởng ổn định</span>. 
              Sản phẩm chủ lực đóng góp hơn 40% tổng lợi nhuận của cửa hàng. Cần duy trì tồn kho cho các nhóm này.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
