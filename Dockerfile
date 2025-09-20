# Docker 部署配置

# 使用官方Python运行时作为父镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖包括Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt package*.json ./

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 安装Node.js依赖
RUN npm install

# 复制应用代码
COPY . .

# 构建前端
RUN npm run build

# 创建必要的目录
RUN mkdir -p database logs

# 设置环境变量
ENV PYTHONPATH=/app
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 5000

# curl已在上面安装

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-5000}/api/health || exit 1

# 启动命令（生产环境使用gunicorn）
CMD ["sh", "-c", "if [ \"$RAILWAY_ENVIRONMENT\" = \"production\" ] || [ -n \"$PORT\" ]; then gunicorn --bind 0.0.0.0:${PORT:-5000} app:app --workers 2 --timeout 120; else python app.py; fi"]