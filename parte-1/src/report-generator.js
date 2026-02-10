import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ReportGenerator {
  constructor(outputDir = null) {
    this.outputDir = outputDir || join(__dirname, '..', 'outputs');
  }

  generateFilename(prefix = 'transfers') {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .substring(0, 19);
    return `${prefix}_${timestamp}`;
  }

  generateCSV(results, summary) {
    const filename = `${this.generateFilename()}.csv`;
    const filepath = join(this.outputDir, filename);

    // CSV Header
    const headers = [
      'index',
      'transfer_id',
      'amount_clp',
      'status',
      'final_status',
      'comment',
      'created_at',
      'error'
    ];

    // CSV Rows
    const rows = results.map(r => [
      r.index,
      r.transfer?.id || 'N/A',
      r.amount,
      r.transfer?.status || 'failed',
      r.finalStatus || r.transfer?.status || 'failed',
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      r.transfer?.createdAt || 'N/A',
      `"${(r.error || '').replace(/"/g, '""')}"`
    ]);

    // Summary rows at the end
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Transfers', summary.total],
      ['Successful', summary.successful],
      ['Pending', summary.pending],
      ['Failed', summary.failed],
      ['Total Amount Attempted (CLP)', summary.totalAmountAttempted],
      ['Total Amount Succeeded (CLP)', summary.totalAmountSucceeded]
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(','))
    ].join('\n');

    writeFileSync(filepath, csvContent, 'utf-8');
    logger.success(`CSV report generated: ${filepath}`);

    return filepath;
  }

  generateJSON(results, summary, metadata = {}) {
    const filename = `${this.generateFilename()}.json`;
    const filepath = join(this.outputDir, filename);

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        ...metadata
      },
      summary,
      transfers: results.map(r => ({
        index: r.index,
        transferId: r.transfer?.id || null,
        amount: r.amount,
        status: r.transfer?.status || 'failed',
        finalStatus: r.finalStatus || r.transfer?.status || 'failed',
        comment: r.comment,
        createdAt: r.transfer?.createdAt || null,
        error: r.error || null
      }))
    };

    writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    logger.success(`JSON report generated: ${filepath}`);

    return filepath;
  }

  generateReport(results, summary, metadata = {}) {
    logger.header('Generating Report');

    const jsonPath = this.generateJSON(results, summary, metadata);

    return { jsonPath };
  }

  generateErrorReport(errorData, metadata = {}) {
    logger.header('Generating Error Report');

    const filename = `${this.generateFilename('error')}.json`;
    const filepath = join(this.outputDir, filename);

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportType: 'ERROR',
        ...metadata
      },
      error: {
        type: errorData.errorType || 'unknown_error',
        message: errorData.error || 'Unknown error occurred',
        details: errorData.details || null
      },
      execution: {
        aborted: errorData.aborted || true,
        abortReason: errorData.abortReason || errorData.error,
        totalPlanned: errorData.totalPlanned || 0,
        totalExecuted: errorData.totalExecuted || 0
      },
      partialResults: errorData.results ? errorData.results.map(r => ({
        index: r.index,
        transferId: r.transfer?.id || null,
        amount: r.amount,
        status: r.transfer?.status || 'failed',
        comment: r.comment,
        error: r.error || null
      })) : [],
      recommendations: this.getErrorRecommendations(errorData.errorType || errorData.abortReason)
    };

    writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    logger.success(`Error report generated: ${filepath}`);

    // Also generate a human-readable text version
    const textFilename = `${this.generateFilename('error')}.txt`;
    const textFilepath = join(this.outputDir, textFilename);
    const textContent = this.formatErrorReportText(report);
    writeFileSync(textFilepath, textContent, 'utf-8');
    logger.success(`Error report (text): ${textFilepath}`);

    return { jsonPath: filepath, textPath: textFilepath };
  }

  formatErrorReportText(report) {
    const lines = [
      '═'.repeat(70),
      'TRANSFER ERROR REPORT',
      '═'.repeat(70),
      '',
      `Generated: ${report.metadata.generatedAt}`,
      '',
      '─'.repeat(70),
      'ERROR DETAILS',
      '─'.repeat(70),
      `Type: ${report.error.type}`,
      `Message: ${report.error.message}`,
      ''
    ];

    if (report.error.details) {
      lines.push('Details:');
      Object.entries(report.error.details).forEach(([key, value]) => {
        if (typeof value === 'number') {
          lines.push(`  - ${key}: $${value.toLocaleString('es-CL')} CLP`);
        } else {
          lines.push(`  - ${key}: ${value}`);
        }
      });
      lines.push('');
    }

    lines.push('─'.repeat(70));
    lines.push('EXECUTION STATUS');
    lines.push('─'.repeat(70));
    lines.push(`Aborted: ${report.execution.aborted ? 'YES' : 'NO'}`);
    lines.push(`Transfers Planned: ${report.execution.totalPlanned}`);
    lines.push(`Transfers Executed: ${report.execution.totalExecuted}`);
    lines.push('');

    if (report.partialResults.length > 0) {
      lines.push('─'.repeat(70));
      lines.push('PARTIAL RESULTS');
      lines.push('─'.repeat(70));
      report.partialResults.forEach(r => {
        const status = r.error ? `FAILED: ${r.error}` : `${r.status}`;
        lines.push(`  #${r.index}: $${r.amount.toLocaleString('es-CL')} CLP - ${status}`);
      });
      lines.push('');
    }

    lines.push('─'.repeat(70));
    lines.push('RECOMMENDATIONS');
    lines.push('─'.repeat(70));
    report.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`);
    });
    lines.push('');
    lines.push('═'.repeat(70));

    return lines.join('\n');
  }

  getErrorRecommendations(errorType) {
    const recommendations = {
      'insufficient_balance': [
        'Check the account balance in the Fintoc Dashboard',
        'Reduce the transfer amount to match available balance',
        'Add funds to the account before retrying',
        'Contact Fintoc support if balance appears incorrect'
      ],
      'invalid_holder_id': [
        'Verify the RUT format is correct (e.g., 12345678-5)',
        'Validate the RUT check digit using the Chilean Modulo 11 algorithm',
        'Ensure the RUT belongs to the intended recipient',
        'Check for typos in the RUT number'
      ],
      'invalid_account': [
        'Verify the account number is correct',
        'Confirm the bank institution ID matches the account',
        'Check that the account type (checking/sight) is correct'
      ],
      'unauthorized': [
        'Verify your API key is valid and not expired',
        'Check that the API key has transfer permissions',
        'Regenerate the API key in the Fintoc Dashboard'
      ],
      'balance_check_failed': [
        'Check your internet connection',
        'Verify the account ID is correct in .env file',
        'Ensure your API key has permission to read account balance'
      ]
    };

    const defaultRecommendations = [
      'Review the error message for specific details',
      'Check the Fintoc documentation: https://docs.fintoc.com',
      'Verify all input parameters are correct',
      'Contact Fintoc support if the issue persists'
    ];

    if (errorType) {
      const lowerType = errorType.toLowerCase();
      for (const [key, recs] of Object.entries(recommendations)) {
        if (lowerType.includes(key)) {
          return recs;
        }
      }
    }

    return defaultRecommendations;
  }
}
