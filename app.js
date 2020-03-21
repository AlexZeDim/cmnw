const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const characters = require('./routes/api/characters');
const guilds = require('./routes/api/guilds');
const items = require('./routes/api/items');
const findAll = require('./routes/api/findAll');
const test = require('./routes/api/test');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/characters', characters);
app.use('/api/guilds', guilds);
app.use('/api/items', items);
app.use('/api/findAll', findAll);
app.use('/api/test', test);

module.exports = app;