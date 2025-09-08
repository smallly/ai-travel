// components/map-view/index.js
Component({
  properties: {
    // 地图中心坐标
    latitude: {
      type: Number,
      value: 39.908823 // 默认北京天安门
    },
    longitude: {
      type: Number,
      value: 116.397470
    },
    // 缩放级别
    scale: {
      type: Number,
      value: 16
    },
    // 标记点数组
    markers: {
      type: Array,
      value: []
    },
    // 路线数组
    polylines: {
      type: Array,
      value: []
    },
    // 是否显示用户位置
    showLocation: {
      type: Boolean,
      value: true
    },
    // 地图高度
    height: {
      type: String,
      value: '400rpx'
    }
  },

  data: {
    mapId: '',
    userLocation: null
  },

  lifetimes: {
    attached() {
      // 生成唯一的地图ID
      this.setData({
        mapId: 'map_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      });
      
      // 获取用户位置
      this.getUserLocation();
    }
  },

  methods: {
    /**
     * 获取用户当前位置
     */
    getUserLocation() {
      const that = this;
      
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          console.log('获取用户位置成功:', res);
          that.setData({
            userLocation: {
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy
            }
          });
          
          // 触发位置获取成功事件
          that.triggerEvent('locationget', {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy
          });
        },
        fail: (err) => {
          console.error('获取用户位置失败:', err);
          
          // 提示用户开启定位权限
          if (err.errMsg.includes('permission')) {
            wx.showModal({
              title: '位置权限',
              content: '需要获取您的位置信息来提供更好的服务，请在设置中开启位置权限',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
        }
      });
    },

    /**
     * 地图渲染完成
     */
    onMapReady(e) {
      console.log('地图渲染完成:', e);
      this.mapContext = wx.createMapContext(this.data.mapId, this);
      this.triggerEvent('mapready', e.detail);
    },

    /**
     * 标记点点击事件
     */
    onMarkerTap(e) {
      const markerId = e.detail.markerId;
      console.log('点击标记:', markerId);
      
      // 找到对应的标记数据
      const marker = this.properties.markers.find(m => m.id === markerId);
      
      this.triggerEvent('markertap', {
        markerId: markerId,
        marker: marker
      });
    },

    /**
     * 气泡点击事件
     */
    onCalloutTap(e) {
      const markerId = e.detail.markerId;
      console.log('点击气泡:', markerId);
      
      this.triggerEvent('callouttap', {
        markerId: markerId
      });
    },

    /**
     * 地图点击事件
     */
    onMapTap(e) {
      const { latitude, longitude } = e.detail;
      console.log('点击地图:', latitude, longitude);
      
      this.triggerEvent('maptap', {
        latitude: latitude,
        longitude: longitude
      });
    },

    /**
     * 地图拖拽结束
     */
    onRegionChange(e) {
      if (e.type === 'end') {
        console.log('地图区域变化:', e.detail);
        this.triggerEvent('regionchange', e.detail);
      }
    },

    /**
     * 控件点击事件
     */
    onControlTap(e) {
      const controlId = e.detail.controlId;
      console.log('点击控件:', controlId);
      
      this.triggerEvent('controltap', {
        controlId: controlId
      });
    },

    /**
     * 移动到指定位置
     */
    moveToLocation(latitude, longitude, scale) {
      if (this.mapContext) {
        this.mapContext.moveToLocation({
          latitude: latitude,
          longitude: longitude,
          scale: scale || this.properties.scale
        });
      }
    },

    /**
     * 缩放到显示所有标记点
     */
    includePoints(points) {
      if (this.mapContext && points && points.length > 0) {
        this.mapContext.includePoints({
          points: points,
          padding: [50, 50, 50, 50]
        });
      }
    },

    /**
     * 获取当前地图中心点
     */
    getCenterLocation() {
      return new Promise((resolve, reject) => {
        if (this.mapContext) {
          this.mapContext.getCenterLocation({
            success: resolve,
            fail: reject
          });
        } else {
          reject(new Error('地图未初始化'));
        }
      });
    },

    /**
     * 获取当前地图边界
     */
    getRegion() {
      return new Promise((resolve, reject) => {
        if (this.mapContext) {
          this.mapContext.getRegion({
            success: resolve,
            fail: reject
          });
        } else {
          reject(new Error('地图未初始化'));
        }
      });
    },

    /**
     * 截图
     */
    takeSnapshot() {
      return new Promise((resolve, reject) => {
        if (this.mapContext) {
          this.mapContext.takeSnapshot({
            quality: 'high',
            success: resolve,
            fail: reject
          });
        } else {
          reject(new Error('地图未初始化'));
        }
      });
    },

    /**
     * 计算距离
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371; // 地球半径（千米）
      const dLat = this.toRadians(lat2 - lat1);
      const dLng = this.toRadians(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance;
    },

    /**
     * 角度转弧度
     */
    toRadians(degree) {
      return degree * (Math.PI / 180);
    },

    /**
     * 格式化距离显示
     */
    formatDistance(distance) {
      if (distance < 1) {
        return `${Math.round(distance * 1000)}米`;
      } else {
        return `${distance.toFixed(1)}公里`;
      }
    }
  },

  // 公开的方法，供外部调用
  export() {
    return {
      moveToLocation: this.moveToLocation.bind(this),
      includePoints: this.includePoints.bind(this),
      getCenterLocation: this.getCenterLocation.bind(this),
      getRegion: this.getRegion.bind(this),
      takeSnapshot: this.takeSnapshot.bind(this),
      calculateDistance: this.calculateDistance.bind(this),
      formatDistance: this.formatDistance.bind(this)
    };
  }
});