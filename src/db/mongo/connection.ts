import { connect, connection } from 'mongoose';
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({path: path.join(__dirname, '..', '..', '..', '.env')})

connect(
  `${process.env.MONGO}`,
  {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    bufferMaxEntries: 0,
    useCreateIndex: true,
    w: 'majority',
    socketTimeoutMS: 8.64e+7,
    family: 4,
  },
).then(r => r)

connection.on('error', console.error.bind(console, 'Connection error:'));
connection.once('open', () => console.info('Connected to database successfully!'));
connection.once('close', (e) => console.info('Connected to database on ' + process.env.hostname + ' closed by ' + e));

[`close`, `exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((eventType:string) => process.on(eventType, (eventType) => connection.close(eventType)));
