export interface IKeyConfig {
  readonly client: string;
  readonly secret: string;
  readonly tags: string[];
  readonly expiredIn: number;
  readonly token: string;
}
