#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - Gunicorn配置文件
生产环境WSGI服务器配置
"""

import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 服务器配置
bind = f"{os.getenv('HOST', '127.0.0.1')}:{os.getenv('PORT', 5000)}"
workers = int(os.getenv('GUNICORN_WORKERS', 4))
worker_class = os.getenv('GUNICORN_WORKER_CLASS', 'sync')
worker_connections = int(os.getenv('GUNICORN_WORKER_CONNECTIONS', 1000))
max_requests = int(os.getenv('GUNICORN_MAX_REQUESTS', 1000))
max_requests_jitter = int(os.getenv('GUNICORN_MAX_REQUESTS_JITTER', 100))

# 日志配置
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
accesslog = os.getenv('GUNICORN_ACCESS_LOG', 'logs/gunicorn_access.log')
errorlog = os.getenv('GUNICORN_ERROR_LOG', 'logs/gunicorn_error.log')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程配置
daemon = os.getenv('GUNICORN_DAEMON', 'False').lower() == 'true'
pidfile = os.getenv('GUNICORN_PIDFILE', 'logs/gunicorn.pid')
user = os.getenv('GUNICORN_USER', None)
group = os.getenv('GUNICORN_GROUP', None)

# 性能配置
timeout = int(os.getenv('GUNICORN_TIMEOUT', 120))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', 5))
preload_app = os.getenv('GUNICORN_PRELOAD_APP', 'True').lower() == 'true'

# SSL配置（如果需要）
keyfile = os.getenv('SSL_KEYFILE', None)
certfile = os.getenv('SSL_CERTFILE', None)

# 安全配置
limit_request_line = int(os.getenv('GUNICORN_LIMIT_REQUEST_LINE', 4096))
limit_request_fields = int(os.getenv('GUNICORN_LIMIT_REQUEST_FIELDS', 100))
limit_request_field_size = int(os.getenv('GUNICORN_LIMIT_REQUEST_FIELD_SIZE', 8190))

def when_ready(server):
    """服务器启动完成后的回调"""
    server.log.info("🚀 AI旅行助手 Gunicorn 服务启动完成")
    server.log.info(f"📍 绑定地址: {bind}")
    server.log.info(f"👥 工作进程数: {workers}")

def on_exit(server):
    """服务器退出时的回调"""
    server.log.info("🛑 AI旅行助手 Gunicorn 服务已停止")