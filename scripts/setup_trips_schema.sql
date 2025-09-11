-- 创建用户行程表
CREATE TABLE IF NOT EXISTS user_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
    cover_image TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建行程详细活动表
CREATE TABLE IF NOT EXISTS trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    start_time TIME,
    end_time TIME,
    estimated_cost DECIMAL(8,2),
    activity_type VARCHAR(50) DEFAULT 'sightseeing' CHECK (activity_type IN ('sightseeing', 'dining', 'shopping', 'entertainment', 'transportation', 'accommodation', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities(trip_id, day_number);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_trips_updated_at 
    BEFORE UPDATE ON user_trips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据函数
CREATE OR REPLACE FUNCTION create_sample_trip(
    p_user_id UUID,
    p_title TEXT,
    p_destination TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_budget DECIMAL DEFAULT 5000.00,
    p_cover_image TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    trip_id UUID;
BEGIN
    -- 创建行程
    INSERT INTO user_trips (user_id, title, destination, start_date, end_date, budget, cover_image)
    VALUES (p_user_id, p_title, p_destination, p_start_date, p_end_date, p_budget, p_cover_image)
    RETURNING id INTO trip_id;
    
    RETURN trip_id;
END;
$$ LANGUAGE plpgsql;