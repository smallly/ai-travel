// utils/storage.js - 本地存储工具类
class Storage {
  
  /**
   * 设置存储数据
   * @param {string} key - 存储键
   * @param {*} data - 存储数据
   * @returns {boolean} 是否成功
   */
  static set(key, data) {
    try {
      wx.setStorageSync(key, data);
      return true;
    } catch (error) {
      console.error('存储数据失败:', key, error);
      return false;
    }
  }

  /**
   * 获取存储数据
   * @param {string} key - 存储键
   * @param {*} defaultValue - 默认值
   * @returns {*} 存储的数据
   */
  static get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key);
      return data || defaultValue;
    } catch (error) {
      console.error('获取存储数据失败:', key, error);
      return defaultValue;
    }
  }

  /**
   * 删除存储数据
   * @param {string} key - 存储键
   * @returns {boolean} 是否成功
   */
  static remove(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (error) {
      console.error('删除存储数据失败:', key, error);
      return false;
    }
  }

  /**
   * 清空所有存储数据
   * @returns {boolean} 是否成功
   */
  static clear() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (error) {
      console.error('清空存储数据失败:', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   * @returns {object} 存储信息
   */
  static getInfo() {
    try {
      return wx.getStorageInfoSync();
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return { keys: [], currentSize: 0, limitSize: 0 };
    }
  }

  // ============ 旅行地点相关 ============

  /**
   * 保存旅行地点
   * @param {object} location - 地点信息
   * @returns {boolean} 是否成功
   */
  static saveLocation(location) {
    try {
      const locations = this.getLocations();
      const newLocation = {
        ...location,
        id: location.id || Date.now().toString(),
        savedAt: new Date().toISOString(),
        savedDate: this.formatDate(new Date())
      };
      
      locations.push(newLocation);
      return this.set('myLocations', locations);
    } catch (error) {
      console.error('保存地点失败:', error);
      return false;
    }
  }

  /**
   * 批量保存旅行地点
   * @param {array} locations - 地点列表
   * @returns {boolean} 是否成功
   */
  static saveLocations(locations) {
    try {
      const existingLocations = this.getLocations();
      const newLocations = locations.map(location => ({
        ...location,
        id: location.id || Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        savedAt: new Date().toISOString(),
        savedDate: this.formatDate(new Date())
      }));
      
      const allLocations = [...existingLocations, ...newLocations];
      return this.set('myLocations', allLocations);
    } catch (error) {
      console.error('批量保存地点失败:', error);
      return false;
    }
  }

  /**
   * 获取所有旅行地点
   * @returns {array} 地点列表
   */
  static getLocations() {
    return this.get('myLocations', []);
  }

  /**
   * 删除旅行地点
   * @param {string} locationId - 地点ID
   * @returns {boolean} 是否成功
   */
  static removeLocation(locationId) {
    try {
      const locations = this.getLocations();
      const filteredLocations = locations.filter(loc => loc.id !== locationId);
      return this.set('myLocations', filteredLocations);
    } catch (error) {
      console.error('删除地点失败:', error);
      return false;
    }
  }

  /**
   * 清空所有地点
   * @returns {boolean} 是否成功
   */
  static clearLocations() {
    return this.set('myLocations', []);
  }

  // ============ 旅行计划相关 ============

  /**
   * 保存旅行计划
   * @param {object} tripPlan - 旅行计划
   * @returns {boolean} 是否成功
   */
  static saveTripPlan(tripPlan) {
    try {
      const trips = this.getTripPlans();
      const newTrip = {
        ...tripPlan,
        id: tripPlan.id || Date.now().toString(),
        createdAt: tripPlan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      trips.push(newTrip);
      return this.set('tripPlans', trips);
    } catch (error) {
      console.error('保存旅行计划失败:', error);
      return false;
    }
  }

  /**
   * 更新旅行计划
   * @param {string} tripId - 旅行计划ID
   * @param {object} updates - 更新的字段
   * @returns {boolean} 是否成功
   */
  static updateTripPlan(tripId, updates) {
    try {
      const trips = this.getTripPlans();
      const index = trips.findIndex(trip => trip.id === tripId);
      
      if (index !== -1) {
        trips[index] = {
          ...trips[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        return this.set('tripPlans', trips);
      }
      
      return false;
    } catch (error) {
      console.error('更新旅行计划失败:', error);
      return false;
    }
  }

  /**
   * 获取所有旅行计划
   * @returns {array} 旅行计划列表
   */
  static getTripPlans() {
    return this.get('tripPlans', []);
  }

  /**
   * 根据ID获取旅行计划
   * @param {string} tripId - 旅行计划ID
   * @returns {object|null} 旅行计划
   */
  static getTripPlan(tripId) {
    const trips = this.getTripPlans();
    return trips.find(trip => trip.id === tripId) || null;
  }

  /**
   * 删除旅行计划
   * @param {string} tripId - 旅行计划ID
   * @returns {boolean} 是否成功
   */
  static removeTripPlan(tripId) {
    try {
      const trips = this.getTripPlans();
      const filteredTrips = trips.filter(trip => trip.id !== tripId);
      return this.set('tripPlans', filteredTrips);
    } catch (error) {
      console.error('删除旅行计划失败:', error);
      return false;
    }
  }

  // ============ 用户信息相关 ============

  /**
   * 保存用户信息
   * @param {object} userInfo - 用户信息
   * @returns {boolean} 是否成功
   */
  static saveUserInfo(userInfo) {
    return this.set('userInfo', {
      ...userInfo,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 获取用户信息
   * @returns {object|null} 用户信息
   */
  static getUserInfo() {
    return this.get('userInfo', null);
  }

  /**
   * 删除用户信息
   * @returns {boolean} 是否成功
   */
  static removeUserInfo() {
    return this.remove('userInfo');
  }

  // ============ 对话历史相关 ============

  /**
   * 保存对话历史
   * @param {string} conversationId - 对话ID
   * @param {array} messages - 消息列表
   * @returns {boolean} 是否成功
   */
  static saveConversation(conversationId, messages) {
    try {
      const conversations = this.getConversations();
      const existingIndex = conversations.findIndex(conv => conv.id === conversationId);
      
      const conversation = {
        id: conversationId,
        messages: messages,
        updatedAt: new Date().toISOString(),
        messageCount: messages.length
      };
      
      if (existingIndex !== -1) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      return this.set('conversations', conversations);
    } catch (error) {
      console.error('保存对话失败:', error);
      return false;
    }
  }

  /**
   * 获取所有对话历史
   * @returns {array} 对话列表
   */
  static getConversations() {
    return this.get('conversations', []);
  }

  /**
   * 获取指定对话
   * @param {string} conversationId - 对话ID
   * @returns {object|null} 对话数据
   */
  static getConversation(conversationId) {
    const conversations = this.getConversations();
    return conversations.find(conv => conv.id === conversationId) || null;
  }

  /**
   * 删除对话历史
   * @param {string} conversationId - 对话ID
   * @returns {boolean} 是否成功
   */
  static removeConversation(conversationId) {
    try {
      const conversations = this.getConversations();
      const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
      return this.set('conversations', filteredConversations);
    } catch (error) {
      console.error('删除对话失败:', error);
      return false;
    }
  }

  /**
   * 清空所有对话历史
   * @returns {boolean} 是否成功
   */
  static clearConversations() {
    return this.set('conversations', []);
  }

  // ============ 应用设置相关 ============

  /**
   * 保存应用设置
   * @param {object} settings - 设置数据
   * @returns {boolean} 是否成功
   */
  static saveSettings(settings) {
    const currentSettings = this.getSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    return this.set('appSettings', newSettings);
  }

  /**
   * 获取应用设置
   * @returns {object} 设置数据
   */
  static getSettings() {
    return this.get('appSettings', {
      theme: 'light',
      language: 'zh-CN',
      autoSaveLocation: true,
      showWelcomeMessage: true,
      mapType: 'standard'
    });
  }

  /**
   * 获取指定设置
   * @param {string} key - 设置键
   * @param {*} defaultValue - 默认值
   * @returns {*} 设置值
   */
  static getSetting(key, defaultValue = null) {
    const settings = this.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  /**
   * 更新指定设置
   * @param {string} key - 设置键
   * @param {*} value - 设置值
   * @returns {boolean} 是否成功
   */
  static setSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    return this.saveSettings(settings);
  }

  // ============ 工具方法 ============

  /**
   * 格式化日期
   * @param {Date} date - 日期对象
   * @returns {string} 格式化的日期字符串
   */
  static formatDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (inputDate.getTime() === today.getTime()) {
      return '今天';
    } else if (inputDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      const diffDays = Math.floor((today - inputDate) / (24 * 60 * 60 * 1000));
      if (diffDays > 0 && diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    }
  }

  /**
   * 数据迁移
   * @param {string} oldKey - 旧键名
   * @param {string} newKey - 新键名
   * @returns {boolean} 是否成功
   */
  static migrate(oldKey, newKey) {
    try {
      const oldData = this.get(oldKey);
      if (oldData) {
        this.set(newKey, oldData);
        this.remove(oldKey);
      }
      return true;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return false;
    }
  }

  /**
   * 数据备份
   * @returns {object} 备份数据
   */
  static backup() {
    try {
      return {
        userInfo: this.getUserInfo(),
        myLocations: this.getLocations(),
        tripPlans: this.getTripPlans(),
        conversations: this.getConversations(),
        appSettings: this.getSettings(),
        backupTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('数据备份失败:', error);
      return null;
    }
  }

  /**
   * 数据恢复
   * @param {object} backupData - 备份数据
   * @returns {boolean} 是否成功
   */
  static restore(backupData) {
    try {
      if (backupData.userInfo) {
        this.saveUserInfo(backupData.userInfo);
      }
      if (backupData.myLocations) {
        this.set('myLocations', backupData.myLocations);
      }
      if (backupData.tripPlans) {
        this.set('tripPlans', backupData.tripPlans);
      }
      if (backupData.conversations) {
        this.set('conversations', backupData.conversations);
      }
      if (backupData.appSettings) {
        this.set('appSettings', backupData.appSettings);
      }
      return true;
    } catch (error) {
      console.error('数据恢复失败:', error);
      return false;
    }
  }
}

module.exports = Storage;