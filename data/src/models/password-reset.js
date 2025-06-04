const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        secureKey: {
            type: DataTypes.STRING
        },
        createdBy: {
            type: DataTypes.STRING
        },
        payload: {
            type: DataTypes.JSON
        },
        expiredAt: {
            type: DataTypes.DATE
        },
    }, {
    })
}