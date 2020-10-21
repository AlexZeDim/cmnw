/**
 * Connection with DB
 */

const { connect, connection } = require('mongoose');
require('dotenv').config();
connect(
  `mongodb://${process.env.login}:${process.env.password}@${process.env.hostname}/${process.env.auth_db}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    useCreateIndex: true,
    w: 'majority',
    family: 4,
  },
).then(r => r);

connection.on('error', console.error.bind(console, 'Connection error:'));
connection.once('open', () =>
  console.log('Connected to database on ' + process.env.hostname),
);

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`, `uncaughtException`].forEach((eventType) => {
    console.info(eventType)
    process.on(eventType, function () {
        connection.close();
        connection.once('close', () =>
          console.log('Connected to database on ' + process.env.hostname + ' closed'),
        );
    });
})



