import { Router } from 'express';
import { GitHubController } from '../controllers/github.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Webhook endpoint (no auth required - uses signature verification)
router.post('/webhook', GitHubController.handleWebhook);

// Protected endpoints
router.get('/issues/:owner/:repo/:issue_number', authMiddleware, GitHubController.getIssue);
router.get('/pulls/:owner/:repo/:pull_number', authMiddleware, GitHubController.getPullRequest);
router.get('/pulls/:owner/:repo/:pull_number/files', authMiddleware, GitHubController.getPullRequestFiles);

export default router;