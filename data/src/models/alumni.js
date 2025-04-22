const { DataTypes } = require('sequelize')


module.exports = (modelName, sequelize) => {
    return sequelize.define(modelName, {
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
        college: {
            type: DataTypes.STRING
        },
        course: {
            type: DataTypes.STRING
        },
        yearGraduated: {
            type: DataTypes.STRING
        },
        occupation: {
            type: DataTypes.STRING
        },
        company: {
            type: DataTypes.STRING
        },
        companyAddress: {
            type: DataTypes.STRING
        },
        contactNumber: {
            type: DataTypes.STRING
        },
        email: {
            type: DataTypes.STRING
        },
        facebook: {
            type: DataTypes.STRING
        },
        profilePhoto: {
            type: DataTypes.STRING
        },
        permanentAddress: {
            type: DataTypes.STRING
        },
        fatherName: {
            type: DataTypes.STRING
        },
        motherName: {
            type: DataTypes.STRING
        },
        address: {
            type: DataTypes.STRING
        },
        
        active: {
            type: DataTypes.BOOLEAN
        },
    }, {
        // Other model options go here
    })
}