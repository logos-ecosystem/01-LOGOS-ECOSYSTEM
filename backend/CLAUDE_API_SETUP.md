# 🤖 Claude API Integration Setup

## 📋 Overview
The LOGOS ECOSYSTEM now includes full Claude AI integration, providing powerful AI capabilities for text processing, code generation, translation, and more.

## 🔑 Environment Variables

Add these to your `.env` file:

```env
# Claude API Configuration
ANTHROPIC_API_KEY=your-claude-api-key-here
# Or alternatively:
# CLAUDE_API_KEY=your-claude-api-key-here

# Optional configurations
CLAUDE_MODEL=claude-3-opus-20240229    # Default model
CLAUDE_MAX_TOKENS=4096                  # Max tokens per request
CLAUDE_TEMPERATURE=0.7                  # Temperature (0-1)
```

## 🚀 Available Endpoints

All endpoints require authentication via Bearer token.

### 1. Send Message
```http
POST /api/claude/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello Claude!"
    }
  ],
  "systemPrompt": "You are a helpful assistant",
  "model": "claude-3-opus-20240229",
  "maxTokens": 1000,
  "temperature": 0.7
}
```

### 2. Stream Response
```http
POST /api/claude/stream
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {
      "role": "user", 
      "content": "Explain quantum computing"
    }
  ],
  "systemPrompt": "Explain complex topics simply"
}
```

Returns Server-Sent Events (SSE) stream.

### 3. Complete Prompt
```http
POST /api/claude/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Write a haiku about programming",
  "systemPrompt": "You are a creative poet"
}
```

### 4. Analyze Text
```http
POST /api/claude/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Your text to analyze...",
  "analysisType": "summary", // or "sentiment", "keywords", "custom"
  "customPrompt": "Required if analysisType is 'custom'"
}
```

### 5. Translate Text
```http
POST /api/claude/translate
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello world",
  "targetLanguage": "Spanish",
  "sourceLanguage": "English" // Optional
}
```

### 6. Generate Code
```http
POST /api/claude/code
Authorization: Bearer <token>
Content-Type: application/json

{
  "requirements": "Create a function to sort an array",
  "language": "TypeScript",
  "framework": "React", // Optional
  "style": "functional" // Optional
}
```

### 7. Answer Questions
```http
POST /api/claude/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What is the meaning of life?",
  "context": "Optional context for the question",
  "format": "detailed" // or "concise", "bullet-points"
}
```

## 📊 Rate Limiting

- Default: 10 requests per minute per authenticated user
- Configurable in `backend/src/api/routes/claude.routes.ts`

## 🔒 Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Rate Limiting**: Prevents API abuse
3. **Input Validation**: All inputs are validated
4. **Error Handling**: Graceful error responses
5. **Logging**: All requests are logged for monitoring

## 📱 Frontend Integration Example

```typescript
// frontend/src/services/claude.service.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ClaudeService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async sendMessage(messages: Array<{role: string, content: string}>) {
    const response = await axios.post(
      `${API_URL}/api/claude/message`,
      { messages },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );
    return response.data;
  }

  async streamMessage(
    messages: Array<{role: string, content: string}>,
    onChunk: (chunk: string) => void
  ) {
    const eventSource = new EventSource(
      `${API_URL}/api/claude/stream?token=${this.token}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.chunk) {
        onChunk(data.chunk);
      } else if (data.done) {
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    // Send the request to initiate streaming
    await fetch(`${API_URL}/api/claude/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ messages }),
    });
  }

  async analyzeText(text: string, analysisType: string) {
    const response = await axios.post(
      `${API_URL}/api/claude/analyze`,
      { text, analysisType },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );
    return response.data;
  }

  async generateCode(requirements: string, language: string, options?: any) {
    const response = await axios.post(
      `${API_URL}/api/claude/code`,
      { requirements, language, ...options },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );
    return response.data;
  }
}
```

## 🧪 Testing the Integration

1. **Get your Claude API key** from [Anthropic Console](https://console.anthropic.com/)
2. **Add to environment variables**
3. **Restart the backend server**
4. **Test with curl**:

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Test Claude message
curl -X POST http://localhost:8000/api/claude/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello Claude!"}
    ]
  }'
```

## 📈 Monitoring

- All Claude API calls are logged in `backend/logs/`
- Metrics available at `/api/system/info`
- Error tracking via Sentry (if configured)

## 🛠️ Troubleshooting

### Common Issues:

1. **401 Unauthorized**: Check your JWT token
2. **429 Too Many Requests**: Rate limit exceeded
3. **500 Internal Error**: Check API key configuration
4. **ANTHROPIC_API_KEY not found**: Ensure environment variable is set

### Debug Mode:

Set `DEBUG=claude:*` in environment variables for detailed logging.

## 📚 API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/api-docs`
- GraphQL Playground: `http://localhost:8000/graphql`

## 🎯 Next Steps

1. **Obtain Claude API Key** from Anthropic
2. **Configure environment variables**
3. **Test the endpoints**
4. **Integrate into your frontend**
5. **Monitor usage and costs**

## 💰 Cost Considerations

- Claude API is usage-based pricing
- Monitor token usage via response metadata
- Set up alerts for usage thresholds
- Consider caching responses for repeated queries

---

Last updated: $(date)
Version: 1.0.0