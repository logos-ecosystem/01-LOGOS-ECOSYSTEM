# 🚀 Executive AI Assistant - Setup Instructions

## Current Status
Your system needs some packages installed to run the full application. Here are your options:

## Option 1: Quick Demo (No Installation Required)
Run the standalone demo that works without any dependencies:

```bash
python3 standalone_demo.py
```

Then open http://localhost:8000 in your browser. This shows the interface but without AI features.

## Option 2: Full Installation (Recommended)

### Step 1: Install System Requirements
```bash
# Update your system
sudo apt update

# Install Python virtual environment and pip
sudo apt install python3-venv python3-pip

# Or if you're using a different Python version:
sudo apt install python3.12-venv python3-pip
```

### Step 2: Create Virtual Environment
```bash
# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows
```

### Step 3: Install Dependencies
```bash
# With virtual environment activated:
pip install -r requirements.txt
```

### Step 4: Start the Server
```bash
# With virtual environment activated:
python start_server.py

# OR use the shell script:
./run.sh
```

## Option 3: Minimal Installation (Without Virtual Environment)

If you can't install system packages, try this:

```bash
# Install pip for your user only
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3 get-pip.py --user

# Add pip to your PATH
export PATH=$PATH:$HOME/.local/bin

# Install minimal dependencies
pip install --user fastapi uvicorn pydantic pydantic-settings python-dotenv aiosqlite sqlalchemy

# Run the server
python3 -m uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

## What You Need to Know

1. **Without `python3-venv`**: You can't create virtual environments
2. **Without `pip`**: You can't install Python packages
3. **Without dependencies**: You can only run the standalone demo

## Next Steps After Installation

1. Add your API keys to `.env`:
   - OpenAI API key for GPT-4
   - Anthropic API key for Claude

2. Access the application:
   - Web Interface: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Voice Demo: `python src/prototype/voice_assistant_demo.py`
   - CLI Demo: `python src/prototype/unified_control_demo.py`

## Troubleshooting

- **"sudo: password required"**: You need administrator access to install system packages
- **"pip: command not found"**: You need to install pip first
- **"No module named 'fastapi'"**: Dependencies aren't installed yet

## Can't Install Anything?

If you can't install packages on this system, you can:
1. Run the `standalone_demo.py` for a basic demo
2. Use a cloud service like Google Colab or Replit
3. Use Docker (when we add Docker support)
4. Ask your system administrator to install the requirements

---

**Remember**: The standalone demo (`python3 standalone_demo.py`) always works without any installation!