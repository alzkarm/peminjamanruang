import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Pesan 5xx TIDAK boleh bocor ke client (pernah memuat path absolut + internal Prisma).
    // Detail asli tetap dicatat di log server.
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi admin.';

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(
          message,
        )}`,
        (exception as Error)?.stack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${status} - Message: ${JSON.stringify(
          message,
        )}`,
      );
    }

    const errorResponse = { statusCode: status, message, path: request.url, timestamp: new Date().toISOString() };
    response.status(status).json(errorResponse);
  }
}
