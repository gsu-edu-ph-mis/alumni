const { DataTypes } = require('sequelize')

module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        key: {
            type: DataTypes.STRING,
            
        },
    }, {
        // Other model options go here
    })
}