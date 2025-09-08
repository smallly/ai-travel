// pages/chat/index.js
const api = require('../../utils/api.js');

Page({
  data: {
    messages: [],
    inputValue: '',
    isTyping: false,
    conversationId: null,
    scrollTop: 0,
    scrollIntoView: '',
    showScrollToBottom: false
  },

  onLoad(options) {
    console.log('聊天页面加载', options);
    this.initChat();
  },

  onShow() {
    // 页面显示时滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 200);
  },

  /**
   * 初始化聊天
   */
  initChat() {
    // 添加欢迎消息
    const welcomeMessage = {
      id: 'welcome_' + Date.now(),
      content: '你好！我是你的AI旅行助手 🤖✨\n\n🎯 我能为你做什么：\n• 🔗 解析小红书、大众点评等旅行链接\n• 📍 提取并保存地点信息\n• 🗺️ 制定个性化旅行计划\n• 💡 推荐当地特色和隐藏美食\n• 🚗 提供交通和住宿建议\n\n快发送一个旅行链接或告诉我你想去哪里吧！',
      isAI: true,
      timestamp: new Date(),
      isWelcome: true
    };

    this.setData({
      messages: [welcomeMessage]
    });
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  async onSendMessage() {
    const { inputValue } = this.data;
    
    if (!inputValue.trim()) {
      wx.showToast({
        title: '请输入消息',
        icon: 'none'
      });
      return;
    }

    // 创建用户消息
    const userMessage = {
      id: 'user_' + Date.now(),
      content: inputValue,
      isAI: false,
      timestamp: new Date()
    };

    // 添加用户消息到列表
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isTyping: true
    });

    // 滚动到底部
    this.scrollToBottom();

    try {
      // 调用AI接口
      const response = await api.chatWithAI(inputValue, this.data.conversationId);
      
      if (response.success && response.data) {
        // 更新对话ID
        if (!this.data.conversationId) {
          this.setData({
            conversationId: response.data.conversation_id
          });
        }

        // 创建AI回复消息
        const aiMessage = {
          id: response.data.ai_message.id,
          content: this.cleanAIText(response.data.ai_message.content),
          isAI: true,
          timestamp: new Date(response.data.ai_message.timestamp),
          attractions: response.data.attractions || []
        };

        // 添加AI回复到消息列表
        this.setData({
          messages: [...this.data.messages, aiMessage]
        });

      } else {
        // 显示错误消息
        const errorMessage = {
          id: 'error_' + Date.now(),
          content: `抱歉，服务暂时不可用：${response.error || '未知错误'}`,
          isAI: true,
          timestamp: new Date()
        };
        
        this.setData({
          messages: [...this.data.messages, errorMessage]
        });
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 网络错误处理
      const errorMessage = {
        id: 'error_' + Date.now(),
        content: '网络连接失败，请检查您的网络连接或稍后重试。',
        isAI: true,
        timestamp: new Date()
      };
      
      this.setData({
        messages: [...this.data.messages, errorMessage]
      });
    } finally {
      this.setData({
        isTyping: false
      });
      
      // 滚动到底部
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  },

  /**
   * 清理AI文本，移除技术信息
   */
  cleanAIText(text) {
    let cleanedText = text;
    
    // 移除经纬度信息的各种格式
    const coordinatePatterns = [
      /经纬度[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      /纬度[：:]?\s*[0-9.-]+/g,
      /经度[：:]?\s*[0-9.-]+/g,
      /坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      /\([^)]*经度[^)]*\)/g,
      /\([^)]*纬度[^)]*\)/g,
      /\([^)]*坐标[^)]*\)/g,
      /\b[0-9]{1,3}\.[0-9]{5,8}\s*[,，]\s*[0-9]{1,3}\.[0-9]{5,8}\b/g,
      /GPS[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      /位置[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      /地理坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
    ];
    
    coordinatePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '');
    });
    
    // 清理多余格式
    cleanedText = cleanedText
      .replace(/^[：:]\s*$/gm, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s*[：:]\s*/gm, '')
      .replace(/\s*[：:]\s*$/gm, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n');
    
    return cleanedText;
  },

  /**
   * 添加景点到行程
   */
  onAddAttraction(e) {
    const { attraction } = e.currentTarget.dataset;
    
    // 这里可以调用添加景点的逻辑
    console.log('添加景点:', attraction);
    
    wx.showToast({
      title: '已添加到行程',
      icon: 'success'
    });
  },

  /**
   * 批量添加景点
   */
  onAddAllAttractions(e) {
    const { attractions } = e.currentTarget.dataset;
    
    console.log('批量添加景点:', attractions);
    
    wx.showToast({
      title: `已添加${attractions.length}个景点`,
      icon: 'success'
    });
  },

  /**
   * 导航到景点
   */
  onNavigateToAttraction(e) {
    const { attraction } = e.currentTarget.dataset;
    
    if (attraction.coordinates) {
      const { lat, lng } = attraction.coordinates;
      wx.openLocation({
        latitude: lat,
        longitude: lng,
        name: attraction.name,
        address: attraction.address,
        scale: 16
      });
    } else {
      wx.showToast({
        title: '位置信息不完整',
        icon: 'none'
      });
    }
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    if (this.data.messages.length > 0) {
      const lastMessageId = this.data.messages[this.data.messages.length - 1].id;
      this.setData({
        scrollIntoView: lastMessageId
      });
    }
  },

  /**
   * 监听滚动
   */
  onScroll(e) {
    const { scrollTop, scrollHeight, height } = e.detail;
    const showScrollToBottom = scrollTop < scrollHeight - height - 100;
    
    if (showScrollToBottom !== this.data.showScrollToBottom) {
      this.setData({
        showScrollToBottom
      });
    }
  },

  /**
   * 点击滚动到底部按钮
   */
  onScrollToBottomTap() {
    this.scrollToBottom();
  },

  /**
   * 清空聊天记录
   */
  onClearChat() {
    wx.showModal({
      title: '清空聊天记录',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            conversationId: null
          });
          this.initChat();
        }
      }
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: 'AI旅行助手 - 让AI成为你的旅行伙伴',
      path: '/pages/chat/index',
      imageUrl: '/images/share-chat.jpg'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: 'AI旅行助手 - 智能规划你的旅行',
      query: '',
      imageUrl: '/images/share-timeline.jpg'
    };
  }
});