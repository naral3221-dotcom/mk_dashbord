import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/infrastructure/logging';
import { ILogger } from '@/domain/services/ILogger';

type RouteHandler = (
  req: NextRequest,
  context?: unknown,
) => Promise<NextResponse>;

export function withLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    const logger = getLogger();
    const start = Date.now();
    const method = req.method;
    const url = req.nextUrl.pathname;

    const requestLogger = logger.child({ method, url });

    requestLogger.info('Request started');

    let response: NextResponse;
    try {
      response = await handler(req, context);
    } catch (error) {
      const duration = Date.now() - start;
      requestLogger.error('Request failed with unhandled error', {
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    const duration = Date.now() - start;
    const status = response.status;

    if (status >= 500) {
      requestLogger.error('Request completed with server error', { duration, status });
    } else if (status >= 400) {
      requestLogger.warn('Request completed with client error', { duration, status });
    } else {
      requestLogger.info('Request completed', { duration, status });
    }

    return response;
  };
}

export function createRouteLogger(name: string): ILogger {
  return getLogger().child({ route: name });
}
