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
  HeartHandshake,
  ShieldCheck,
  Wrench,
  BarChart3, 
  Settings, 
  Building,
  LogOut,
  Store
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { AppData } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  data: AppData;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activePage, setActivePage, data, isOpen, onClose }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Tổng quan' },
    { id: 'customers', label: 'Khách hàng', icon: Users, section: 'Quản lý cơ bản' },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: Building2, section: 'Quản lý cơ bản' },
    { id: 'products', label: 'Sản phẩm', icon: Package, section: 'Quản lý cơ bản' },
    { id: 'categories', label: 'Danh mục', icon: FolderTree, section: 'Quản lý cơ bản' },
    { id: 'inventory', label: 'Kho hàng', icon: ClipboardList, section: 'Quản lý cơ bản' },
    { id: 'debts', label: 'Công nợ', icon: CreditCard, section: 'Nghiệp vụ' },
    { id: 'orders', label: 'Quản lý đơn hàng', icon: ShoppingCart, section: 'Nghiệp vụ' },
    { id: 'warranty', label: 'Quản lý bảo hành', icon: ShieldCheck, section: 'Nghiệp vụ' },
    { id: 'repairs', label: 'Quản lý sửa chữa', icon: Wrench, section: 'Nghiệp vụ' },
    { id: 'crm', label: 'Quản lý CRM', icon: HeartHandshake, section: 'Nghiệp vụ' },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3, section: 'Báo cáo' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, section: 'Hệ thống' },
    { id: 'company-info', label: 'Thông Tin Shop', icon: Building, section: 'Hệ thống' },
  ];

  const sections = Array.from(new Set(navItems.map(item => item.section)));

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await auth.signOut();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "w-64 bg-white shadow-lg flex flex-col fixed h-screen z-30 transition-transform duration-300 lg:translate-x-0 print:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 bg-gradient-to-br from-blue-800 to-blue-500 text-white text-center relative">
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden text-white/80 hover:text-white"
          >
            <LogOut size={20} className="rotate-180" />
          </button>

          <div className="flex items-center justify-center gap-3 mb-2">
            {data.shopInfo?.logo ? (
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-inner p-2">
                <img 
                  src={data.shopInfo.logo} 
                  alt="Shop Logo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xs font-black tracking-tighter">
                QLBH
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold m-0 truncate">{data.shopInfo?.name || 'Hữu Laptop'}</h1>
          <p className="text-sm opacity-90">Hệ thống quản lý</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
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

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in duration-200">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <LogOut size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">Xác nhận đăng xuất</h3>
                <p className="text-sm text-gray-500 mt-1">Bạn có chắc chắn muốn thoát khỏi hệ thống?</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
