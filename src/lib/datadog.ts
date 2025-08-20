import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

// Datadog configuration
const DATADOG_CONFIG = {
  applicationId: 'YOUR_APPLICATION_ID', // Replace with your Datadog Application ID
  clientToken: 'YOUR_CLIENT_TOKEN', // Replace with your Datadog Client Token
  site: 'datadoghq.com' as const, // or 'datadoghq.eu' for EU
  service: 'cv-analyzer',
  env: 'production', // or 'development'
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
};

export function initializeDatadog() {
  try {
    // Initialize RUM (Real User Monitoring)
    datadogRum.init({
      applicationId: DATADOG_CONFIG.applicationId,
      clientToken: DATADOG_CONFIG.clientToken,
      site: DATADOG_CONFIG.site as any,
      service: DATADOG_CONFIG.service,
      env: DATADOG_CONFIG.env,
      version: DATADOG_CONFIG.version,
      sessionSampleRate: DATADOG_CONFIG.sessionSampleRate,
      sessionReplaySampleRate: DATADOG_CONFIG.sessionReplaySampleRate,
      trackUserInteractions: DATADOG_CONFIG.trackUserInteractions,
      trackResources: DATADOG_CONFIG.trackResources,
      trackLongTasks: DATADOG_CONFIG.trackLongTasks,
      defaultPrivacyLevel: 'mask-user-input',
    });

    // Initialize Logs
    datadogLogs.init({
      clientToken: DATADOG_CONFIG.clientToken,
      site: DATADOG_CONFIG.site as any,
      service: DATADOG_CONFIG.service,
      env: DATADOG_CONFIG.env,
      version: DATADOG_CONFIG.version,
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
    });

    console.log('Datadog monitoring initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Datadog:', error);
  }
}

// Custom tracking functions
export const trackCVUpload = (fileType: string, fileSize: number) => {
  datadogRum.addAction('cv_upload', {
    fileType,
    fileSize,
    timestamp: Date.now(),
  });
  
  datadogLogs.logger.info('CV uploaded', {
    fileType,
    fileSize,
    event: 'cv_upload',
  });
};

export const trackCVAnalysis = (analysis: {
  coverage: number;
  specificity: number;
  impact: number;
  wordCount: number;
  issueCount: number;
}) => {
  datadogRum.addAction('cv_analysis_completed', {
    ...analysis,
    timestamp: Date.now(),
  });
  
  datadogLogs.logger.info('CV analysis completed', {
    ...analysis,
    event: 'cv_analysis',
  });
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  datadogRum.addError(error, context);
  datadogLogs.logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    context,
  });
};

export const trackUserAction = (actionName: string, properties?: Record<string, any>) => {
  datadogRum.addAction(actionName, properties);
  datadogLogs.logger.info(`User action: ${actionName}`, properties);
};