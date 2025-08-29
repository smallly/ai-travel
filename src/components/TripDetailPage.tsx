import React from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Map, Navigation } from 'lucide-react';

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
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
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
      <div className="flex-1 overflow-y-auto">
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
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{trip.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{trip.locations} 个地点</span>
                </div>
                {trip.startDate && trip.endDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{trip.startDate} - {trip.endDate}</span>
                  </div>
                )}
                {trip.createdAt && !trip.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>创建于 {trip.createdAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 查看地图按钮 */}
          <div className="mb-6">
            <button
              onClick={() => onNavigate(trip.destination || trip.title, trip.centerCoordinates)}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Map className="w-5 h-5" />
              查看完整地图
            </button>
          </div>
        </div>

        {/* 地点清单 */}
        <div className="px-4 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-500" />
            <h4 className="text-lg font-semibold text-gray-800">地点清单</h4>
            <span className="ml-auto text-sm text-gray-500">
              {trip.attractionList?.length || 0} 个地点
            </span>
          </div>

          {trip.attractionList && trip.attractionList.length > 0 ? (
            <div className="space-y-3">
              {trip.attractionList.map((attraction, index) => (
                <div key={attraction.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    {/* 序号 */}
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
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
                      <h5 className="font-semibold text-gray-800 mb-1 truncate">
                        {attraction.name}
                      </h5>
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