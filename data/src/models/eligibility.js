const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        refNumber: {
            type: DataTypes.STRING
        },
        eligibilityType: {
            type: DataTypes.STRING
        },
        examDate: {
            type: DataTypes.DATE
        },
        examPlace: {
            type: DataTypes.STRING
        },
        rating: {
            type: DataTypes.STRING
        },
        licenseNumber: {
            type: DataTypes.STRING
        },
        validityDate: {
            type: DataTypes.STRING
        },
        isOthers: {
            type: DataTypes.BOOLEAN
        },

        almId: {
            type: DataTypes.STRING
        },
    }, {
        timestamps: true,
        paranoid: true,
        // Other model options go here
    })
}