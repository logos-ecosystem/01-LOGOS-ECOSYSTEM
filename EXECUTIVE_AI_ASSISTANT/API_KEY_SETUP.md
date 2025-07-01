# API Key Setup Guide

## Quick Setup

1. **Edit the .env file**:
   ```bash
   nano .env
   ```

2. **Add your API keys** (replace the placeholder text):
   - For OpenAI: `OPENAI_API_KEY=sk-your-actual-key-here`
   - For Anthropic: `ANTHROPIC_API_KEY=sk-ant-your-actual-key-here`

3. **Save and exit** (Ctrl+X, then Y, then Enter)

4. **The server will auto-reload** with your new keys

## Getting API Keys

### OpenAI (GPT-4)
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with 'sk-')
5. Add to .env file

### Anthropic (Claude)
1. Go to https://console.anthropic.com/account/keys
2. Sign in or create an account
3. Click "Create Key"
4. Copy the key (starts with 'sk-ant-')
5. Add to .env file

## Testing Your Setup

Run the test script:
```bash
python3 test_api_keys.py
```

You should see:
- ✅ Health check passed
- ✅ Success! API is working
- A proper AI response (not an error message)

## Troubleshooting

- **Still seeing "no AI model configured"?** Make sure you removed the placeholder text completely
- **Server errors?** Check the server.log file: `tail -f server.log`
- **Need to restart manually?** Kill the server with `pkill -f uvicorn` then run `./run.sh`

## Using Without API Keys

The system will still work without API keys but will show friendly error messages instead of AI responses. This is useful for:
- Testing the interface
- Development work
- Demo purposes