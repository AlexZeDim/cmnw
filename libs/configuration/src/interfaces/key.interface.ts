export interface KeyInterface {
  readonly _id: string,
  readonly secret: string,
  readonly tags: string[],
  readonly expired_in: number,
  readonly token: string
}
