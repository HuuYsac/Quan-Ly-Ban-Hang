import React from 'react';
import { ShoppingCart, HeartHandshake, ShieldCheck, Menu, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onNavigate: (page: string) => void;
  onToggleSidebar?: () => void;
}

export function Header({ title, subtitle, onNavigate, onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white px-4 md:px-8 py-4 md:py-5 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10 print:hidden">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate max-w-[200px] md:max-w-none">{title}</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 truncate max-w-[200px] md:max-w-none">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={() => onNavigate('profile')}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
          title="Tài khoản của tôi"
        >
          <User size={20} />
        </button>

        <button 
          onClick={() => onNavigate('crm')}
          className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs md:text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <HeartHandshake size={16} />
          <span className="hidden md:inline">Quản lý CRM</span>
        </button>

        <button 
          onClick={() => onNavigate('warranty')}
          className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs md:text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ShieldCheck size={16} />
          <span className="hidden md:inline">Bảo hành</span>
        </button>
        
        <button 
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <ShoppingCart size={16} />
          <span className="hidden md:inline">Đơn hàng</span>
          <span className="md:hidden">Đơn</span>
        </button>
      </div>
    </header>
  );
}
