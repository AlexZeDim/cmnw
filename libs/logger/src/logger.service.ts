import { Injectable, ConsoleLogger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class LoggerService extends ConsoleLogger {
  private static lokiUrl = process.env.LOKI_URL;
  private static lokiToken = process.env.LOKI_TOKEN;
  private static defaultLabels: Record<string, string> = {
    app: process.env.APP_NAME || 'not-set',
    env: process.env.NODE_ENV || 'development',
  };
  private static gzip = false;
  private static onLokiError: (error: any) => void = () => {};

  constructor(
    private readonly httpService: HttpService
  ) {
    super();
  }

  private sendLokiRequest = (
    labels: Record<string, string>,
    message: string,
  ): any => {
    const data = JSON.stringify({
      streams: [
        {
          stream: labels,
          values: [[(Date.now() * 1_000_000).toString(), message]],
        },
      ],
    });

    this.httpService.axiosRef.request({
      method: 'POST',
      url: `${LoggerService.lokiUrl}/loki/api/v1/push`,
      headers: LoggerService.gzip
        ? {
          'Content-Type': 'application/json',
          'Content-Encoding': 'application/gzip',
        }
        : {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LoggerService.lokiToken}`,
        },
      data: data,
    })
      .then()
      .catch((error) => {
        if (LoggerService.onLokiError) {
          LoggerService.onLokiError(error);
        } else {
          console.error('error', error.message, error?.response?.data);
        }
      });
  };

  error(
    message: string,
    trace?: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.sendLokiRequest(
      {
        ...LoggerService.defaultLabels,
        ...labels,
        context: context ?? this.context,
        level: 'error',
      },
      message,
    );
    super.error(message, trace, context);
  }

  log(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.sendLokiRequest(
      {
        ...LoggerService.defaultLabels,
        ...labels,
        context: context ?? this.context,
        level: 'info',
      },
      message,
    );
    super.log(message, context);
  }

  warn(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.sendLokiRequest(
      {
        ...LoggerService.defaultLabels,
        ...labels,
        context: this.context,
        level: 'warn',
      },
      message,
    );
    super.warn(message, context);
  }

  debug(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.sendLokiRequest(
      {
        ...LoggerService.defaultLabels,
        ...labels,
        context: this.context,
        level: 'debug',
      },
      message,
    );
    super.debug(message, context);
  }

  verbose(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    this.sendLokiRequest(
      {
        ...LoggerService.defaultLabels,
        ...labels,
        context: this.context,
        level: 'verbose',
      },
      message,
    );
    super.verbose(message, context);
  }
}
