const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        refNumber: {
            type: DataTypes.STRING
        },
        idNumber: {
            type: DataTypes.STRING
        },
        degree: {
            type: DataTypes.STRING
        },
        campus: {
            type: DataTypes.STRING
        },
        college: {
            type: DataTypes.STRING
        },
        course: {
            type: DataTypes.STRING
        },
        track: {
            type: DataTypes.STRING
        },
        strand: {
            type: DataTypes.STRING
        },
        yearGraduated: {
            type: DataTypes.INTEGER
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