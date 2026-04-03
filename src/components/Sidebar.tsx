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
  MessageCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { AppData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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
    { id: 'ai-assistant', label: 'Trợ lý AI', icon: Sparkles, section: 'Tổng quan', allowedRoles: ['admin', 'staff', 'user'] },
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
    if (!item.allowedRoles.includes(userRole)) return false;
    if (item.id === 'dashboard' || item.id === 'profile') return true;
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
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "w-64 bg-white border-r border-slate-100 flex flex-col fixed h-screen z-50 print:hidden transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-50 relative bg-slate-50/50">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              {data.shopInfo?.logo ? (
                <img 
                  src={data.shopInfo.logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Store size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                {data.shopInfo?.name || 'Hữu Laptop'}
              </h1>
              <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest opacity-80">
                Management System
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
          {sections.map(section => (
            <div key={section} className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 mb-2 px-3 uppercase tracking-[0.2em]">
                {section}
              </h3>
              {filteredNavItems.filter(item => item.section === section).map(item => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                const unreadCount = item.id === 'messages' 
                  ? data.messages?.filter(m => m.receiverId === auth.currentUser?.uid && !m.read).length || 0
                  : 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group relative",
                      isActive 
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      <Icon size={16} />
                    </div>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                    
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute right-2 w-1 h-4 bg-indigo-600 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50 bg-slate-50/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
              <LogOut size={16} />
            </div>
            <span>Đăng xuất</span>
          </button>
        </div>

        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6"
              >
                <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto shadow-inner">
                  <LogOut size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Xác nhận đăng xuất</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">Bạn có chắc chắn muốn thoát khỏi hệ thống quản lý?</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={confirmLogout}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                  >
                    Đăng xuất
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
