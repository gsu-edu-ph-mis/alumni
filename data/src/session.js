// Core modules

// External modules
const session = require('express-session'); // Session engine
const SessionStore = require('express-session-sequelize')(session.Store);

// Use the session middleware
// See options in https://github.com/expressjs/session
module.exports = (database) => {
    return session({
        name: CONFIG.session.name,
        store: new SessionStore({
            db: database,
        }),
        secret: CRED.session.secret,
        cookie: CONFIG.session.cookie,
        resave: false,
        saveUninitialized: false
    });
}