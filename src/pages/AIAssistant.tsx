import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Product } from '../types';
import { Send, Bot, User, Sparkles, Copy, Facebook, MessageSquare, Loader2, Search } from 'lucide-react';
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
      content: 'Xin chào! Tôi là trợ lý AI của cửa hàng. Tôi có thể giúp bạn tìm kiếm sản phẩm, tư vấn cấu hình hoặc viết bài đăng bán hàng. Bạn cần giúp gì hôm nay?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fbPost, setFbPost] = useState<string | null>(null);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API_KEY_MISSING: Vui lòng cấu hình GEMINI_API_KEY trong môi trường.');
      }
      
      const ai = new GoogleGenAI({ apiKey });

      // Limit product context to avoid token limits if there are many products
      const maxProducts = 300;
      const productsToInclude = data.products.slice(0, maxProducts);
      
      const productsContext = productsToInclude.map(p => 
        `- ${p.name} (ID: ${p.id}): ${formatCurrency(p.price)}, Kho: ${p.stock}, Danh mục: ${p.category}`
      ).join('\n');

      const systemInstruction = `
        Bạn là một trợ lý bán hàng thông minh cho một cửa hàng máy tính và thiết bị công nghệ tại Việt Nam.
        Dưới đây là danh sách sản phẩm hiện có trong kho${data.products.length > maxProducts ? ' (chỉ hiển thị ' + maxProducts + ' sản phẩm đầu tiên)' : ''}:
        ${productsContext}

        Nhiệm vụ của bạn:
        1. Trả lời các câu hỏi của nhân viên về sản phẩm một cách chuyên nghiệp và thân thiện.
        2. Khi nhân viên hỏi về tư vấn sản phẩm theo ngân sách hoặc nhu cầu, hãy liệt kê các sản phẩm phù hợp nhất từ danh sách trên.
        3. Nếu sản phẩm không có trong danh sách, hãy thông báo lịch sự rằng hiện tại không có mẫu đó.
        4. Luôn sử dụng tiếng Việt tự nhiên, phù hợp với ngữ cảnh bán hàng.
        5. Khi liệt kê sản phẩm, hãy định dạng rõ ràng để nhân viên dễ theo dõi.
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemInstruction,
        },
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text;

      // Identify products mentioned in the response
      const mentionedProducts = data.products.filter(p => 
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
      
      if (errorMessage.includes('API_KEY_INVALID')) {
        displayMessage = 'Lỗi: API Key không hợp lệ. Vui lòng liên hệ quản trị viên.';
      } else if (errorMessage.includes('max tokens limit')) {
        displayMessage = 'Lỗi: Dữ liệu quá lớn để xử lý. Vui lòng thử lại với câu hỏi ngắn hơn.';
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        content: displayMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFacebookPost = async (product: Product) => {
    setIsGeneratingPost(true);
    setFbPost(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API_KEY_MISSING: Vui lòng cấu hình GEMINI_API_KEY trong môi trường.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Viết một bài đăng Facebook ngắn gọn, hấp dẫn để bán sản phẩm sau:
          Tên: ${product.name}
          Giá: ${formatCurrency(product.price)}
          Danh mục: ${product.category}
          
          Yêu cầu:
          - Có tiêu đề thu hút.
          - Liệt kê 3-4 điểm nổi bật.
          - Có lời kêu gọi hành động (CTA).
          - Sử dụng emoji phù hợp.
          - Ngôn ngữ trẻ trung, năng động.`
      });

      setFbPost(response.text);
    } catch (error) {
      console.error('Error generating FB post:', error);
    } finally {
      setIsGeneratingPost(false);
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
                          onClick={() => generateFacebookPost(p)}
                          className="p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{p.category}</span>
                            <Sparkles size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                          <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(p.price)}</p>
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-medium uppercase">
                            <MessageSquare size={10} /> Click để viết bài FB
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

        {/* Side Panel for FB Post */}
        <AnimatePresence>
          {fbPost && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l border-gray-100 bg-gray-50/30 p-4 overflow-y-auto hidden lg:block"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Facebook size={18} className="text-blue-600" />
                  Bài đăng FB
                </h3>
                <button 
                  onClick={() => setFbPost(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy size={16} onClick={() => copyToClipboard(fbPost)} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-sm whitespace-pre-wrap leading-relaxed relative group">
                {fbPost}
                <button
                  onClick={() => copyToClipboard(fbPost)}
                  className="absolute top-2 right-2 p-2 bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sao chép"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={() => copyToClipboard(fbPost)}
                className="w-full mt-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Copy size={16} /> Sao chép nội dung
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Modal for FB Post */}
        <AnimatePresence>
          {isGeneratingPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Đang sáng tạo nội dung bài viết...</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
