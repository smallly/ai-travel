import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Plus, Trash2, Edit3, X, Check, Search } from 'lucide-react';
import { chatApi } from '../services/api';

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  dify_conversation_id?: string;
}

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string | null, title: string) => void;
  onNewConversation: () => void;
  currentConversationId: string | null;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  onNewConversation,
  currentConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 加载对话列表
  const loadConversations = async (useCache = false) => {
    // 简单缓存：如果已有数据且要求使用缓存，则不重新加载
    if (useCache && conversations.length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await chatApi.getConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('加载对话列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除对话
  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await chatApi.deleteConversation(conversationId);
      if (response.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        // 如果删除的是当前对话，则创建新对话
        if (currentConversationId === conversationId) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
    }
  };

  // 开始编辑标题
  const startEditing = (conversation: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  // 保存标题编辑
  const saveEdit = async (conversationId: string) => {
    if (!editTitle.trim()) {
      cancelEdit();
      return;
    }

    try {
      const response = await chatApi.updateConversation(conversationId, editTitle.trim());
      if (response.success && response.data) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === conversationId
              ? { ...conv, title: response.data.title }
              : conv
          )
        );
        setEditingId(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('更新对话标题失败:', error);
      cancelEdit();
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(conversationId);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // 选择对话
  const handleSelectConversation = (conversation: Conversation) => {
    onSelectConversation(conversation.id, conversation.title);
    onClose();
  };

  // 过滤对话列表
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    return conversations.filter(conversation =>
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // 创建新对话
  const handleNewConversation = () => {
    onNewConversation();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      // 首次打开时使用缓存，减少重复请求
      loadConversations(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-start z-[9999]">
      <div className="bg-white h-full w-4/5 max-w-sm shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">对话历史</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 新建对话按钮 */}
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">新建对话</span>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索对话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-200 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              {/* 主要加载动画 */}
              <div className="relative">
                <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-purple-300 rounded-full animate-spin animate-reverse"></div>
              </div>

              {/* 加载文本 */}
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm font-medium">正在加载对话历史</p>
                <div className="flex items-center justify-center mt-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>

              {/* 骨架屏效果 */}
              <div className="w-full mt-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">还没有对话记录</p>
              <p className="text-gray-400 text-xs mt-1">开始新对话来创建历史记录</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">没有找到匹配的对话</p>
              <p className="text-gray-400 text-xs mt-1">尝试使用其他关键词搜索</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                    currentConversationId === conversation.id
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:shadow-sm'
                  }`}
                >
                  {/* 对话信息 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      {editingId === conversation.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, conversation.id)}
                            onBlur={() => saveEdit(conversation.id)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
                            autoFocus
                            maxLength={100}
                          />
                          <button
                            onClick={() => saveEdit(conversation.id)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-sm font-medium text-gray-800 truncate">
                          {conversation.title}
                        </h4>
                      )}

                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{conversation.message_count} 条消息</span>
                        <span>{new Date(conversation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEditing(conversation, e)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑标题"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除对话"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 当前对话指示器 */}
                  {currentConversationId === conversation.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 点击遮罩关闭 */}
      <div
        className="flex-1 h-full"
        onClick={onClose}
      />
    </div>
  );
};

export default ConversationHistory;