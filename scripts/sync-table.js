/**
 * Usage:
 * node scripts/sync-table.js ModelName create drop clear alter install
 * node scripts/sync-table.js Permission install
 * node scripts/sync-table.js Role install
 * node scripts/sync-table.js User install
 * node scripts/sync-table.js Alumni install
 * node scripts/sync-table.js UserVerification install
 * node scripts/sync-table.js Education install
 * node scripts/sync-table.js Work install
 * node scripts/sync-table.js PasswordReset install
 * node scripts/sync-table.js VerifyRegistration install
 */
// Core modules
const path = require('path')
const process = require('process')
const readline = require('readline') // Add this

// External modules
const lodash = require('lodash')

// Modules
const pigura = require('pigura')


// First things first
// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname + '/../').replace(/\\/g, '/') // Turn back slash to slash for cross-platform compat
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

// Create readline interface for yes/no prompt
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askConfirmation = (message) => {
    return new Promise((resolve) => {
        rl.question(`${message} [yes] or no: `, (answer) => {
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y' || answer.toLowerCase() === '');
        });
    });
};

(async () => {
    let dbInstance = await dbConn.connect()

    try {
        const [MODEL_NAME, ...REST] = process.argv.slice(2)
        const FILE_NAME = lodash.kebabCase(MODEL_NAME)
        const VAR_NAME = lodash.camelCase(MODEL_NAME) // Camel Case: RegistrationForm => registrationForm // Useful for variable names

        let Model = require(`../data/src/models/${FILE_NAME}`)(MODEL_NAME, dbInstance)

        if (REST.includes('drop') || REST.includes('clear') || REST.includes('install')) {
            const confirmation = await askConfirmation('This is a destructive process, proceed?');
            
            if (!confirmation) {
                console.log('Operation canceled.');
                rl.close();
                return;
            }
        }

        if (REST.includes('drop')) {
            await Model.drop()
            console.log(`Model ${MODEL_NAME} dropped!`)

        } else if (REST.includes('clear')) {
            await Model.sync({ force: true })
            console.log(`Model ${MODEL_NAME} cleared!`)

        } else if (REST.includes('alter')) {
            await Model.sync({ alter: true })
            console.log(`Model ${MODEL_NAME} altered.`)

        } else if (REST.includes('install')) {
            console.log(`Installing ${MODEL_NAME}`)
            let LIST = require(`./install-data/${FILE_NAME}`)
            await Model.sync({ force: true })

            for (let x = 0; x < LIST.length; x++) {
                let props = {
                    ...LIST[x]
                }
                await Model.create(props)
            }
            console.log(`Inserted ${LIST.length} ${VAR_NAME}(s).`)
        } else {
            await Model.sync()
            console.log(`Model ${MODEL_NAME} synced.`)
        }

    } catch (err) {
        console.error(err)
    } finally {
        rl.close(); // Close the readline interface after completion
        dbInstance.close();
    }
})();
