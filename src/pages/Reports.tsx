import React from 'react';
import { AppData } from '../types';
import { BarChart3, TrendingUp, DollarSign, Package } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface ReportsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function Reports({ data, updateData }: ReportsProps) {
  const totalRevenue = data.orders.filter(o => o.paymentStatus === 'Đã thanh toán').reduce((sum, o) => sum + o.total, 0);
  const totalOrders = data.orders.length;
  const totalProductsSold = data.orders.reduce((sum, o) => sum + o.products.reduce((s, p) => s + p.quantity, 0), 0);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng doanh thu</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Tổng đơn hàng</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalOrders}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Sản phẩm đã bán</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalProductsSold}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <Package size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-blue-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Doanh thu theo ngày (7 ngày gần nhất)</h3>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {/* Placeholder for chart */}
            {[40, 70, 45, 90, 65, 85, 100].map((height, i) => (
              <div key={i} className="w-full bg-blue-100 rounded-t-md relative group">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-md transition-all duration-500"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatCurrency(height * 100000)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="text-blue-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Sản phẩm bán chạy</h3>
          </div>
          <div className="space-y-4">
            {data.products.slice(0, 5).map((product, i) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-medium text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(product.price)}</p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {Math.floor(Math.random() * 50) + 10} đã bán
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
