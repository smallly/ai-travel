// pages/index/index.js (行程主页)
const api = require('../../utils/api.js');

Page({
  data: {
    currentTab: 'pending', // pending, planning, completed
    tripPlans: {
      pending: [],
      planning: [],
      completed: []
    },
    myLocations: [],
    isMapFullscreen: false,
    mapCenter: {
      latitude: 39.908823,
      longitude: 116.397470
    },
    mapMarkers: [],
    loading: false
  },

  onLoad(options) {
    console.log('行程页面加载', options);
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadTripPlans();
    this.loadMyLocations();
  },

  onPullDownRefresh() {
    this.loadTripPlans().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 初始化页面
   */
  async initPage() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadTripPlans(),
        this.loadMyLocations()
      ]);
    } catch (error) {
      console.error('初始化页面失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载旅行计划列表
   */
  async loadTripPlans() {
    try {
      const response = await api.getTripList();
      
      if (response.success) {
        const tripPlans = {
          pending: response.data.filter(trip => trip.status === 'upcoming'),
          planning: response.data.filter(trip => trip.status === 'planning'), 
          completed: response.data.filter(trip => trip.status === 'completed')
        };
        
        this.setData({ tripPlans });
      } else {
        console.error('加载旅行计划失败:', response.error);
      }
    } catch (error) {
      console.error('加载旅行计划异常:', error);
    }
  },

  /**
   * 加载我的地点
   */
  loadMyLocations() {
    try {
      const locations = wx.getStorageSync('myLocations') || [];
      const markers = this.convertLocationsToMarkers(locations);
      
      this.setData({
        myLocations: locations,
        mapMarkers: markers
      });
      
      // 如果有地点，调整地图中心
      if (locations.length > 0) {
        const center = this.calculateCenter(locations);
        this.setData({ mapCenter: center });
      }
    } catch (error) {
      console.error('加载我的地点失败:', error);
    }
  },

  /**
   * 将地点转换为地图标记
   */
  convertLocationsToMarkers(locations) {
    return locations.map((location, index) => ({
      id: location.id,
      latitude: location.realCoordinates?.lat || location.coordinates?.lat || 39.908823,
      longitude: location.realCoordinates?.lng || location.coordinates?.lng || 116.397470,
      iconPath: '/images/marker-default.png',
      width: 40,
      height: 40,
      title: location.name,
      callout: {
        content: location.name,
        padding: 10,
        borderRadius: 8,
        bgColor: '#ffffff',
        color: '#333333',
        fontSize: 14,
        display: 'BYCLICK'
      }
    }));
  },

  /**
   * 计算地点中心坐标
   */
  calculateCenter(locations) {
    if (locations.length === 0) {
      return { latitude: 39.908823, longitude: 116.397470 };
    }
    
    let totalLat = 0;
    let totalLng = 0;
    let validCount = 0;
    
    locations.forEach(location => {
      const coords = location.realCoordinates || location.coordinates;
      if (coords && coords.lat && coords.lng) {
        totalLat += coords.lat;
        totalLng += coords.lng;
        validCount++;
      }
    });
    
    if (validCount === 0) {
      return { latitude: 39.908823, longitude: 116.397470 };
    }
    
    return {
      latitude: totalLat / validCount,
      longitude: totalLng / validCount
    };
  },

  /**
   * 切换Tab
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  /**
   * 查看旅行计划详情
   */
  onViewTripDetail(e) {
    const { trip } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/trip-detail/index?id=${trip.id}&status=${trip.status}`
    });
  },

  /**
   * 地图标记点击
   */
  onMarkerTap(e) {
    const { markerId } = e.detail;
    const location = this.data.myLocations.find(loc => loc.id === markerId);
    
    if (location) {
      this.showLocationActions(location);
    }
  },

  /**
   * 显示地点操作菜单
   */
  showLocationActions(location) {
    wx.showActionSheet({
      itemList: ['导航到此地点', '查看详情', '删除地点'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.navigateToLocation(location);
            break;
          case 1:
            this.showLocationDetail(location);
            break;
          case 2:
            this.confirmDeleteLocation(location);
            break;
        }
      }
    });
  },

  /**
   * 导航到地点
   */
  navigateToLocation(location) {
    const coords = location.realCoordinates || location.coordinates;
    
    if (coords && coords.lat && coords.lng) {
      wx.openLocation({
        latitude: coords.lat,
        longitude: coords.lng,
        name: location.name,
        address: location.address,
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
   * 显示地点详情
   */
  showLocationDetail(location) {
    wx.showModal({
      title: location.name,
      content: `地址: ${location.address}\n保存时间: ${location.savedDate}`,
      showCancel: false,
      confirmText: '确定'
    });
  },

  /**
   * 确认删除地点
   */
  confirmDeleteLocation(location) {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${location.name}」吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteLocation(location.id);
        }
      }
    });
  },

  /**
   * 删除地点
   */
  deleteLocation(locationId) {
    try {
      const newLocations = this.data.myLocations.filter(loc => loc.id !== locationId);
      
      // 更新本地存储
      wx.setStorageSync('myLocations', newLocations);
      
      // 更新页面数据
      const markers = this.convertLocationsToMarkers(newLocations);
      this.setData({
        myLocations: newLocations,
        mapMarkers: markers
      });
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除地点失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  /**
   * 切换地图全屏
   */
  onToggleMapFullscreen() {
    this.setData({
      isMapFullscreen: !this.data.isMapFullscreen
    });
  },

  /**
   * 地图渲染完成
   */
  onMapReady(e) {
    console.log('地图渲染完成:', e.detail);
    this.mapContext = wx.createMapContext('tripMap', this);
  },

  /**
   * 移动到用户位置
   */
  onMoveToUserLocation() {
    if (this.mapContext) {
      this.mapContext.moveToLocation();
    }
  },

  /**
   * 包含所有标记点
   */
  onIncludeAllPoints() {
    if (this.mapContext && this.data.mapMarkers.length > 0) {
      const points = this.data.mapMarkers.map(marker => ({
        latitude: marker.latitude,
        longitude: marker.longitude
      }));
      
      this.mapContext.includePoints({
        points: points,
        padding: [50, 50, 50, 50]
      });
    }
  },

  /**
   * 创建新的旅行计划
   */
  onCreateTrip() {
    wx.navigateTo({
      url: '/pages/chat/index'
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: '我的旅行计划 - AI旅行助手',
      path: '/pages/index/index',
      imageUrl: '/images/share-trip.jpg'
    };
  }
});