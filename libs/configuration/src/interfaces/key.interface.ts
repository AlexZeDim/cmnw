export interface IKey {
  readonly _id: string,
  readonly secret: string,
  readonly tags: string[],
  readonly expiredIn: number,
  readonly token: string
}
