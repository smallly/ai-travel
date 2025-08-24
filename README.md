# AI旅行助手 - Flask后端API

为React前端提供API服务的Flask后端应用，集成Dify AI服务。

## 功能特点

- 🤖 **Dify AI集成**: 智能旅行助手对话服务
- 💾 **数据持久化**: SQLite数据库存储对话记录
- 📝 **对话管理**: 创建、查看、删除对话历史
- 🗺️ **导航服务**: 生成多平台地图导航链接
- 📊 **日志系统**: 完整的操作日志记录
- 🔗 **CORS支持**: 支持React前端跨域访问

## 技术栈

- **框架**: Flask 2.3.3
- **数据库**: SQLite + SQLAlchemy ORM
- **AI服务**: Dify API
- **跨域**: Flask-CORS
- **环境管理**: python-dotenv
- **时区**: pytz (北京时间)

## API接口

### 健康检查
```
GET /api/health
```

### 对话管理
```
GET /api/conversations              # 获取所有对话
POST /api/conversations             # 创建新对话
DELETE /api/conversations/{id}      # 删除对话
GET /api/conversations/{id}/messages # 获取对话消息
```

### 聊天功能
```
POST /api/chat/send                 # 发送消息并获取AI回复
```

### 导航服务
```
POST /api/locations/navigation      # 获取导航链接
```

## 快速开始

### 1. 安装依赖
```bash
# 使用uv（推荐）
uv pip install -r requirements.txt

# 或使用pip
pip install -r requirements.txt
```

### 2. 配置环境
```bash
# 复制配置文件
cp env.example .env

# 编辑配置文件，填入您的Dify API密钥
nano .env
```

### 3. 启动服务
```bash
python app.py
```

服务将在 http://localhost:5000 启动

## 环境配置

在 `.env` 文件中配置以下参数：

```env
# Flask应用配置
SECRET_KEY=your-secret-key-change-this-in-production
DEBUG=True

# 服务器配置
HOST=127.0.0.1
PORT=5000

# Dify API配置（必填）
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=your-dify-api-key-here

# 数据库配置
DATABASE_URL=sqlite:///database/travel.db

# 日志配置
LOG_DIRECTORY=logs
LOG_LEVEL=INFO
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=5

# 时区配置
TIMEZONE=Asia/Shanghai

# 前端地址（CORS配置）
FRONTEND_URL=http://localhost:5173
```

## 数据库结构

### conversations表
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### messages表
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    sender_type VARCHAR(10) NOT NULL,  -- 'user' or 'ai'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
);
```

## 日志系统

- 日志文件按日期命名：`YYYY-MM-DD.log`
- 自动轮转：单文件最大10MB，保留5个备份
- 日志级别：INFO（可配置）
- 记录内容：API调用、错误信息、用户操作

## 开发调试

### 查看日志
```bash
# 实时查看今天的日志
tail -f logs/$(date +%Y-%m-%d).log

# 查看错误日志
grep ERROR logs/$(date +%Y-%m-%d).log
```

### 测试API
```bash
# 健康检查
curl http://localhost:5000/api/health

# 发送测试消息
curl -X POST http://localhost:5000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，我想去北京旅游"}'
```

## 部署说明

### 生产环境配置
1. 设置 `DEBUG=False`
2. 使用强密码作为 `SECRET_KEY`
3. 配置真实的 `DIFY_API_KEY`
4. 考虑使用 PostgreSQL 替代 SQLite
5. 使用 Gunicorn 或 uWSGI 作为 WSGI 服务器

### 使用Gunicorn部署
```bash
# 安装Gunicorn
pip install gunicorn

# 启动服务
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 故障排除

### 常见问题

1. **Dify API调用失败**
   - 检查 `DIFY_API_KEY` 是否正确
   - 确认网络连接正常
   - 查看日志文件获取详细错误信息

2. **CORS错误**
   - 确认前端地址在 `FRONTEND_URL` 中配置正确
   - 检查前端请求的端口号

3. **数据库错误**
   - 确保 `database` 目录存在且有写权限
   - 检查 SQLite 文件是否正常创建

### 日志分析
```bash
# 查看API调用统计
grep "发送消息到Dify" logs/*.log | wc -l

# 查看错误统计
grep "ERROR" logs/*.log | wc -l

# 查看今日活跃度
grep $(date +%Y-%m-%d) logs/*.log | wc -l
```
