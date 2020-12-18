/**
 * Connection with DB
 */
require('dotenv').config();
const { connect, connection } = require('mongoose');
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    useCreateIndex: true,
    w: 'majority',
    socketTimeoutMS: 1200000,
    family: 4,
  },
).then(r => r);

connection.on('error', console.error.bind(console, 'Connection error:'));
connection.once('open', () => console.log('Connected to database on ' + process.env.hostname));
connection.once('close', (e) => console.info('Connected to database on ' + process.env.hostname + ' closed by ' + e));

[`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((eventType) => process.on(eventType, () => connection.close()))



