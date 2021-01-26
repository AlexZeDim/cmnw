/**
 * Mongo Models
 */
require('./db/connection')

/**
 * Module dependencies.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');

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

app.use('/graphql', graphqlHTTP({
  schema: buildSchema(schema),
  rootValue: root,
  graphiql: true,
}));

/**
 * Port number
 * @type {number}
 */
const port = 4000;

app.set('port', port);

const server = http.createServer(app);

server.listen(port, '0.0.0.0');
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(port + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log('Listening on ' + bind);
}
