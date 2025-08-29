import React from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Map, Navigation, Edit3, Trash2 } from 'lucide-react';

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

interface PlanningTripDetailProps {
  trip: TravelPlan | null;
  onBack: () => void;
  onNavigate: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onEdit?: (tripId: string) => void;
  onDelete?: (tripId: string) => void;
}

const PlanningTripDetail: React.FC<PlanningTripDetailProps> = ({ 
  trip,
  onBack,
  onNavigate,
  onEdit,
  onDelete
}) => {
  if (!trip) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到行程信息</p>
          <button
            onClick={onBack}
            className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">规划详情</h1>
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(trip.id)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Edit3 className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(trip.id)}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="pb-6">
        {/* 行程头部信息 */}
        <div className="p-4">
          <div className="flex items-start gap-4 mb-4">
            <img
              src={trip.image}
              alt={trip.title}
              className="w-24 h-24 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{trip.title}</h2>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                  规划中
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
                {trip.createdAt && (
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

          {/* 规划进度 */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-blue-800">规划进度</h3>
            </div>
            <p className="text-blue-700 text-sm">
              您的行程正在规划中，可以继续添加地点或调整安排
            </p>
            <div className="mt-3 flex gap-2">
              <button className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                继续规划
              </button>
              <button className="bg-white text-blue-500 px-4 py-2 rounded-xl text-sm font-medium border border-blue-200 hover:bg-blue-50 transition-colors">
                保存草稿
              </button>
            </div>
          </div>
        </div>

        {/* 地点清单 */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">规划地点</h3>
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
                      <h4 className="font-semibold text-gray-800 mb-1">
                        {attraction.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {attraction.address}
                      </p>
                      {attraction.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {attraction.description}
                        </p>
                      )}
                      
                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onNavigate(attraction.address, attraction.coordinates)}
                          className="bg-white text-green-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 hover:bg-green-50 transition-colors flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          导航
                        </button>
                        <button className="bg-white text-purple-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 hover:bg-purple-50 transition-colors flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          编辑
                        </button>
                        <button className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" />
                          移除
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
              <p className="text-gray-500 mb-4">还没有添加地点</p>
              <button className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 transition-colors">
                添加第一个地点
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningTripDetail;