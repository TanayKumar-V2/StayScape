import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Global HTTP exception filter that returns consistent JSON error responses.
 * Ensures that internal stack traces and infrastructure details are never
 * exposed to API consumers.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj['message'] as string | string[]) ?? exception.message;
        error = (responseObj['error'] as string) ?? 'Error';
      } else {
        message = exception.message;
        error = 'Error';
      }
    } else {
      // Safety-net: PostgreSQL exclusion constraint violation surfacing as
      // PrismaClientUnknownRequestError — treat as a 409 Conflict.
      if (
        exception instanceof Prisma.PrismaClientUnknownRequestError &&
        (exception.message.includes('23P01') ||
          exception.message.includes('no_overlapping_active_bookings'))
      ) {
        statusCode = HttpStatus.CONFLICT;
        message = 'The selected dates are no longer available. Please choose different dates.';
        error = 'Conflict';

        this.logger.warn(
          `Exclusion constraint violation on ${request.method} ${request.url}: ${exception.message}`,
        );
      } else {
        // Unexpected / internal errors — log fully, respond generically
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'An unexpected error occurred.';
        error = 'Internal Server Error';

        this.logger.error(
          `Unhandled exception on ${request.method} ${request.url}`,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }
}
