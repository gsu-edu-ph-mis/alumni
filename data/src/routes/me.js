// Core modules
let { timingSafeEqual } = require('crypto')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Op, where } = require("sequelize")
const fileUpload = require('express-fileupload');
const cors = require('cors')
const path = require('path')
const sharp = require('sharp')

// Modules
const middlewares = require('../middlewares')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

//// Home Routes
router.use('/me', middlewares.requireAuthUser)

// View Alumni Records
// A.1 Display View Alumni Records
router.get('/me', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let data = {
            flash: flash.get(req, 'home'),
            alumni,
            app: { title: `Home | ${CONFIG.app.title}` }
        }
        
        res.render('me/home.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});

// Update Alumni Records
// B.1 Display Update Alumni Records - Basic Info
router.get('/me/basic-info', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let data = {
            flash: flash.get(req, 'basic_info'),
            alumni,
            civilStatuses: CONFIG.civilStatuses,
            suffixes: CONFIG.suffixes,
            app: { title: `Basic Information | ${CONFIG.app.title}` } 
        }
        
        res.render('me/basic-info.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});
// B.2 Submit Update Alumni Records - Basic Info
router.patch('/me/:almId/basic-info', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let firstName = lodash.trim(lodash.get(payload, 'firstName', ''))
        let middleName = lodash.trim(lodash.get(payload, 'middleName', ''))
        let lastName = lodash.trim(lodash.get(payload, 'lastName', ''))
        let suffix = lodash.trim(lodash.get(payload, 'suffix', ''))
        let birthDate = lodash.trim(lodash.get(payload, 'birthDate', ''))
        let gender = lodash.trim(lodash.get(payload, 'gender', ''))
        let civilStatus = lodash.trim(lodash.get(payload, 'civilStatus', ''))
        let citizenship = lodash.trim(lodash.get(payload, 'citizenship', ''))
        let religion = lodash.trim(lodash.get(payload, 'religion', ''))
        let email = lodash.trim(lodash.get(payload, 'email', ''))
        let mobileNumber = lodash.trim(lodash.get(payload, 'mobileNumber', ''))
        let fbName = lodash.trim(lodash.get(payload, 'fbName', ''))
        let presentAddress = lodash.trim(lodash.get(payload, 'presentAddress', ''))
        let permanentAddress = lodash.trim(lodash.get(payload, 'permanentAddress', ''))
        let guardianName = lodash.trim(lodash.get(payload, 'guardianName', ''))
        let guardianMobileNumber = lodash.trim(lodash.get(payload, 'guardianMobileNumber', ''))
        let emergencyPersonName = lodash.trim(lodash.get(payload, 'emergencyPersonName', ''))
        let emergencyPersonMobileNumber = lodash.trim(lodash.get(payload, 'emergencyPersonMobileNumber', ''))
        let isTheSame = lodash.trim(lodash.get(payload, 'isTheSame', false))

        if (!firstName) {
            throw new Error('First Name is required.')
        }
        if (middleName) {
            middleName = middleName.trim()
            if (middleName.at(-1) == '.' || middleName.length <= 1) {
                throw new Error('Please write your Middle Name in full.')
            }
        }
        if (!lastName) {
            throw new Error('Last Name is required.')
        }
        if (!birthDate) {
            throw new Error('Birth Date is required.')
        }
        if (!gender) {
            throw new Error('Gender is required.')
        }
        if (!civilStatus) {
            throw new Error('Civil Status is required.')
        }
        if (!citizenship) {
            throw new Error('Citizenship is required.')
        }
        if (!religion) {
            throw new Error('Religion is required.')
        }
        if (email) {
            email = email.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email) === false) {
                throw new Error('Invalid email.')
            }
            let existEmail = await req.app.locals.db.models.Alumni.findOne({
                where: {
                    id: {
                        [Op.ne]: editAlm.id
                    },
                    email: email
                }
            })
            if (existEmail) {
                throw new Error(`Email ${existEmail.email} already exists.`)
            }
        }
        if (mobileNumber) {
            mobileNumber = mobileNumber.trim();
            if (/^(09)\d{9}$/g.test(mobileNumber) === false) {
                throw new Error('Invalid mobile number.');
            }
        }
        if (!guardianName) {
            throw new Error('Parent/Guardian is required.')
        }
        if (guardianMobileNumber) {
            guardianMobileNumber = guardianMobileNumber.trim();
            if (/^(09)\d{9}$/g.test(guardianMobileNumber) === false) {
                throw new Error("Invalid parent/guardian's mobile number.");
            }
        }
        if (!emergencyPersonName) {
            throw new Error('Emergency Person is required.')
        }
        if (emergencyPersonMobileNumber) {
            emergencyPersonMobileNumber = emergencyPersonMobileNumber.trim();
            if (/^(09)\d{9}$/g.test(emergencyPersonMobileNumber) === false) {
                throw new Error("Invalid emergency person's mobile number.");
            }
        }

        editAlm.set({
            firstName: firstName,
            middleName: middleName,
            lastName: lastName,
            suffix: suffix,
            birthDate: birthDate,
            gender: gender,
            civilStatus: civilStatus,
            citizenship: citizenship,
            religion: religion,
            email: email,
            mobileNumber: mobileNumber,
            fbName: fbName,
            presentAddress: presentAddress,
            permanentAddress: permanentAddress,
            guardianName: guardianName,
            guardianMobileNumber: guardianMobileNumber,
            emergencyPersonName: emergencyPersonName,
            emergencyPersonMobileNumber: emergencyPersonMobileNumber,
            isTheSame: isTheSame,
        });
        await editAlm.save()

        flash.ok(req, 'educ', 'Updated the basic information. Next, please update the educational records.')
        res.redirect('/me/education')
    } catch (err) {
        console.error(err)
        flash.error(req, 'basic_info', err.message)
        return res.redirect('/me/basic-info')
    }
});
// B.3 Display Update Alumni Records - Education
router.get('/me/education', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let educ = await req.app.locals.db.models.Education.findOne({
            where: {
                almId: alumni.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'educ'),
            degrees: CONFIG.degrees,
            tracks: CONFIG.tracks,
            strands: CONFIG.strands,
            alumni,
            educ,
            app: { title: `Educational Records | ${CONFIG.app.title}` } 
        }
        
        res.render('me/education.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});
// B.4 Submit Update Alumni Records - Education
router.patch('/me/:almId/education', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let idNumber = lodash.trim(lodash.get(payload, 'idNumber', ''))
        let yearGraduated = lodash.trim(lodash.get(payload, 'yearGraduated', ''))

        let degree = lodash.trim(lodash.get(payload, 'degree', ''))
        let campus = lodash.trim(lodash.get(payload, 'campus', ''))

        let college = lodash.trim(lodash.get(payload, 'college', ''))
        let course = lodash.trim(lodash.get(payload, 'course', ''))

        let track = lodash.trim(lodash.get(payload, 'track', ''))
        let strand = lodash.trim(lodash.get(payload, 'strand', ''))

        if (!campus) {
            throw new Error('Campus is required.')
        }
        if (!yearGraduated) {
            throw new Error('Year Graduated is required.')
        }
        if (!degree) {
            throw new Error('Degree is required.')
        }

        let editAlmEduc = await req.app.locals.db.models.Education.findOne({
            where: {
                almId: editAlm.refNumber
            }
        })

        if (degree == 'College' || degree == 'Graduate Studies') {
            track = ''
            strand = ''
        }

        if (degree == 'Senior High School') {
            college = ''
            course = ''
        }

        if (degree != 'College' && degree != 'Graduate Studies' && degree != 'Senior High School') {
            college = ''
            course = ''
            track = ''
            strand = ''
        }

        if (!editAlmEduc) {
            let refNo = passwordMan.randomString(16)
            await req.app.locals.db.models.Education.create({
                refNumber: refNo,
                idNumber: idNumber,
                yearGraduated: yearGraduated,
                degree: degree,
                campus: campus,
                college: college,
                course: course,
                track: track,
                strand: strand,
                almId: editAlm.refNumber
            })
        } else {
            editAlmEduc.set({
                idNumber: idNumber,
                yearGraduated: yearGraduated,
                degree: degree,
                campus: campus,
                college: college,
                course: course,
                track: track,
                strand: strand
            });
            await editAlmEduc.save()
        }

        flash.ok(req, 'work', 'Updated the educational records. Next, please update the work details.')
        res.redirect('/me/work')
    } catch (err) {
        console.error(err)
        flash.error(req, 'educ', err.message)
        return res.redirect('/me/education')
    }
});
// B.5 Display Update Alumni Records - Work
router.get('/me/work', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let work = await req.app.locals.db.models.Work.findOne({
            where: {
                almId: alumni.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'work'),
            employmentStatuses: CONFIG.employmentStatuses,
            employmentSectors: CONFIG.employmentSectors,
            employmentLocations: CONFIG.employmentLocations,
            alumni,
            work,
            app: { title: `Work Details | ${CONFIG.app.title}` } 
        }
        
        res.render('me/work.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});
// B.6 Submit Update Alumni Records - Work
router.patch('/me/:almId/work', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let employmentStatus = lodash.trim(lodash.get(payload, 'employmentStatus', ''))
        let employmentSector = lodash.trim(lodash.get(payload, 'employmentSector', ''))
        let workProgramAlignment = lodash.trim(lodash.get(payload, 'workProgramAlignment', ''))
        let employmentLocation = lodash.trim(lodash.get(payload, 'employmentLocation', ''))
        let position = lodash.trim(lodash.get(payload, 'position', ''))
        let companyName = lodash.trim(lodash.get(payload, 'companyName', ''))
        let companyAddress = lodash.trim(lodash.get(payload, 'companyAddress', ''))
        let from = lodash.trim(lodash.get(payload, 'from', ''))
        let to = lodash.trim(lodash.get(payload, 'to', ''))
        let isPresent = lodash.trim(lodash.get(payload, 'isPresent', false))

        if (!employmentStatus) {
            throw new Error('Employment Status is required.')
        }
        if(employmentStatus == 'Unemployed') {
            employmentSector = ''
            workProgramAlignment = ''
            employmentLocation = ''
            position = ''
            companyName = ''
            companyAddress = ''
            from = '00-00-0000'
            to = ''
            isPresent = false
        }
        if(employmentStatus == 'Employed') {
            if (!employmentSector) {
                throw new Error('Employment Sector is required.')
            }
            if (!workProgramAlignment) {
                throw new Error('Work Alignment to the Course/Program is required.')
            }
            if (!employmentLocation) {
                throw new Error('Employment Location is required.')
            }
            if (employmentLocation == 'Philippines') {
                if (!companyAddress) {
                    throw new Error('Company Address is required.')
                }
            } else {
                companyAddress = ''
            }
            if (!position) {
                throw new Error('Position is required.')
            }
            if (!companyName) {
                throw new Error('Company Name is required.')
            }
            if (!from) {
                throw new Error('From is required.')
            }
            if (!to) {
                throw new Error('To is required.')
            }
            if (from >= to) {
                throw new Error('To date should be later than the From date')
            }
        }

        let editAlmWork = await req.app.locals.db.models.Work.findOne({
            where: {
                almId: editAlm.refNumber
            }
        })

        if (!editAlmWork) {
            let refNo = passwordMan.randomString(16)
            await req.app.locals.db.models.Work.create({
                refNumber: refNo,
                employmentStatus: employmentStatus,
                employmentSector: employmentSector,
                workProgramAlignment: workProgramAlignment,
                employmentLocation: employmentLocation,
                position: position,
                companyName: companyName,
                companyAddress: companyAddress,
                from: from,
                to: to,
                isPresent: isPresent,
                almId: editAlm.refNumber
            })
        } else {
            editAlmWork.set({
                employmentStatus: employmentStatus,
                employmentSector: employmentSector,
                workProgramAlignment: workProgramAlignment,
                employmentLocation: employmentLocation,
                position: position,
                companyName: companyName,
                companyAddress: companyAddress,
                from: from,
                to: to,
                isPresent: isPresent
            })
            await editAlmWork.save()
        }

        flash.ok(req, 'eligibility', 'Updated the work details. Lastly, please add an eligibility (if applicable).')
        res.redirect(`/me/eligibility`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'work', err.message)
        return res.redirect('/me/work')
    }
});
// B.7 Display Table Alumni Records - Eligibility
router.get('/me/eligibility', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let eligibility = await req.app.locals.db.models.Eligibility.findAll({
            where: {
                almId: alumni.refNumber
            },
            order: [['createdAt', 'DESC']]
        })

        let data = {
            flash: flash.get(req, 'eligibility'),
            alumni,
            eligibility,
            app: { title: `Eligibility | ${CONFIG.app.title}` } 
        }
        
        res.render('me/eligibility.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});
// B.8 Display Create Alumni Records - Eligibility
router.get('/me/eligibility/create', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let createAlm = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let data = {
            flash: flash.get(req, 'create-eligibility'),
            eligibilityTypes: CONFIG.eligibilityTypes,
            createAlm,
            app: { title: `Add Eligibility | ${CONFIG.app.title}` } 
        }

        res.render('me/create-eligibility.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'eligibility', err.message)
        return res.redirect('/me/eligibility')
    }
});
// B.9 Submit Create Alumni Records - Eligibility
router.post('/me/:almId/eligibility/create', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    let createAlm = res.alm

    try {
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let eligibilityType = lodash.trim(lodash.get(payload, 'eligibilityType', ''))
        let specifyEligibilityType = lodash.trim(lodash.get(payload, 'specifyEligibilityType', ''))
        let examDate = lodash.trim(lodash.get(payload, 'examDate', ''))
        let examPlace = lodash.trim(lodash.get(payload, 'examPlace', ''))
        let rating = lodash.trim(lodash.get(payload, 'rating', ''))
        let licenseNumber = lodash.trim(lodash.get(payload, 'licenseNumber', ''))
        let validityDate = lodash.trim(lodash.get(payload, 'validityDate', ''))
        let isOthers = false;

        if (!eligibilityType) {
            throw new Error('Type of Eligibility is required.')
        }
        if (!examDate) {
            throw new Error('Exam Date is required.')
        }
        if (!examPlace) {
            throw new Error('Place of Exam is required.')
        }

        if (eligibilityType == 'Others') {
            if(!specifyEligibilityType) {
                throw new Error('Other eligiblity is required.')
            }
            eligibilityType = specifyEligibilityType
            isOthers = true
        }

        let refNo = passwordMan.randomString(16)
        await req.app.locals.db.models.Eligibility.create({
            refNumber: refNo,
            eligibilityType: eligibilityType,
            examDate: examDate,
            examPlace: examPlace,
            rating: rating,
            licenseNumber: licenseNumber,
            validityDate: validityDate,
            isOthers: isOthers,
            almId: createAlm.refNumber
        })

        flash.ok(req, 'eligibility', 'Added an eligibility.')
        res.redirect(`/me/eligibility`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'create-eligibility', err.message)
        return res.redirect('/me/eligibility/create')
    }
});
// B.10 Display Update Alumni Records - Eligibility
router.get('/me/eligibility/:refNumber/edit', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {

    try {
        let sessionUser = res.locals.user;
        let eligibilityRefNumber = req.params.refNumber || ''

        let editAlm = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let editAlmEligibility = await req.app.locals.db.models.Eligibility.findOne({
            where: {
                [Op.and]: [
                    { almId: editAlm.refNumber },
                    { refNumber: eligibilityRefNumber }
                ]
            }
        })

        let data = {
            flash: flash.get(req, 'edit-eligibility'),
            eligibilityTypes: CONFIG.eligibilityTypes,
            editAlm,
            editAlmEligibility,
            app: { title: `Edit Eligibility | ${CONFIG.app.title}` } 
        }

        res.render('me/update-eligibility.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'eligibility', err.message)
        return res.redirect('/me/eligibility')
    }
});
// B.11 Submit Update Alumni Records - Eligibility
router.patch('/me/:almId/eligibility/:refNumber/edit', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    let editAlm = res.alm
    let eligibilityRefNumber = req.params.refNumber || ''

    try {
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let eligibilityType = lodash.trim(lodash.get(payload, 'eligibilityType', ''))
        let specifyEligibilityType = lodash.trim(lodash.get(payload, 'specifyEligibilityType', ''))
        let examDate = lodash.trim(lodash.get(payload, 'examDate', ''))
        let examPlace = lodash.trim(lodash.get(payload, 'examPlace', ''))
        let rating = lodash.trim(lodash.get(payload, 'rating', ''))
        let licenseNumber = lodash.trim(lodash.get(payload, 'licenseNumber', ''))
        let validityDate = lodash.trim(lodash.get(payload, 'validityDate', ''))
        let isOthers = false;

        let editAlmEligibility = await req.app.locals.db.models.Eligibility.findOne({
            where: {
                [Op.and]: [
                    { almId: editAlm.refNumber },
                    { refNumber: eligibilityRefNumber }
                ]
            }
        })

        if (!eligibilityType) {
            throw new Error('Type of Eligibility is required.')
        }
        if (!examDate) {
            throw new Error('Exam Date is required.')
        }
        if (!examPlace) {
            throw new Error('Place of Exam is required.')
        }

        if (eligibilityType == 'Others') {
            if(!specifyEligibilityType) {
                throw new Error('Other eligiblity is required.')
            }
            eligibilityType = specifyEligibilityType
            isOthers = true
        }

        editAlmEligibility.set({
            eligibilityType: eligibilityType,
            examDate: examDate,
            examPlace: examPlace,
            rating: rating,
            licenseNumber: licenseNumber,
            validityDate: validityDate,
            isOthers: isOthers
        });
        await editAlmEligibility.save()

        flash.ok(req, 'eligibility', 'Updated the eligibility.')
        res.redirect(`/me/eligibility`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'edit-eligibility', err.message)
        return res.redirect(`/me/eligibility/${eligibilityRefNumber}/edit`)
    }
});
// B.12 Display Delete Alumni Records - Eligibility
router.get('/me/eligibility/:refNumber/delete', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;
        let eligibilityRefNumber = req.params.refNumber || ''

        let deleteAlm = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: sessionUser.id
            }
        })

        let deleteAlmEligibility = await req.app.locals.db.models.Eligibility.findOne({
            where: {
                [Op.and]: [
                    { almId: deleteAlm.refNumber },
                    { refNumber: eligibilityRefNumber }
                ]
            }
        })

        let data = {
            flash: flash.get(req, 'delete-eligibility'),
            deleteAlm,
            deleteAlmEligibility,
            app: { title: `Delete Eligibility | ${CONFIG.app.title}` } 
        }

        res.render('me/delete-eligibility.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'eligibility', err.message)
        return res.redirect('/me/eligibility')
    }
});
// B.13 Submit Delete Alumni Records - Eligibility
router.delete('/me/:almId/eligibility/:refNumber/delete', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_record']), middlewares.getAlm(), async (req, res, next) => {
    let deleteAlm = res.alm
    let eligibilityRefNumber = req.params.refNumber || ''

    try {
        let deleteAlmEligibility = await req.app.locals.db.models.Eligibility.findOne({
            where: {
                [Op.and]: [
                    { almId: deleteAlm.refNumber },
                    { refNumber: eligibilityRefNumber }
                ]
            }
        })

        await deleteAlmEligibility.destroy({ force: true })

        flash.ok(req, 'eligibility', 'Deleted the eligibility.')
        res.redirect(`/me/eligibility`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'delete-eligibility', err.message)
        return res.redirect(`/me/eligibility/${eligibilityRefNumber}/delete`)
    }
});



// View Data Privacy and Consent Form
router.get('/me/data-privacy', middlewares.guardRoute(['read_own_record']), async (req, res, next) => {
    try {        
        res.render('me/data-privacy.html', { app: { title: `Data Privacy and Consent Form | ${CONFIG.app.title}` }});
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
});

// Accounts
// C.1 Display Own Account
router.get('/me/account', middlewares.guardRoute(['read_own_account']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let user = await req.app.locals.db.models.User.findOne({
            where: {
                id: sessionUser.id
            }
        })

        let data = {
            flash: flash.get(req, 'account'),
            user,
            app: { title: `Account | ${CONFIG.app.title}` }
        }
        
        res.render('me/account.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'account', err.message);
        return res.redirect('/me')
    }
});
// C.2 Generate Password
router.post('/me/regen', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_password']), async (req, res, next) => {
    try {
        res.send({
            data: passwordMan.genPassword(8)
        })
    } catch (err) {
        console.error(err)
        flash.error(req, 'home', err.message)
        return res.redirect('/me')
    }
})
// C.3 Submit Change Password
router.patch('/me/account/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_own_password']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let body = req.body

        if(!body.currPassword){
            throw new Error('Current password is required.')
        }
        if(body.currPassword.length < 8){
            throw new Error('Current password is less than 8 characters long.')
        }

        if(!body.newPassword){
            throw new Error('New password is required.')
        }
        if(body.newPassword.length < 8){
            throw new Error('New password is less than 8 characters long.')
        }

        if(body.currPassword === body.newPassword){
            throw new Error('The new password must be different from the current one.')
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(body.currPassword, editUser.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(editUser.passwordHash, 'utf8'))) {
            throw new Error('Incorrect password.')
        }

        let NewPasswordHash = passwordMan.hashPassword(body.newPassword, editUser.salt)
        editUser.set({
            passwordHash: NewPasswordHash,
        });

        await editUser.save()

        flash.ok(req, 'account', 'Password changed.')
        res.redirect('/me/account')
    } catch (err) {
        console.error(err)
        flash.error(req, 'account', err.message)
        return res.redirect('/me/account')
    }
});
// C.4 Display Own Profile
router.get('/me/profile', middlewares.guardRoute(['read_own_account']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let user = await req.app.locals.db.models.User.findOne({
            where: {
                id: sessionUser.id
            }
        })

        let dateUpdated = moment(user.imgPathUpdate);
        let dateNow = moment();
        let dateDiff = dateUpdated.diff(dateNow, 'days');

        let data = {
            flash: flash.get(req, 'profile'),
            user,
            remDays: dateDiff > 0 ? dateDiff : 0,
            app: { title: `Profile | ${CONFIG.app.title}` }
        }
        
        res.render('me/profile.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'profile', err.message)
        return res.redirect('/me')
    }
});
// C.5 Submit Update Profile
router.post('/me/upload/:userId', middlewares.guardRoute(['update_own_record']), async (req, res, next) => {
    try {
        let userRefNum = req.params.userId

        let editUser = await req.app.locals.db.models.User.findOne({
            where: {
                refNumber: userRefNum
            }
        })

        if (!req.files || Object.keys(req.files).length === 0) {
            throw new Error('No files were uploaded.')
        }

        // Accessing the file
        const pp = req.files.file;
        const staticPath = `${CONFIG.app.dirs.public}`;
        const fileExtension = path.extname(pp.name).toLowerCase();

        // Acceptable formats
        const acceptedFormats = ['.png', '.jpeg', '.jpg'];

        // Check if the file format is acceptable
        if (!acceptedFormats.includes(fileExtension)) {
            throw new Error('Invalid file format. Please upload a .png, .jpeg, or .jpg file.')
        }

        const newFileName = `profile_${moment().format('YYYYMMDD_HHmmss')}${fileExtension}`; 
        const imagePath = `/upload/alumni/${newFileName}`;
        const fullPath = `${staticPath}${imagePath}`;

        // Compress and save the image using sharp
        sharp(pp.data) // Use pp.data for the image buffer
        .resize(300) // Optional: Resize the image to a width of 800px, maintaining aspect ratio
        .toFile(fullPath, async (err) => {
            if (err) {
                throw new Error('An error occurred while compressing the image.');
            }

            let momentNow = moment()
            editUser.set({
                imgPath: imagePath,
                imgPathUpdate: momentNow.clone().add(30, 'days').toDate(),
            })
            await editUser.save()

            // Returning the response with file path and name
            return res.send({ 
                path: imagePath
            });
        });

        flash.ok(req, 'profile', 'You successfully updated your profile picture.');
    } catch (err) {
        console.error(err)
        flash.error(req, 'profile', err.message)
        return res.redirect('/me')
    }
});


module.exports = router;