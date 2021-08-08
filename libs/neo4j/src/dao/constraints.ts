import { Session } from 'neo4j-driver';

export const createConstraints = (session: Session) => {
  session.run(`CREATE CONSTRAINT UniqueMovieTitleConstraint ON (m:Movie) ASSERT m.title IS UNIQUE`)
}
