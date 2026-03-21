import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  FolderTree, 
  ClipboardList, 
  CreditCard, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Building,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Tổng quan' },
    { id: 'customers', label: 'Khách hàng', icon: Users, section: 'Quản lý cơ bản' },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: Building2, section: 'Quản lý cơ bản' },
    { id: 'products', label: 'Sản phẩm', icon: Package, section: 'Quản lý cơ bản' },
    { id: 'categories', label: 'Danh mục', icon: FolderTree, section: 'Quản lý cơ bản' },
    { id: 'inventory', label: 'Kho hàng', icon: ClipboardList, section: 'Quản lý cơ bản' },
    { id: 'debts', label: 'Công nợ', icon: CreditCard, section: 'Nghiệp vụ' },
    { id: 'orders', label: 'Quản lý đơn hàng', icon: ShoppingCart, section: 'Nghiệp vụ' },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3, section: 'Báo cáo' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, section: 'Hệ thống' },
    { id: 'company-info', label: 'Thông Tin Shop', icon: Building, section: 'Hệ thống' },
  ];

  const sections = Array.from(new Set(navItems.map(item => item.section)));

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      await auth.signOut();
    }
  };

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col fixed h-screen z-10">
      <div className="p-6 bg-gradient-to-br from-blue-800 to-blue-500 text-white text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            📋
          </div>
        </div>
        <h1 className="text-xl font-bold m-0">Hữu Laptop</h1>
        <p className="text-sm opacity-90">Quản lý bán hàng offline</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider px-2">
              {section}
            </h3>
            {navItems.filter(item => item.section === section).map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-all duration-200 text-sm font-medium",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/30" 
                      : "text-gray-700 hover:bg-gray-100 hover:translate-x-1"
                  )}
                >
                  <Icon size={18} className={cn(isActive ? "text-white" : "text-gray-500")} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium text-red-600 hover:bg-red-50 hover:translate-x-1"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
