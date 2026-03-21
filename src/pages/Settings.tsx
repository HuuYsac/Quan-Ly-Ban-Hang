import React, { useState, useEffect } from 'react';
import { AppData, Settings as SettingsType } from '../types';
import { Settings as SettingsIcon, DollarSign, Calendar, Moon, Sun, Monitor, Bell, HardDrive, FileText, Save, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function Settings({ data, updateData }: SettingsProps) {
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
  const [showSuccess, setShowSuccess] = useState(false);

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
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 600);
  };

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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-8">
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

            {/* Appearance */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Giao diện
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
            </div>

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                Tính năng
              </h3>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      name="notifications"
                      checked={formData.notifications}
                      onChange={handleChange}
                      className="sr-only" 
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${formData.notifications ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.notifications ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Bell size={16} className="text-gray-500" />
                      Thông báo hệ thống
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Nhận thông báo khi có đơn hàng mới, cảnh báo tồn kho thấp.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      name="autoBackup"
                      checked={formData.autoBackup}
                      onChange={handleChange}
                      className="sr-only" 
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${formData.autoBackup ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.autoBackup ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <HardDrive size={16} className="text-gray-500" />
                      Tự động sao lưu
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Tự động sao lưu dữ liệu lên máy chủ mỗi ngày.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Printing */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                In ấn & Hóa đơn
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <FileText size={16} className="text-gray-400" />
                  Mẫu hóa đơn mặc định
                </label>
                <select 
                  name="invoiceTemplate"
                  value={formData.invoiceTemplate}
                  onChange={handleChange}
                  className="w-full md:w-1/2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                >
                  <option value="standard">Mẫu Tiêu chuẩn (A4/A5)</option>
                  <option value="thermal">Mẫu Máy in nhiệt (K80)</option>
                  <option value="minimal">Mẫu Tối giản</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 animate-in slide-in-from-left-2">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Đã lưu cài đặt thành công!</span>
                </div>
              )}
            </div>
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
      </div>
    </div>
  );
}
