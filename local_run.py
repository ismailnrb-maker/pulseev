#!/usr/bin/env python
import os
import sys
import subprocess
import socket

def install_dependencies():
    print("Checking PulseEV dependencies...")
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        import jwt
        import passlib
        import multipart
        print("All dependencies are already installed.")
    except Exception as e:
        print(f"Dependency check failed ({e}). Installing/upgrading requirements...")
        # Try uv first (extremely fast), fall back to pip
        try:
            subprocess.check_call([sys.executable, "-m", "uv", "pip", "install", "-U", "-r", "requirements.txt"])
        except Exception:
            try:
                subprocess.check_call(["uv", "pip", "install", "-U", "-r", "requirements.txt"])
            except Exception:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "-U", "-r", "requirements.txt"])
        print("Dependencies installed successfully.")

def get_local_ip():
    try:
        # Create dummy socket to get local IP routing information
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

def start_server():
    local_ip = get_local_ip()
    port = 8000
    
    print("\n" + "="*60)
    print("                 PULSEEV ONLINE SERVER RUNNER")
    print("="*60)
    print(f" * Localhost access:   http://localhost:{port}/")
    print(f" * LAN Team access:    http://{local_ip}:{port}/")
    print("="*60)
    print("Press Ctrl+C to terminate the server.\n")
    
    import uvicorn
    uvicorn.run("api.index:app", host="0.0.0.0", port=port, reload=False)

if __name__ == "__main__":
    install_dependencies()
    start_server()
