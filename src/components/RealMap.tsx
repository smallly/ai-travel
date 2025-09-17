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
  const [polylines, setPolylines] = useState<any[]>([]);
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

            // 计算地图中心点和缩放级别
            let initialZoom = 10;
            let initialCenter = [116.4074, 39.9042]; // 默认北京坐标（经度，纬度）

            console.log('🎯 传入的locations数量:', locations.length);

            if (locations.length > 0) {
              const validLocs = locations.filter(loc => loc.realCoordinates);
              console.log('🎯 有效坐标的locations数量:', validLocs.length);

              if (validLocs.length > 0) {
                // 打印所有坐标用于调试
                validLocs.forEach((loc, index) => {
                  console.log(`🎯 Location ${index}:`, loc.name, '坐标:', loc.realCoordinates);
                });

                if (validLocs.length === 1) {
                  const { lat, lng } = validLocs[0].realCoordinates!;
                  console.log('🎯 单个点位坐标:', lng, lat);

                  // 检查坐标是否合理（全球范围内）
                  if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                    initialCenter = [lng, lat];
                    initialZoom = 12; // 单个点位放大一些
                    console.log('🎯 使用单个点位坐标');
                  } else {
                    console.log('🎯 单个点位坐标超出合理范围，使用北京坐标');
                  }
                } else {
                  // 多个点位，计算中心点
                  const lngs = validLocs.map(loc => loc.realCoordinates!.lng);
                  const lats = validLocs.map(loc => loc.realCoordinates!.lat);
                  const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
                  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;

                  console.log('🎯 计算出的多点中心:', centerLng, centerLat);
                  console.log('🎯 坐标范围: 经度', Math.min(...lngs), '~', Math.max(...lngs), '纬度', Math.min(...lats), '~', Math.max(...lats));

                  // 放宽坐标范围检查，确保计算出的中心点合理
                  if (centerLng >= -180 && centerLng <= 180 && centerLat >= -90 && centerLat <= 90) {
                    initialCenter = [centerLng, centerLat];
                    console.log('🎯 使用计算的多点中心坐标');

                    // 根据点位分布调整缩放级别
                    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
                    const latSpan = Math.max(...lats) - Math.min(...lats);
                    const maxSpan = Math.max(lngSpan, latSpan);

                    if (maxSpan < 0.05) initialZoom = 14;
                    else if (maxSpan < 0.1) initialZoom = 12;
                    else if (maxSpan < 0.5) initialZoom = 10;
                    else if (maxSpan < 2) initialZoom = 8;
                    else initialZoom = 6;

                    console.log('🎯 使用多点计算中心，缩放级别:', initialZoom);
                  } else {
                    console.log('🎯 多点中心超出合理范围，使用北京坐标');
                  }
                }
              } else {
                console.log('🎯 没有有效坐标，使用北京默认坐标');
              }
            } else {
              console.log('🎯 没有传入locations，使用北京默认坐标');
            }

            console.log('🎯 最终使用的地图位置:', initialCenter, '缩放:', initialZoom);

            // 创建地图实例
            const mapInstance = new window.AMap.Map(mapContainer, {
              zoom: initialZoom,
              center: initialCenter,
              mapStyle: 'amap://styles/normal', // 使用标准样式便于自定义
              features: ['bg', 'road'], // 显示背景和主要道路
              viewMode: '2D'
            });

            // 地图创建后立即验证中心点
            setTimeout(() => {
              const currentCenter = mapInstance.getCenter();
              console.log('🎯 地图创建后的实际中心点:', currentCenter.lng, currentCenter.lat);
              console.log('🎯 预期中心点:', initialCenter[0], initialCenter[1]);

              // 检查坐标是否偏差过大
              const lngDiff = Math.abs(currentCenter.lng - initialCenter[0]);
              const latDiff = Math.abs(currentCenter.lat - initialCenter[1]);
              if (lngDiff > 5 || latDiff > 5) {
                console.error('❌ 地图中心点与预期差异过大!');
                console.error('实际中心:', currentCenter.lng, currentCenter.lat);
                console.error('预期中心:', initialCenter[0], initialCenter[1]);
                console.error('差异:', lngDiff, latDiff);

                // 强制设置正确的中心点
                console.log('🔧 强制重新设置地图中心点');
                mapInstance.setCenter(initialCenter);
              }
            }, 1000);

            // 自定义地图样式
            try {
              mapInstance.setMapStyle({
                styleId: 'normal',
                features: ['bg', 'road'],
                // 设置水域颜色为蓝色
                styleJson: [{
                  featureType: 'water',
                  elementType: 'all',
                  stylers: {
                    color: '#C5E5FE' // RGB(197,229,254) 浅蓝色
                  }
                }, {
                  featureType: 'background',
                  elementType: 'all',
                  stylers: {
                    color: '#FFFFFF' // 白色背景
                  }
                }, {
                  featureType: 'road',
                  elementType: 'all',
                  stylers: {
                    visibility: 'simplified' // 只显示主干道
                  }
                }]
              });
              console.log('🎨 地图样式自定义成功');
            } catch (styleError) {
              console.warn('⚠️ 地图样式自定义失败，使用默认样式:', styleError);
            }

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
  }, [locations]); // 依赖locations数据，确保地图初始化时有正确的中心位置

  // 更新地图标记
  useEffect(() => {
    console.log('🔄 更新地图标记，locations:', locations.length);
    if (!map || !locations.length) return;

    // 清除旧标记和连线
    markers.forEach(marker => {
      map.remove(marker);
    });
    polylines.forEach(polyline => {
      map.remove(polyline);
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
      
      // 根据天数决定颜色 - 统一使用紫色主题
      const dayColors = {
        1: { bg: 'bg-purple-500', text: 'text-purple-600', label: 'DAY 1' },
        2: { bg: 'bg-purple-600', text: 'text-purple-700', label: 'DAY 2' },
        3: { bg: 'bg-purple-700', text: 'text-purple-800', label: 'DAY 3' },
        4: { bg: 'bg-purple-800', text: 'text-purple-900', label: 'DAY 4' },
        5: { bg: 'bg-purple-900', text: 'text-purple-950', label: 'DAY 5' }
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
      console.log(`📍 添加标记到bounds - ${location.name}: lng=${lng}, lat=${lat}`);
      bounds.extend(new window.AMap.LngLat(lng, lat));
    });

    setMarkers(newMarkers);

    // 不再创建连线，保持地图简洁
    const newPolylines: any[] = [];
    setPolylines(newPolylines);

    console.log('🗺️ 有效位置数量:', validLocationCount);
    console.log('🗺️ 当前地图中心:', map.getCenter());
    console.log('🗺️ 当前地图缩放:', map.getZoom());

    // 智能调整地图视野 - 确保所有点位都可见
    if (validLocationCount === 0) {
      console.log('🇨🇳 无标记，保持中国默认视图');
      map.setZoomAndCenter(5, [104.066, 30.651]); // 使用成都作为中心，更合适的缩放级别
    } else {
      // 有标记时，优先使用setBounds确保所有点都可见
      console.log('📐 有标记，使用自适应边界确保所有点可见');

      // 检查bounds是否有效
      const boundsSW = bounds.getSouthWest();
      const boundsNE = bounds.getNorthEast();
      console.log('📐 Bounds 西南角:', boundsSW.lng, boundsSW.lat);
      console.log('📐 Bounds 东北角:', boundsNE.lng, boundsNE.lat);

      // 计算bounds的中心点（用于对比）
      const boundsCenter = bounds.getCenter();
      console.log('📐 Bounds计算的中心:', boundsCenter.lng, boundsCenter.lat);

      // 使用较大的padding，确保标记不会贴边显示，且视野更宽松
      map.setBounds(bounds, false, [60, 60, 60, 60]);

      // 验证setBounds后的实际中心
      setTimeout(() => {
        const actualCenter = map.getCenter();
        console.log('📐 setBounds后的实际中心:', actualCenter.lng, actualCenter.lat);
      }, 100);

      // 延迟微调，确保视野合适
      setTimeout(() => {
        const currentZoom = map.getZoom();
        console.log('🔍 自动调整后的缩放级别:', currentZoom);

        // 对缩放级别进行合理限制
        if (currentZoom > 15) {
          console.log('🔽 缩放级别过高，适当降低到14');
          map.setZoom(14);
        } else if (currentZoom < 4) {
          console.log('🔼 缩放级别过低，适当提高到6');
          map.setZoom(6);
        }
      }, 300); // 增加延迟确保setBounds完全生效
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
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
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