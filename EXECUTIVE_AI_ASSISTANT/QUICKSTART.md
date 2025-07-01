# Executive AI Assistant - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Server

**Option A - Using the shell script (Linux/Mac):**
```bash
./run.sh
```

**Option B - Using Python (All platforms):**
```bash
python start_server.py
```

### Step 2: Test the System
```bash
python test_system.py
```

### Step 3: Access the Application
- **Web Interface**: Open http://localhost:8000 in your browser
- **API Documentation**: Visit http://localhost:8000/docs
- **Voice Assistant**: Run `python src/prototype/voice_assistant_demo.py`
- **CLI Interface**: Run `python src/prototype/unified_control_demo.py`

## 🔑 Adding API Keys (Optional)

The system works without API keys but with limited functionality. To enable AI features:

1. Edit the `.env` file:
```bash
# For OpenAI (GPT-4)
OPENAI_API_KEY=sk-your-api-key-here

# For Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

2. Restart the server

## 🎯 Quick Features Tour

### Web Chat Interface
1. Open http://localhost:8000
2. Type a message and press Enter
3. Switch between domains (Healthcare, Legal, Sports) by clicking the cards

### Voice Assistant
```bash
python src/prototype/voice_assistant_demo.py
```
- Say "Hello" to start
- Say "Spanish" to switch languages
- Say "Exit" to quit

### CLI Control Center
```bash
python src/prototype/unified_control_demo.py
```
- Use arrow keys to navigate
- Select options with Enter
- Access all features from one interface

## 🆘 Troubleshooting

### Server won't start?
- Check Python version: `python --version` (needs 3.11+)
- Install dependencies: `pip install -r requirements.txt`
- Check port 8000 is free: `lsof -i :8000` (Linux/Mac)

### No AI responses?
- Add API keys to `.env` file
- Restart the server after adding keys
- Check API key format (should start with 'sk-')

### Database errors?
- Delete the `data/` folder
- Restart the server (it will recreate the database)

## 📚 Next Steps

- Read the full documentation in `README.md`
- Explore the API at http://localhost:8000/docs
- Customize domain expertise in `src/backend/services/domain_services.py`
- Add your own features!

## 💡 Tips

- The system shows friendly messages when API keys are missing
- All chat history is saved in the local database
- You can use both English and Spanish languages
- The web interface works on mobile devices too!

---

Need help? Check the logs in the terminal where you started the server.