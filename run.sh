#!/bin/bash
# AI旅行助手 - Flask后端启动脚本

set -e  # 脚本遇到错误时退出

echo "🚀 启动AI旅行助手Flask后端服务..."

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python3"
    exit 1
fi

# 检查pip
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "❌ pip 未安装，请先安装pip"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p database
mkdir -p logs

# 检查依赖
echo "📦 检查Python依赖..."
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt 文件不存在"
    exit 1
fi

# 安装依赖
echo "📥 安装Python依赖..."
if command -v uv &> /dev/null; then
    echo "使用uv安装依赖..."
    uv pip install -r requirements.txt
else
    echo "使用pip安装依赖..."
    pip3 install -r requirements.txt 2>/dev/null || pip install -r requirements.txt
fi

# 检查环境配置
echo "⚙️ 检查环境配置..."
if [ ! -f ".env" ]; then
    echo "⚠️ .env 文件不存在，复制示例配置..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ 已复制 env.example 到 .env"
        echo "🔧 请编辑 .env 文件，配置您的 Dify API 密钥"
    else
        echo "❌ env.example 文件不存在，请手动创建 .env 文件"
        exit 1
    fi
fi

# 验证配置
echo "🔍 验证配置..."
python3 config.py

if [ $? -ne 0 ]; then
    echo "❌ 配置验证失败，请检查 .env 文件"
    exit 1
fi

# 启动服务
echo "🚀 启动Flask服务..."
echo "📍 API地址: http://localhost:5000/api"
echo "💡 按 Ctrl+C 停止服务"
echo ""

python3 app.py