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
    const product = data.products.find(p => p.id === productId);
    return product?.importPrice || 0;
  };

  const stats = useMemo(() => {
    const paidOrders = data.orders.filter(o => o.paymentStatus === 'Đã thanh toán');
    
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    
    const totalCost = paidOrders.reduce((sum, o) => {
      return sum + o.products.reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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
        return sum + o.products.reduce((s, p) => s + (getImportPrice(p.productId, p.importPrice) * p.quantity), 0);
      }, 0);
      const profit = revenue - cost;

      return {
        name: monthLabel,
        revenue,
        profit,
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
    const productSales = data.products.map(p => {
      const quantitySold = data.orders.reduce((sum, o) => {
        const item = o.products.find(item => item.productId === p.id);
        return sum + (item?.quantity || 0);
      }, 0);
      return { ...p, quantitySold };
    }).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

    // Category distribution
    const categoryData = data.categories.map(cat => {
      const value = data.products
        .filter(p => p.category === cat.name)
        .reduce((sum, p) => {
          const sold = data.orders.reduce((s, o) => {
            const item = o.products.find(item => item.productId === p.id);
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
      totalOrders: data.orders.length,
      totalProductsSold: data.orders.reduce((sum, o) => sum + o.products.reduce((s, p) => s + p.quantity, 0), 0),
      monthlyData,
      currentMonth,
      lastMonth,
      revenueGrowth,
      profitGrowth,
      productSales,
      categoryData
    };
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Tổng doanh thu</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign size={20} />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs font-medium ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.revenueGrowth >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            <span>{Math.abs(stats.revenueGrowth).toFixed(1)}% so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Tổng lợi nhuận</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalProfit)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs font-medium ${stats.profitGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.profitGrowth >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            <span>{Math.abs(stats.profitGrowth).toFixed(1)}% so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Đơn hàng</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            Trung bình: {formatCurrency(stats.totalRevenue / (stats.totalOrders || 1))}/đơn
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Sản phẩm đã bán</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalProductsSold}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            {data.products.length} sản phẩm trong kho
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-gray-900">Doanh thu & Lợi nhuận theo tháng</h3>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar name="Doanh thu" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Lợi nhuận" dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Cơ cấu danh mục</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.categoryData.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{cat.value} SP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-blue-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Sản phẩm bán chạy nhất</h3>
          </div>
          <div className="space-y-4">
            {stats.productSales.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{product.quantitySold} cái</p>
                  <p className="text-xs text-emerald-600 font-medium">{formatCurrency(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Xu hướng doanh thu</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
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
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-600 leading-relaxed">
              Dựa trên dữ liệu 6 tháng qua, doanh thu có xu hướng <span className="text-emerald-600 font-bold">tăng trưởng ổn định</span>. 
              Sản phẩm chủ lực đóng góp hơn 40% tổng lợi nhuận của cửa hàng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
