import React, { useState, useMemo } from 'react';
import { AppData, Order, Customer } from '../types';
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
  Save
} from 'lucide-react';

interface CSKHProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

interface CareTask {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderDate: string;
  taskDate: Date;
  type: 'milestone1' | 'milestone2' | 'milestone3';
  status: 'pending' | 'completed';
  description: string;
}

export function CSKH({ data, updateData }: CSKHProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'promotions'>('tasks');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
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

  // Generate care tasks from orders
  const careTasks = useMemo(() => {
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
        // Only show tasks that are coming up or recently passed (within 30 days)
        const diffDays = Math.floor((point.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= -30) {
          tasks.push({
            id: `${order.id}-${point.type}`,
            customerId: order.customerId,
            customerName: order.customerName,
            orderId: order.id,
            orderDate: order.date,
            taskDate: point.date,
            type: point.type,
            status: diffDays < 0 ? 'completed' : 'pending', // Mock status for now
            description: point.desc
          });
        }
      });
    });

    return tasks.sort((a, b) => a.taskDate.getTime() - b.taskDate.getTime());
  }, [data.orders, settings]);

  const handleSaveSettings = async () => {
    await updateData({ cskhSettings: tempSettings });
    setShowSettings(false);
  };

  const filteredTasks = careTasks.filter(task => 
    task.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGoogleCalendarLink = (task: CareTask) => {
    const customer = data.customers.find(c => c.id === task.customerId);
    const title = encodeURIComponent(`CSKH: ${task.customerName} - ${task.description}`);
    const dateStr = task.taskDate.toISOString().replace(/-|:|\.\d+/g, '');
    const details = encodeURIComponent(
      `Chăm sóc khách hàng cho đơn hàng #${task.orderId}\n` +
      `Khách hàng: ${task.customerName}\n` +
      `SĐT: ${customer?.phone || 'N/A'}\n` +
      `Nội dung: ${task.description}`
    );
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
  };

  const getEmailLink = (task: CareTask) => {
    const customer = data.customers.find(c => c.id === task.customerId);
    if (!customer?.email) return null;
    
    const subject = encodeURIComponent(`[${data.shopInfo?.name || 'Hữu Laptop'}] Chăm sóc khách hàng - Đơn hàng #${task.orderId}`);
    const body = encodeURIComponent(
      `Kính chào ${task.customerName},\n\n` +
      `Chúng tôi từ ${data.shopInfo?.name || 'Hữu Laptop'} xin gửi lời chào đến quý khách.\n` +
      `Quý khách đã mua hàng tại shop vào ngày ${task.orderDate}.\n` +
      `Nội dung chăm sóc: ${task.description}.\n\n` +
      `Quý khách có gặp khó khăn gì trong quá trình sử dụng không ạ?\n\n` +
      `Trân trọng,\n` +
      `${data.shopInfo?.name || 'Hữu Laptop'}`
    );
    return `mailto:${customer.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cần xử lý hôm nay</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {careTasks.filter(t => {
                const today = new Date();
                today.setHours(0,0,0,0);
                return t.taskDate.getTime() === today.getTime();
              }).length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sắp tới (7 ngày)</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {careTasks.filter(t => {
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                return t.taskDate > today && t.taskDate <= nextWeek;
              }).length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã hoàn thành</p>
            <h3 className="text-2xl font-bold text-gray-900">
              {careTasks.filter(t => t.status === 'completed').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex p-1 gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tasks' 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Calendar size={18} />
              Lịch chăm sóc định kỳ
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'promotions' 
                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <HeartHandshake size={18} />
              Chương trình khuyến mãi
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'tasks' ? (
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
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                    <Filter size={18} />
                    Lọc
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Ngày thực hiện</th>
                      <th className="px-4 py-3 font-semibold">Khách hàng</th>
                      <th className="px-4 py-3 font-semibold">Nội dung</th>
                      <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                      <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const isToday = new Date(task.taskDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                        const isPast = task.taskDate < new Date() && !isToday;
                        
                        return (
                          <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : isPast ? 'text-red-500' : 'text-gray-900'}`}>
                                  {task.taskDate.toLocaleDateString('vi-VN')}
                                </span>
                                {isToday && <span className="text-[10px] font-bold text-blue-600 uppercase">Hôm nay</span>}
                                {isPast && <span className="text-[10px] font-bold text-red-500 uppercase">Quá hạn</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                  <User size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{task.customerName}</span>
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
                                <a
                                  href={getGoogleCalendarLink(task)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Thêm vào Google Lịch"
                                >
                                  <Calendar size={18} />
                                </a>
                                {getEmailLink(task) && (
                                  <a
                                    href={getEmailLink(task)!}
                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    title="Gửi Email"
                                  >
                                    <Mail size={18} />
                                  </a>
                                )}
                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                  <MessageSquare size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <HeartHandshake size={48} className="text-gray-200" />
                            <p>Không có lịch chăm sóc nào cần xử lý.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
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
                        placeholder="VD: Khuyến mãi Hè 2024"
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
                      </select>
                    </div>
                    <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <Bell size={18} />
                      Gửi thông báo ngay
                    </button>
                  </div>
                </div>

                {/* Promotion History / Active */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    Lịch sử khuyến mãi
                  </h4>
                  <div className="space-y-4">
                    {[
                      { title: 'Giảm giá 10% Laptop Gaming', date: '20/03/2024', sent: 45, clicks: 12 },
                      { title: 'Tặng túi chống sốc cho khách cũ', date: '15/03/2024', sent: 120, clicks: 34 },
                    ].map((promo, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{promo.title}</h5>
                            <p className="text-xs text-gray-500 mt-1">Đã gửi vào: {promo.date}</p>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase">Đã gửi</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Số lượng gửi</p>
                            <p className="text-lg font-bold text-gray-900">{promo.sent}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Lượt quan tâm</p>
                            <p className="text-lg font-bold text-blue-600">{promo.clicks}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Tự động hóa Chăm sóc khách hàng</h3>
            <p className="opacity-90 max-w-xl">
              Hệ thống tự động tính toán các mốc thời gian quan trọng ({settings.milestone1} ngày, {settings.milestone2} tháng, {settings.milestone3} tháng) để bạn không bỏ lỡ bất kỳ cơ hội kết nối nào với khách hàng.
            </p>
          </div>
          <button 
            onClick={() => {
              setTempSettings(settings);
              setShowSettings(true);
            }}
            className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-bold shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Settings size={20} />
            Cấu hình mốc thời gian
          </button>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

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
    </div>
  );
}
