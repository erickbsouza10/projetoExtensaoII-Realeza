import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const data =
      typeof body === 'object' && body !== null
        ? (body as { code?: string; message?: string | string[] })
        : {};
    if (status >= 500) this.logger.error(error instanceof Error ? error.stack : 'Erro interno');
    response.status(status).json({
      statusCode: status,
      code:
        data.code ??
        (
          {
            400: 'VALIDATION_ERROR',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
          } as Record<number, string>
        )[status] ??
        'INTERNAL_ERROR',
      message:
        status >= 500
          ? 'Erro interno do servidor.'
          : (data.message ?? body ?? 'Requisição inválida.'),
    });
  }
}
