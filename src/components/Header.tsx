import React from 'react';
import { ShoppingCart, HeartHandshake, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onNavigate: (page: string) => void;
}

export function Header({ title, subtitle, onNavigate }: HeaderProps) {
  return (
    <header className="bg-white px-8 py-5 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10 print:hidden">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onNavigate('crm')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <HeartHandshake size={16} />
          Quản lý CRM
        </button>

        <button 
          onClick={() => onNavigate('warranty')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ShieldCheck size={16} />
          Quản lý bảo hành
        </button>
        
        <button 
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ShoppingCart size={16} />
          Đơn hàng
        </button>
      </div>
    </header>
  );
}
