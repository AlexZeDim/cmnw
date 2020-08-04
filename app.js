const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const character = require('./routes/api/characters/character');
const character_logs = require('./routes/api/characters/character_logs');
const guild = require('./routes/api/guilds/guild');
const guild_logs = require('./routes/api/guilds/guild_logs');
const items = require('./routes/api/items');
const find = require('./routes/api/find');
const contracts = require('./routes/api/contracts/tod');
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


/** Contracts */

app.use('/api/contracts/tod', contracts);

/** Characters */

app.use('/api/characters/character', character);
app.use('/api/characters/character_logs', character_logs);

/** Guilds */

app.use('/api/guilds/guild', guild);
app.use('/api/guilds/guild_logs', guild_logs);


app.use('/api/items', items);
app.use('/api/find', find);
app.use('/api/eva', eva);
app.use('/api/realms', realms);
app.use('/api/wowtoken', wowtoken);
app.use('/api/golds', golds);
app.use('/api/xrs', xrs);
app.use('/api/test', test);

module.exports = app;