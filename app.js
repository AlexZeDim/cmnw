const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');

const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const root = require('./graphql/resolvers');

const app = express();

morgan.token('graphql-query', (req) => {
  const {variables} = req.body;
  return `GRAPHQL: ${JSON.stringify(variables)}`;
});

app.use(morgan(':date[web] :status - :response-time ms :method :graphql-query'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/** GraphQL */
const schema = fs.readFileSync(path.resolve(__dirname, './graphql/schemas/schema.graphql'), 'utf-8');

/**
 * TODO cors()
 */

app.use('/graphql', graphqlHTTP({
  schema: buildSchema(schema),
  rootValue: root,
  graphiql: true,
}));

module.exports = app;
