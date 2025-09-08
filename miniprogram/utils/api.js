// utils/api.js - API调用封装模块
const app = getApp();

class API {
  constructor() {
    this.baseURL = app.globalData.apiBaseUrl;
    this.timeout = 10000; // 10秒超时
  }

  /**
   * 通用请求方法
   * @param {string} url - 请求URL
   * @param {object} options - 请求配置
   * @returns {Promise} 返回Promise对象
   */
  request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const {
        method = 'GET',
        data = {},
        header = {},
        timeout = this.timeout,
        showLoading = false,
        loadingText = '加载中...'
      } = options;

      // 显示加载提示
      if (showLoading) {
        wx.showLoading({
          title: loadingText,
          mask: true
        });
      }

      // 构建完整URL
      const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

      wx.request({
        url: fullURL,
        method: method.toUpperCase(),
        data: data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        timeout: timeout,
        success: (res) => {
          if (showLoading) {
            wx.hideLoading();
          }

          const { statusCode, data } = res;
          
          if (statusCode === 200) {
            resolve(data);
          } else {
            const errorMsg = data.error || data.message || `请求失败 (${statusCode})`;
            console.error('API请求错误:', errorMsg);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          if (showLoading) {
            wx.hideLoading();
          }

          let errorMessage = '网络连接失败';
          
          if (err.errMsg) {
            if (err.errMsg.includes('timeout')) {
              errorMessage = '请求超时，请检查网络连接';
            } else if (err.errMsg.includes('fail')) {
              errorMessage = '网络请求失败，请稍后重试';
            }
          }

          console.error('API请求失败:', err);
          reject(new Error(errorMessage));
        }
      });
    });
  }

  /**
   * GET请求
   * @param {string} url - 请求URL
   * @param {object} params - 查询参数
   * @param {object} options - 其他选项
   * @returns {Promise}
   */
  get(url, params = {}, options = {}) {
    // 将参数转换为查询字符串
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullURL = queryString ? `${url}?${queryString}` : url;
    
    return this.request(fullURL, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   * @param {string} url - 请求URL
   * @param {object} data - 请求数据
   * @param {object} options - 其他选项
   * @returns {Promise}
   */
  post(url, data = {}, options = {}) {
    return this.request(url, { ...options, method: 'POST', data });
  }

  /**
   * PUT请求
   * @param {string} url - 请求URL
   * @param {object} data - 请求数据
   * @param {object} options - 其他选项
   * @returns {Promise}
   */
  put(url, data = {}, options = {}) {
    return this.request(url, { ...options, method: 'PUT', data });
  }

  /**
   * DELETE请求
   * @param {string} url - 请求URL
   * @param {object} options - 其他选项
   * @returns {Promise}
   */
  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // ============ AI对话相关接口 ============

  /**
   * 发送AI对话消息
   * @param {string} message - 用户消息
   * @param {string} conversationId - 对话ID（可选）
   * @param {object} inputs - 输入参数（可选）
   * @returns {Promise}
   */
  async chatWithAI(message, conversationId = null, inputs = {}) {
    try {
      const data = await this.post('/dify/chat', {
        query: message,
        conversation_id: conversationId,
        inputs: inputs,
        user: this.getUserId()
      }, {
        showLoading: true,
        loadingText: 'AI思考中...'
      });

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取对话历史
   * @param {string} conversationId - 对话ID
   * @returns {Promise}
   */
  async getConversationHistory(conversationId) {
    try {
      const data = await this.get(`/dify/conversations/${conversationId}`);
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ 旅行计划相关接口 ============

  /**
   * 保存旅行计划
   * @param {object} tripData - 旅行计划数据
   * @returns {Promise}
   */
  async saveTripPlan(tripData) {
    try {
      const data = await this.post('/travel/save', {
        ...tripData,
        user_id: this.getUserId()
      }, {
        showLoading: true,
        loadingText: '保存中...'
      });

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取旅行计划列表
   * @param {string} status - 状态筛选（可选）
   * @returns {Promise}
   */
  async getTripList(status = null) {
    try {
      const params = { user_id: this.getUserId() };
      if (status) {
        params.status = status;
      }

      const data = await this.get('/travel/list', params);
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除旅行计划
   * @param {string} tripId - 旅行计划ID
   * @returns {Promise}
   */
  async deleteTripPlan(tripId) {
    try {
      const data = await this.delete(`/travel/${tripId}`, {
        showLoading: true,
        loadingText: '删除中...'
      });

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============ 辅助方法 ============

  /**
   * 获取用户ID（从本地存储或生成）
   * @returns {string}
   */
  getUserId() {
    let userId = wx.getStorageSync('userId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      wx.setStorageSync('userId', userId);
    }
    return userId;
  }

  /**
   * 处理API错误并显示用户友好的提示
   * @param {Error} error - 错误对象
   * @param {string} defaultMessage - 默认错误消息
   */
  handleError(error, defaultMessage = '操作失败，请稍后重试') {
    const errorMessage = error.message || defaultMessage;
    wx.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000
    });
  }

  /**
   * 显示成功提示
   * @param {string} message - 成功消息
   */
  showSuccess(message = '操作成功') {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: 2000
    });
  }

  /**
   * 检查网络状态
   * @returns {Promise<boolean>}
   */
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none';
          if (!isConnected) {
            wx.showToast({
              title: '网络连接异常',
              icon: 'none',
              duration: 2000
            });
          }
          resolve(isConnected);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 上传文件
   * @param {string} filePath - 文件路径
   * @param {string} name - 文件字段名
   * @param {object} formData - 额外的表单数据
   * @returns {Promise}
   */
  uploadFile(filePath, name = 'file', formData = {}) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}/upload`,
        filePath: filePath,
        name: name,
        formData: formData,
        header: {
          'Content-Type': 'multipart/form-data'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data);
              resolve(data);
            } catch (e) {
              reject(new Error('响应数据格式错误'));
            }
          } else {
            reject(new Error(`上传失败 (${res.statusCode})`));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '上传失败'));
        }
      });
    });
  }
}

// 创建API实例
const api = new API();

module.exports = api;