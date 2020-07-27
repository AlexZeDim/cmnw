const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const characters = require('./routes/api/characters');
const guilds = require('./routes/api/guilds');
const items = require('./routes/api/items');
const find = require('./routes/api/find');
const contracts = require('./routes/api/contracts');
const eva = require('./routes/api/eva');
const realms = require('./routes/api/realms');
const wowtoken = require('./routes/api/wowtoken');
const golds = require('./routes/api/golds');
const xrs = require('./routes/api/xrs');
const test = require('./routes/api/test');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/characters', characters);
app.use('/api/guilds', guilds);
app.use('/api/items', items);
app.use('/api/find', find);
app.use('/api/contracts', contracts);
app.use('/api/eva', eva);
app.use('/api/realms', realms);
app.use('/api/wowtoken', wowtoken);
app.use('/api/golds', golds);
app.use('/api/xrs', xrs);
app.use('/api/test', test);

module.exports = app;