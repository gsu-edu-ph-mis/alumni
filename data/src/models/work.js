const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        refNumber: {
            type: DataTypes.STRING
        },
        position: {
            type: DataTypes.STRING
        },
        companyName: {
            type: DataTypes.STRING
        },
        companyAddress: {
            type: DataTypes.STRING
        },
        employmentStatus: {
            type: DataTypes.STRING
        },
        govt: {
            type: DataTypes.STRING
        },
        from: {
            type: DataTypes.DATE
        },
        to: {
            type: DataTypes.STRING
        },
        isPresent: {
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