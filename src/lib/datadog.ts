import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

// Datadog configuration
const DATADOG_CONFIG = {
  applicationId: 'c0ba3158-b3de-4fff-92d2-3bc6e1c55070', // Replace with your Datadog Application ID
  clientToken: 'pubf0c1bee78435f20b13bc86aace534e86', // Replace with your Datadog Client Token
  site: 'us5.datadoghq.com' as const, // or 'datadoghq.eu' for EU
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
    // Initialize RUM (Real User Monitoring) with distributed tracing
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
      // Enable distributed tracing
      allowedTracingUrls: [
        { match: '*', propagatorTypes: ['datadog', 'tracecontext'] }
      ],
      traceSampleRate: 100,
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

    console.log('Datadog monitoring with distributed tracing initialized successfully');
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

// Distributed tracing functions using RUM SDK
export const startCustomTrace = (operationName: string, context?: Record<string, any>) => {
  datadogRum.addAction(`${operationName}_started`, {
    ...context,
    phase: 'start',
    timestamp: Date.now(),
  });
  datadogLogs.logger.info(`Starting operation: ${operationName}`, context);
};

export const finishCustomTrace = (operationName: string, context?: Record<string, any>) => {
  datadogRum.addAction(`${operationName}_completed`, {
    ...context,
    phase: 'complete',
    completed: true,
    timestamp: Date.now(),
  });
  datadogLogs.logger.info(`Completed operation: ${operationName}`, context);
};

export const traceAsyncOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  const startTime = Date.now();
  startCustomTrace(operationName, context);
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    finishCustomTrace(operationName, {
      ...context,
      success: true,
      duration,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    finishCustomTrace(operationName, {
      ...context,
      success: false,
      duration,
      error: errorMessage,
    });
    
    trackError(error instanceof Error ? error : new Error(errorMessage), {
      operation: operationName,
      context,
    });
    
    throw error;
  }
};