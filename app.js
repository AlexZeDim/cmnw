const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const character = require('./routes/api/characters/character');
const character_logs = require('./routes/api/characters/character_logs');
const guild = require('./routes/api/guilds/guild');
const guild_logs = require('./routes/api/guilds/guild_logs');
const items = require('./routes/api/items/item');
const find = require('./routes/api/find');
const contracts_tod = require('./routes/api/contracts/tod');
const contracts_ytd = require('./routes/api/contracts/ytd');
const contracts_week = require('./routes/api/contracts/week');
const contracts_lastWeek = require('./routes/api/contracts/last_week');
const contracts_month = require('./routes/api/contracts/month');
const contracts_lastMonth = require('./routes/api/contracts/last_month');
const eva = require('./routes/api/items/eva');
const realms = require('./routes/api/realms');
const wowtoken = require('./routes/api/wowtoken');
const golds = require('./routes/api/golds');
const xrs_item = require('./routes/api/items/xrs_item');
const xrs_eva = require('./routes/api/items/xrs_eva');
const xrs_iva = require('./routes/api/items/xrs_iva');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/** Contracts */

app.use('/api/contracts/tod', contracts_tod);
app.use('/api/contracts/ytd', contracts_ytd);
app.use('/api/contracts/week', contracts_week);
app.use('/api/contracts/last_week', contracts_lastWeek);
app.use('/api/contracts/month', contracts_month);
app.use('/api/contracts/last_month', contracts_lastMonth);

/** Characters */

app.use('/api/characters/character', character);
app.use('/api/characters/character_logs', character_logs);

/** Guilds */

app.use('/api/guilds/guild', guild);
app.use('/api/guilds/guild_logs', guild_logs);

/** Items */

app.use('/api/items/item', items);
app.use('/api/items/eva', cors(), eva);
app.use('/api/items/xrs_item', cors(), xrs_item);
app.use('/api/items/xrs_eva', cors(), xrs_eva);
app.use('/api/items/xrs_iva', cors(), xrs_iva);

/** Find */

app.use('/api/find', find);

/** Others */

app.use('/api/realms', realms);
app.use('/api/wowtoken', wowtoken);
app.use('/api/golds', golds);

module.exports = app;
