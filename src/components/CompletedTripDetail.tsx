import React from 'react';
import { ArrowLeft, MapPin, Calendar, Map, Navigation, Camera, Share, Star, Heart } from 'lucide-react';

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

interface CompletedTripDetailProps {
  trip: TravelPlan | null;
  onBack: () => void;
  onNavigate: (address: string, coordinates?: { lat: number; lng: number }) => void;
  onShare?: (tripId: string) => void;
  onRate?: (tripId: string, rating: number) => void;
}

const CompletedTripDetail: React.FC<CompletedTripDetailProps> = ({ 
  trip,
  onBack,
  onNavigate,
  onShare,
  onRate
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
        <h1 className="text-lg font-semibold text-gray-800">旅行回忆</h1>
        <div className="flex gap-1">
          {onShare && (
            <button
              onClick={() => onShare(trip.id)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button className="p-2 hover:bg-red-50 rounded-full transition-colors">
            <Heart className="w-5 h-5 text-red-500" />
          </button>
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
                <div className="w-5 h-5 text-green-500 flex items-center justify-center">✓</div>
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-medium">
                  已完成
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
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
              重温旅行路线
            </button>
          </div>

          {/* 旅行评价 */}
          <div className="bg-green-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-green-800">旅行评价</h3>
            </div>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRate && onRate(trip.id, star)}
                  className="text-yellow-400 hover:text-yellow-500 transition-colors"
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-green-700 text-sm mb-3">
              这次旅行很棒！给你留下了美好的回忆
            </p>
            <div className="flex gap-2">
              <button className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-2">
                <Camera className="w-4 h-4" />
                添加照片
              </button>
              <button className="bg-white text-green-500 px-4 py-2 rounded-xl text-sm font-medium border border-green-200 hover:bg-green-50 transition-colors">
                写游记
              </button>
            </div>
          </div>
        </div>

        {/* 旅行足迹 */}
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">旅行足迹</h3>
            <span className="ml-auto text-sm text-gray-500">
              {trip.attractionList?.length || 0} 个地点
            </span>
          </div>

          {trip.attractionList && trip.attractionList.length > 0 ? (
            <div className="space-y-3">
              {trip.attractionList.map((attraction, index) => (
                <div key={attraction.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    {/* 完成标记 */}
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      ✓
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
                          再次导航
                        </button>
                        <button className="bg-white text-purple-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 hover:bg-purple-50 transition-colors flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          查看照片
                        </button>
                        <button className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-1">
                          <Share className="w-3 h-3" />
                          分享
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
              <p className="text-gray-500">暂无足迹记录</p>
            </div>
          )}
        </div>

        {/* 相关推荐 */}
        <div className="px-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">相似目的地推荐</h3>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt="推荐目的地"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800">苏州古城游</h4>
                <p className="text-sm text-gray-600">3天2晚 · 8个景点</p>
              </div>
            </div>
            <button className="w-full bg-white text-purple-600 py-2 rounded-xl text-sm font-medium border border-purple-200 hover:bg-purple-50 transition-colors">
              查看详情
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletedTripDetail;