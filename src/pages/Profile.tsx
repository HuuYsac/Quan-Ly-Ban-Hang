import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Shield, 
  Briefcase, 
  CreditCard, 
  Lock, 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  UserCheck
} from 'lucide-react';
import { User as UserProfile } from '../types';

export function Profile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile Form
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            setPhone(data.phone || '');
            setBankName(data.bankName || '');
            setBankAccount(data.bankAccount || '');
            setBankAccountName(data.bankAccountName || '');
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError('Không thể tải thông tin cá nhân.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        phone,
        bankName,
        bankAccount,
        bankAccountName,
        updatedAt: new Date().toISOString()
      });
      setSuccess('Cập nhật thông tin thành công!');
      
      // Update local state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          phone,
          bankName,
          bankAccount,
          bankAccountName
        });
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError('Lỗi khi cập nhật thông tin: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setPasswordSaving(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      setSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === 'auth/wrong-password') {
        setError('Mật khẩu hiện tại không chính xác.');
      } else {
        setError('Lỗi khi đổi mật khẩu: ' + err.message);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900">Thông tin cá nhân</h1>
        <p className="text-gray-500">Quản lý tài khoản và thông tin thanh toán của bạn</p>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-rose-500 mt-0.5" size={18} />
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="text-emerald-500 mt-0.5" size={18} />
          <p className="text-sm text-emerald-700 font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Account Summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
              <UserIcon size={48} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 truncate">{userProfile?.email}</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              <Shield size={12} />
              {userProfile?.role === 'admin' ? 'Quản trị viên' : userProfile?.role === 'staff' ? 'Nhân viên' : 'Thành viên'}
            </div>
            {userProfile?.position && (
              <p className="mt-2 text-sm text-gray-500 font-medium italic">
                {userProfile.position}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Trạng thái</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Phê duyệt</span>
                {userProfile?.approved ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <UserCheck size={14} /> Đã duyệt
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600">Chờ duyệt</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Ngày tham gia</span>
                <span className="text-xs font-bold text-gray-900">
                  {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-slate-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <UserIcon size={18} className="text-blue-600" />
                Thông tin cá nhân & Ngân hàng
              </h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tên ngân hàng</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Ví dụ: Techcombank, VCB..."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Số tài khoản</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Nhập số tài khoản"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tên chủ tài khoản</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Nhập tên không dấu"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 bg-slate-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Lock size={18} className="text-rose-600" />
                Đổi mật khẩu
              </h3>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  {passwordSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={18} />}
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
