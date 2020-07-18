const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const passport = require('passport');
const util = require('util');
const session = require('express-session');

const BnetStrategy = require('passport-bnet').Strategy;
const BNET_ID = process.env.BNET_ID
const BNET_SECRET = process.env.BNET_SECRET

console.log(BNET_ID, BNET_SECRET)

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Use the BnetStrategy within Passport.
passport.use(new BnetStrategy({
    clientID: BNET_ID,
    clientSecret: BNET_SECRET,
    callbackURL: "http://127.0.0.1:3030/auth/bnet/callback",
    region: "eu"
}, function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

const indexRouter = require('./routes/index');
const characters = require('./routes/api/characters');
const guilds = require('./routes/api/guilds');
const items = require('./routes/api/items');
const find = require('./routes/api/find');
const contracts = require('./routes/api/contracts');
const eva = require('./routes/api/eva');
const realms = require('./routes/api/realms');
const wowtoken = require('./routes/api/wowtoken');
const golds = require('./routes/api/golds');
const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'blizzard',
    saveUninitialized: true,
    resave: true }));

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/bnet', passport.authenticate('bnet'));

app.get('/auth/bnet/callback',
    passport.authenticate('bnet', { failureRedirect: '/' }),
    function(req, res){
        res.redirect('/');
    });

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.use('/', indexRouter);
app.use('/api/characters', characters);
app.use('/api/guilds', guilds);
app.use('/api/items', items);
app.use('/api/find', find);
app.use('/api/contracts', contracts);
app.use('/api/eva', eva);
app.use('/api/realms', realms);
app.use('/api/wowtoken', wowtoken);
app.use('/api/golds', golds);

module.exports = app;