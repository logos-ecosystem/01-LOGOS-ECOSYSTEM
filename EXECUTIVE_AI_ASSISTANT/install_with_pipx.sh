#!/bin/bash
# Install Executive AI Assistant with pipx (for systems with managed Python)

echo "Executive AI Assistant - Alternative Installation"
echo "=============================================="
echo ""
echo "Your system has externally-managed Python (PEP 668)."
echo "This script provides alternatives:"
echo ""

# Option 1: Using pipx
echo "Option 1: Install pipx and use it"
echo "Run these commands:"
echo ""
echo "  sudo apt install pipx"
echo "  pipx install fastapi"
echo "  pipx install uvicorn"
echo ""

# Option 2: Force install with --break-system-packages
echo "Option 2: Force install (not recommended)"
echo "Run:"
echo ""
echo "  python3 get-pip.py --user --break-system-packages"
echo "  ~/.local/bin/pip install --user --break-system-packages -r requirements.txt"
echo ""

# Option 3: Use virtual environment with system packages
echo "Option 3: Use virtual environment (recommended)"
echo "Run:"
echo ""
echo "  sudo apt install python3-full python3.12-venv"
echo "  python3 -m venv venv --system-site-packages"
echo "  source venv/bin/activate"
echo "  pip install -r requirements.txt"
echo ""

# Option 4: Minimal direct run
echo "Option 4: Install minimal deps with apt"
echo "Run:"
echo ""
echo "  sudo apt install python3-fastapi python3-uvicorn python3-pydantic"
echo "  python3 -m uvicorn src.backend.main:app --reload"
echo ""

echo "Choose the option that works best for your setup!"