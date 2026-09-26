import {
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async forwardRequest(
    baseUrl: string,
    serviceName: string,
    req: Request,
    res?: Response,
  ): Promise<unknown> {
    const url = `${baseUrl.replace(/\/+$/, '')}${req.originalUrl}`;
    const headers: Record<string, string> = {};

    if (req.headers['authorization']) {
      headers['authorization'] = req.headers['authorization'] as string;
    }
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'] as string;
    } else if (
      ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())
    ) {
      headers['content-type'] = 'application/json';
    }

    const hasBody =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase()) &&
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body as object).length > 0;

    try {
      const response = await fetch(url, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(5000),
      });

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : {};
      }

      if (!response.ok) {
        throw new HttpException(
          data || { message: response.statusText },
          response.status,
        );
      }

      if (res) {
        res.status(response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Failed to communicate with ${serviceName} at ${url}: ${(error as Error).message}`,
      );

      if (
        (error as Error).name === 'TimeoutError' ||
        (error as Error).name === 'AbortError'
      ) {
        throw new GatewayTimeoutException(`${serviceName} request timed out`);
      }

      throw new ServiceUnavailableException(
        `${serviceName} is currently unavailable`,
      );
    }
  }
}
