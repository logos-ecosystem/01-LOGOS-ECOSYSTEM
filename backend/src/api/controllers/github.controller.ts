import { Request, Response } from 'express';
import { githubService } from '../../services/github.service';
import { logger } from '../../utils/logger';

export class GitHubController {
  static async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const event = req.headers['x-github-event'] as string;
      const payload = JSON.stringify(req.body);

      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      const isValid = await githubService.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      logger.info(`Received GitHub webhook event: ${event}`);

      if (event === 'issue_comment' || event === 'pull_request_review_comment') {
        await githubService.handleWebhook(req.body);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Error handling GitHub webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIssue(req: Request, res: Response) {
    try {
      const { owner, repo, issue_number } = req.params;
      
      const issue = await githubService.getIssue(
        owner,
        repo,
        parseInt(issue_number)
      );
      
      res.json(issue);
    } catch (error) {
      logger.error('Error fetching issue:', error);
      res.status(500).json({ error: 'Failed to fetch issue' });
    }
  }

  static async getPullRequest(req: Request, res: Response) {
    try {
      const { owner, repo, pull_number } = req.params;
      
      const pullRequest = await githubService.getPullRequest(
        owner,
        repo,
        parseInt(pull_number)
      );
      
      res.json(pullRequest);
    } catch (error) {
      logger.error('Error fetching pull request:', error);
      res.status(500).json({ error: 'Failed to fetch pull request' });
    }
  }

  static async getPullRequestFiles(req: Request, res: Response) {
    try {
      const { owner, repo, pull_number } = req.params;
      
      const files = await githubService.getPullRequestFiles(
        owner,
        repo,
        parseInt(pull_number)
      );
      
      res.json(files);
    } catch (error) {
      logger.error('Error fetching pull request files:', error);
      res.status(500).json({ error: 'Failed to fetch pull request files' });
    }
  }
}