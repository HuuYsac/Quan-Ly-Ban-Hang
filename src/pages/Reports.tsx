import React, { useMemo } from 'react';
import { AppData } from '../types';
import { BarChart3, TrendingUp, DollarSign, Package, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, Calendar } from 'lucide-react';
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
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReportsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function Reports({ data, updateData }: ReportsProps) {
  // Helper to get import price for profit calculation
  const getImportPrice = (productId: string, itemImportPrice?: number) => {
    if (itemImportPrice !== undefined) return itemImportPrice;
    const product = (data.products || []).find(p => p.id === productId);
    return product?.importPrice || 0;
  };

  const stats = useMemo(() => {
    const paidOrders = (data.orders || []).filter(o => o.paymentStatus === 'Đã thanh toán');
    
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    
    const totalCost = paidOrders.reduce((sum, o) => {
      return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Category profitability
    const categoryProfitData = (data.categories || []).map(cat => {
      const catProducts = (data.products || []).filter(p => p.category === cat.name);
      const catOrders = paidOrders.filter(o => 
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
      const productOrders = paidOrders.filter(o => (o.products || []).some(op => op.productId === p.id));
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

    // Monthly data for the last 12 months for better comparison
    const monthlyData = Array.from({ length: 12 }).map((_, i) => {
      const date = subMonths(new Date(), 11 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MM/yyyy');

      const monthOrders = paidOrders.filter(o => {
        const orderDate = parseISO(o.date);
        return isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
      });

      const revenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
      const cost = monthOrders.reduce((sum, o) => {
        return sum + (o.products || []).reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
      }, 0);
      const profit = revenue - cost;

      return {
        name: monthLabel,
        revenue,
        profit,
        cost,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        orders: monthOrders.length
      };
    });

    const currentMonth = monthlyData[monthlyData.length - 1];
    const lastMonth = monthlyData[monthlyData.length - 2];
    
    const revenueGrowth = lastMonth.revenue > 0 
      ? ((currentMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100 
      : 0;
    
    const profitGrowth = lastMonth.profit > 0 
      ? ((currentMonth.profit - lastMonth.profit) / lastMonth.profit) * 100 
      : 0;

    // Best selling products
    const productSales = (data.products || []).map(p => {
      const quantitySold = (data.orders || []).reduce((sum, o) => {
        const item = (o.products || []).find(item => item.productId === p.id);
        return sum + (item?.quantity || 0);
      }, 0);
      return { ...p, quantitySold };
    }).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

    // Category distribution
    const categoryData = (data.categories || []).map(cat => {
      const value = (data.products || [])
        .filter(p => p.category === cat.name)
        .reduce((sum, p) => {
          const sold = (data.orders || []).reduce((s, o) => {
            const item = (o.products || []).find(item => item.productId === p.id);
            return s + (item?.quantity || 0);
          }, 0);
          return sum + sold;
        }, 0);
      return { name: cat.name, value };
    }).filter(c => c.value > 0);

    return {
      totalRevenue,
      totalProfit,
      profitMargin,
      totalOrders: (data.orders || []).length,
      totalProductsSold: (data.orders || []).reduce((sum, o) => sum + (o.products || []).reduce((s, p) => s + p.quantity, 0), 0),
      monthlyData,
      currentMonth,
      lastMonth,
      revenueGrowth,
      profitGrowth,
      productSales,
      profitableProducts,
      categoryData,
      categoryProfitData
    };
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Doanh thu</p>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div className={`mt-3 sm:mt-4 flex items-center text-[10px] sm:text-xs font-medium ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.revenueGrowth >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
            <span>{Math.abs(stats.revenueGrowth).toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Lợi nhuận</p>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{formatCurrency(stats.totalProfit)}</h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className={`mt-3 sm:mt-4 flex items-center text-[10px] sm:text-xs font-medium ${stats.profitGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.profitGrowth >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
            <span>{Math.abs(stats.profitGrowth).toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Tỷ suất LN</p>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{stats.profitMargin.toFixed(1)}%</h3>
            </div>
            <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <PieChartIcon size={18} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-500">
            Trung bình mỗi đơn
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Biểu đồ Doanh thu & Lợi nhuận</h3>
            </div>
          </div>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  width={35}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar name="Doanh thu" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Lợi nhuận" dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-indigo-600" size={20} />
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Lợi nhuận theo danh mục</h3>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryProfitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="profit"
                >
                  {stats.categoryProfitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.categoryProfitData.slice(0, 4).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-gray-600 truncate max-w-[100px]">{cat.name}</span>
                </div>
                <span className="font-semibold text-emerald-600">{formatCurrency(cat.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} />
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Bảng chi tiết hàng tháng</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3">Tháng</th>
                <th className="px-4 sm:px-6 py-3 text-right">Doanh thu</th>
                <th className="px-4 sm:px-6 py-3 text-right text-rose-500">Giá vốn</th>
                <th className="px-4 sm:px-6 py-3 text-right text-emerald-600">Lợi nhuận</th>
                <th className="px-4 sm:px-6 py-3 text-right">Tỷ suất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.monthlyData.slice().reverse().filter(m => m.revenue > 0).map((month) => (
                <tr key={month.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">{month.name}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right font-bold">{formatCurrency(month.revenue)}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right text-gray-500">{formatCurrency(month.cost)}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right font-bold text-emerald-600">{formatCurrency(month.profit)}</td>
                  <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-bold">
                      {month.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-600" size={20} />
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Sản phẩm lợi nhuận cao</h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {stats.profitableProducts.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs sm:text-sm">
                    {i + 1}
                  </div>
                  <div className="max-w-[120px] sm:max-w-none">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">Bán: {product.quantitySold} cái</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold text-emerald-600">+{formatCurrency(product.profit)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 font-medium">DT: {formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-600" size={20} />
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Xu hướng doanh thu</h3>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                />
                <YAxis 
                  hide
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }} 
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dựa trên dữ liệu 12 tháng qua, doanh thu có xu hướng <span className="text-emerald-600 font-bold">tăng trưởng ổn định</span>. 
              Sản phẩm chủ lực đóng góp hơn 40% tổng lợi nhuận của cửa hàng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
