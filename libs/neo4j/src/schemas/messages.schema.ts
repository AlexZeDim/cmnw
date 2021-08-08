export const MessageModel = `
  type Message {
    id: ID! @id
    context: String
    tags: [String]
    clearance: [String]
    entity: [Entity] @relationship(type: "MENTIONED", direction: OUT)
    source: String
  }
`
