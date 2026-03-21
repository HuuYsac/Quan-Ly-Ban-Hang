import React from 'react';
import { AppData } from '../types';
import { formatCurrency } from '../lib/utils';
import { DollarSign, ClipboardList, Users, Package, FileText, UserPlus, PlusCircle, BarChart2 } from 'lucide-react';

interface DashboardProps {
  data: AppData;
  onNavigate: (page: string) => void;
}

export function Dashboard({ data, onNavigate }: DashboardProps) {
  // Calculate stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = data.orders.filter(o => o.date === todayStr);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Doanh thu hôm nay" 
          value={formatCurrency(todayRevenue)} 
          icon={DollarSign} 
          trend="+12.5% so với hôm qua" 
          trendUp={true} 
          color="emerald"
        />
        <StatCard 
          title="Đơn hàng mới" 
          value={todayOrders.length.toString()} 
          icon={ClipboardList} 
          trend="+8.2% so với hôm qua" 
          trendUp={true} 
          color="blue"
        />
        <StatCard 
          title="Khách hàng" 
          value={data.customers.length.toString()} 
          icon={Users} 
          trend="+5.1% so với tuần trước" 
          trendUp={true} 
          color="amber"
        />
        <StatCard 
          title="Sản phẩm" 
          value={data.products.length.toString()} 
          icon={Package} 
          trend="+2.3% so với tuần trước" 
          trendUp={true} 
          color="rose"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction 
            icon={FileText} 
            title="Tạo đơn bán hàng" 
            desc="Form mới với chiết khấu" 
            onClick={() => onNavigate('orders')} 
          />
          <QuickAction 
            icon={UserPlus} 
            title="Thêm khách hàng" 
            desc="Thêm thông tin khách hàng mới" 
            onClick={() => onNavigate('customers')} 
          />
          <QuickAction 
            icon={PlusCircle} 
            title="Thêm sản phẩm" 
            desc="Thêm sản phẩm mới vào kho" 
            onClick={() => onNavigate('products')} 
          />
          <QuickAction 
            icon={BarChart2} 
            title="Xem báo cáo" 
            desc="Báo cáo doanh thu và bán hàng" 
            onClick={() => onNavigate('reports')} 
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Hoạt động gần đây</h2>
          <button className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md font-medium hover:bg-emerald-200 transition-colors">
            🔄 Refresh
          </button>
        </div>
        <div className="space-y-4">
          {data.orders.slice(0, 5).map((order, idx) => (
            <div key={order.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <ClipboardList size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {order.paymentStatus === 'Đã thanh toán' ? `Đơn hàng ${order.id} đã hoàn thành` : `Đơn hàng mới ${order.id}`}
                </h4>
                <p className="text-sm text-gray-500">
                  Khách hàng {order.customerName} {order.paymentStatus === 'Đã thanh toán' ? 'đã thanh toán' : 'đặt hàng trị giá'} {formatCurrency(order.total)}
                </p>
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {order.date} {order.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  const colorMap: Record<string, string> = {
    emerald: 'before:bg-emerald-500 text-emerald-600',
    blue: 'before:bg-blue-500 text-blue-600',
    amber: 'before:bg-amber-500 text-amber-600',
    rose: 'before:bg-rose-500 text-rose-600',
  };

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md before:absolute before:top-0 before:left-0 before:right-0 before:h-1 ${colorMap[color]}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <Icon size={20} className="opacity-70" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      <div className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
        {trend}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all group"
    >
      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-3">
        <Icon size={24} />
      </div>
      <h4 className="text-sm font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{desc}</p>
    </button>
  );
}
