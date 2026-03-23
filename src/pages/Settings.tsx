import React, { useState, useEffect } from 'react';
import { AppData, Settings as SettingsType } from '../types';
import { Settings as SettingsIcon, DollarSign, Calendar, Moon, Sun, Monitor, Bell, HardDrive, FileText, Save, CheckCircle2, Users as UsersIcon, ShieldCheck, ShieldX, Trash2, Palette, HeartHandshake } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ConfirmModal, Toast } from '../components/Notification';

interface SettingsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  resetDatabase?: () => Promise<void>;
  isAdmin: boolean;
}

export function Settings({ data, updateData, resetDatabase, isAdmin }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'system'>('general');
  const [formData, setFormData] = useState<SettingsType>(
    data.settings || {
      currency: 'VND',
      dateFormat: 'DD/MM/YYYY',
      theme: 'light',
      notifications: true,
      autoBackup: true,
      invoiceTemplate: 'standard'
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleApproval = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: !currentStatus
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approved: !currentStatus } : u));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUsers(prev => prev.filter(u => u.id === userToDelete ? false : true));
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setUserToDelete(null);
    }
  };

  useEffect(() => {
    if (data.settings) {
      setFormData(data.settings);
    }
  }, [data.settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      updateData({ settings: formData });
      setIsSaving(false);
      showToast('Đã lưu cài đặt thành công!');
    }, 600);
  };

  const tabs = [
    { id: 'general', label: 'Cài đặt chung', icon: SettingsIcon, adminOnly: true },
    { id: 'appearance', label: 'Giao diện', icon: Palette, adminOnly: false },
    { id: 'system', label: 'Cài đặt hệ thống', icon: UsersIcon, adminOnly: true },
  ].filter(tab => !tab.adminOnly || isAdmin);

  // If active tab is hidden for current user, switch to first available tab
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id as any || 'appearance');
    }
  }, [isAdmin]);

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="text-blue-600" size={24} />
            Cài đặt hệ thống
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tùy chỉnh giao diện, định dạng và các tính năng của phần mềm.
          </p>
        </div>

        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in slide-in-from-bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Cấu hình chung
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <DollarSign size={16} className="text-gray-400" />
                    Đơn vị tiền tệ
                  </label>
                  <select 
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="VND">Việt Nam Đồng (VND)</option>
                    <option value="USD">Đô la Mỹ (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    Định dạng ngày tháng
                  </label>
                  <select 
                    name="dateFormat"
                    value={formData.dateFormat}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Ví dụ: 31/12/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (Ví dụ: 12/31/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (Ví dụ: 2024-12-31)</option>
                  </select>
                </div>
              </div>
            </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Giao diện ứng dụng
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.theme === 'light' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="theme" value="light" checked={formData.theme === 'light'} onChange={handleChange} className="sr-only" />
                  <Sun size={24} className={formData.theme === 'light' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className={`mt-2 text-sm font-medium ${formData.theme === 'light' ? 'text-blue-700' : 'text-gray-600'}`}>Sáng</span>
                </label>
                
                <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.theme === 'dark' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="theme" value="dark" checked={formData.theme === 'dark'} onChange={handleChange} className="sr-only" />
                  <Moon size={24} className={formData.theme === 'dark' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className={`mt-2 text-sm font-medium ${formData.theme === 'dark' ? 'text-blue-700' : 'text-gray-600'}`}>Tối</span>
                </label>

                <label className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.theme === 'system' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="theme" value="system" checked={formData.theme === 'system'} onChange={handleChange} className="sr-only" />
                  <Monitor size={24} className={formData.theme === 'system' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className={`mt-2 text-sm font-medium ${formData.theme === 'system' ? 'text-blue-700' : 'text-gray-600'}`}>Hệ thống</span>
                </label>
              </div>
              <div className="pt-6 flex justify-end">
                <button 
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  Lưu thay đổi
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && isAdmin && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <UsersIcon size={18} className="text-blue-600" />
                  Quản lý thành viên
                </h3>
                  
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Table View (Desktop) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                              <th className="p-3 font-medium">Email</th>
                              <th className="p-3 font-medium">SĐT</th>
                              <th className="p-3 font-medium">Trạng thái</th>
                              <th className="p-3 font-medium text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 text-sm font-medium text-gray-900">{u.email}</td>
                                <td className="p-3 text-sm text-gray-600">{u.phone}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {u.approved ? 'Đã phê duyệt' : 'Chờ phê duyệt'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleApproval(u.id, u.approved)}
                                      className={`p-1.5 rounded-md transition-colors ${u.approved ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                      title={u.approved ? 'Hủy phê duyệt' : 'Phê duyệt'}
                                    >
                                      {u.approved ? <ShieldX size={16} /> : <ShieldCheck size={16} />}
                                    </button>
                                    {u.email !== 'dieuhuu1995@gmail.com' && u.email !== 'huulaptop.info@gmail.com' && (
                                      <button
                                        type="button"
                                        onClick={() => deleteUser(u.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Xóa người dùng"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Card View (Mobile) */}
                      <div className="md:hidden space-y-4">
                        {users.map(u => (
                          <div key={u.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{u.email}</span>
                                <span className="text-xs text-gray-500">{u.phone}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.approved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {u.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                              </span>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={() => toggleApproval(u.id, u.approved)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${u.approved ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}
                              >
                                {u.approved ? <ShieldX size={14} /> : <ShieldCheck size={14} />}
                                {u.approved ? 'Hủy duyệt' : 'Phê duyệt'}
                              </button>
                              {u.email !== 'dieuhuu1995@gmail.com' && u.email !== 'huulaptop.info@gmail.com' && (
                                <button
                                  type="button"
                                  onClick={() => deleteUser(u.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium transition-colors"
                                >
                                  <Trash2 size={14} />
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              {/* Database Reset Section */}
              <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-2">
                  <Trash2 size={20} />
                  Khu vực nguy hiểm
                </h3>
                <p className="text-sm text-red-600 mb-6">
                  Xóa sạch toàn bộ dữ liệu hiện tại và khôi phục về trạng thái ban đầu của Admin. 
                  Hành động này không thể hoàn tác.
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                  Xóa sạch & Khôi phục dữ liệu gốc
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Xác nhận xóa sạch dữ liệu"
        message="CẢNH BÁO: Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu và khôi phục về mặc định? Hành động này không thể hoàn tác."
        onConfirm={async () => {
          setShowResetConfirm(false);
          try {
            await resetDatabase?.();
            showToast('Đã xóa sạch dữ liệu và khôi phục mặc định thành công');
          } catch (error) {
            showToast('Có lỗi xảy ra khi xóa dữ liệu', 'error');
          }
        }}
        onCancel={() => setShowResetConfirm(false)}
        confirmText="Xóa sạch dữ liệu"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Xác nhận xóa người dùng"
        message="Bạn có chắc chắn muốn xóa người dùng này khỏi hệ thống?"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
        confirmText="Xóa người dùng"
        type="danger"
      />
    </div>
  );
}
