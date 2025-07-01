import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { verify } from '@octokit/webhooks-methods';
import { ClaudeService } from './claude.service';
import { logger } from '../utils/logger';

interface GitHubWebhookPayload {
  action: string;
  issue?: {
    number: number;
    title: string;
    body: string;
    user: {
      login: string;
    };
  };
  pull_request?: {
    number: number;
    title: string;
    body: string;
    user: {
      login: string;
    };
  };
  comment?: {
    id: number;
    body: string;
    user: {
      login: string;
    };
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
}

class GitHubService {
  private octokit: Octokit;
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    
    if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY) {
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_PRIVATE_KEY,
          installationId: process.env.GITHUB_INSTALLATION_ID,
        },
      });
    } else if (process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
      });
    } else {
      logger.warn('GitHub service initialized without authentication');
      this.octokit = new Octokit();
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      return await verify(this.webhookSecret, payload, signature);
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  async handleWebhook(payload: GitHubWebhookPayload): Promise<void> {
    const { action, issue, pull_request, comment, repository } = payload;
    
    if (!comment?.body.includes('@claude')) {
      return;
    }

    try {
      const context = this.extractContext(payload);
      const userQuestion = this.extractClaudeQuery(comment.body);
      
      if (!userQuestion) {
        return;
      }

      const response = await claudeService.generateResponse({
        messages: [
          {
            role: 'system',
            content: `You are Claude, an AI assistant helping with GitHub ${issue ? 'issue' : 'pull request'} #${issue?.number || pull_request?.number} in repository ${repository.owner.login}/${repository.name}. 
            
Context:
Title: ${issue?.title || pull_request?.title}
Description: ${issue?.body || pull_request?.body}
User: ${comment.user.login}

Provide helpful, concise responses focused on the technical aspects of the issue or pull request.`
          },
          {
            role: 'user',
            content: userQuestion
          }
        ],
        maxTokens: 1000,
        temperature: 0.7
      });

      await this.postComment(
        repository.owner.login,
        repository.name,
        issue?.number || pull_request?.number || 0,
        response
      );

    } catch (error) {
      logger.error('Error handling GitHub webhook:', error);
      
      await this.postComment(
        repository.owner.login,
        repository.name,
        issue?.number || pull_request?.number || 0,
        'Sorry, I encountered an error while processing your request. Please try again later.'
      );
    }
  }

  private extractContext(payload: GitHubWebhookPayload): string {
    const { issue, pull_request, repository } = payload;
    
    return `
Repository: ${repository.owner.login}/${repository.name}
Type: ${issue ? 'Issue' : 'Pull Request'}
Number: ${issue?.number || pull_request?.number}
Title: ${issue?.title || pull_request?.title}
    `.trim();
  }

  private extractClaudeQuery(commentBody: string): string | null {
    const claudeMentions = commentBody.match(/@claude\s+([\s\S]+?)(?=@\w+|$)/gi);
    
    if (!claudeMentions || claudeMentions.length === 0) {
      return null;
    }

    return claudeMentions
      .map(mention => mention.replace(/@claude\s+/i, '').trim())
      .join('\n\n');
  }

  async postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      });
    } catch (error) {
      logger.error('Error posting GitHub comment:', error);
      throw error;
    }
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    try {
      const { data } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });
      return data;
    } catch (error) {
      logger.error('Error fetching GitHub issue:', error);
      throw error;
    }
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    try {
      const { data } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });
      return data;
    } catch (error) {
      logger.error('Error fetching GitHub pull request:', error);
      throw error;
    }
  }

  async getPullRequestFiles(owner: string, repo: string, pullNumber: number) {
    try {
      const { data } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber
      });
      return data;
    } catch (error) {
      logger.error('Error fetching pull request files:', error);
      throw error;
    }
  }
}

export const githubService = new GitHubService();