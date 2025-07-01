# Installation Instructions

## System Requirements Missing

It looks like your system needs some packages installed. Please run these commands:

### Ubuntu/Debian:
```bash
# Install Python virtual environment support
sudo apt update
sudo apt install python3.12-venv python3-pip

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python start_server.py
```

### Alternative: Install without virtual environment
```bash
# Install pip if not present
sudo apt update
sudo apt install python3-pip

# Install dependencies system-wide (not recommended but works)
pip3 install --user -r requirements.txt

# Run directly
python3 -m uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Fedora/RHEL:
```bash
sudo dnf install python3-venv python3-pip
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python start_server.py
```

### macOS (with Homebrew):
```bash
# Install Python if needed
brew install python@3.12

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python start_server.py
```

### Windows:
```bash
# In PowerShell or Command Prompt
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python start_server.py
```

## Quick Test (Minimal Dependencies)

If you just want to test quickly, install only the essential packages:

```bash
pip3 install --user fastapi uvicorn pydantic pydantic-settings python-dotenv aiosqlite sqlalchemy
python3 -m uvicorn src.backend.main:app --reload
```

Then open http://localhost:8000 in your browser.

## Troubleshooting

1. **"python3-venv not found"**: Your system needs the venv package. Use the commands above for your OS.

2. **"pip not found"**: Install pip with `sudo apt install python3-pip` (Ubuntu) or equivalent for your OS.

3. **"Permission denied"**: Use `--user` flag with pip or run in a virtual environment.

4. **Port 8000 in use**: Change the port in the command: `--port 8001`

## Docker Alternative (Coming Soon)

We're working on a Docker setup that will work without any Python installation!