/**
 * Insert default admin users.
 * Usage: node scripts/install-db.js
 */
// Core modules
const fs = require('fs');
const path = require('path');

// External modules
const lodash = require('lodash');
const pigura = require('pigura');

// Modules
const passwordMan = require('../data/src/password-man');


// First things first
// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname + '/../').replace(/\\/g, '/'); // Turn back slash to slash for cross-platform compat
global.ENV = lodash.get(process, 'env.NODE_ENV', 'dev')

const configLoader = new pigura.ConfigLoader({
    configName: './configs/config.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CONFIG = configLoader.getConfig()

const credLoader = new pigura.ConfigLoader({
    configName: './credentials/credentials.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CRED = credLoader.getConfig()

const dbConn = require('../data/src/db-connect');


; (async () => {
    let dbInstance = await dbConn.connect()

    try {
        // const dbModels = dbConn.attachModels(dbInstance)
        if(ENV==='dev'){
            // Sync all defined models to the DB.
            // await dbInstance.sync({ force: true }) // DROP ALL!
            await dbInstance.sync()
        }
    } catch (err) {
        console.log(err)
    } finally {
        dbInstance.close();
    }
})()