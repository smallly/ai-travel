import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import MapConfig from '../utils/mapConfig';

// 声明高德地图API的全局类型
declare global {
  interface Window {
    AMap: any;
  }
}

interface Location {
  id: string;
  name: string;
  address: string;
  dayNumber?: number; // 新增：标记属于第几天
  realCoordinates?: {
    lat: number;
    lng: number;
  };
}

interface RealMapProps {
  locations: Location[];
  className?: string;
  onLocationClick?: (location: Location) => void;
}

const RealMap: React.FC<RealMapProps> = ({ locations, className, onLocationClick }) => {
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // 创建一个独立的DOM容器，完全脱离React管理
  const mapContainer = useMemo(() => {
    const container = document.createElement('div');
    // 确保容器有正确的尺寸样式
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '1';
    container.className = 'amap-container';
    console.log('🎯 创建地图容器，初始样式:', container.style.cssText);
    return container;
  }, []);
  
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    console.log('🎯 containerRef回调触发，node存在:', !!node);
    if (node) {
      if (!node.contains(mapContainer)) {
        console.log('🎯 添加地图容器到DOM');
        console.log('🎯 React容器尺寸:', node.getBoundingClientRect());
        
        // 强制设置父容器样式，确保有尺寸
        node.style.position = 'relative';
        node.style.width = '100%';
        node.style.height = '100%';
        node.style.minHeight = '200px';
        node.style.display = 'block';
        
        // 确保地图容器继承正确的尺寸
        mapContainer.style.width = '100%';
        mapContainer.style.height = '100%';
        mapContainer.style.minHeight = '200px';
        mapContainer.style.position = 'absolute';
        mapContainer.style.top = '0';
        mapContainer.style.left = '0';
        mapContainer.style.zIndex = '1';
        
        node.appendChild(mapContainer);
        
        // 等待一帧后再检查尺寸
        requestAnimationFrame(() => {
          console.log('🎯 独立地图容器已添加，容器尺寸:', mapContainer.getBoundingClientRect());
          console.log('🎯 React父容器最新尺寸:', node.getBoundingClientRect());
          
          // 强制触发重新布局
          node.style.display = 'none';
          node.offsetHeight; // 触发重排
          node.style.display = 'block';
          
          console.log('🎯 强制重排后容器尺寸:', mapContainer.getBoundingClientRect());
        });
      }
    } else {
      // node为null时，确保不清理地图容器，因为可能只是React重新渲染
      console.log('🎯 containerRef节点为null，但保持地图容器');
    }
  }, [mapContainer]);

  // 添加组件挂载日志
  useEffect(() => {
    console.log('🎯 RealMap组件已挂载');
    console.log('传入的locations数量:', locations.length);
    console.log('地图容器:', mapContainer);
  }, [mapContainer, locations.length]);

  // 初始化地图
  useEffect(() => {
    console.log('🎯 地图初始化Effect触发');
    console.log('🎯 mapContainer存在:', !!mapContainer);
    console.log('🎯 mapContainer是否在DOM中:', !!mapContainer.parentNode);
    
    if (!mapContainer) {
      console.log('⚠️ mapContainer不存在');
      return;
    }

    // 等待容器被正确添加到DOM中
    const waitForContainer = () => {
      if (!mapContainer.parentNode) {
        console.log('⚠️ 地图容器未挂载到DOM，等待...');
        setTimeout(waitForContainer, 100);
        return;
      }
      
      console.log('✅ 地图容器已挂载到DOM，开始初始化');
      
      // 延迟初始化，确保DOM完全渲染和尺寸计算完成
      const timer = setTimeout(() => {
        console.log('🔄 开始初始化地图');
        console.log('🔄 地图容器父节点:', mapContainer.parentNode);
        console.log('🔄 地图容器尺寸:', mapContainer.getBoundingClientRect());
        
        const initializeMap = async () => {
          try {
            setIsLoading(true);
            setError('');

            console.log('🗺️ 开始初始化地图组件...');
            console.log('调试信息:', MapConfig.getDebugInfo());

            // 验证API Key
            if (!MapConfig.validateAPIKey()) {
              throw new Error('请在.env文件中配置有效的高德地图API Key (VITE_AMAP_API_KEY)');
            }

            // 动态加载地图API
            console.log('🚀 开始加载地图API...');
            await MapConfig.loadMapAPI();
            
            console.log('✅ 地图API加载完成，开始创建地图实例...');

            // 等待一小段时间确保API完全加载
            await new Promise(resolve => setTimeout(resolve, 200));

            if (!window.AMap) {
              throw new Error('高德地图API加载失败：window.AMap不存在');
            }

            console.log('🗺️ 创建地图实例...');
            console.log('地图容器:', mapContainer);
            console.log('地图容器最终尺寸:', mapContainer.getBoundingClientRect());

            // 确保容器为空且有尺寸
            mapContainer.innerHTML = '';
            const rect = mapContainer.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              throw new Error(`地图容器尺寸异常: ${rect.width}x${rect.height}，请检查CSS样式`);
            }

            // 创建地图实例
            const mapInstance = new window.AMap.Map(mapContainer, {
              zoom: 4,
              center: [108.953, 34.266], // 中国地理中心（西安附近，更适合显示全国）
              mapStyle: 'amap://styles/normal',
              features: ['bg', 'road', 'building'],
              viewMode: '2D'
            });

            console.log('🎯 地图实例创建成功:', mapInstance);

            // 等待地图加载完成
            mapInstance.on('complete', () => {
              console.log('🎊 地图完全加载完成！');
            });

            // 添加地图控件
            try {
              mapInstance.addControl(new window.AMap.Scale());
              
              // 添加缩放控件（放大缩小按钮）到右上角
              mapInstance.addControl(new window.AMap.ToolBar({
                position: {
                  top: '10px',
                  right: '10px'
                },
                ruler: false,
                direction: false,
                locate: false
              }));
              
              // 全屏控件已移除（按用户要求）
              
              console.log('🛠️ 地图控件添加成功');
            } catch (controlError) {
              console.warn('⚠️ 地图控件添加失败:', controlError);
              // 控件失败不影响地图基本功能
            }

            setMap(mapInstance);
            setIsLoading(false);
            console.log('🎉 地图初始化完成！');

          } catch (err) {
            console.error('❌ 地图初始化失败:', err);
            const errorMessage = err instanceof Error && err.message.includes('网络连接问题') 
              ? '地图服务暂时无法连接，请检查网络设置' 
              : (err instanceof Error ? err.message : '地图加载失败');
            setError(errorMessage);
            setIsLoading(false);
          }
        };
        
        // 检查并初始化地图
        const checkAndInitMap = () => {
          const rect = mapContainer.getBoundingClientRect();
          console.log('🔄 检查地图容器尺寸:', rect);
          
          if (rect.width === 0 || rect.height === 0) {
            console.log('⚠️ 容器尺寸异常，尝试修复...');
            
            // 尝试多种修复方式
            if (mapContainer.parentNode) {
              const parent = mapContainer.parentNode as HTMLElement;
              console.log('🔄 父容器尺寸:', parent.getBoundingClientRect());
              
              // 强制设置尺寸
              parent.style.height = '256px'; // h-64 = 256px
              parent.style.width = '100%';
              parent.style.display = 'block';
              parent.style.position = 'relative';
              
              mapContainer.style.height = '256px';
              mapContainer.style.width = '100%';
              
              // 再次检查
              setTimeout(() => {
                const newRect = mapContainer.getBoundingClientRect();
                console.log('🔄 修复后容器尺寸:', newRect);
                if (newRect.width > 0 && newRect.height > 0) {
                  initializeMap();
                } else {
                  setError('无法获取地图容器正确尺寸，请检查页面布局');
                  setIsLoading(false);
                }
              }, 200);
            } else {
              setError('地图容器未正确挂载到DOM');
              setIsLoading(false);
            }
          } else {
            initializeMap();
          }
        };
        
        checkAndInitMap();
      }, 300); // 延迟300ms确保DOM完全渲染和CSS生效

      // 清理函数 - 关键在于清理独立的DOM容器
      return () => {
        clearTimeout(timer);
        console.log('🧹 开始清理地图');
        if (map) {
          try {
            console.log('🗑️ 销毁地图实例');
            map.destroy();
            console.log('✅ 地图实例已销毁');
          } catch (destroyError) {
            console.warn('⚠️ 地图销毁失败:', destroyError);
          }
        }
        // 清空独立容器
        if (mapContainer) {
          try {
            mapContainer.innerHTML = '';
            // 移除容器（如果还在父节点中）
            if (mapContainer.parentNode) {
              mapContainer.parentNode.removeChild(mapContainer);
            }
            console.log('✅ 独立地图容器已清空');
          } catch (cleanError) {
            console.warn('⚠️ 独立容器清理失败:', cleanError);
          }
        }
      };
    };

    waitForContainer();
  }, []); // 只初始化一次

  // 更新地图标记
  useEffect(() => {
    console.log('🔄 更新地图标记，locations:', locations.length);
    if (!map || !locations.length) return;

    // 清除旧标记
    markers.forEach(marker => {
      map.remove(marker);
    });

    const newMarkers: any[] = [];
    const bounds = new window.AMap.Bounds();
    let validLocationCount = 0;

    // 按天数分组计算每天的序号
    const dayCounters: { [key: number]: number } = {};

    locations.forEach((location) => {
      if (!location.realCoordinates) return;
      
      validLocationCount++;
      const { lat, lng } = location.realCoordinates;
      console.log('📍 添加标记:', location.name, `经度:${lng}, 纬度:${lat}`);
      
      // 根据天数决定颜色
      const dayColors = {
        1: { bg: 'bg-blue-500', text: 'text-blue-600', label: 'DAY 1' },
        2: { bg: 'bg-green-500', text: 'text-green-600', label: 'DAY 2' },
        3: { bg: 'bg-purple-500', text: 'text-purple-600', label: 'DAY 3' },
        4: { bg: 'bg-orange-500', text: 'text-orange-600', label: 'DAY 4' },
        5: { bg: 'bg-red-500', text: 'text-red-600', label: 'DAY 5' }
      };
      
      const dayNumber = location.dayNumber || 1;
      const colorInfo = dayColors[dayNumber as keyof typeof dayColors] || dayColors[1];
      
      // 计算该天的序号
      if (!dayCounters[dayNumber]) {
        dayCounters[dayNumber] = 0;
      }
      dayCounters[dayNumber]++;
      const dayIndex = dayCounters[dayNumber];
      
      // 创建自定义标记内容
      const markerContent = document.createElement('div');
      markerContent.className = 'relative flex flex-col items-center';
      markerContent.innerHTML = `
        <div class="w-6 h-6 ${colorInfo.bg} rounded-full flex items-center justify-center shadow-lg cursor-pointer border-2 border-white">
          <span class="text-white text-xs font-bold">${dayIndex}</span>
        </div>
        <div class="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md text-xs whitespace-nowrap border border-gray-200 font-medium text-gray-700">
          ${location.name}
        </div>
      `;

      // 创建标记
      const marker = new window.AMap.Marker({
        position: new window.AMap.LngLat(lng, lat),
        content: markerContent,
        anchor: 'center'
      });

      // 添加点击事件
      marker.on('click', () => {
        if (onLocationClick) {
          onLocationClick(location);
        }
      });

      // 添加到地图
      map.add(marker);
      newMarkers.push(marker);

      // 添加到边界
      bounds.extend(new window.AMap.LngLat(lng, lat));
    });

    setMarkers(newMarkers);

    console.log('🗺️ 有效位置数量:', validLocationCount);
    console.log('🗺️ 当前地图中心:', map.getCenter());
    console.log('🗺️ 当前地图缩放:', map.getZoom());

    // 智能调整地图视野
    if (validLocationCount === 0) {
      console.log('🇨🇳 无标记，保持中国默认视图');
      map.setZoomAndCenter(4, [108.953, 34.266]);
    } else if (validLocationCount > 1) {
      // 计算标记的地理跨度
      const lngs = locations.filter(loc => loc.realCoordinates).map(loc => loc.realCoordinates!.lng);
      const lats = locations.filter(loc => loc.realCoordinates).map(loc => loc.realCoordinates!.lat);
      const lngSpan = Math.max(...lngs) - Math.min(...lngs);
      const latSpan = Math.max(...lats) - Math.min(...lats);
      
      console.log('📐 多个标记，经度跨度:', lngSpan.toFixed(4), '纬度跨度:', latSpan.toFixed(4));
      
      // 如果所有标记都在很小的范围内（同一个城市），保持中国整体视图
      if (lngSpan < 1 && latSpan < 1) {
        console.log('🏙️ 标记集中在同一城市，保持中国整体视图');
        map.setZoomAndCenter(4, [108.953, 34.266]);
      } else {
        console.log('🌏 标记分布较广，调整地图边界');
        map.setBounds(bounds, false, [20, 20, 20, 20]);
      }
    } else {
      console.log('📍 单个标记，保持中国默认视图');
      const { lat, lng } = locations.find(loc => loc.realCoordinates)?.realCoordinates!;
      // 检查标记是否在中国境内
      if (lng >= 73 && lng <= 135 && lat >= 3 && lat <= 53) {
        console.log('📍 标记在中国境内，保持中国视图');
        map.setZoomAndCenter(4, [108.953, 34.266]);
      } else {
        console.log('📍 标记在中国境外，调整视图');
        map.setZoomAndCenter(6, [lng, lat]);
      }
    }

  }, [map, locations, onLocationClick]);

  // 简化的渲染结构
  return (
    <div className="relative w-full h-full min-h-[200px]">
      {/* React管理的容器，只用于接收独立DOM容器 */}
      <div 
        ref={containerRef} 
        className={`${className} w-full h-full min-h-[200px]`}
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '200px',
          position: 'relative',
          display: 'block'
        }}
      />
      
      {/* 覆盖层用于显示状态和信息 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 z-10">
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <MapPin className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-gray-600 text-sm font-medium">正在加载地图...</p>
            <p className="text-gray-400 text-xs mt-1">API Key: {MapConfig.getAPIKey()}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 z-10">
          {/* 简化地图展示区域 */}
          <div className="flex-1 relative overflow-hidden">
            {/* 地图背景 */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-green-100 opacity-50"></div>
            
            {/* 模拟地点标记 */}
            {locations.map((location, index) => (
              <div
                key={location.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                  left: `${25 + (index * 20) % 60}%`,
                  top: `${30 + (index * 15) % 40}%`
                }}
              >
                <div className="relative">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs whitespace-nowrap border">
                    {location.name}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 网格线 */}
            <div className="absolute inset-0 opacity-10">
              <div className="h-full w-full" style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}></div>
            </div>
          </div>
          
          {/* 错误信息底部栏 */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 text-sm font-medium">简化地图模式</p>
                <p className="text-gray-500 text-xs mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 地图信息标签 */}
      {/* 地点数量标签已移除 */}
      {/* {!isLoading && !error && locations.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md px-3 py-2 border border-gray-200 z-10">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-700 font-medium">共 {locations.length} 个地点</span>
          </div>
        </div>
      )} */}
      
      {/* 地图版权信息 */}
      {!isLoading && !error && (
        <div className="absolute bottom-1 right-2 text-xs text-gray-400 z-10">
          Powered by 高德地图
        </div>
      )}
    </div>
  );
};

export default RealMap;