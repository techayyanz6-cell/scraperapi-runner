import subprocess
import os
import sys

print("⚡ Starting ScraperAPI 24/7 Runner Engine...")

# Ensure npm dependencies are installed
if not os.path.exists("node_modules"):
    print("📦 Installing npm packages...")
    subprocess.run(["npm", "install"], check=True)

# Hugging Face default web port
os.environ["PORT"] = "7860"

# Start Node.js server
proc = subprocess.Popen(["node", "server.js"])

# Wait for process
proc.wait()
