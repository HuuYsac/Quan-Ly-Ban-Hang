import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ShoppingCart, Menu, User, Bell, Search, Package, UserCircle, FileText, CheckCircle2, Clock, AlertCircle, MessageSquare, CheckSquare, Sun, Moon, Monitor, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData, Notification } from '../types';
import { formatCurrency } from '../lib/utils';
import { auth, db } from '../firebase';
import { collection, updateDoc, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';

interface HeaderProps {
  title: string;
  subtitle: string;
  onNavigate: (page: string) => void;
  onToggleSidebar?: () => void;
  data: AppData;
  currentUserUid?: string;
  updateData: (newData: Partial<AppData>) => void;
}

export function Header({ title, subtitle, onNavigate, onToggleSidebar, data, currentUserUid, updateData }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeToggle, setShowThemeToggle] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setShowThemeToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim().length >= 2 ? {
    products: (data.products || []).filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    orders: (data.orders || []).filter(o => 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3),
    customers: (data.customers || []).filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery)
    ).slice(0, 3)
  } : null;

  const hasResults = searchResults && (
    searchResults.products.length > 0 || 
    searchResults.orders.length > 0 || 
    searchResults.customers.length > 0
  );

  // Use real-time notifications from Firestore
  const notifications = useMemo(() => {
    const list = [...(data.notifications || [])];
    
    // Supplement with some auto-generated ones if list is short (legacy logic)
    if (list.length < 5) {
      // 1. Recent Orders
      const recentOrders = (data.orders || []).slice(0, 3);
      recentOrders.forEach(order => {
        if (!list.find(n => n.id.includes(order.id))) {
          list.push({
            id: `order-${order.id}`,
            title: 'Đơn hàng mới',
            content: `Đơn hàng ${order.id} từ ${order.customerName} - ${formatCurrency(order.total)}`,
            createdAt: order.createdAt || new Date().toISOString(),
            type: 'order',
            read: true,
            link: 'orders',
            icon: 'shopping-cart'
          });
        }
      });

      // 2. Low Stock Products
      const lowStock = (data.products || []).filter(p => p.stock <= p.minStock).slice(0, 2);
      lowStock.forEach(product => {
        if (!list.find(n => n.id.includes(product.id))) {
          list.push({
            id: `stock-${product.id}`,
            title: 'Sắp hết hàng',
            content: `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho`,
            createdAt: new Date().toISOString(),
            type: 'stock',
            read: true,
            link: 'inventory',
            icon: 'alert-circle'
          });
        }
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
  }, [data, currentUserUid]);

  const unreadCount = useMemo(() => 
    (data.notifications || []).filter(n => !n.read && (n.userId === currentUserUid || !n.userId)).length
  , [data.notifications, currentUserUid]);

  const handleMarkAllAsRead = async () => {
    try {
      const q = query(collection(db, 'notifications'), where('read', '==', false));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    // If it's a real firestore notification
    if (data.notifications?.find(n => n.id === id)) {
      try {
        await updateDoc(doc(db, 'notifications', id), { read: true });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const getNotificationIcon = (type: string, iconName?: string) => {
    switch (type) {
      case 'order': return <ShoppingCart size={14} className="text-blue-600" />;
      case 'repair': return <CheckCircle2 size={14} className="text-emerald-600" />;
      case 'stock': return <AlertCircle size={14} className="text-amber-600" />;
      case 'customer': return <UserCircle size={14} className="text-indigo-600" />;
      case 'message': return <MessageSquare size={14} className="text-rose-600" />;
      case 'system': return <Monitor size={14} className="text-slate-600" />;
      default: return <Bell size={14} className="text-slate-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'order': return 'bg-blue-50';
      case 'repair': return 'bg-emerald-50';
      case 'stock': return 'bg-amber-50';
      case 'customer': return 'bg-indigo-50';
      case 'message': return 'bg-rose-50';
      case 'system': return 'bg-slate-50';
      default: return 'bg-slate-50';
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return 'Gần đây';
    }
  };

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    updateData({ settings: { ...(data.settings || {}), theme: newTheme } as any });
    setShowThemeToggle(false);
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-40 print:hidden transition-colors duration-200">
      <div className="flex items-center gap-4">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSidebar}
          className="lg:hidden p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <Menu size={20} />
        </motion.button>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>
          <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-0.5 uppercase tracking-wider">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="lg:hidden" ref={searchRef}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className={`p-2.5 rounded-xl transition-all border ${showMobileSearch ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'}`}
          >
            <Search size={18} />
          </motion.button>

          <AnimatePresence>
            {showMobileSearch && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 p-4 bg-white border-b border-slate-100 shadow-xl z-50"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Tìm kiếm nhanh..." 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    className="w-full pl-9 pr-4 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs outline-none"
                  />
                  
                  {showSearchResults && searchQuery.trim().length >= 2 && (
                    <div className="mt-2 bg-white rounded-xl border border-slate-100 overflow-hidden max-h-[300px] overflow-y-auto">
                      {hasResults ? (
                        <div className="p-2">
                          {searchResults.products.length > 0 && (
                            <div className="mb-2">
                              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</p>
                              {searchResults.products.map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    onNavigate('products');
                                    setShowSearchResults(false);
                                    setShowMobileSearch(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Package size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                    <p className="text-[10px] text-slate-500">{formatCurrency(p.price)}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.orders.length > 0 && (
                            <div className="mb-2">
                              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn hàng</p>
                              {searchResults.orders.map(o => (
                                <button 
                                  key={o.id}
                                  onClick={() => {
                                    onNavigate('orders');
                                    setShowSearchResults(false);
                                    setShowMobileSearch(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <FileText size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 truncate">{o.id} - {o.customerName}</p>
                                    <p className="text-[10px] text-slate-500">{formatCurrency(o.total)}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.customers.length > 0 && (
                            <div>
                              <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</p>
                              {searchResults.customers.map(c => (
                                <button 
                                  key={c.id}
                                  onClick={() => {
                                    onNavigate('customers');
                                    setShowSearchResults(false);
                                    setShowMobileSearch(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <UserCircle size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                                    <p className="text-[10px] text-slate-500">{c.phone}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[10px] text-slate-400">Không tìm thấy kết quả</div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden lg:flex items-center gap-2 mr-2" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hasResults) {
                  if (searchResults.products.length > 0) onNavigate('products');
                  else if (searchResults.orders.length > 0) onNavigate('orders');
                  else if (searchResults.customers.length > 0) onNavigate('customers');
                  setShowSearchResults(false);
                  setSearchQuery('');
                }
              }}
              className="pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs w-48 focus:w-64 transition-all outline-none"
            />

            <AnimatePresence>
              {showSearchResults && searchQuery.trim().length >= 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                >
                  {hasResults ? (
                    <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {searchResults.products.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</p>
                          {searchResults.products.map(p => (
                            <button 
                              key={p.id}
                              onClick={() => {
                                onNavigate('products');
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Package size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-500">{formatCurrency(p.price)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.orders.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn hàng</p>
                          {searchResults.orders.map(o => (
                            <button 
                              key={o.id}
                              onClick={() => {
                                onNavigate('orders');
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <FileText size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 truncate">{o.id} - {o.customerName}</p>
                                <p className="text-[10px] text-slate-500">{formatCurrency(o.total)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.customers.length > 0 && (
                        <div>
                          <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</p>
                          {searchResults.customers.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => {
                                onNavigate('customers');
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <UserCircle size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-500">{c.phone}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Search size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-900">Không tìm thấy kết quả</p>
                      <p className="text-[10px] text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme Toggle */}
          <div className="relative" ref={themeRef}>
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowThemeToggle(!showThemeToggle)}
              className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
              title="Giao diện"
            >
              {data.settings?.theme === 'dark' ? <Moon size={18} /> : data.settings?.theme === 'system' ? <Monitor size={18} /> : <Sun size={18} />}
            </motion.button>

            <AnimatePresence>
              {showThemeToggle && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => changeTheme('light')}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all ${data.settings?.theme === 'light' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Sun size={14} /> Chế độ sáng
                    </button>
                    <button 
                      onClick={() => changeTheme('dark')}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all ${data.settings?.theme === 'dark' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Moon size={14} /> Chế độ tối
                    </button>
                    <button 
                      onClick={() => changeTheme('system')}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold transition-all ${data.settings?.theme === 'system' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Monitor size={14} /> Theo hệ thống
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('profile')}
            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
            title="Tài khoản của tôi"
          >
            <User size={18} />
          </motion.button>

          <div className="relative" ref={notificationRef}>
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-xl transition-all border relative ${showNotifications ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent hover:border-indigo-100'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Thông báo</h3>
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </div>
                  <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <button 
                          key={n.id}
                          onClick={() => {
                            handleMarkAsRead(n.id);
                            if (n.link) onNavigate(n.link as any);
                            setShowNotifications(false);
                          }}
                          className={`w-full flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group relative ${!n.read ? 'bg-indigo-50/30' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg ${getNotificationBg(n.type)} flex items-center justify-center shrink-0`}>
                            {getNotificationIcon(n.type, n.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-xs font-bold text-slate-900 ${!n.read ? 'pr-2' : ''}`}>{n.title}</p>
                              {!n.read && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1 shrink-0"></div>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.content}</p>
                            <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock size={10} />
                              {formatNotificationTime(n.createdAt)}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <Bell size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-900">Không có thông báo mới</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      onNavigate('messages');
                      setShowNotifications(false);
                    }}
                    className="w-full p-3 bg-slate-50 text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest border-t border-slate-100"
                  >
                    Xem tất cả thông báo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Tạo đơn mới</span>
            <span className="sm:hidden">Đơn</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
