# 🤖 Claude GitHub App Setup Guide

## Overview
This guide helps you configure the Claude GitHub App to enable @claude mentions in your GitHub issues and pull requests.

## Prerequisites
- GitHub account with repository access
- Backend API running with Claude integration
- Environment variables configured

## Installation Steps

### 1. Install the Claude GitHub App
1. Visit [Claude for GitHub App](https://github.com/apps/claude-for-github)
2. Click "Install"
3. Select your organization or personal account
4. Choose repositories:
   - Select "All repositories" for organization-wide access
   - Or select specific repositories including `01-LOGOS-ECOSYSTEM`

### 2. Configure Environment Variables
Add these to your backend `.env` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----"
GITHUB_INSTALLATION_ID=your_installation_id
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Alternative: Personal Access Token
GITHUB_TOKEN=your_personal_access_token
```

### 3. Configure Webhook URL
In your GitHub App settings, set the webhook URL to:
```
https://api.logos-ecosystem.com/api/github/webhook
```

### 4. Required Permissions
The app needs these permissions:
- **Issues**: Read & Write
- **Pull requests**: Read & Write
- **Contents**: Read (for code review)
- **Metadata**: Read

### 5. Subscribe to Events
Enable these webhook events:
- Issue comments
- Pull request comments
- Pull request review comments

## Usage Examples

### In Issues
```markdown
@claude Can you help me understand why this error is occurring?

Error: Cannot read property 'map' of undefined
  at Dashboard.render (Dashboard.tsx:45)
```

### In Pull Requests
```markdown
@claude Please review this code for potential security issues and performance optimizations.
```

### Code Review
```markdown
@claude What's the time complexity of this algorithm? Can it be optimized?
```

### Architecture Questions
```markdown
@claude Should we use Redis or in-memory caching for this feature?
```

## Advanced Features

### 1. Context-Aware Responses
Claude automatically analyzes:
- Issue/PR title and description
- Related code changes
- Repository structure
- Previous comments

### 2. Code Analysis
When reviewing PRs, Claude can:
- Identify potential bugs
- Suggest performance improvements
- Check for security vulnerabilities
- Recommend best practices

### 3. Multi-Language Support
Claude supports all programming languages in your repository:
- TypeScript/JavaScript
- Python
- Go
- And more...

## API Endpoints

### Webhook Endpoint
```
POST /api/github/webhook
```
Receives GitHub events and triggers Claude responses.

### Manual Endpoints (for testing)
```
GET /api/github/issues/:owner/:repo/:issue_number
GET /api/github/pulls/:owner/:repo/:pull_number
GET /api/github/pulls/:owner/:repo/:pull_number/files
```

## Troubleshooting

### Claude Not Responding
1. Check webhook delivery in GitHub settings
2. Verify environment variables
3. Check API logs: `docker logs logos-backend`
4. Ensure Claude API key is valid

### Authentication Errors
1. Regenerate GitHub App private key
2. Update GITHUB_PRIVATE_KEY in .env
3. Restart backend service

### Rate Limiting
- Claude has usage limits
- Implement caching for repeated questions
- Use batch processing for multiple requests

## Security Best Practices

1. **Never commit secrets**
   - Use AWS Secrets Manager
   - Or environment variables

2. **Validate webhooks**
   - Always verify GitHub signatures
   - Check payload integrity

3. **Limit permissions**
   - Only grant necessary repository access
   - Use fine-grained permissions

## Integration with LOGOS Ecosystem

The GitHub integration works seamlessly with:
- **Support System**: Auto-create tickets from issues
- **Dashboard**: View GitHub activity metrics
- **AI Agents**: Specialized bots for different tasks
- **Notifications**: Real-time updates via WebSocket

## Next Steps

1. Test the integration with a simple @claude mention
2. Configure specialized AI agents for specific tasks
3. Set up automated workflows
4. Monitor usage and optimize responses

## Support

For issues or questions:
- Create a support ticket in the dashboard
- Email: support@logos-ecosystem.com
- Check logs: `/api/health/logs`

---

Last updated: $(date)