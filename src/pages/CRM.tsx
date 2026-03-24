import React, { useState, useMemo } from 'react';
import { auth } from '../firebase';
import { AppData, Order, Customer, Lead, CareTask } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  HeartHandshake, 
  Calendar, 
  Mail, 
  Bell, 
  CheckCircle2, 
  Clock, 
  User, 
  ExternalLink,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MessageSquare,
  Settings,
  X,
  Save,
  Phone,
  Gift,
  Users,
  Target,
  Send,
  Trash2,
  Edit2,
  UserPlus,
  RefreshCw,
  Facebook
} from 'lucide-react';

interface CRMProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  addItem: (collection: keyof AppData, item: any) => Promise<void>;
  updateItem: (collection: keyof AppData, id: string, item: any) => Promise<void>;
  deleteItem: (collection: keyof AppData, id: string) => Promise<void>;
}

export function CRM({ data, updateData, addItem, updateItem, deleteItem }: CRMProps) {
  const [activeTab, setActiveTab] = useState<'leads' | 'tasks' | 'promotions'>('tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingConvert, setConfirmingConvert] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  // Default settings if not provided
  const settings = data.cskhSettings || {
    milestone1: 7,
    milestone2: 3,
    milestone3: 6
  };

  const [tempSettings, setTempSettings] = useState(settings);

  // Helper to parse DD/MM/YYYY to Date object
  const parseVNToDate = (vnDate: string) => {
    const [day, month, year] = vnDate.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Generate care tasks from orders (for syncing)
  const generatedTasks = useMemo(() => {
    const tasks: CareTask[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data.orders.forEach(order => {
      const orderDate = parseVNToDate(order.date);
      
      // Milestone 1 (Days)
      const date1 = new Date(orderDate);
      date1.setDate(date1.getDate() + settings.milestone1);
      
      // Milestone 2 (Months)
      const date2 = new Date(orderDate);
      date2.setMonth(date2.getMonth() + settings.milestone2);
      
      // Milestone 3 (Months)
      const date3 = new Date(orderDate);
      date3.setMonth(date3.getMonth() + settings.milestone3);

      const carePoints = [
        { date: date1, type: 'milestone1' as const, desc: `Hỏi thăm sử dụng sau ${settings.milestone1} ngày` },
        { date: date2, type: 'milestone2' as const, desc: `Bảo trì định kỳ ${settings.milestone2} tháng` },
        { date: date3, type: 'milestone3' as const, desc: `Kiểm tra định kỳ ${settings.milestone3} tháng` }
      ];

      carePoints.forEach(point => {
        const diffDays = Math.floor((point.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= -30) {
          tasks.push({
            id: `${order.id}-${point.type}`,
            customerId: order.customerId,
            customerName: order.customerName,
            orderId: order.id,
            orderDate: order.date,
            taskDate: point.date.toISOString(),
            type: point.type,
            status: 'pending',
            description: point.desc
          });
        }
      });
    });

    return tasks;
  }, [data.orders, settings]);

  const careTasks = useMemo(() => {
    const storedTasks = data.careTasks || [];
    // Merge generated tasks with stored tasks, preferring stored tasks for status
    const merged = [...generatedTasks];
    
    storedTasks.forEach(stored => {
      const index = merged.findIndex(m => m.id === stored.id);
      if (index !== -1) {
        merged[index] = stored;
      } else {
        merged.push(stored);
      }
    });

    return merged.sort((a, b) => new Date(a.taskDate).getTime() - new Date(b.taskDate).getTime());
  }, [generatedTasks, data.careTasks]);

  const handleSaveSettings = async () => {
    await updateData({ cskhSettings: tempSettings });
    setShowSettings(false);
  };

  const handleToggleTaskStatus = async (task: CareTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTask = { 
      ...task, 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    };
    
    const currentCareTasks = data.careTasks || [];
    const existingIndex = currentCareTasks.findIndex(t => t.id === task.id);
    
    try {
      if (existingIndex !== -1) {
        await updateItem('careTasks', task.id, updatedTask);
      } else {
        await addItem('careTasks', updatedTask);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái chăm sóc:', error);
    }
  };

  const handleSyncAndReport = async () => {
    // Sync all generated tasks to Firestore if they don't exist
    const currentCareTasks = data.careTasks || [];
    const newTasksToSync = generatedTasks.filter(gt => !currentCareTasks.find(ct => ct.id === gt.id));
    
    if (newTasksToSync.length > 0) {
      await updateData({ careTasks: [...currentCareTasks, ...newTasksToSync] });
    }

    // Send report
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTasks = careTasks.filter(t => {
      const d = new Date(t.taskDate);
      d.setHours(0,0,0,0);
      return d.getTime() === today.getTime() && t.status === 'pending';
    });
    
    if (todayTasks.length === 0) {
      setToast({ message: 'Đã đồng bộ dữ liệu. Không có lịch chăm sóc mới nào trong hôm nay để báo cáo.', type: 'info' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const adminEmails = ['dieuhuu1995@gmail.com', 'huulaptop.info@gmail.com'];
    const adminEmail = adminEmails.includes(auth.currentUser?.email || '') ? auth.currentUser?.email : adminEmails[0];
    const subject = `Báo cáo chăm sóc khách hàng ngày ${today.toLocaleDateString('vi-VN')}`;
    let body = `Danh sách khách hàng cần chăm sóc hôm nay (${today.toLocaleDateString('vi-VN')}):\n\n`;
    
    todayTasks.forEach((t, i) => {
      body += `${i+1}. ${t.customerName} - ${t.description} (Đơn hàng: #${t.orderId})\n`;
    });
    
    body += `\nTổng cộng: ${todayTasks.length} nhiệm vụ chưa hoàn thành.\n`;
    body += `\nVui lòng kiểm tra hệ thống CRM để thực hiện chăm sóc.`;
    
    window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const filteredTasks = careTasks.filter(task => 
    task.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeads = (data.leads || []).filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const getGoogleCalendarLink = (task: CareTask) => {
    const customer = data.customers.find(c => c.id === task.customerId);
    const title = encodeURIComponent(`CRM: ${task.customerName} - ${task.description}`);
    const taskDate = new Date(task.taskDate);
    const dateStr = taskDate.toISOString().replace(/-|:|\.\d+/g, '');
    const details = encodeURIComponent(
      `Chăm sóc khách hàng cho đơn hàng #${task.orderId}\n` +
      `Khách hàng: ${task.customerName}\n` +
      `SĐT: ${customer?.phone || 'N/A'}\n` +
      `Nội dung: ${task.description}`
    );
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
  };

  const getEmailLink = (email: string, subject: string, body: string) => {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getSmsLink = (phone: string, body: string) => {
    return `sms:${phone}?body=${encodeURIComponent(body)}`;
  };

  const getZaloLink = (phone: string) => {
    // Zalo link format: https://zalo.me/phone
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://zalo.me/${cleanPhone}`;
  };

  const getMessengerLink = (facebook?: string) => {
    if (!facebook) return null;
    // If it's a full URL, use it, otherwise assume it's a username for m.me
    if (facebook.startsWith('http')) return facebook;
    return `https://m.me/${facebook}`;
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const leadData: any = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      facebook: formData.get('facebook') as string,
      source: formData.get('source') as string,
      status: formData.get('status') as any,
      notes: formData.get('notes') as string,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingLead) {
        await updateItem('leads', editingLead.id, {
          ...editingLead,
          ...leadData
        });
      } else {
        const newLead: Lead = {
          id: `LEAD${Date.now()}`,
          ...leadData,
          createdAt: new Date().toISOString(),
        };
        await addItem('leads', newLead);
      }
      setShowLeadModal(false);
      setEditingLead(null);
    } catch (error) {
      console.error('Lỗi khi lưu lead:', error);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteItem('leads', id);
      setConfirmingDelete(null);
    } catch (error) {
      console.error('Lỗi khi xóa lead:', error);
    }
  };

  const handleConvertToCustomer = async (lead: Lead) => {
    try {
      // Robust ID generation for customer
      const maxId = data.customers.reduce((max, c) => {
        const idNum = parseInt(c.id.replace('KH', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);

      const newCustomer: Customer = {
        id: `KH${String(maxId + 1).padStart(3, '0')}`,
        name: lead.name,
        type: 'ca-nhan',
        phone: lead.phone,
        email: lead.email || '',
        facebook: lead.facebook || '',
        address: '',
        debt: 0,
        createdAt: new Date().toISOString(),
      };

      await addItem('customers', newCustomer);
      await deleteItem('leads', lead.id);
      
      setConfirmingConvert(null);
      // Switch to care tasks tab to show the "after-sale" context
      setActiveTab('tasks');
    } catch (error) {
      console.error('Lỗi khi chuyển đổi lead:', error);
    }
  };

  const handleSendAdminReport = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTasks = careTasks.filter(t => t.taskDate.getTime() === today.getTime());
    
    if (todayTasks.length === 0) {
      setToast({ message: 'Không có lịch chăm sóc nào trong hôm nay để báo cáo.', type: 'info' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const adminEmails = ['dieuhuu1995@gmail.com', 'huulaptop.info@gmail.com'];
    const adminEmail = adminEmails.includes(auth.currentUser?.email || '') ? auth.currentUser?.email : adminEmails[0];
    const subject = `Báo cáo chăm sóc khách hàng ngày ${today.toLocaleDateString('vi-VN')}`;
    let body = `Danh sách khách hàng cần chăm sóc hôm nay (${today.toLocaleDateString('vi-VN')}):\n\n`;
    
    todayTasks.forEach((t, i) => {
      body += `${i+1}. ${t.customerName} - ${t.description} (Đơn hàng: #${t.orderId})\n`;
    });
    
    body += `\nTổng cộng: ${todayTasks.length} nhiệm vụ.\n`;
    body += `\nVui lòng kiểm tra hệ thống CRM để thực hiện chăm sóc.`;
    
    window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tiềm năng mới</p>
            <h3 className="text-2xl font-bold text-gray-900">{(data.leads || []).filter(l => l.status === 'Mới').length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cần chăm sóc hôm nay</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {careTasks.filter(t => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const tDate = new Date(t.taskDate);
                tDate.setHours(0,0,0,0);
                return tDate.getTime() === today.getTime();
              }).length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tỷ lệ chốt đơn</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.leads?.length ? Math.round((data.leads.filter(l => l.status === 'Thành công').length / data.leads.length) * 100) : 0}%
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <Gift size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">CT Khuyến mãi chạy</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {data.promotions?.filter(p => p.status === 'Đang chạy').length || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex flex-col sm:flex-row p-1 gap-1">
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'leads' 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              Tiềm năng (Trước bán)
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tasks' 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Calendar size={18} />
              Lịch chăm sóc (Sau bán)
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'promotions' 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Gift size={18} />
              Khuyến mãi
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Tìm tên, số điện thoại tiềm năng..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => {
                    setEditingLead(null);
                    setShowLeadModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={18} />
                  Thêm tiềm năng
                </button>
              </div>

              {/* Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Khách hàng</th>
                      <th className="px-4 py-3 font-semibold">Nguồn</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Ghi chú</th>
                      <th className="px-4 py-3 font-semibold text-right">Liên hệ</th>
                      <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{lead.name}</span>
                            <span className="text-xs text-gray-500">{lead.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">{lead.source}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            lead.status === 'Mới' ? 'bg-blue-100 text-blue-600' :
                            lead.status === 'Đã liên hệ' ? 'bg-amber-100 text-amber-600' :
                            lead.status === 'Đang thương lượng' ? 'bg-purple-100 text-purple-600' :
                            lead.status === 'Thành công' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-rose-100 text-rose-600'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{lead.notes || '---'}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <a href={getZaloLink(lead.phone)} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Zalo">
                              <MessageSquare size={18} />
                            </a>
                            {lead.facebook && (
                              <a href={getMessengerLink(lead.facebook)!} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Messenger">
                                <Facebook size={18} />
                              </a>
                            )}
                            <a href={`tel:${lead.phone}`} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Gọi điện">
                              <Phone size={18} />
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setConfirmingConvert(lead)}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Chuyển thành khách hàng"
                            >
                              <UserPlus size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingLead(lead);
                                setShowLeadModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => setConfirmingDelete(lead.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900">{lead.name}</h4>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        lead.status === 'Mới' ? 'bg-blue-100 text-blue-600' :
                        lead.status === 'Đã liên hệ' ? 'bg-amber-100 text-amber-600' :
                        lead.status === 'Đang thương lượng' ? 'bg-purple-100 text-purple-600' :
                        lead.status === 'Thành công' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {lead.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg font-medium">Nguồn: {lead.source}</span>
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-100 italic">
                        {lead.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex gap-1">
                        <a href={getZaloLink(lead.phone)} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                          <MessageSquare size={18} />
                        </a>
                        <a href={`tel:${lead.phone}`} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                          <Phone size={18} />
                        </a>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setConfirmingConvert(lead)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <UserPlus size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingLead(lead);
                            setShowLeadModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setConfirmingDelete(lead.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredLeads.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Target size={48} className="text-gray-200" />
                    <p>Chưa có khách hàng tiềm năng nào.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Tìm khách hàng, mã đơn hàng..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <button 
                    onClick={handleSyncAndReport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all"
                  >
                    <RefreshCw size={18} />
                    Đồng bộ & Báo cáo
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              {/* Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Ngày thực hiện</th>
                      <th className="px-4 py-3 font-semibold">Khách hàng</th>
                      <th className="px-4 py-3 font-semibold">Nội dung</th>
                      <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                      <th className="px-4 py-3 font-semibold text-right">Liên hệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTasks.map((task) => {
                      const taskDate = new Date(task.taskDate);
                      const isToday = taskDate.setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                      const isPast = taskDate < new Date() && !isToday;
                      const customer = data.customers.find(c => c.id === task.customerId);
                      
                      return (
                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleTaskStatus(task)}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                  task.status === 'completed' 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'border-gray-300 hover:border-blue-500'
                                }`}
                              >
                                {task.status === 'completed' && <CheckCircle2 size={12} />}
                              </button>
                              <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : isToday ? 'text-blue-600' : isPast ? 'text-red-500' : 'text-gray-900'}`}>
                                  {new Date(task.taskDate).toLocaleDateString('vi-VN')}
                                </span>
                                {isToday && task.status !== 'completed' && <span className="text-[10px] font-bold text-blue-600 uppercase">Hôm nay</span>}
                                {isPast && task.status !== 'completed' && <span className="text-[10px] font-bold text-red-500 uppercase">Quá hạn</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                <User size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{task.customerName}</span>
                                <span className="text-[10px] text-gray-400">{customer?.phone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                task.type === 'milestone1' ? 'bg-blue-100 text-blue-600' :
                                task.type === 'milestone2' ? 'bg-amber-100 text-amber-600' :
                                'bg-purple-100 text-purple-600'
                              }`}>
                                {task.type === 'milestone1' ? `${settings.milestone1} Ngày` : task.type === 'milestone2' ? `${settings.milestone2} Tháng` : `${settings.milestone3} Tháng`}
                              </span>
                              <span className="text-sm text-gray-600">{task.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-mono text-gray-500">#{task.orderId}</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <a href={getZaloLink(customer?.phone || '')} target="_blank" rel="noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Zalo">
                                <MessageSquare size={18} />
                              </a>
                              <a href={getSmsLink(customer?.phone || '', `Chào ${task.customerName}, mình từ Hữu Laptop...`)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Gửi SMS">
                                <Send size={18} />
                              </a>
                              <a
                                href={getGoogleCalendarLink(task)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Thêm vào Google Lịch"
                              >
                                <Calendar size={18} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredTasks.map((task) => {
                  const taskDate = new Date(task.taskDate);
                  const isToday = taskDate.setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                  const isPast = taskDate < new Date() && !isToday;
                  const customer = data.customers.find(c => c.id === task.customerId);

                  return (
                    <div key={task.id} className={`p-4 rounded-2xl border transition-all ${task.status === 'completed' ? 'bg-gray-50 border-gray-100 opacity-75' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                              task.status === 'completed' 
                              ? 'bg-emerald-500 border-emerald-500 text-white' 
                              : 'border-gray-300'
                            }`}
                          >
                            {task.status === 'completed' && <CheckCircle2 size={14} />}
                          </button>
                          <div>
                            <p className={`font-bold ${task.status === 'completed' ? 'text-gray-400 line-through' : isToday ? 'text-blue-600' : isPast ? 'text-red-500' : 'text-gray-900'}`}>
                              {new Date(task.taskDate).toLocaleDateString('vi-VN')}
                            </p>
                            <div className="flex gap-2">
                              {isToday && task.status !== 'completed' && <span className="text-[10px] font-bold text-blue-600 uppercase">Hôm nay</span>}
                              {isPast && task.status !== 'completed' && <span className="text-[10px] font-bold text-red-500 uppercase">Quá hạn</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400">#{task.orderId}</span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{task.customerName}</p>
                            <p className="text-xs text-gray-500">{customer?.phone}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              task.type === 'milestone1' ? 'bg-blue-100 text-blue-600' :
                              task.type === 'milestone2' ? 'bg-amber-100 text-amber-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {task.type === 'milestone1' ? `${settings.milestone1} Ngày` : task.type === 'milestone2' ? `${settings.milestone2} Tháng` : `${settings.milestone3} Tháng`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{task.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-2">
                            <a href={getZaloLink(customer?.phone || '')} target="_blank" rel="noreferrer" className="p-2 text-blue-500 bg-blue-50 rounded-lg">
                              <MessageSquare size={18} />
                            </a>
                            <a href={`tel:${customer?.phone}`} className="p-2 text-emerald-500 bg-emerald-50 rounded-lg">
                              <Phone size={18} />
                            </a>
                          </div>
                          <a
                            href={getGoogleCalendarLink(task)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 bg-gray-50 rounded-lg"
                          >
                            <Calendar size={18} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTasks.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <HeartHandshake size={48} className="text-gray-200" />
                    <p>Không có lịch chăm sóc nào cần xử lý.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'promotions' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Promotion Form */}
                <div className="lg:col-span-1 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Plus size={18} className="text-blue-600" />
                    Tạo chương trình mới
                  </h4>
                  <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tên chương trình</label>
                      <input 
                        type="text" 
                        placeholder="VD: Quà tặng tri ân khách cũ"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nội dung thông điệp</label>
                      <textarea 
                        rows={4}
                        placeholder="Nhập nội dung gửi đến khách hàng..."
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Đối tượng</label>
                      <select className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm">
                        <option>Tất cả khách hàng</option>
                        <option>Khách hàng thân thiết</option>
                        <option>Khách hàng đã lâu không mua</option>
                        <option>Khách hàng tiềm năng</option>
                      </select>
                    </div>
                    <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <Gift size={18} />
                      Gửi quà tặng ngay
                    </button>
                  </div>
                </div>

                {/* Promotion History / Active */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    Lịch sử quà tặng & Khuyến mãi
                  </h4>
                  <div className="space-y-4">
                    {data.promotions?.map((promo) => (
                      <div key={promo.id} className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${promo.type === 'Gift' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                              {promo.type === 'Gift' ? <Gift size={20} /> : <Target size={20} />}
                            </div>
                            <div>
                              <h5 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{promo.title}</h5>
                              <p className="text-xs text-gray-500 mt-1">Đã gửi vào: {new Date(promo.createdAt).toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                            promo.status === 'Đang chạy' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {promo.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Số lượng gửi</p>
                            <p className="text-lg font-bold text-gray-900">{promo.sentCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Lượt quan tâm</p>
                            <p className="text-lg font-bold text-blue-600">{promo.clickCount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!data.promotions || data.promotions.length === 0) && (
                      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        Chưa có chương trình khuyến mãi nào.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Tối ưu hóa CRM & Chăm sóc khách hàng</h3>
            <p className="opacity-90 max-w-xl">
              Quản lý khách hàng từ khi còn là tiềm năng cho đến khi trở thành khách hàng trung thành. Tích hợp đa kênh (Zalo, SMS, Email) để tạo sự gần gũi và chuyên nghiệp.
            </p>
          </div>
          <button 
            onClick={() => {
              setTempSettings(settings);
              setShowSettings(true);
            }}
            className="px-6 py-3 bg-white text-blue-700 rounded-2xl font-bold shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Settings size={20} />
            Cấu hình mốc thời gian
          </button>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editingLead ? 'Sửa tiềm năng' : 'Thêm tiềm năng mới'}</h3>
              <button onClick={() => setShowLeadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Họ tên</label>
                  <input 
                    name="name"
                    required
                    defaultValue={editingLead?.name}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Số điện thoại</label>
                  <input 
                    name="phone"
                    required
                    defaultValue={editingLead?.phone}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                  <input 
                    name="email"
                    type="email"
                    defaultValue={editingLead?.email}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Messenger/FB</label>
                  <input 
                    name="facebook"
                    placeholder="Username hoặc Link"
                    defaultValue={editingLead?.facebook}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nguồn</label>
                  <select 
                    name="source"
                    defaultValue={editingLead?.source || 'Facebook'}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    <option>Facebook</option>
                    <option>Website</option>
                    <option>Zalo</option>
                    <option>Trực tiếp</option>
                    <option>Giới thiệu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Trạng thái</label>
                  <select 
                    name="status"
                    defaultValue={editingLead?.status || 'Mới'}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    <option>Mới</option>
                    <option>Đã liên hệ</option>
                    <option>Đang thương lượng</option>
                    <option>Thành công</option>
                    <option>Thất bại</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ghi chú</label>
                  <textarea 
                    name="notes"
                    rows={3}
                    defaultValue={editingLead?.notes}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingLead ? 'Cập nhật' : 'Lưu tiềm năng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Cấu hình mốc thời gian</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mốc 1 (Sau khi mua - Ngày)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={tempSettings.milestone1}
                    onChange={(e) => setTempSettings({...tempSettings, milestone1: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mốc 2 (Định kỳ - Tháng)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={tempSettings.milestone2}
                    onChange={(e) => setTempSettings({...tempSettings, milestone2: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mốc 3 (Định kỳ - Tháng)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    value={tempSettings.milestone3}
                    onChange={(e) => setTempSettings({...tempSettings, milestone3: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <Bell size={20} />}
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Xác nhận xóa</h3>
            <p className="text-sm text-gray-500">Bạn có chắc chắn muốn xóa khách hàng tiềm năng này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmingDelete(null)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleDeleteLead(confirmingDelete)}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingConvert && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Chuyển thành khách hàng</h3>
            <p className="text-sm text-gray-500">Chuyển <strong>{confirmingConvert.name}</strong> thành khách hàng chính thức để bắt đầu quy trình chăm sóc sau bán?</p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setConfirmingConvert(null)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleConvertToCustomer(confirmingConvert)}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
              >
                Đồng ý chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
