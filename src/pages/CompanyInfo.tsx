import React, { useState, useEffect } from 'react';
import { AppData, ShopInfo } from '../types';
import { Building, MapPin, Phone, Mail, Globe, FileText, CreditCard, Save, CheckCircle2, Upload, X } from 'lucide-react';

interface CompanyInfoProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
}

export function CompanyInfo({ data, updateData }: CompanyInfoProps) {
  const [formData, setFormData] = useState<ShopInfo>(
    data.shopInfo || {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxCode: '',
      website: '',
      bankAccount: '',
      bankName: '',
      logo: ''
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (data.shopInfo) {
      setFormData({
        name: data.shopInfo.name || '',
        address: data.shopInfo.address || '',
        phone: data.shopInfo.phone || '',
        email: data.shopInfo.email || '',
        taxCode: data.shopInfo.taxCode || '',
        website: data.shopInfo.website || '',
        bankAccount: data.shopInfo.bankAccount || '',
        bankName: data.shopInfo.bankName || '',
        logo: data.shopInfo.logo || ''
      });
    }
  }, [data.shopInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 storage
        alert('Kích thước logo quá lớn. Vui lòng chọn file dưới 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      updateData({ shopInfo: formData });
      setIsSaving(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 600);
  };

  return (
    <div>
      <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="text-blue-600" size={24} />
            Thông tin cửa hàng / doanh nghiệp
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Thông tin này sẽ được sử dụng để in hóa đơn và báo cáo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-8 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
            <div className="relative group">
              {formData.logo ? (
                <div className="relative">
                  <img 
                    src={formData.logo} 
                    alt="Shop Logo" 
                    className="w-32 h-32 object-contain rounded-lg border border-gray-200 bg-white shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-md hover:bg-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-400">
                  <Building size={40} strokeWidth={1.5} />
                  <span className="text-[10px] mt-2 font-medium uppercase tracking-wider">Chưa có logo</span>
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110">
                <Upload size={16} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
            <div className="mt-4 text-center">
              <h4 className="text-sm font-semibold text-gray-900">Logo cửa hàng</h4>
              <p className="text-xs text-gray-500 mt-1">Định dạng: JPG, PNG. Dung lượng tối đa: 1MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Tên cửa hàng */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Building size={16} className="text-gray-400" />
                Tên cửa hàng / Doanh nghiệp *
              </label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: Cửa hàng Máy tính ABC"
              />
            </div>

            {/* Địa chỉ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                Địa chỉ *
              </label>
              <input 
                type="text" 
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                Số điện thoại *
              </label>
              <input 
                type="tel" 
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: 0901234567"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                Email
              </label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: contact@abc.com"
              />
            </div>

            {/* Mã số thuế */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                Mã số thuế
              </label>
              <input 
                type="text" 
                name="taxCode"
                value={formData.taxCode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: 0312345678"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                Website
              </label>
              <input 
                type="text" 
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: www.abc.com"
              />
            </div>

            {/* Số tài khoản */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                Số tài khoản ngân hàng
              </label>
              <input 
                type="text" 
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: 19031234567890"
              />
            </div>

            {/* Tên ngân hàng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Building size={16} className="text-gray-400" />
                Ngân hàng & Chi nhánh
              </label>
              <input 
                type="text" 
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="VD: Techcombank - CN Quận 1"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div>
              {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 animate-in slide-in-from-left-2">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Đã lưu thông tin thành công!</span>
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
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
