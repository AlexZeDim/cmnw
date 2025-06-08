export interface ILoki {
  readonly lokiUrl: string;
  readonly labels: Record<string, string>;
  readonly logToConsole: boolean;
  readonly gzip: boolean;
}
