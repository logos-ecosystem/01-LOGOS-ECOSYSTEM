import { Request, Response } from 'express';
import { validationService } from '../../services/validation.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ValidationController {
  async runValidation(req: Request, res: Response) {
    try {
      const report = await validationService.runAllValidations();
      
      // Save report to file
      const reportPath = path.join(process.cwd(), 'validation-reports');
      await fs.mkdir(reportPath, { recursive: true });
      
      const filename = `validation-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
      await fs.writeFile(
        path.join(reportPath, filename),
        JSON.stringify(report, null, 2)
      );
      
      // Generate HTML report if requested
      if (req.query.format === 'html') {
        const htmlReport = await validationService.generateHTMLReport(report);
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlReport);
      }
      
      res.json({
        success: true,
        report,
        savedTo: filename
      });
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed',
        message: error.message
      });
    }
  }
  
  async getValidationHistory(req: Request, res: Response) {
    try {
      const reportPath = path.join(process.cwd(), 'validation-reports');
      const files = await fs.readdir(reportPath);
      
      const reports = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async (file) => {
            const content = await fs.readFile(path.join(reportPath, file), 'utf-8');
            const report = JSON.parse(content);
            return {
              filename: file,
              date: report.generatedAt,
              status: report.overallStatus,
              totalTests: report.totalTests,
              passedTests: report.passedTests,
              failedTests: report.failedTests,
              warningTests: report.warningTests
            };
          })
      );
      
      res.json({
        success: true,
        reports: reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get validation history',
        message: error.message
      });
    }
  }
  
  async getValidationReport(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      const reportPath = path.join(process.cwd(), 'validation-reports', filename);
      
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);
      
      if (req.query.format === 'html') {
        const htmlReport = await validationService.generateHTMLReport(report);
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlReport);
      }
      
      res.json({
        success: true,
        report
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Report not found',
        message: error.message
      });
    }
  }
}

export const validationController = new ValidationController();