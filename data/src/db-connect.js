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
            const models = {
                Permission: require('./models/permission')('Permission', sequelize),
                Role: require('./models/role')('Role', sequelize),
                User: require('./models/user')('User', sequelize),
                Alumni: require('./models/alumni')('Alumni', sequelize),
                UserVerification: require('./models/user-verification')('UserVerification', sequelize),
                Education: require('./models/education')('Education', sequelize),
                Work: require('./models/work')('Work', sequelize),
                PasswordReset: require('./models/password-reset')('PasswordReset', sequelize)
            };

            // Define associations of models Alumni and Education
            models.Alumni.hasMany(models.Education, { foreignKey: 'almId', sourceKey: 'refNumber' });
            models.Education.belongsTo(models.Alumni, { foreignKey: 'almId', targetKey: 'refNumber' });

            // Define association between Alumni and Work
            models.Alumni.hasMany(models.Work, { foreignKey: 'almId', sourceKey: 'refNumber' });
            models.Work.belongsTo(models.Alumni, { foreignKey: 'almId', targetKey: 'refNumber' });

            return models;
        } catch (error) {
            console.log('Connection error:', error.message)
        }
    }
}