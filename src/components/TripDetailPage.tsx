import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Map, Navigation, Maximize, Minimize } from 'lucide-react';
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
}

interface TripDetailPageProps {
  trip: TravelPlan;
  onBack: () => void;
  onNavigate: (address: string, coordinates?: { lat: number; lng: number }) => void;
}

const TripDetailPage: React.FC<TripDetailPageProps> = ({ 
  trip, 
  onBack, 
  onNavigate 
}) => {
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
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
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">行程详情</h2>
        <div className="w-10"></div> {/* 占位符保持居中 */}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 行程头部信息 */}
        <div className="p-4">
          <div className="flex items-start gap-4 mb-4">
            <img
              src={trip.image}
              alt={trip.title}
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{trip.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(trip.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBgColor(trip.status)}`}>
                  {getStatusText(trip.status)}
                </span>
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
                {trip.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>创建于 {trip.createdAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 天数快速定位标签 */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(() => {
                const days = Math.ceil((trip.duration?.includes('天') ? parseInt(trip.duration) : 1));
                return Array.from({ length: days }, (_, index) => {
                  const dayNumber = index + 1;
                  return (
                    <button
                      key={dayNumber}
                      onClick={() => {
                        // 快速定位到对应的Day
                        const dayElement = document.getElementById(`day-${dayNumber}`);
                        if (dayElement) {
                          dayElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                          });
                        }
                      }}
                      className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm"
                    >
                      DAY {dayNumber}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* 地图区域 */}
          <div className={`relative ${isMapFullscreen ? 'fixed inset-0 z-50' : 'h-64'} overflow-hidden transition-all duration-300 rounded-2xl mb-6`}>
            {/* 地图组件 */}
            <RealMap 
              locations={
                (trip.attractionList || []).map(attraction => ({
                  id: attraction.id,
                  name: attraction.name,
                  address: attraction.address,
                  realCoordinates: attraction.coordinates
                }))
              }
              className="absolute inset-0 w-full h-full"
              onLocationClick={(location) => {
                console.log('点击了地点:', location.name);
              }}
            />
            
            {/* 地图控制按钮 */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
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
                    <div key={dayNumber} id={`day-${dayNumber}`} className="mb-6">
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
                            <div className="flex items-start gap-3">
                              {/* 时间序号 */}
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {index + 1}
                              </div>
                              
                              {/* 地点图片 */}
                              <img
                                src={attraction.image}
                                alt={attraction.name}
                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                              />
                              
                              {/* 地点信息 */}
                              <div className="flex-1 min-w-0">
                                <h6 className="font-semibold text-gray-800 mb-1 truncate">
                                  {attraction.name}
                                </h6>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {attraction.address}
                                </p>
                                {attraction.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                    {attraction.description}
                                  </p>
                                )}
                                
                                {/* 导航按钮 */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => onNavigate(attraction.address, attraction.coordinates)}
                                    className="bg-white text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 hover:bg-green-50 transition-colors flex items-center gap-1"
                                  >
                                    <Navigation className="w-3 h-3" />
                                    导航
                                  </button>
                                </div>
                              </div>
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
    </div>
  );
};

export default TripDetailPage;