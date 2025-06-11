export const isContractArraysEmpty = (
  timestamps: number[],
  itemIds: number[]
): boolean => {
  return timestamps.length === 0 || itemIds.length === 0;
}
