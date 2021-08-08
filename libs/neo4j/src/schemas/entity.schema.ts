export const EntityModel = `
    enum EntityType {
        Entity
        Guild
        Persona
        Item
        Class
        Realm
    }

    type Entity {
        id: ID! @id
        entity: EntityType!
        name: String
        tags: [String]
        languages: [String]
        messages: [Message] @relationship(type: "MENTIONED", direction: IN)
    }
`;
