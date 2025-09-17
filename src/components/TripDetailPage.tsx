import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Map, Navigation, Maximize, Minimize, Trash2, Star, ThumbsUp } from 'lucide-react';
import RealMap from './RealMap';

interface TravelPlan {
  id: string;
  title: string;
  duration: string;
  locations: number;
  image: string;
  status: 'planning' | 'upcoming' | 'completed';
  province?: string;
  centerCoordinates?: {
    lat: number;
    lng: number;
  };
  destination?: string;
  attractionList?: {
    id: string;
    name: string;
    address: string;
    image: string;
    description: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  }[];
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  sourceLink?: string; // 原文链接
}

interface TripDetailPageProps {
  trip: TravelPlan;
  onBack: () => void;
  onNavigate: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onDelete?: (tripId: string) => void;
}

const TripDetailPage: React.FC<TripDetailPageProps> = ({
  trip,
  onBack,
  onNavigate,
  onDelete
}) => {
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 监听滚动，更新当前激活的Day
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const days = Math.ceil((trip.duration?.includes('天') ? parseInt(trip.duration) : 1));
      let currentActiveDay = 1;
      
      // 获取所有day元素的位置
      for (let i = 1; i <= days; i++) {
        const dayElement = document.getElementById(`day-${i}`);
        if (dayElement) {
          const rect = dayElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          
          // 如果Day元素的顶部在视窗范围内（考虑tab高度偏移）
          if (rect.top - containerRect.top <= 100) {
            currentActiveDay = i;
          }
        }
      }
      
      setActiveDay(currentActiveDay);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    // 初始调用一次
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [trip.duration]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'upcoming':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'completed':
        return <div className="w-5 h-5 text-green-500 flex items-center justify-center">✓</div>;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning':
        return '规划中';
      case 'upcoming':
        return '待出行';
      case 'completed':
        return '已完成';
      default:
        return '未知状态';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-50 text-blue-600';
      case 'upcoming':
        return 'bg-orange-50 text-orange-600';
      case 'completed':
        return 'bg-green-50 text-green-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col max-w-md mx-auto overflow-hidden">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center sticky top-0 z-10 relative">
        <button
          onClick={onBack}
          className="absolute left-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 w-full text-center">行程详情</h2>
        {onDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute right-4 p-2 hover:bg-red-50 rounded-full transition-colors group"
            title="删除行程"
          >
            <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 行程头部信息 */}
        <div className="p-4">
          <div className="flex items-start gap-4 mb-2">
            <img
              src={trip.image}
              alt={trip.title}
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{trip.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(trip.status)}`}>
                  {getStatusText(trip.status)}
                </span>
                {trip.createdAt && (
                  <span className="text-xs text-gray-500">
                    {trip.createdAt}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{trip.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{trip.locations} 个地点</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 天数快速定位标签 - 置顶固定 */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-1">
          <div className="flex items-center gap-6">
            {(() => {
              const days = Math.ceil((trip.duration?.includes('天') ? parseInt(trip.duration) : 1));
              return Array.from({ length: days }, (_, index) => {
                const dayNumber = index + 1;
                return (
                  <button
                    key={dayNumber}
                    onClick={() => {
                      // 快速定位到对应的Day，考虑置顶标签的高度
                      const dayElement = document.getElementById(`day-${dayNumber}`);
                      if (dayElement) {
                        const rect = dayElement.getBoundingClientRect();
                        const scrollContainer = dayElement.closest('.overflow-y-auto');
                        if (scrollContainer) {
                          const containerRect = scrollContainer.getBoundingClientRect();
                          const offset = rect.top - containerRect.top + scrollContainer.scrollTop - 80; // 80px为标签高度的偏移
                          scrollContainer.scrollTo({
                            top: offset,
                            behavior: 'smooth'
                          });
                        }
                      }
                    }}
                    className={`relative py-2 text-sm font-medium transition-all ${
                      activeDay === dayNumber
                        ? 'text-blue-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    DAY {dayNumber}
                    {activeDay === dayNumber && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* 地图区域 */}
        <div className="px-4 mb-6">
          <div className={`relative ${isMapFullscreen ? 'fixed inset-0 z-50' : 'h-48'} overflow-hidden transition-all duration-300 rounded-2xl`}>
            {/* 地图组件 */}
            <RealMap 
              locations={
                (trip.attractionList || []).map((attraction, index) => {
                  // 计算每天的景点分配
                  const days = Math.ceil((trip.duration?.includes('天') ? parseInt(trip.duration) : 1));
                  const attractionsPerDay = Math.ceil(trip.attractionList.length / days);
                  const dayNumber = Math.floor(index / attractionsPerDay) + 1;
                  
                  return {
                    id: attraction.id,
                    name: attraction.name,
                    address: attraction.address,
                    dayNumber: dayNumber,
                    realCoordinates: attraction.coordinates
                  };
                })
              }
              className="absolute inset-0 w-full h-full"
              onLocationClick={(location) => {
                console.log('点击了地点:', location.name);
              }}
            />
            
            {/* 地图控制按钮 */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button 
                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                {isMapFullscreen ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
            
            {/* 全屏状态下的返回按钮 */}
            {isMapFullscreen && (
              <div className="absolute top-4 left-4 z-10">
                <button 
                  onClick={() => setIsMapFullscreen(false)}
                  className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 地点清单 */}
        <div className="px-4 pb-6 flex-1">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-500" />
            <h4 className="text-lg font-semibold text-gray-800">地点清单</h4>
            <span className="ml-auto text-sm text-gray-500">
              {trip.attractionList?.length || 0} 个地点
            </span>
          </div>

          {trip.attractionList && trip.attractionList.length > 0 ? (
            <div>
              {/* 原文链接 - 显示在第一个DAY标题上方 */}
              {trip.sourceLink && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-medium">原文链接：</span>
                    <a
                      href={trip.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 underline truncate flex-1"
                    >
                      {trip.sourceLink}
                    </a>
                  </div>
                </div>
              )}

              {/* 显示所有天数的景点 */}
              {(() => {
                // 计算每天的景点分配
                const days = Math.ceil((trip.duration?.includes('天') ? parseInt(trip.duration) : 1));
                const attractionsPerDay = Math.ceil(trip.attractionList.length / days);

                return Array.from({ length: days }, (_, dayIndex) => {
                  const dayNumber = dayIndex + 1;
                  const startIndex = dayIndex * attractionsPerDay;
                  const endIndex = startIndex + attractionsPerDay;
                  const dayAttractions = trip.attractionList.slice(startIndex, endIndex);

                  return (
                    <div key={dayNumber} id={`day-${dayNumber}`} className="mb-4">
                      {/* Day标题 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {dayNumber}
                        </div>
                        <h5 className="font-semibold text-gray-800">Day {dayNumber}</h5>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                      
                      {/* 该天的景点列表 */}
                      <div className="space-y-3 pl-8">
                        {dayAttractions.map((attraction, index) => (
                          <div key={attraction.id} className="bg-gray-50 rounded-2xl p-4">
                            {/* 序号和图片行 */}
                            <div className="flex items-start gap-3 mb-3">
                              {/* 时间序号 */}
                              <div className="text-sm font-medium text-gray-800 flex-shrink-0 w-4">
                                {index + 1}
                              </div>

                              {/* 地点图片 */}
                              <img
                                src={attraction.image}
                                alt={attraction.name}
                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                              />

                              {/* 标题和地址 */}
                              <div className="flex-1 min-w-0">
                                {/* 大标题：地点名称 */}
                                <h6 className="text-lg font-bold text-gray-800 mb-1 truncate">
                                  {attraction.name}
                                </h6>
                                {/* 小标题：地址 */}
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {attraction.address}
                                </p>
                              </div>
                            </div>

                            {/* 推荐理由单独显示在图片下方 */}
                            {attraction.description && (
                              <div className="mb-3 pl-7">
                                <div className="flex items-start gap-2">
                                  <ThumbsUp className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {attraction.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 导航按钮 */}
                            <div className="flex gap-2 pl-7">
                              <button
                                onClick={() => onNavigate(attraction.address, attraction.coordinates)}
                                className="bg-white text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 hover:bg-green-50 transition-colors flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                导航
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无地点信息</p>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">删除行程</h3>
              <p className="text-gray-600 mb-6">
                确定要删除「{trip.title}」这个行程吗？删除后将无法恢复。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete?.(trip.id);
                  }}
                  className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailPage;