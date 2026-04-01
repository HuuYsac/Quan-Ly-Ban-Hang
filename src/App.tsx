/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Categories } from './pages/Categories';
import { Inventory } from './pages/Inventory';
import { Debts } from './pages/Debts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { CompanyInfo } from './pages/CompanyInfo';
import { CRM } from './pages/CRM';
import { AIAssistant } from './pages/AIAssistant';
import { Members } from './pages/Members';
import { Profile } from './pages/Profile';
import Messages from './pages/Messages';
import Warranty from './pages/Warranty';
import Repairs from './pages/Repairs';
import { useAppStore } from './hooks/useAppStore';
import { Auth } from './pages/Auth';
import { auth } from './firebase';
import { onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { Mail, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
        <ShieldAlert size={40} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h2>
      <p className="text-gray-600 max-w-md">
        Bạn không có quyền truy cập vào khu vực này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là một lỗi.
      </p>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, updateData, loading: dataLoading, addItem, updateItem, deleteItem, resetDatabase } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'user'>('user');
  const [authLoading, setAuthLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check approval status
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const ownerEmail = 'dieuhuu1995@gmail.com';
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsApproved(userData.approved !== false);
          const isOwner = currentUser.email === ownerEmail;
          setIsAdmin(isOwner || userData.role === 'admin');
          setUserRole(userData.role || 'user');
        } else {
          // If doc doesn't exist yet (just registered), it will be created with approved: false
          // unless it's the owner
          const isOwner = currentUser.email === ownerEmail;
          setIsApproved(isOwner);
          setIsAdmin(isOwner);
          setUserRole(isOwner ? 'admin' : 'user');
        }
      } else {
        setIsApproved(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResendVerification = async () => {
    if (user) {
      setResending(true);
      try {
        await sendEmailVerification(user);
        setResendMessage('Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn.');
      } catch (error: any) {
        setResendMessage('Có lỗi xảy ra: ' + error.message);
      } finally {
        setResending(false);
      }
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (authLoading || (user && dataLoading) || (user && isApproved === null)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium animate-pulse">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Xác minh Email</h2>
            <p className="text-gray-600 mb-6">
              Vui lòng kiểm tra email <strong>{user.email}</strong> và nhấp vào liên kết xác minh để tiếp tục sử dụng ứng dụng.
            </p>
            
            {resendMessage && (
              <div className="mb-6 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
                {resendMessage}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70"
              >
                {resending ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                Gửi lại email xác minh
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <LogOut size={18} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
              <ShieldAlert className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Chờ phê duyệt</h2>
            <p className="text-gray-600 mb-6">
              Tài khoản của bạn (<strong>{user.email}</strong>) đã được đăng ký thành công nhưng đang chờ quản trị viên phê duyệt để truy cập vào hệ thống.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <LogOut size={18} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return { title: 'Hệ thống Quản lý', subtitle: 'Quản lý bán hàng doanh nghiệp Việt Nam' };
      case 'members': return { title: 'Quản lý Thành viên', subtitle: 'Phê duyệt và quản lý quyền hạn thành viên' };
      case 'customers': return { title: 'Quản lý Khách hàng', subtitle: 'Hồ sơ, thiết bị và lịch sử bảo hành' };
      case 'suppliers': return { title: 'Quản lý Nhà cung cấp', subtitle: 'Danh sách và thông tin nhà cung cấp' };
      case 'products': return { title: 'Quản lý Sản phẩm', subtitle: 'Danh mục và kho hàng sản phẩm' };
      case 'categories': return { title: 'Quản lý Danh mục', subtitle: 'Phân loại sản phẩm' };
      case 'inventory': return { title: 'Quản lý Kho hàng', subtitle: 'Kiểm kê và nhập xuất kho' };
      case 'debts': return { title: 'Quản lý Công nợ', subtitle: 'Theo dõi công nợ khách hàng và nhà cung cấp' };
      case 'orders': return { title: 'Quản lý Đơn hàng', subtitle: 'Danh sách và xử lý đơn hàng' };
      case 'reports': return { title: 'Báo cáo', subtitle: 'Thống kê doanh thu và hoạt động' };
      case 'crm': return { title: 'Quản lý quan hệ khách hàng (CRM)', subtitle: 'Quản lý tiềm năng, chăm sóc khách hàng và khuyến mãi' };
      case 'warranty': return { title: 'Quản lý Bảo hành', subtitle: 'Theo dõi và kiểm tra thời hạn bảo hành sản phẩm' };
      case 'repairs': return { title: 'Quản lý Sửa chữa', subtitle: 'Theo dõi tiến độ sửa chữa và bảo hành thiết bị' };
      case 'settings': return { title: 'Cài đặt hệ thống', subtitle: 'Tùy chỉnh hệ thống và giao diện' };
      case 'company-info': return { title: 'Thông tin Shop', subtitle: 'Cập nhật thông tin cửa hàng/doanh nghiệp' };
      case 'profile': return { title: 'Tài khoản của tôi', subtitle: 'Quản lý thông tin cá nhân và tài khoản' };
      case 'messages': return { title: 'Tin nhắn nội bộ', subtitle: 'Trao đổi công việc giữa các nhân viên' };
      case 'ai-assistant': return { title: 'Trợ lý AI Thông minh', subtitle: 'Tư vấn sản phẩm & Sáng tạo nội dung' };
      default: return { title: 'Đang phát triển', subtitle: 'Tính năng này sẽ sớm ra mắt' };
    }
  };

  const renderPage = () => {
    const isStaffOrAdmin = isAdmin || userRole === 'staff' || (isApproved && userRole === 'user');

    switch (activePage) {
      case 'dashboard':
        return <Dashboard data={data} onNavigate={setActivePage} isAdmin={isAdmin} />;
      case 'ai-assistant':
        return <AIAssistant data={data} />;
      case 'members':
        if (!isAdmin) return <AccessDenied />;
        return <Members />;
      case 'customers':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Customers data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />;
      case 'suppliers':
        if (!isAdmin) return <AccessDenied />;
        return <Suppliers data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} isAdmin={isAdmin} />;
      case 'products':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Products data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} isAdmin={isAdmin} />;
      case 'categories':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Categories data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />;
      case 'inventory':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Inventory data={data} updateData={updateData} isAdmin={isAdmin} />;
      case 'debts':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Debts data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} isAdmin={isAdmin} />;
      case 'orders':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Orders data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} isAdmin={isAdmin} />;
      case 'reports':
        if (!isAdmin) return <AccessDenied />;
        return <Reports data={data} updateData={updateData} />;
      case 'crm':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <CRM data={data} updateData={updateData} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />;
      case 'warranty':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Warranty />;
      case 'repairs':
        if (!isStaffOrAdmin) return <AccessDenied />;
        return <Repairs />;
      case 'settings':
        if (!isAdmin) return <AccessDenied />;
        return <Settings data={data} updateData={updateData} resetDatabase={resetDatabase} isAdmin={isAdmin} />;
      case 'company-info':
        if (!isAdmin) return <AccessDenied />;
        return <CompanyInfo data={data} updateData={updateData} />;
      case 'messages':
        if (!isApproved) return <AccessDenied />;
        return <Messages />;
      case 'profile':
        return <Profile />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-4xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold">Tính năng đang phát triển</h2>
            <p className="text-sm mt-2">Vui lòng quay lại sau.</p>
          </div>
        );
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-gray-900 overflow-x-hidden">
      <Sidebar 
        activePage={activePage} 
        setActivePage={(page) => {
          setActivePage(page);
          setSidebarOpen(false);
        }} 
        data={data} 
        isAdmin={isAdmin} 
        isApproved={isApproved || false} 
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 print:ml-0 transition-all duration-300">
        <Header 
          title={title} 
          subtitle={subtitle} 
          onNavigate={setActivePage} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

