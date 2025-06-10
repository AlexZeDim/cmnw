import { Injectable, ConsoleLogger, Scope } from '@nestjs/common';
import { lokiConfig } from '@app/configuration';
import axios from 'axios';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private lokiUrl = `http://${lokiConfig.lokiUrl}/loki/api/v1/push`;
  private logsToLoki = lokiConfig.logToLoki;
  private logsToConsole = lokiConfig.logToConsole;
  private gzip = false;

  private readonly onLokiError: (error: any) => void = () => {};
  private readonly defaultLabels: Record<string, string> = {
    app: process.env.APP_NAME || 'not-set',
    env: process.env.NODE_ENV || 'dev',
  };

  constructor(appLabel?: string) {
    super();
    if (appLabel) {
      this.defaultLabels = {
        app: appLabel,
        env: process.env.NODE_ENV || 'dev',
      };
      this.setContext(appLabel);
    }
  }

  private sendLokiRequest = (
    labels: Record<string, string>,
    message: string,
  ): void => {
    const data = JSON.stringify({
      streams: [
        {
          stream: labels,
          values: [[(Date.now() * 1_000_000).toString(), message]],
        },
      ],
    });

    axios.request({
      method: 'POST',
      url: this.lokiUrl,
      headers: this.gzip
        ? {
          'Content-Type': 'application/json',
          'Content-Encoding': 'application/gzip',
        }
        : {
          'Content-Type': 'application/json',
          // Authorization: `Bearer ${this.lokiToken}`,
        },
      data: data,
    })
      .then()
      .catch((error) => {
        if (this.onLokiError) {
          this.onLokiError(error);
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
    if (this.logsToLoki)
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: context ?? this.context,
          level: 'error',
        },
        message,
      );

    if (this.logsToConsole)
      super.error(message, trace, context);
  }

  log(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    if (this.logsToLoki)
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: context ?? this.context,
          level: 'info',
        },
        message,
      );

    if (this.logsToConsole)
      super.log(message, context);
  }

  warn(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    if (this.logsToLoki)
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: this.context,
          level: 'warn',
        },
        message,
      );

    if (this.logsToConsole)
      super.warn(message, context);
  }

  debug(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    if (this.logsToLoki)
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: this.context,
          level: 'debug',
        },
        message,
      );

    if (this.logsToConsole)
      super.debug(message, context);
  }

  verbose(
    message: string,
    context?: string,
    labels?: Record<string, string>,
  ): void {
    if (this.logsToLoki)
      this.sendLokiRequest(
        {
          ...this.defaultLabels,
          ...labels,
          context: this.context,
          level: 'verbose',
        },
        message,
      );

    if (this.logsToConsole)
      super.verbose(message, context);
  }
}
