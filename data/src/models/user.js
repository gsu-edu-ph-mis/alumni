const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        email: {
            type: DataTypes.STRING
        },
        username: {
            type: DataTypes.STRING
        },
        passwordHash: {
            type: DataTypes.STRING
        },
        salt: {
            type: DataTypes.STRING
        },
        roles: {
            type: DataTypes.JSON
        },
        active: {
            type: DataTypes.BOOLEAN
        },
    }, {
        timestamps: true,
        paranoid: true,
        // Other model options go here
    })
}