// 高德地图配置工具类
class MapConfig {
  private static instance: MapConfig;
  private mapAPIKey: string;
  private isMapLoaded: boolean = false;
  private mapLoadPromise: Promise<void> | null = null;

  private constructor() {
    // 从环境变量获取API Key
    this.mapAPIKey = import.meta.env.VITE_AMAP_API_KEY || '';
    console.log('🗺️ 高德地图配置初始化');
    console.log('API Key状态:', this.mapAPIKey ? '已配置' : '未配置');
    console.log('API Key前缀:', this.mapAPIKey ? this.mapAPIKey.substring(0, 10) + '...' : '无');
  }

  public static getInstance(): MapConfig {
    if (!MapConfig.instance) {
      MapConfig.instance = new MapConfig();
    }
    return MapConfig.instance;
  }

  /**
   * 动态加载高德地图API
   */
  public async loadMapAPI(): Promise<void> {
    console.log('🚀 开始加载高德地图API...');
    
    // 如果已经加载过，直接返回
    if (this.isMapLoaded && window.AMap) {
      console.log('✅ 地图API已加载，直接返回');
      return Promise.resolve();
    }

    // 如果正在加载，返回现有的Promise
    if (this.mapLoadPromise) {
      console.log('⏳ 地图API正在加载中，等待现有加载完成');
      return this.mapLoadPromise;
    }

    // 检查API Key
    if (!this.mapAPIKey || this.mapAPIKey === 'your-amap-api-key-here') {
      const errorMsg = '❌ 高德地图API Key未配置，请在.env文件中设置VITE_AMAP_API_KEY';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 创建加载Promise
    this.mapLoadPromise = new Promise<void>((resolve, reject) => {
      // 如果已经存在window.AMap，说明已加载
      if (window.AMap) {
        console.log('✅ 检测到window.AMap已存在');
        this.isMapLoaded = true;
        resolve();
        return;
      }

      console.log('📡 创建script元素加载地图API...');
      
      // 创建script元素动态加载
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${this.mapAPIKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.Marker`;
      
      console.log('🔗 地图API URL:', script.src.replace(this.mapAPIKey, this.mapAPIKey.substring(0, 10) + '...'));
      
      script.onload = () => {
        console.log('✅ 高德地图API加载成功');
        console.log('window.AMap存在:', !!window.AMap);
        this.isMapLoaded = true;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('❌ 高德地图API加载失败:', error);
        const errorMsg = '高德地图API加载失败，可能的原因：\n1. API Key无效\n2. 网络连接问题\n3. 域名未在高德控制台配置';
        console.error(errorMsg);
        reject(new Error(errorMsg));
      };

      // 添加到页面头部
      document.head.appendChild(script);
      console.log('📄 script元素已添加到页面头部');
    });

    return this.mapLoadPromise;
  }

  /**
   * 检查地图API是否已加载
   */
  public isAPILoaded(): boolean {
    const loaded = this.isMapLoaded && !!window.AMap;
    console.log('🔍 检查API加载状态:', loaded);
    return loaded;
  }

  /**
   * 获取API Key（用于调试）
   */
  public getAPIKey(): string {
    return this.mapAPIKey ? this.mapAPIKey.substring(0, 10) + '...' : '未配置';
  }

  /**
   * 验证API Key格式
   */
  public validateAPIKey(): boolean {
    if (!this.mapAPIKey) {
      console.warn('⚠️ API Key为空');
      return false;
    }
    if (this.mapAPIKey === 'your-amap-api-key-here') {
      console.warn('⚠️ API Key未更新，仍为占位符');
      return false;
    }
    if (this.mapAPIKey.length < 10) {
      console.warn('⚠️ API Key长度不足');
      return false;
    }
    console.log('✅ API Key验证通过');
    return true;
  }

  /**
   * 获取完整的调试信息
   */
  public getDebugInfo(): any {
    return {
      hasAPIKey: !!this.mapAPIKey,
      apiKeyPrefix: this.getAPIKey(),
      isAPILoaded: this.isAPILoaded(),
      windowAMapExists: !!window.AMap,
      isValidKey: this.validateAPIKey()
    };
  }
}

// 导出单例实例
export default MapConfig.getInstance();