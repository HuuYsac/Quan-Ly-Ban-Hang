import React, { useState, useRef, useEffect } from 'react';
import { AppData, Product } from '../types';
import { Send, Bot, User, Sparkles, Copy, Facebook, MessageSquare, Loader2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { formatCurrency } from '../lib/utils';

interface AIAssistantProps {
  data: AppData;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  products?: Product[];
}

export function AIAssistant({ data }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: 'Chào anh em! Mình là Hữu Laptop đây. Anh em cần tư vấn dòng máy nào bền bỉ, ổn định để làm việc hay viết bài bán hàng chuẩn kỹ thuật thì cứ bảo mình nhé!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ type: 'fb' | 'shorts', content: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Check for API key selection if missing
    if (typeof window !== 'undefined' && window.aistudio && !process.env.GEMINI_API_KEY) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // After opening the dialog, we assume the user will select a key.
        // The page will likely refresh or the key will become available.
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Limit product context to avoid token limits if there are many products
      const maxProducts = 300;
      const productsToInclude = (data.products || []).slice(0, maxProducts);
      
      const productsContext = productsToInclude.map(p => 
        `- ${p.name} (ID: ${p.id}): ${formatCurrency(p.price)}, Kho: ${p.stock}, Danh mục: ${p.category}`
      ).join('\n');

      const systemInstruction = `
        Bạn là Hữu Laptop - Một chuyên gia kỹ thuật máy tính chân thành và thực dụng.
        Mục tiêu của bạn là hỗ trợ nhân viên tư vấn sản phẩm và tạo nội dung marketing chuyên sâu.

        [DANH SÁCH SẢN PHẨM HIỆN CÓ]
        ${productsContext}

        [PHONG CÁCH & ĐỊNH VỊ]
        - Xưng hô: Xưng là "Hữu Laptop" hoặc "mình", gọi khách hàng là "anh em" hoặc "khách".
        - Giọng văn: Chân thành, thực dùng, góc nhìn chuyên gia kỹ thuật cứng tay. Tránh từ ngữ sáo rỗng, hoa mỹ, "lùa gà".
        - Trọng tâm: Nhấn mạnh độ bền bỉ, tính ổn định, nhiệt độ mát mẻ, khả năng gánh tab trình duyệt/giả lập.

        [NGUYÊN TẮC VỀ DỊCH VỤ]
        1. Bảo hành: Không tự bịa số tháng. Luôn ghi: "Thời gian bảo hành linh hoạt, thời hạn phụ thuộc chuẩn theo gói dịch vụ anh em lựa chọn".
        2. Hệ điều hành: Máy luôn được tối ưu sâu, bung file chuẩn (Sysprep/Acronis) nên cực kỳ ổn định, không lỗi vặt.
        3. Phần mềm: Có sẵn Office 2021 Standard (250K) hoặc bản Bind vĩnh viễn (1.490K) cho anh em làm việc, không lo crack virus.
        4. Địa lý: Shop tại Bình Phước, nhận ship toàn quốc có video test máy kỹ càng.

        [NHIỆM VỤ]
        1. Tư vấn cấu hình: Dựa vào ngân sách/nhu cầu, liệt kê máy phù hợp từ danh sách sản phẩm.
        2. Trả lời kỹ thuật: Giải đáp thắc mắc về nâng cấp, độ bền, hiệu năng thực tế.
        3. KHÔNG SỬ DỤNG ký tự ** để in đậm văn bản.
      `;

      // Construct history for context
      const history = messages.slice(-5).map(m => `${m.role === 'user' ? 'Khách' : 'Hữu Laptop'}: ${m.content}`).join('\n');
      const promptWithHistory = `Lịch sử hội thoại:\n${history}\n\nKhách hỏi: ${userMessage}`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction,
          prompt: promptWithHistory
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi từ máy chủ AI');
      }

      const result = await response.json();
      const responseText = (result.text || '').replace(/\*\*/g, '');

      // Identify products mentioned in the response
      const mentionedProducts = (data.products || []).filter(p => 
        responseText.toLowerCase().includes(p.name.toLowerCase()) || 
        responseText.includes(p.id)
      );

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: responseText,
        products: mentionedProducts.length > 0 ? mentionedProducts : undefined
      }]);
    } catch (error: any) {
      console.error('AI Error Details:', error);
      const errorMessage = error?.message || '';
      let displayMessage = 'Xin lỗi, đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Vui lòng thử lại sau.';
      
      if (errorMessage.includes('API_KEY_MISSING')) {
        displayMessage = 'Lỗi: Thiếu API Key. Vui lòng liên hệ quản trị viên để cấu hình hệ thống.';
      } else if (errorMessage.includes('API_KEY_INVALID')) {
        displayMessage = 'Lỗi: API Key không hợp lệ. Vui lòng liên hệ quản trị viên.';
      } else if (errorMessage.includes('max tokens limit')) {
        displayMessage = 'Lỗi: Dữ liệu quá lớn để xử lý. Vui lòng thử lại với câu hỏi ngắn hơn.';
      } else if (errorMessage.includes('PERMISSION_DENIED')) {
        displayMessage = 'Lỗi: Không có quyền truy cập API. Vui lòng kiểm tra lại cấu hình API Key.';
      } else if (errorMessage.includes('quota')) {
        displayMessage = 'Lỗi: Hết hạn mức sử dụng AI (Quota exceeded). Vui lòng thử lại sau.';
      } else {
        // Show a bit more detail for other errors
        displayMessage = `Lỗi kết nối AI: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: displayMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateContent = async (product: Product, type: 'fb' | 'shorts') => {
    setIsGenerating(true);
    setGeneratedContent(null);
    try {
      let prompt = "";
      if (type === 'fb') {
        prompt = `Bạn là Hữu Laptop. Viết một BÀI FACEBOOK bán sản phẩm sau:
          Tên: ${product.name}
          Giá: ${formatCurrency(product.price)}
          Danh mục: ${product.category}
          
          Cấu trúc bài viết:
          1. Tiêu đề in hoa đánh trúng tâm lý (VD: LAPTOP BEN BI CHO ANH EM KY THUAT).
          2. 3 gạch đầu dòng phân tích kỹ thuật thực tế (về độ bền, tản nhiệt, khả năng gánh việc).
          3. Thông tin bảo hành: "Thời gian bảo hành linh hoạt, thời hạn phụ thuộc chuẩn theo gói dịch vụ anh em lựa chọn".
          4. Thông tin phần mềm: Nhắc về Windows tối ưu Sysprep và Office bản quyền Office 2021 Standard (250K) hoặc Bind (1.490K).
          5. Lời kêu gọi chốt sale chân thành.
          6. Hashtags: #HuuLaptop #LaptopBenBi #LaptopBinhPhuoc.
          
          Lưu ý: Giọng văn chân thành, thực dụng, không sáo rỗng. KHÔNG dùng **.`;
      } else {
        prompt = `Bạn là Hữu Laptop. Viết kịch bản SHORTS (video ngắn) cho sản phẩm:
          Tên: ${product.name}
          Giá: ${formatCurrency(product.price)}
          
          Yêu cầu:
          - Định dạng: Bảng 2 cột (Góc quay/Hành động | Lời thoại).
          - Hook (3 giây đầu): Cực mạnh, giữ chân người xem (VD: "Đừng mua laptop này nếu anh em chỉ thích vẻ ngoài hào nhoáng...").
          - Nội dung: Tập trung vào độ bền, hiệu năng thực tế, bung file chuẩn ổn định.
          - Thời lượng: Dưới 60 giây.
          - Kết thúc: Kêu gọi anh em ghé kho tại Bình Phước hoặc inbox xem video test máy.
          
          Lưu ý: KHÔNG dùng **. Cung cấp nội dung dưới dạng bảng Markdown.`;
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: "Bạn là Hữu Laptop, chuyên gia máy tính chân thành và thực dụng.",
          prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi từ máy chủ AI');
      }

      const result = await response.json();
      const cleanContent = (result.text || '').replace(/\*\*/g, '');
      setGeneratedContent({ type, content: cleanContent });
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast here if available
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Trợ lý AI Thông minh</h2>
            <p className="text-xs text-gray-500">Tư vấn sản phẩm & Viết bài bán hàng</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] space-y-3`}>
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    <div className="markdown-body prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Suggested Products */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {msg.products.map(p => (
                        <div 
                          key={p.id}
                          className="p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{p.category}</span>
                            <Sparkles size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                          <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(p.price)}</p>
                          
                          <div className="mt-3 flex gap-2">
                            <button 
                              onClick={() => generateContent(p, 'fb')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                            >
                              <Facebook size={12} /> Bài đăng FB
                            </button>
                            <button 
                              onClick={() => generateContent(p, 'shorts')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors"
                            >
                              <MessageSquare size={12} /> Kịch bản Shorts
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Hỏi AI về sản phẩm, tư vấn khách hàng..."
                className="flex-1 pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                "Tư vấn máy tính 5-10tr",
                "Sản phẩm bán chạy nhất?",
                "Viết bài đăng Laptop Dell",
                "So sánh các dòng SSD"
              ].map((hint, i) => (
                <button
                  key={i}
                  onClick={() => setInput(hint)}
                  className="whitespace-nowrap px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panel for Generated Content */}
        <AnimatePresence>
          {generatedContent && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-96 border-l border-gray-100 bg-gray-50/30 p-4 overflow-y-auto hidden lg:block"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  {generatedContent.type === 'fb' ? (
                    <><Facebook size={18} className="text-blue-600" /> Bài đăng Facebook</>
                  ) : (
                    <><MessageSquare size={18} className="text-rose-600" /> Kịch bản Shorts</>
                  )}
                </h3>
                <button 
                  onClick={() => setGeneratedContent(null)}
                  className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-sm whitespace-pre-wrap leading-relaxed relative group overflow-x-auto">
                <div className="markdown-body prose prose-xs max-w-none">
                  <ReactMarkdown>{generatedContent.content}</ReactMarkdown>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedContent.content)}
                  className="absolute top-2 right-2 p-2 bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sao chép"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(generatedContent.content)}
                className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Copy size={16} /> Sao chép tất cả
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Modal for Loading */}
        <AnimatePresence>
          {isGenerating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Hữu Laptop đang sáng tạo nội dung...</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
