# Quick Agent Integration Guide

## Option 1: Manual Integration (Recommended)

Add to `backend/src/server.ts`:

```typescript
// Line ~35 (after imports)
import { createAgentRoutes } from '../EXECUTIVE_AI_ASSISTANT/agent-routes-extension';

// Line ~148 (after other routes)
app.use('/api/ai', createAgentRoutes());
logger.info('🤖 Loaded 158 specialized AI agents');
```

## Option 2: Direct Access

The agents are already implemented in:
- `/EXECUTIVE_AI_ASSISTANT/agent-routes-extension.ts`
- `/EXECUTIVE_AI_ASSISTANT/.../agent-registry.service.ts`
- `/EXECUTIVE_AI_ASSISTANT/.../agent.controller.ts`

## Testing

Once integrated:
1. Start backend: `cd backend && npm run dev`
2. Test: `curl http://localhost:8000/api/ai/agents/categories`
3. Open dashboard: `http://localhost:8888/agent-dashboard-functional.html`

## Troubleshooting

- Permission issues: Files may be owned by root
- Use `sudo` if needed for editing server.ts
- Or copy the integration files to a writable location
