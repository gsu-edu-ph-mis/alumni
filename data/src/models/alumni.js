const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
        refNumber: {
            type: DataTypes.STRING
        },
        firstName: {
            type: DataTypes.STRING
        },
        middleName: {
            type: DataTypes.STRING
        },
        lastName: {
            type: DataTypes.STRING
        },
        suffix: {
            type: DataTypes.STRING
        },
        birthDate: {
            type: DataTypes.DATE
        },
        gender: {
            type: DataTypes.STRING
        },
        civilStatus: {
            type: DataTypes.STRING
        },
        citizenship: {
            type: DataTypes.STRING
        },
        religion: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING
        },
        mobileNumber: {
            type: DataTypes.STRING
        },
        fbName: {
            type: DataTypes.STRING
        },
        
        presentAddress: {
            type: DataTypes.STRING
        },
        permanentAddress: {
            type: DataTypes.STRING
        },
        guardianName: {
            type: DataTypes.STRING
        },
        guardianMobileNumber: {
            type: DataTypes.STRING
        },
        emergencyPersonName: {
            type: DataTypes.STRING
        },
        emergencyPersonMobileNumber: {
            type: DataTypes.STRING
        },
        isTheSame: {
            type: DataTypes.BOOLEAN
        },

        userId: {
            type: DataTypes.INTEGER
        },
    }, {
        timestamps: true,
        paranoid: true,
        // Other model options go here
    })
}