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
  Store,
  UserCog,
  User,
  X,
  MessageSquare,
  MessageCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { AppData } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  data: AppData;
  isAdmin: boolean;
  isApproved: boolean;
  userRole: 'admin' | 'staff' | 'user';
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activePage, setActivePage, data, isAdmin, isApproved, userRole, isOpen, onClose }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Tổng quan', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'messages', label: 'Tin nhắn nội bộ', icon: MessageSquare, section: 'Tổng quan', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'members', label: 'Thành viên', icon: UserCog, section: 'Hệ thống', allowedRoles: ['admin'] },
    { id: 'customers', label: 'Khách hàng', icon: Users, section: 'Quản lý cơ bản', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'suppliers', label: 'Nhà cung cấp', icon: Building2, section: 'Quản lý cơ bản', allowedRoles: ['admin'] },
    { id: 'products', label: 'Sản phẩm', icon: Package, section: 'Quản lý cơ bản', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'categories', label: 'Danh mục', icon: FolderTree, section: 'Quản lý cơ bản', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'inventory', label: 'Kho hàng', icon: ClipboardList, section: 'Quản lý cơ bản', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'debts', label: 'Công nợ', icon: CreditCard, section: 'Nghiệp vụ', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'orders', label: 'Quản lý đơn hàng', icon: ShoppingCart, section: 'Nghiệp vụ', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'warranty', label: 'Quản lý bảo hành', icon: ShieldCheck, section: 'Nghiệp vụ', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'repairs', label: 'Quản lý sửa chữa', icon: Wrench, section: 'Nghiệp vụ', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'crm', label: 'Quản lý CRM', icon: HeartHandshake, section: 'Nghiệp vụ', allowedRoles: ['admin', 'staff', 'user'] },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3, section: 'Báo cáo', allowedRoles: ['admin'] },
    { id: 'settings', label: 'Cài đặt', icon: Settings, section: 'Hệ thống', allowedRoles: ['admin', 'staff'] },
    { id: 'company-info', label: 'Thông Tin Shop', icon: Building, section: 'Hệ thống', allowedRoles: ['admin'] },
    { id: 'profile', label: 'Tài khoản của tôi', icon: User, section: 'Hệ thống', allowedRoles: ['admin', 'staff', 'user'] },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (isAdmin) return true;
    
    // Check if the user's role is allowed for this item
    if (!item.allowedRoles.includes(userRole)) return false;
    
    // For non-admin users, most items require the account to be approved
    // Dashboard and Profile are usually accessible even if not fully approved for business features,
    // but here we follow the existing logic where isApproved is required for most things.
    if (item.id === 'dashboard' || item.id === 'profile') {
      return true;
    }
    
    return isApproved;
  });
  const sections = Array.from(new Set(filteredNavItems.map(item => item.section)));

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
        "w-64 bg-white shadow-lg flex flex-col fixed h-screen z-30 print:hidden transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 bg-gradient-to-br from-blue-800 to-blue-500 text-white text-center relative">
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
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
        <h1 className="text-xl font-bold m-0 truncate">{data.currentStore?.name || data.shopInfo?.name || 'Hữu Laptop'}</h1>
        <p className="text-sm opacity-90">Hệ thống quản lý</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider px-2">
              {section}
            </h3>
            {filteredNavItems.filter(item => item.section === section).map(item => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-all duration-200 text-sm font-medium relative",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/30" 
                      : "text-gray-700 hover:bg-gray-100 hover:translate-x-1"
                  )}
                >
                  <Icon size={18} className={cn(isActive ? "text-white" : "text-gray-500")} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'messages' && data.messages?.filter(m => m.receiverId === auth.currentUser?.uid && !m.read).length > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {data.messages.filter(m => m.receiverId === auth.currentUser?.uid && !m.read).length}
                    </span>
                  )}
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
