import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Users as UsersIcon, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2, 
  Search,
  Filter,
  MoreVertical,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  CreditCard
} from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  role?: 'admin' | 'staff' | 'user';
  position?: string;
  approved: boolean;
  createdAt: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
}

export function Members() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    role: 'user' as 'admin' | 'staff' | 'user',
    position: '',
    approved: false
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleApproval = async (user: UserProfile) => {
    try {
      const updates: any = {
        approved: !user.approved
      };
      
      // If approving a user who currently has the 'user' role, upgrade them to 'staff' automatically
      if (!user.approved && (!user.role || user.role === 'user')) {
        updates.role = 'staff';
      }
      
      await updateDoc(doc(db, 'users', user.uid), updates);
    } catch (error) {
      console.error("Error updating approval status:", error);
      alert("Không thể cập nhật trạng thái phê duyệt.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === auth.currentUser?.uid) {
      alert("Bạn không thể tự xóa tài khoản của chính mình.");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này? Hành động này không thể hoàn tác.")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Không thể xóa thành viên.");
      }
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role || 'user',
      position: user.position || '',
      approved: user.approved
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        role: editForm.role,
        position: editForm.position,
        approved: editForm.approved
      });
      setIsEditing(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Không thể cập nhật thông tin thành viên.");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      (user.position?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'approved' && user.approved) ||
      (filterStatus === 'pending' && !user.approved);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <UsersIcon className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Tổng thành viên</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <UserCheck className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Đã phê duyệt</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.approved).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <UserX className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Chờ phê duyệt</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => !u.approved).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm email, SĐT, chức vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="pending">Chờ phê duyệt</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-bottom border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thành viên</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò & Chức vụ</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngân hàng</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500 font-mono">{user.uid.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                            <Shield size={12} className="mr-1" /> Quản trị viên
                          </span>
                        ) : user.role === 'staff' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                            <Briefcase size={12} className="mr-1" /> Nhân viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                            Thành viên mới
                          </span>
                        )}
                      </div>
                      {user.position && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Briefcase size={12} /> {user.position}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Phone size={14} className="text-gray-400" /> {user.phone}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Mail size={14} /> {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {user.bankAccount ? (
                        <>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                            <CreditCard size={14} className="text-blue-500" /> {user.bankAccount}
                          </div>
                          <div className="text-[10px] text-gray-500 uppercase font-medium">
                            {user.bankName} - {user.bankAccountName}
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa cập nhật</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.approved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={12} /> Đã phê duyệt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <XCircle size={12} /> Chờ phê duyệt
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleApproval(user)}
                        title={user.approved ? "Thu hồi phê duyệt" : "Phê duyệt ngay"}
                        className={`p-2 rounded-lg transition-colors ${
                          user.approved 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {user.approved ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa vai trò"
                      >
                        <Shield size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.uid)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa thành viên"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy thành viên nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Thiết lập thành viên</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedUser.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-blue-900">{selectedUser.email}</p>
                  <p className="text-xs text-blue-700">ID: {selectedUser.uid}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò hệ thống</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  disabled={selectedUser.uid === auth.currentUser?.uid}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                >
                  <option value="user">Thành viên mới (Chưa phân quyền)</option>
                  <option value="staff">Nhân viên (Quyền hạn nghiệp vụ)</option>
                  <option value="admin">Quản trị viên (Toàn quyền hệ thống)</option>
                </select>
                {selectedUser.uid === auth.currentUser?.uid && (
                  <p className="text-xs text-amber-600 mt-1 italic">Bạn không thể tự thay đổi vai trò của chính mình.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ / Vị trí</label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  placeholder="VD: Quản lý kho, Kế toán, Kỹ thuật..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Bank Info (Read-only for Admin to view) */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={14} /> Thông tin ngân hàng
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Ngân hàng</p>
                    <p className="text-sm font-bold text-gray-900">{selectedUser.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Số tài khoản</p>
                    <p className="text-sm font-bold text-gray-900">{selectedUser.bankAccount || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase">Chủ tài khoản</p>
                    <p className="text-sm font-bold text-gray-900">{selectedUser.bankAccountName || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="approved-check"
                  checked={editForm.approved}
                  onChange={(e) => setEditForm({ ...editForm, approved: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="approved-check" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Phê duyệt quyền truy cập vào hệ thống
                </label>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
