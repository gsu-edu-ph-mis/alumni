/**
 * Clear exam
 * Usage: node scripts/backup-db.js
 */
// Core modules
const fs = require('fs/promises');
const path = require('path');

// External modules
const lodash = require('lodash');
const moment = require('moment');

// Modules
const pigura = require('pigura');


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
    ;
(async () => {

    try {
        const out = `${APP_DIR}/data/app.db.backup-${moment().format('YYYY-MM-DD_hhmmss')}`
        await fs.copyFile(`${APP_DIR}/data/app.db`, `${out}`);
        console.log(`Backup to ${out}`)
    } catch (err) {
        console.error(err)
    } finally {
    }
})()

