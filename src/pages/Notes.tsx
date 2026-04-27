import React, { useState } from 'react';
import { AppData, Note } from '../types';
import { useAppStore } from '../hooks/useAppStore';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Paperclip, 
  Palette, 
  Clock, 
  Pin,
  MoreVertical,
  ChevronDown,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface NotesProps {
  data: AppData;
}

const COLORS = [
  { name: 'Default', class: 'bg-white border-slate-200' },
  { name: 'Red', class: 'bg-red-50 border-red-200' },
  { name: 'Orange', class: 'bg-orange-50 border-orange-200' },
  { name: 'Yellow', class: 'bg-yellow-50 border-yellow-200' },
  { name: 'Green', class: 'bg-emerald-50 border-emerald-200' },
  { name: 'Teal', class: 'bg-teal-50 border-teal-200' },
  { name: 'Blue', class: 'bg-blue-50 border-blue-200' },
  { name: 'Indigo', class: 'bg-indigo-50 border-indigo-200' },
  { name: 'Purple', class: 'bg-purple-50 border-purple-200' },
  { name: 'Pink', class: 'bg-pink-50 border-pink-200' },
];

export function Notes({ data }: NotesProps) {
  const { addItem, updateItem, deleteItem } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState<Partial<Note>>({
    title: '',
    content: '',
    color: 'Default'
  });

  const notes = data.notes || [];
  const filteredNotes = notes
    .filter(note => 
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      note.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddNote = async () => {
    if (!newNote.content?.trim()) return;

    const id = `note-${Date.now()}`;
    const now = new Date().toISOString();
    
    const noteToAdd: Note = {
      id,
      title: newNote.title || '',
      content: newNote.content,
      color: newNote.color || 'Default',
      createdBy: auth.currentUser?.uid || '',
      createdAt: now,
      updatedAt: now
    };

    try {
      await addItem('notes', noteToAdd);
      setNewNote({ title: '', content: '', color: 'Default' });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;

    try {
      await updateItem('notes', editingNote.id, {
        ...editingNote,
        updatedAt: new Date().toISOString()
      });
      setEditingNote(null);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
      try {
        await deleteItem('notes', id);
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  };

  const handleCopyNote = (content: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getNoteColorClass = (colorName?: string) => {
    const color = COLORS.find(c => c.name === colorName) || COLORS[0];
    return color.class;
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm ghi chú..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 font-bold"
        >
          <Plus size={20} />
          Thêm ghi chú mới
        </button>
      </div>

      {/* Add/Edit Overlay */}
      <AnimatePresence>
        {(isAdding || editingNote) && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20",
                getNoteColorClass(isAdding ? newNote.color : editingNote?.color)
              )}
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black/5 rounded-xl">
                    <Edit3 size={20} className="text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {isAdding ? 'Tạo ghi chú mới' : 'Chỉnh sửa ghi chú'}
                  </h3>
                </div>
                <button 
                  onClick={() => { setIsAdding(false); setEditingNote(null); }}
                  className="p-2 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto space-y-6">
                <input
                  type="text"
                  placeholder="Tiêu đề (không bắt buộc)"
                  className="w-full text-2xl font-black bg-transparent border-none outline-none placeholder:text-slate-400 text-slate-900"
                  value={isAdding ? newNote.title : editingNote?.title}
                  onChange={(e) => isAdding ? setNewNote({...newNote, title: e.target.value}) : setEditingNote(prev => prev ? {...prev, title: e.target.value} : null)}
                />
                <textarea
                  placeholder="Bắt đầu ghi chú..."
                  className="w-full min-h-[350px] bg-transparent border-none outline-none resize-none placeholder:text-slate-400 text-slate-800 leading-relaxed text-xl font-medium"
                  value={isAdding ? newNote.content : editingNote?.content}
                  onChange={(e) => isAdding ? setNewNote({...newNote, content: e.target.value}) : setEditingNote(prev => prev ? {...prev, content: e.target.value} : null)}
                  autoFocus
                />
              </div>

              <div className="p-6 border-t border-black/5 bg-black/5 flex flex-col gap-6">
                <div className="flex flex-wrap gap-2 justify-center">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => isAdding ? setNewNote({...newNote, color: color.name}) : setEditingNote(prev => prev ? {...prev, color: color.name} : null)}
                      className={cn(
                        "w-9 h-9 rounded-full border-4 transition-all hover:scale-125",
                        color.class,
                        (isAdding ? newNote.color === color.name : editingNote?.color === color.name) ? "ring-2 ring-indigo-500 ring-offset-2 scale-110 shadow-lg border-indigo-200" : "border-white"
                      )}
                      title={color.name}
                    />
                  ))}
                </div>

                <div className="flex gap-4 items-center justify-between">
                  {!isAdding && (
                    <button
                      onClick={() => handleCopyNote(editingNote?.content || '', 'modal')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold",
                        copiedId === 'modal' ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm"
                      )}
                    >
                      {copiedId === 'modal' ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      {copiedId === 'modal' ? 'Đã copy!' : 'Copy nội dung'}
                    </button>
                  )}
                  
                  <div className="flex gap-3 ml-auto">
                    <button
                      onClick={() => { setIsAdding(false); setEditingNote(null); }}
                      className="px-6 py-3 rounded-2xl text-base font-bold text-slate-600 hover:bg-black/5 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={isAdding ? handleAddNote : handleUpdateNote}
                      disabled={isAdding ? !newNote.content?.trim() : !editingNote?.content.trim()}
                      className="flex items-center gap-2 px-10 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all font-bold shadow-xl shadow-indigo-200 disabled:opacity-50"
                    >
                      <Save size={20} />
                      {isAdding ? 'Lưu ghi chú' : 'Cập nhật ngay'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setEditingNote(note)}
                className={cn(
                  "group relative p-7 rounded-[24px] border border-transparent shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full min-h-[240px] cursor-pointer overflow-hidden",
                  getNoteColorClass(note.color)
                )}
              >
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-20 transition-opacity">
                  <Notebook size={80} />
                </div>

                {note.title && (
                  <h4 className="text-xl font-extrabold text-slate-900 mb-4 pr-10 leading-tight">
                    {note.title}
                  </h4>
                )}
                
                <div className="text-slate-700 whitespace-pre-wrap flex-1 text-base font-medium leading-relaxed mb-6 line-clamp-6">
                  {note.content}
                </div>

                <div className="mt-auto flex items-center justify-between pt-5 border-t border-black/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock size={14} />
                    {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleCopyNote(note.content, note.id, e)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all shadow-sm",
                        copiedId === note.id ? "bg-emerald-500 text-white" : "bg-white/80 hover:bg-white text-slate-600 border border-slate-100"
                      )}
                      title="Sao chép nội dung"
                    >
                      {copiedId === note.id ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm"
                      title="Xóa ghi chú"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Hover Indicator */}
                <div className="absolute top-4 right-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                  <Edit3 size={16} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
          <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center text-slate-300 shadow-inner rotate-12 group hover:rotate-0 transition-transform duration-500">
            <Notebook size={64} />
          </div>
          <div className="max-w-md space-y-3 px-4">
            <h3 className="text-2xl font-black text-slate-900">Sổ tay ghi chú đang trống</h3>
            <p className="text-slate-500 text-lg font-medium">
              Bạn có thể lưu lại mẫu tin nhắn, địa chỉ hoặc bất kỳ thông tin nào để gửi cho khách nhanh hơn.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all font-black text-lg shadow-xl shadow-indigo-200 mt-6"
          >
            <Plus size={24} />
            Tạo ghi chú quan trọng đầu tiên
          </button>
        </div>
      )}
    </div>
  );
}

const Notebook = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
