// Core modules

// External modules
const { Sequelize } = require('sequelize')
const moment = require('moment')

module.exports = {
    connect: async () => {
        try {

            const sequelize = new Sequelize({
                dialect: 'sqlite',
                storage: CONFIG.sqlite.db,
                logging: false,
            });

            await sequelize.authenticate()
            console.log(`${moment().format('YYYY-MMM-DD hh:mm:ss A')}: Database connected.`);

            return sequelize
        } catch (error) {
            console.error('Connection error:', error.message)
        }
    },
    attachModels: async (sequelize) => {
        try {
            return {
                Permission: require('./models/permission')('Permission', sequelize),
                Role: require('./models/role')('Role', sequelize),
                User: require('./models/user')('User', sequelize),
                Alumni: require('./models/alumni')('Alumni', sequelize),
            }
        } catch (error) {
            console.log('Connection error:', error.message)
        }
    }
}