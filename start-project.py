#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - 项目启动脚本
一键启动前端和后端服务
"""

import os
import sys
import subprocess
import time
import threading
from pathlib import Path

class ProjectLauncher:
    """项目启动器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "flask-backend"
        self.frontend_dir = self.project_root
        
    def print_banner(self):
        """打印启动横幅"""
        banner = """
╔══════════════════════════════════════════════════════════════╗
║                    🤖 AI旅行助手启动器                        ║
║                                                              ║
║  这个脚本将帮助您同时启动前端和后端服务                        ║
║  前端: React + Vite (端口 5173)                             ║
║  后端: Flask API (端口 5000)                                ║
╚══════════════════════════════════════════════════════════════╝
        """
        print(banner)
    
    def check_requirements(self):
        """检查运行环境"""
        print("🔍 检查运行环境...")
        
        # 检查Python
        try:
            python_version = sys.version_info
            if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
                print("❌ Python版本过低，需要Python 3.8+")
                return False
            print(f"✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        except Exception as e:
            print(f"❌ Python检查失败: {e}")
            return False
        
        # 检查Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Node.js {result.stdout.strip()}")
            else:
                print("❌ Node.js未安装，请先安装Node.js")
                return False
        except FileNotFoundError:
            print("❌ Node.js未安装，请先安装Node.js")
            return False
        
        # 检查后端目录
        if not self.backend_dir.exists():
            print("❌ 后端目录不存在")
            return False
        
        # 检查前端package.json
        if not (self.frontend_dir / "package.json").exists():
            print("❌ 前端package.json不存在")
            return False
        
        print("✅ 环境检查通过")
        return True
    
    def setup_backend(self):
        """设置后端环境"""
        print("\n🐍 设置后端环境...")
        
        os.chdir(self.backend_dir)
        
        # 检查.env文件
        env_file = self.backend_dir / ".env"
        env_example = self.backend_dir / "env.example"
        
        if not env_file.exists() and env_example.exists():
            print("📝 复制环境配置文件...")
            import shutil
            shutil.copy(env_example, env_file)
            print("⚠️  请编辑 flask-backend/.env 文件，配置您的Dify API密钥")
        
        # 安装Python依赖
        print("📦 安装Python依赖...")
        try:
            # 优先使用uv
            result = subprocess.run(['uv', '--version'], capture_output=True)
            if result.returncode == 0:
                print("使用uv安装依赖...")
                subprocess.run(['uv', 'pip', 'install', '-r', 'requirements.txt'], check=True)
            else:
                print("使用pip安装依赖...")
                subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
            print("✅ Python依赖安装完成")
        except subprocess.CalledProcessError as e:
            print(f"❌ Python依赖安装失败: {e}")
            return False
        
        return True
    
    def setup_frontend(self):
        """设置前端环境"""
        print("\n⚛️  设置前端环境...")
        
        os.chdir(self.frontend_dir)
        
        # 安装Node.js依赖
        print("📦 安装Node.js依赖...")
        try:
            subprocess.run(['npm', 'install'], check=True)
            print("✅ Node.js依赖安装完成")
        except subprocess.CalledProcessError as e:
            print(f"❌ Node.js依赖安装失败: {e}")
            return False
        
        return True
    
    def start_backend(self):
        """启动后端服务"""
        print("\n🚀 启动后端服务...")
        
        os.chdir(self.backend_dir)
        
        try:
            # 启动Flask应用
            process = subprocess.Popen(
                [sys.executable, 'app.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # 实时输出日志
            for line in process.stdout:
                print(f"[后端] {line.rstrip()}")
                if "AI旅行助手API服务启动成功" in line:
                    break
            
            return process
            
        except Exception as e:
            print(f"❌ 后端启动失败: {e}")
            return None
    
    def start_frontend(self):
        """启动前端服务"""
        print("\n🚀 启动前端服务...")
        
        os.chdir(self.frontend_dir)
        
        try:
            # 启动Vite开发服务器
            process = subprocess.Popen(
                ['npm', 'run', 'dev'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # 实时输出日志
            for line in process.stdout:
                print(f"[前端] {line.rstrip()}")
                if "Local:" in line and "localhost:5173" in line:
                    break
            
            return process
            
        except Exception as e:
            print(f"❌ 前端启动失败: {e}")
            return None
    
    def run(self):
        """运行启动器"""
        self.print_banner()
        
        # 检查环境
        if not self.check_requirements():
            print("\n❌ 环境检查失败，请解决上述问题后重试")
            return False
        
        # 设置后端
        if not self.setup_backend():
            print("\n❌ 后端设置失败")
            return False
        
        # 设置前端
        if not self.setup_frontend():
            print("\n❌ 前端设置失败")
            return False
        
        print("\n" + "="*60)
        print("🎉 环境设置完成，正在启动服务...")
        print("="*60)
        
        # 启动后端（在新线程中）
        def start_backend_thread():
            backend_process = self.start_backend()
            if backend_process:
                backend_process.wait()
        
        backend_thread = threading.Thread(target=start_backend_thread, daemon=True)
        backend_thread.start()
        
        # 等待后端启动
        time.sleep(3)
        
        # 启动前端
        frontend_process = self.start_frontend()
        
        if frontend_process:
            print("\n" + "="*60)
            print("🎉 服务启动成功！")
            print("📍 前端地址: http://localhost:5173")
            print("📍 后端地址: http://localhost:5000")
            print("📍 API文档: http://localhost:5000/api/health")
            print("\n💡 提示:")
            print("   1. 请确保在 flask-backend/.env 中配置了正确的Dify API密钥")
            print("   2. 按 Ctrl+C 停止服务")
            print("="*60)
            
            try:
                # 等待用户中断
                frontend_process.wait()
            except KeyboardInterrupt:
                print("\n👋 正在停止服务...")
                frontend_process.terminate()
                
        return True

def main():
    """主函数"""
    launcher = ProjectLauncher()
    try:
        launcher.run()
    except KeyboardInterrupt:
        print("\n👋 用户中断，退出启动器")
    except Exception as e:
        print(f"\n❌ 启动器异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
