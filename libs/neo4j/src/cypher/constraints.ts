

export const createConstraints = (indexName: string, modelEntity: string): string => {
  return `CREATE CONSTRAINT ${indexName} ON (m:${modelEntity}) ASSERT m.title IS UNIQUE`
}
