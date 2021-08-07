export const EntityModel = `
    enum EntityType {
        ENTITY
        GUILD
        PERSONA
        ITEM
        CLASS
        REALM
    }

    type Entity {
        id: ID! @id
        entity: EntityType
        name: String
        tags: [String]
        languages: [String]
        messages: [Message] @relationship(type: "MENTIONED", direction: IN)
    }
`;
