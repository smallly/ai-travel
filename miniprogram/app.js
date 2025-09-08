// app.js
App({
  globalData: {
    userInfo: null,
    apiBaseUrl: 'https://yourdomain.com/api', // 替换为您的服务器域名
    version: '1.0.0'
  },
  
  onLaunch() {
    console.log('小程序启动');
    // 检查小程序版本更新
    this.checkForUpdate();
    // 初始化用户信息
    this.initUserInfo();
  },

  onShow() {
    console.log('小程序显示');
  },

  onHide() {
    console.log('小程序隐藏');
  },

  onError(msg) {
    console.error('小程序错误:', msg);
  },

  // 检查版本更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请检查网络连接',
          showCancel: false
        });
      });
    }
  },

  // 初始化用户信息
  initUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  // 全局错误处理
  showError(title = '操作失败', content = '请稍后重试') {
    wx.showModal({
      title,
      content,
      showCancel: false
    });
  },

  // 全局成功提示
  showSuccess(title = '操作成功') {
    wx.showToast({
      title,
      icon: 'success',
      duration: 2000
    });
  },

  // 全局加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading();
  }
});