import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { User, Message, Group, InternalTask } from '../types';
import { auth } from '../firebase';
import { Send, User as UserIcon, Search, MessageSquare, Plus, Users, CheckSquare, Calendar, Clock, CheckCircle2, Circle, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Messages() {
  const { data, addItem, updateItem } = useAppStore();
  const [selectedChat, setSelectedChat] = useState<{ type: 'direct' | 'group', id: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = auth.currentUser;
  const currentUserData = data.users.find(u => u.uid === currentUser?.uid);
  const isAdmin = currentUserData?.role === 'admin' || currentUser?.email === 'dieuhuu1995@gmail.com';

  const otherUsers = data.users.filter(u => u.uid !== currentUser?.uid && u.approved);
  
  // Filtering users for direct messaging:
  // - Admins can message anyone.
  // - Staff can only message Admins (or in groups).
  const allowedDirectUsers = otherUsers.filter(u => {
    if (isAdmin) return true;
    return u.role === 'admin';
  });

  const filteredUsers = allowedDirectUsers.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.phone && u.phone.includes(searchTerm))
  );

  const myGroups = data.groups.filter(g => g.memberIds.includes(currentUser?.uid || ''));
  const filteredGroups = myGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedUser = selectedChat?.type === 'direct' ? data.users.find(u => u.uid === selectedChat.id) : null;
  const selectedGroup = selectedChat?.type === 'group' ? data.groups.find(g => g.id === selectedChat.id) : null;

  const conversation = data.messages
    .filter(m => {
      if (selectedChat?.type === 'direct') {
        return (m.senderId === currentUser?.uid && m.receiverId === selectedChat.id) ||
               (m.senderId === selectedChat.id && m.receiverId === currentUser?.uid);
      } else if (selectedChat?.type === 'group') {
        return m.groupId === selectedChat.id;
      }
      return false;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  useEffect(() => {
    if (selectedChat?.type === 'direct' && currentUser) {
      const unreadMessages = data.messages.filter(m => 
        m.senderId === selectedChat.id && 
        m.receiverId === currentUser.uid && 
        !m.read
      );
      unreadMessages.forEach(m => {
        updateItem('messages', m.id, { ...m, read: true });
      });
    }
  }, [selectedChat, data.messages, currentUser, updateItem]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat || !currentUser) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.uid,
      senderName: currentUserData?.email || 'Anonymous',
      content: messageText.trim(),
      createdAt: new Date().toISOString(),
      read: false,
      type: 'text'
    };

    if (selectedChat.type === 'direct') {
      newMessage.receiverId = selectedChat.id;
      newMessage.receiverName = selectedUser?.email || '';
    } else {
      newMessage.groupId = selectedChat.id;
    }

    try {
      await addItem('messages', newMessage);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !currentUser) return;

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      memberIds: [...selectedMembers, currentUser.uid],
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString()
    };

    try {
      await addItem('groups', newGroup);
      setGroupName('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      setSelectedChat({ type: 'group', id: newGroup.id });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !taskAssignedTo || !selectedChat || !currentUser) return;

    const taskId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    const newTask: InternalTask = {
      id: taskId,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assignedTo: taskAssignedTo,
      dueDate: taskDueDate,
      status: 'pending',
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      messageId: messageId
    };

    const newMessage: Message = {
      id: messageId,
      senderId: currentUser.uid,
      senderName: currentUserData?.email || 'Anonymous',
      content: `Giao việc: ${taskTitle}`,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'task',
      taskId: taskId
    };

    if (selectedChat.type === 'direct') {
      newMessage.receiverId = selectedChat.id;
      newMessage.receiverName = selectedUser?.email || '';
    } else {
      newMessage.groupId = selectedChat.id;
    }

    try {
      await addItem('internalTasks', newTask);
      await addItem('messages', newMessage);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskAssignedTo('');
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const toggleTaskStatus = async (task: InternalTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateItem('internalTasks', task.id, { ...task, status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getUnreadCount = (chatId: string, type: 'direct' | 'group') => {
    return data.messages.filter(m => {
      if (type === 'direct') {
        return m.senderId === chatId && m.receiverId === currentUser?.uid && !m.read;
      } else {
        return m.groupId === chatId && m.senderId !== currentUser?.uid && !m.read;
      }
    }).length;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tin nhắn nội bộ</h2>
              {isAdmin && (
                <button 
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Tạo nhóm mới"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Groups Section */}
            {filteredGroups.length > 0 && (
              <div className="p-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Nhóm</p>
                {filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedChat({ type: 'group', id: group.id })}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors mb-1 ${selectedChat?.id === group.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="font-medium text-sm text-gray-900 truncate">{group.name}</p>
                      <p className="text-[10px] text-gray-500">{group.memberIds.length} thành viên</p>
                    </div>
                    {getUnreadCount(group.id, 'group') > 0 && (
                      <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {getUnreadCount(group.id, 'group')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Direct Messages Section */}
            <div className="p-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Trực tiếp</p>
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-xs italic">
                  Không có nhân viên nào
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => setSelectedChat({ type: 'direct', id: user.uid })}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors mb-1 ${selectedChat?.id === user.uid ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="font-medium text-sm text-gray-900 truncate">{user.email}</p>
                      <p className="text-[10px] text-gray-500">{user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
                    </div>
                    {getUnreadCount(user.uid, 'direct') > 0 && (
                      <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {getUnreadCount(user.uid, 'direct')}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-gray-50/30 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className={`w-10 h-10 rounded-${selectedChat.type === 'group' ? 'xl' : 'full'} ${selectedChat.type === 'group' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-semibold`}>
                    {selectedChat.type === 'group' ? <Users className="w-5 h-5" /> : (selectedUser?.email.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm md:text-base truncate max-w-[120px] md:max-w-none">
                      {selectedChat.type === 'group' ? selectedGroup?.name : selectedUser?.email}
                    </p>
                    <p className="text-[10px] md:text-xs text-green-500">
                      {selectedChat.type === 'group' ? `${selectedGroup?.memberIds.length} thành viên` : 'Đang hoạt động'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowCreateTask(true)}
                    className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-[10px] md:text-xs font-medium"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Giao việc</span>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversation.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Bắt đầu cuộc trò chuyện</p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser?.uid;
                    const showDate = idx === 0 || 
                      format(new Date(msg.createdAt), 'dd/MM/yyyy') !== 
                      format(new Date(conversation[idx-1].createdAt), 'dd/MM/yyyy');
                    
                    const task = msg.type === 'task' ? data.internalTasks.find(t => t.id === msg.taskId) : null;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] text-gray-500 font-medium">
                              {format(new Date(msg.createdAt), 'EEEE, dd MMMM', { locale: vi })}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'order-1' : 'order-2'}`}>
                            {!isMe && selectedChat.type === 'group' && (
                              <p className="text-[10px] text-gray-500 mb-1 ml-1">{msg.senderName}</p>
                            )}
                            
                            {msg.type === 'task' && task ? (
                              <div className={`p-3 md:p-4 rounded-2xl border ${
                                isMe ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'
                              } shadow-sm min-w-[200px] md:min-w-[240px]`}>
                                <div className="flex items-start gap-2 md:gap-3">
                                  <button 
                                    onClick={() => toggleTaskStatus(task)}
                                    className={`mt-1 transition-colors ${task.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-blue-500'}`}
                                  >
                                    {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`font-semibold text-xs md:text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-[10px] md:text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 md:gap-3 mt-3">
                                      <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-gray-400">
                                        <UserIcon className="w-3 h-3" />
                                        <span className="truncate max-w-[60px]">{data.users.find(u => u.uid === task.assignedTo)?.email.split('@')[0] || 'N/A'}</span>
                                      </div>
                                      {task.dueDate && (
                                        <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-amber-600 font-medium">
                                          <Calendar className="w-3 h-3" />
                                          {format(new Date(task.dueDate), 'dd/MM')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3 rounded-2xl text-sm ${
                                isMe 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                              }`}>
                                {msg.content}
                              </div>
                            )}
                            
                            <p className={`text-[10px] mt-1 text-gray-400 ${isMe ? 'text-right' : 'text-left'}`}>
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-lg font-medium text-gray-900">Chọn cuộc trò chuyện</p>
              <p className="text-sm">để bắt đầu trao đổi công việc</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Tạo nhóm mới</h3>
              <button onClick={() => setShowCreateGroup(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tên nhóm</label>
                <input
                  type="text"
                  placeholder="Nhập tên nhóm..."
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chọn thành viên</label>
                <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-gray-50 rounded-xl">
                  {otherUsers.map(user => (
                    <label key={user.uid} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedMembers.includes(user.uid)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMembers([...selectedMembers, user.uid]);
                          else setSelectedMembers(selectedMembers.filter(id => id !== user.uid));
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-[10px] text-gray-500">{user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Giao việc mới</h3>
              <button onClick={() => setShowCreateTask(false)} className="text-gray-400 hover:text-gray-600">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tiêu đề công việc</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề..."
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mô tả chi tiết</label>
                <textarea
                  placeholder="Nhập mô tả (không bắt buộc)..."
                  className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Người thực hiện</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                  >
                    <option value="">Chọn người...</option>
                    {selectedChat?.type === 'group' ? (
                      selectedGroup?.memberIds.map(id => {
                        const u = data.users.find(user => user.uid === id);
                        return u ? <option key={id} value={id}>{u.email}</option> : null;
                      })
                    ) : (
                      <>
                        <option value={currentUser?.uid}>{currentUser?.email} (Tôi)</option>
                        <option value={selectedUser?.uid}>{selectedUser?.email}</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowCreateTask(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleCreateTask}
                disabled={!taskTitle.trim() || !taskAssignedTo}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                Giao việc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
