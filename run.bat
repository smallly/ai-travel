@echo off
REM AI旅行助手 - Flask后端启动脚本 (Windows)

echo 🚀 启动AI旅行助手Flask后端服务...

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python 未安装，请先安装Python
    pause
    exit /b 1
)

REM 创建必要的目录
echo 📁 创建必要目录...
if not exist "database" mkdir database
if not exist "logs" mkdir logs

REM 检查依赖
echo 📦 检查Python依赖...
if not exist "requirements.txt" (
    echo ❌ requirements.txt 文件不存在
    pause
    exit /b 1
)

REM 安装依赖
echo 📥 安装Python依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

REM 检查环境配置
echo ⚙️ 检查环境配置...
if not exist ".env" (
    echo ⚠️ .env 文件不存在，复制示例配置...
    if exist "env.example" (
        copy env.example .env
        echo ✅ 已复制 env.example 到 .env
        echo 🔧 请编辑 .env 文件，配置您的 Dify API 密钥
    ) else (
        echo ❌ env.example 文件不存在，请手动创建 .env 文件
        pause
        exit /b 1
    )
)

REM 验证配置
echo 🔍 验证配置...
python config.py
if errorlevel 1 (
    echo ❌ 配置验证失败，请检查 .env 文件
    pause
    exit /b 1
)

REM 启动服务
echo 🚀 启动Flask服务...
echo 📍 API地址: http://localhost:5000/api
echo 💡 按 Ctrl+C 停止服务
echo.

python app.py