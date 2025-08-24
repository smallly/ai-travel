# AI旅行助手 - 完整部署指南

本文档详细说明如何部署AI旅行助手应用，包括React前端和Flask后端。

## 项目架构

```
AI旅行助手应用
├── React前端 (Vite + TailwindCSS)
│   ├── 端口: 5173 (开发) / 80,443 (生产)
│   ├── 技术栈: React + TypeScript + TailwindCSS
│   └── 功能: 用户界面、聊天交互、地图展示
└── Flask后端 (Python API)
    ├── 端口: 5000 (开发) / 8000 (生产)
    ├── 技术栈: Flask + SQLAlchemy + Dify API
    └── 功能: API服务、AI对话、数据存储
```

## 开发环境部署

### 1. 环境要求

#### 系统要求
- **操作系统**: Windows 10/11, macOS, Linux
- **Python**: 3.8+ (推荐3.10+)
- **Node.js**: 16+ (推荐18+)
- **包管理器**: uv (Python), npm/yarn (Node.js)

#### 工具安装
```bash
# 安装uv (Python包管理器)
pip install uv

# 验证Node.js版本
node --version
npm --version
```

### 2. 后端部署 (Flask API)

#### 步骤1: 进入后端目录
```bash
cd flask-backend
```

#### 步骤2: 创建Python虚拟环境
```bash
# 使用uv创建虚拟环境
uv venv

# 激活虚拟环境
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

#### 步骤3: 安装依赖
```bash
uv pip install -r requirements.txt
```

#### 步骤4: 配置环境变量
```bash
# 复制配置模板
cp env.example .env

# 编辑配置文件
# Windows
notepad .env
# macOS/Linux
nano .env
```

**重要配置项**:
```env
# 必须配置的Dify API密钥
DIFY_API_KEY=app-your-actual-dify-api-key-here

# 生产环境请更改
SECRET_KEY=your-production-secret-key-here

# 如果前端端口不同，请修改
FRONTEND_URL=http://localhost:5173
```

#### 步骤5: 启动后端服务
```bash
python app.py
```

**验证后端启动**:
- 访问: http://localhost:5000/api/health
- 应该返回: `{"status": "ok", "message": "AI旅行助手API服务正常运行"}`

### 3. 前端部署 (React应用)

#### 步骤1: 进入前端目录
```bash
cd ..  # 回到项目根目录
```

#### 步骤2: 安装依赖
```bash
npm install
# 或使用yarn
yarn install
```

#### 步骤3: 配置环境变量 (可选)
```bash
# 创建前端环境配置文件
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
```

#### 步骤4: 启动前端服务
```bash
npm run dev
# 或使用yarn
yarn dev
```

**验证前端启动**:
- 访问: http://localhost:5173
- 应该看到AI旅行助手登录页面

### 4. 完整测试

1. **前端访问**: 打开 http://localhost:5173
2. **登录应用**: 使用任意邮箱和密码登录
3. **测试聊天**: 发送消息 "你好，我想去北京旅游"
4. **检查日志**: 查看 `flask-backend/logs/` 目录下的日志文件

## 生产环境部署

### 1. 服务器要求

#### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 20GB SSD
- **网络**: 10Mbps带宽

#### 推荐配置
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **网络**: 100Mbps带宽

### 2. 后端生产部署

#### 使用Gunicorn部署Flask应用
```bash
# 安装Gunicorn
uv pip install gunicorn

# 生产环境配置
export DEBUG=False
export FLASK_ENV=production

# 启动Gunicorn服务器
gunicorn -w 4 -b 0.0.0.0:8000 --timeout 120 app:app
```

#### 使用Supervisor管理进程
```ini
# /etc/supervisor/conf.d/travel-assistant-api.conf
[program:travel-assistant-api]
command=/path/to/flask-backend/.venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 app:app
directory=/path/to/flask-backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/travel-assistant-api.err.log
stdout_logfile=/var/log/travel-assistant-api.out.log
```

### 3. 前端生产部署

#### 构建生产版本
```bash
# 构建静态文件
npm run build

# 构建产物在 dist/ 目录
ls dist/
```

#### 使用Nginx部署
```nginx
# /etc/nginx/sites-available/travel-assistant
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. HTTPS配置 (推荐)

#### 使用Let's Encrypt
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 5. 数据库优化 (生产环境)

#### 使用PostgreSQL (可选)
```bash
# 安装PostgreSQL
sudo apt install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE travel_assistant;
CREATE USER travel_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE travel_assistant TO travel_user;
```

**更新Flask配置**:
```env
DATABASE_URL=postgresql://travel_user:secure_password@localhost/travel_assistant
```

**安装PostgreSQL驱动**:
```bash
uv pip install psycopg2-binary
```

### 6. 监控和日志

#### 设置日志轮转
```bash
# /etc/logrotate.d/travel-assistant
/path/to/flask-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 www-data www-data
}
```

#### 监控脚本
```bash
#!/bin/bash
# monitor.sh - 服务监控脚本

API_URL="http://localhost:8000/api/health"
FRONTEND_URL="http://localhost"

# 检查API服务
if curl -f -s $API_URL > /dev/null; then
    echo "✅ API服务正常"
else
    echo "❌ API服务异常"
    # 重启服务
    sudo supervisorctl restart travel-assistant-api
fi

# 检查前端服务
if curl -f -s $FRONTEND_URL > /dev/null; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
    sudo systemctl restart nginx
fi
```

## 常见问题和解决方案

### 1. API连接失败
```bash
# 检查后端服务状态
curl http://localhost:5000/api/health

# 检查防火墙设置
sudo ufw status

# 检查端口占用
netstat -tlnp | grep :5000
```

### 2. CORS错误
```javascript
// 前端错误: Access to fetch at 'http://localhost:5000/api' from origin 'http://localhost:5173' has been blocked by CORS policy

// 解决方案: 检查Flask后端CORS配置
// flask-backend/app.py
CORS(app, origins=[
    "http://localhost:5173",  # 开发环境
    "https://your-domain.com"  # 生产环境
])
```

### 3. Dify API调用失败
```bash
# 检查API密钥
grep DIFY_API_KEY .env

# 测试API连接
curl -X POST https://api.dify.ai/v1/chat-messages \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"inputs":{},"query":"hello","response_mode":"blocking","user":"test"}'
```

### 4. 数据库问题
```bash
# 检查数据库文件权限
ls -la database/

# 重新初始化数据库
python -c "from app import init_db; init_db()"
```

## 性能优化

### 1. 前端优化
```bash
# 启用Gzip压缩
# nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 使用CDN加速
# 将静态资源上传到CDN
```

### 2. 后端优化
```python
# 数据库连接池
# app.py
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 20,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}

# Redis缓存 (可选)
pip install redis flask-caching
```

### 3. 系统优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
sysctl -p
```

## 备份策略

### 1. 数据库备份
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp database/travel.db backups/travel_${DATE}.db

# 保留最近7天的备份
find backups/ -name "travel_*.db" -mtime +7 -delete
```

### 2. 配置文件备份
```bash
# 备份重要配置
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env \
  /etc/nginx/sites-available/travel-assistant \
  /etc/supervisor/conf.d/travel-assistant-api.conf
```

## 安全建议

1. **定期更新依赖包**
2. **使用强密码和密钥**
3. **启用防火墙**
4. **定期备份数据**
5. **监控异常访问**
6. **使用HTTPS**
7. **限制API访问频率**

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看日志文件获取详细错误信息
2. 检查配置文件是否正确
3. 确认所有依赖都已正确安装
4. 验证网络连接和防火墙设置

部署完成后，您的AI旅行助手应用就可以正常运行了！
