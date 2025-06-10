// Core modules
let { timingSafeEqual } = require('crypto')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Op, Sequelize } = require("sequelize")
const fileUpload = require('express-fileupload');
const cors = require('cors')
const path = require('path')
const sharp = require('sharp')

// Modules
const middlewares = require('../../middlewares')
const mailer = require('../../mailer')
const passwordMan = require('../../password-man')

// Router
let router = express.Router()

//// Dashboard Routes
router.use('/admin', middlewares.requireAuthAdmin)

// A.1 Display Dashboard
router.get('/admin', middlewares.guardRoute(['read_admin_dashboard']), async (req, res, next) => {
    try {
        res.redirect('/admin/alumni-records')
    } catch (err) {
        next(err);
    }
});
////


//// User Routes
router.use('/admin/users', middlewares.requireAuthUser)

// All Users
// A.1 Display List of Users
router.get('/admin/users', middlewares.guardRoute(['read_all_user']), async (req, res, next) => {
    try {
        const searchKey = req.query?.searchKey || '';
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 100; // Records per page
        const offset = (page - 1) * limit; // Calculate offset
        let sessionUser = res.locals.user;
        
        let users = [];
        let totalRecords = 0;

        const whereClause = searchKey ? {
            username: {
                [Op.like]: `%${searchKey || ''}%`
            },
            ...(sessionUser.roles.includes('manager') && {
                roles: {
                    [Op.ne]: ['admin']
                }
            })
        } : {
            id: {
                [Op.ne]: sessionUser.id
            },
            ...(sessionUser.roles.includes('manager') && {
                roles: {
                    [Op.ne]: ['admin']
                }
            })
        }

        // Get total count of records
        totalRecords = await req.app.locals.db.models.User.count({ where: whereClause });

        // Fetch records with pagination
        users = await req.app.locals.db.models.User.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        if(searchKey) {
            if(users.length <= 0) {
                flash.error(req, 'user', `Found ${users.length} user(s) with username "${searchKey}".`);
            } else {
                flash.ok(req, 'user', `Found ${users.length} user(s) with username "${searchKey}".`);
            }
        }

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);

        let data = {
            flash: flash.get(req, 'user'),
            users,
            searchKey,
            sessionUser,
            currentPage: page,
            totalPages
        }
        
        res.render('admin/user/all.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'user', err.message);
        return res.redirect('/admin/users')
    }
});

// Create User
// B.1 Display Create User
router.get('/admin/users/create', middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        let roles = await req.app.locals.db.models.Role.findAll()
        let data = {
            roles,
            password: passwordMan.genPassphrase(3)
        }
        res.render('admin/user/create.html', data);
    } catch (err) {
        next(err);
    }
});
// B.2 Generate Password
router.post('/admin/users/regen', middlewares.antiCsrfCheck, middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        res.send({
            data: passwordMan.genPassword(8)
        })
    } catch (err) {
        next(err);
    }
})
// B.3 Submit Create User
router.post('/admin/users', middlewares.antiCsrfCheck, middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        let body = req.body

        if (body.username.length <= 2) {
            throw new Error('Username too short.')
        }
        let existUser = await req.app.locals.db.models.User.findOne({
            where: {
                username: body.username
            }
        })
        if (existUser) {
            throw new Error(`Username ${existUser.username} already exists.`)
        }

        let refNo = passwordMan.randomString(16)
        let salt = passwordMan.randomString(16)
        let passwordHash = passwordMan.hashPassword(body.password, salt)
        let createdUser = await req.app.locals.db.models.User.create({
            refNumber: refNo,
            username: body.username,
            salt: salt,
            passwordHash: passwordHash,
            roles: [body.role],
            active: true
        })

        flash.ok(req, 'user', 'Created user.')
        res.redirect(`/admin/users/${createdUser.id}`)
    } catch (err) {
        next(err);
    }
});

// Update User
// C.1 Display Update User
router.get('/admin/users/:userId', middlewares.guardRoute(['read_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let sessionUser = res.locals.user;
        let roles = await req.app.locals.db.models.Role.findAll({
            where: {
                ...(sessionUser.roles.includes('manager') && {
                    key: {
                        [Op.ne]: 'admin'
                    }
                })
            }
        })

        let data = {
            flash: flash.get(req, 'user'),
            roles,
            editUser,
            sessionUser
        }

        res.render('admin/user/update.html', data);
    } catch (err) {
        next(err);
    }
});
// C.2 Submit Update User
router.patch('/admin/users/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let body = req.body

        if (!body.username) {
            throw new Error('Username is required.')
        }
        if (body.username.length <= 2) {
            throw new Error('Username too short.')
        }
        let existUser = await req.app.locals.db.models.User.findOne({
            where: {
                id: {
                    [Op.ne]: editUser.id
                },
                username: body.username
            }
        })
        if (existUser) {
            throw new Error(`Username ${existUser.username} already exists.`)
        }

        if (!body.role) {
            throw new Error('Role is required.')
        }

        if (body.password) {
            let passwordHash = passwordMan.hashPassword(body.password, editUser.salt);
            editUser.set({
                username: body.username,
                passwordHash: passwordHash,
                roles: [body.role],
            });
        } else {
            editUser.set({
                username: body.username,
                roles: [body.role],
            });
        }

        await editUser.save()

        flash.ok(req, 'user', 'Updated user.')
        res.redirect(`/admin/users/${editUser.id}`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'user', err.message);
        return res.redirect('/admin/users')
    }
});

router.get('/admin/users/:userId/isActive', middlewares.guardRoute(['activate_deactivate_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user

        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: editUser.id
            }
        })

        if(editUser.active == true) {
            editUser.set({
                active: false,
            });
        } else {
            editUser.set({
                active: true,
            }); 
        }

        await editUser.save()

        if(editUser.active == true) {
            flash.ok(req, 'alumni', `Activated user "${editUser.username}".`)
        } else {
            flash.ok(req, 'alumni', `Deactivated user "${editUser.username}".`)
        }

        res.redirect(`/admin/alumni-records/${alumni.refNumber}/view`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});

// Delete User
// D.1 Display Delete User
router.get('/admin/users/:userId/delete', middlewares.guardRoute(['delete_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let deleteUser = res.user

        let data = {
            flash: flash.get(req, 'user'),
            deleteUser
        }
        res.render('admin/user/delete.html', data);
    } catch (err) {
        next(err);
    }
});
// D.2 Submit Delete User
router.delete('/admin/users/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['delete_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let deleteUser = res.user

        let alm = await req.app.locals.db.models.Alumni.findOne({
            where: {
                userId: deleteUser.id
            }
        })

        if (alm) {
            await req.app.locals.db.models.Education.destroy({
                where: {
                    almId: alm.refNumber
                }
            });
            await req.app.locals.db.models.Work.destroy({
                where: {
                    almId: alm.refNumber
                }
            });
            await req.app.locals.db.models.Alumni.destroy({
                where: {
                    userId: deleteUser.id
                }
            });
        }

        await deleteUser.destroy({ force: true })

        flash.ok(req, 'user', 'Deleted user.')
        res.redirect('/admin/users')
    } catch (err) {
        next(err);
    }
});
////

// E.1 Display Own Account
router.get('/admin/account', middlewares.guardRoute(['read_user']), async (req, res, next) => {
    try {
        let sessionUser = res.locals.user;

        let user = await req.app.locals.db.models.User.findOne({
            where: {
                id: sessionUser.id
            }
        })

        let data = {
            flash: flash.get(req, 'account'),
            user
        }
        
        res.render('admin/user/account.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'account', err.message);
        return res.redirect('/admin/users')
    }
});

// E.2 Submit Change Password
router.patch('/admin/account/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_user']), middlewares.getUser(), async (req, res, next) => {
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
        res.redirect('/admin/account')
    } catch (err) {
        console.error(err)
        flash.error(req, 'account', err.message);
        return res.redirect('/admin/account')
    }
});


//// Registration Routes
router.use('/admin/registrations', middlewares.requireAuthUser)

// All Registration
// A.1 Display List of Registrations
router.get('/admin/registrations', middlewares.guardRoute(['read_all_registration']), async (req, res, next) => {
    try {
        const searchKey = req.query?.searchKey || '';
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 100; // Records per page
        const offset = (page - 1) * limit; // Calculate offset

        let users = [];
        let totalRecords = 0;

        const whereClause = searchKey ? {
            [Op.or]: [
                { refNumber: { [Op.like]: `%${searchKey}%` } },
                Sequelize.where(
                    Sequelize.json('payload.firstName'),
                    {
                        [Op.like]: `%${searchKey}%`
                    }
                ),
                Sequelize.where(
                    Sequelize.json('payload.lastName'),
                    {
                        [Op.like]: `%${searchKey}%`
                    }
                )
            ]
        } : {}

        // Get total count of records
        totalRecords = await req.app.locals.db.models.UserVerification.count({ where: whereClause });

        // Fetch records with pagination
        users = await req.app.locals.db.models.UserVerification.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        if(searchKey) {
            if (users.length <= 0) {
                flash.error(req, 'registration', `Found ${users.length} request(s) with Ref. No. or Name "${searchKey}".`);
            } else {
                flash.ok(req, 'registration', `Found ${users.length} request(s) with Ref. No. or Name "${searchKey}".`);
            }
        }

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);

        let data = {
            flash: flash.get(req, 'registration'),
            users,
            searchKey,
            currentPage: page,
            totalPages
        }
        
        res.render('admin/registration/all.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'registration', err.message);
        return res.redirect('/admin/registrations')
    }
});

// Approve Registration
// B.1 Display Approve Registration
router.get('/admin/registrations/:regId/approve', middlewares.guardRoute(['read_registration']), middlewares.getReg(), async (req, res, next) => {
    try {
        let approveReg = res.reg

        let roles = await req.app.locals.db.models.Role.findAll({
            where: {
                key: {
                    [Op.like]: 'alumni'
                }
            }
        })

        let data = {
            flash: flash.get(req, 'registration'),
            suffixes: CONFIG.suffixes,
            approveReg,
            username: passwordMan.genUsername(approveReg.payload.firstName, approveReg.payload.lastName),
            password: passwordMan.genPassword(8),
            roles
        }

        res.render('admin/registration/approve.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'registration', err.message);
        return res.redirect('/admin/registrations')
    }
});
// B.2 Submit Approve Registration
router.post('/admin/registrations/:regId/approve', middlewares.antiCsrfCheck, middlewares.guardRoute(['approve_registration']), middlewares.getReg(), async (req, res, next) => {
    try {
        let approveReg = res.reg
        let body = req.body

        if (!body.firstName) {
            throw new Error('First Name is required.')
        }

        if (body.middleName) {
            body.middleName = body.middleName.trim()
            if (body.middleName.at(-1) == '.' || body.middleName.length <= 1) {
                throw new Error('Please write your Middle Name in full.')
            }
        }

        if (!body.lastName) {
            throw new Error('Last Name is required.')
        }

        if (body.username.length <= 2) {
            throw new Error('Username too short.')
        }
        let existUsername = await req.app.locals.db.models.User.findOne({
            where: {
                username: body.username
            }
        })
        if (existUsername) {        
            throw new Error(`Username ${existUsername.username} already exists.`)
        }
        if (!body.password) {
            throw new Error('Password is required.')
        }
        if (!body.role) {
            throw new Error('Role is required.')
        }
        if (!body.email) {
            throw new Error('Email is required.')
        } else {
            body.email = body.email.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(body.email) === false) {
                throw new Error('Invalid email.')
            }
            let existEmail = await req.app.locals.db.models.Alumni.findOne({
                where: {
                    email: body.email
                }
            })
            if (existEmail) {
                throw new Error(`Email ${existEmail.email} already exists.`)
            }
        }

        let salt = passwordMan.randomString(16)
        let passwordHash = passwordMan.hashPassword(body.password, salt)
        let refNo = passwordMan.randomString(16)
        let createdUser = await req.app.locals.db.models.User.create({
            refNumber: refNo,
            username: body.username,
            passwordHash: passwordHash,
            salt: salt,
            roles: [body.role],
            active: true
        })

        let refNo2 = passwordMan.randomString(16)
        let createdAlumni = await req.app.locals.db.models.Alumni.create({
            refNumber: refNo2,
            firstName: body.firstName,
            middleName: body.middleName,
            lastName: body.lastName,
            suffix: body.suffix,
            email: body.email,
            userId: createdUser.id
        })

        if(!createdAlumni) {
            throw new Error('Failed to create alumni account.')
        }

        await req.app.locals.db.models.UserVerification.destroy({
            where: {
                id: approveReg.id
            }
        });

        let verifyLink = `${CONFIG.app.url}/login`
        let data = {
            email: createdAlumni.email,
            firstName: createdAlumni.firstName,
            username: body.username,
            password: body.password,
            verifyLink: `${verifyLink}`
        }

        await mailer.sendVerify(data)
        
        flash.ok(req, 'registration', 'Created alumni account.')
        res.redirect(`/admin/registrations/${createdAlumni.refNumber}/preview?username=${body.username}&password=${body.password}&isSubmitted=true`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'registration', err.message);
        return res.redirect('/admin/registrations')
    }
});

// Preview Registration
// C.1 Display Preview Registration
router.get('/admin/registrations/:almId/preview', middlewares.guardRoute(['approve_registration']), async (req, res, next) => {
    try {
        let refNumber = req.params.almId || ''
        let username = req.query?.username
        let password = req.query?.password
        let isSubmitted = req.query?.isSubmitted

        let data = {
            flash: flash.get(req, 'registration'),
            refNumber: refNumber,
            username: username,
            password: password,
            isSubmitted: isSubmitted
        }

        res.render('admin/registration/preview.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'registration', err.message);
        return res.redirect('/admin/registrations')
    }
});

// Delete Registration
// D.1 Display Delete Registration
router.get('/admin/registrations/:regId/delete', middlewares.guardRoute(['delete_registration']), middlewares.getReg(), async (req, res, next) => {
    try {
        let deleteReg = res.reg

        let data = {
            flash: flash.get(req, 'registration'),
            deleteReg
        }
        res.render('admin/registration/delete.html', data);
    } catch (err) {
        next(err);
    }
});
// D.2 Submit Delete Registration
router.delete('/admin/registrations/:regId', middlewares.antiCsrfCheck, middlewares.guardRoute(['delete_registration']), middlewares.getReg(), async (req, res, next) => {
    try {
        let deleteReg = res.reg

        await deleteReg.destroy({ force: true })

        flash.ok(req, 'registration', 'Deleted registration.')
        res.redirect('/admin/registrations')
    } catch (err) {
        next(err);
    }
});
////


//// Alumni Routes
router.use('/admin/alumni-records', middlewares.requireAuthUser)

// All Alumni Records
// A.1 Display Alumni Records
router.get('/admin/alumni-records', middlewares.guardRoute(['read_all_alumni']), async (req, res, next) => {
    try {
        const searchKey = req.query?.searchKey || '';
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 100; // Records per page
        const offset = (page - 1) * limit; // Calculate offset

        let alumni = [];
        let totalRecords = 0;

        const whereClause = searchKey ? {
            [Op.or]: [
                { firstName: { [Op.like]: `%${searchKey}%` } },
                { lastName: { [Op.like]: `%${searchKey}%` } }
            ]
        } : {};

        // Get total count of records
        totalRecords = await req.app.locals.db.models.Alumni.count({ where: whereClause });

        // Fetch records with pagination
        alumni = await req.app.locals.db.models.Alumni.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            include: [{
                model: req.app.locals.db.models.Education,
                required: false
            }],
            limit: limit,
            offset: offset
        });

        if(searchKey) {
            if (alumni.length <= 0) {
                flash.error(req, 'alumni', `Found ${alumni.length} record(s) with Name "${searchKey}".`);
            } else {
                flash.ok(req, 'alumni', `Found ${alumni.length} record(s) with Name "${searchKey}".`);
            }
        }

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);
        
        const data = {
            flash: flash.get(req, 'alumni'),
            alumni,
            searchKey,
            currentPage: page,
            totalPages
        };
        
        res.render('admin/alumni/all.html', data);
    } catch (err) {
        console.error(err);
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records');
    }
});

// Generate Reports
router.get('/admin/alumni-records/reports', middlewares.guardRoute(['read_all_alumni']), async (req, res, next) => {
    try {
        let s1 = req.query?.yearGraduated
        let s2 = req.query?.campus
        let s3 = req.query?.college
        let s4 = req.query?.course
        let s5 = req.query?.track
        let s6 = req.query?.strand
        let s7 = req.query?.degree
        let whereConditions = [];
        let alumni = [];
        
        if (s1) {
            whereConditions.push({ yearGraduated: { [Op.like]: `%${s1}%` } });
        }
        if (s2) {
            whereConditions.push({ campus: { [Op.like]: `%${s2}%` } });
        }
        if (s3) {
            whereConditions.push({ college: { [Op.like]: `%${s3}%` } });
        }
        if (s4) {
            whereConditions.push({ course: { [Op.like]: `%${s4}%` } });
        }
        if (s5) {
            whereConditions.push({ track: { [Op.like]: `%${s5}%` } });
        }
        if (s6) {
            whereConditions.push({ strand: { [Op.like]: `%${s6}%` } });
        }
        if (s7) {
            whereConditions.push({ degree: s7 });
        }

        if (whereConditions.length === 0) {
            // If no filters are applied, we can skip the where clause
            whereConditions = [{}]; // Use an empty object to avoid Sequelize errors
        } else {
            // Fetch alumni records based on the constructed where conditions
            alumni = await req.app.locals.db.models.Alumni.findAll({
                include: [
                    {
                        model: req.app.locals.db.models.Education,
                        required: true, // Change to true if you want only alumni with education records
                        where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {} // Use the constructed conditions or an empty object
                    },
                    {
                        model: req.app.locals.db.models.Work,
                        required: true
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
        }

        let foundText = `Found ${alumni.length} result(s)`;

        if(alumni.length <= 0) {
            if (s1 || s2 || s3 || s4 || s5 || s6 || s7) {
                flash.error(req, 'alumni', foundText);
            }
        } else {
            if (s1 || s2 || s3 || s4 || s5 || s6 || s7) {
                flash.ok(req, 'alumni', foundText);
            }
        }

        let data = {
            flash: flash.get(req, 'alumni'),
            alumni,
            degrees: CONFIG.degrees,
            tracks: CONFIG.tracks,
            strands: CONFIG.strands,
            s1, s2, s3, s4, s5, s6, s7
        }

        console.log(alumni)
        
        res.render('admin/alumni/reports.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records/reports')
    }
});

// View Alumni Records
// B.2 Display View Alumni Records
router.get('/admin/alumni-records/:almId/view', middlewares.guardRoute(['read_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let viewAlm = res.alm

        let users = await req.app.locals.db.models.User.findOne({
            where: {
                id: viewAlm.userId
            }
        })

        let educ = await req.app.locals.db.models.Education.findOne({
            where: {
                almId: viewAlm.refNumber
            }
        })

        let work = await req.app.locals.db.models.Work.findOne({
            where: {
                almId: viewAlm.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'alumni'),
            viewAlm,
            users,
            educ,
            work
        }

        res.render('admin/alumni/view.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});

// Update Alumni Records
// C.1 Display Update Alumni Records - Basic Info.
router.get('/admin/alumni-records/:almId/edit/basic-info', middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm

        let data = {
            flash: flash.get(req, 'alumni'),
            civilStatuses: CONFIG.civilStatuses,
            suffixes: CONFIG.suffixes,
            editAlm
        }

        res.render('admin/alumni/update-basic-info.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.2 Submit Update Alumni Records - Basic Info.
router.patch('/admin/alumni-records/:almId/edit/basic-info', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
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

        flash.ok(req, 'alumni', 'Updated the basic information.')
        res.redirect(`/admin/alumni-records/${editAlm.refNumber}/view#content1`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.3 Display Update Alumni Records - Education
router.get('/admin/alumni-records/:almId/edit/education', middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm

        let editAlmEduc = await req.app.locals.db.models.Education.findOne({
            where: {
                almId: editAlm.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'alumni'),
            degrees: CONFIG.degrees,
            tracks: CONFIG.tracks,
            strands: CONFIG.strands,
            editAlmEduc,
            editAlm
        }

        res.render('admin/alumni/update-education.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.4 Submit Update Alumni Records - Education
router.patch('/admin/alumni-records/:almId/edit/education', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
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

        flash.ok(req, 'alumni', 'Updated the educational records.')
        res.redirect(`/admin/alumni-records/${editAlm.refNumber}/view#content2`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.5 Display Update Alumni Records - Work
router.get('/admin/alumni-records/:almId/edit/work', middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm

        let editAlmWork = await req.app.locals.db.models.Work.findOne({
            where: {
                almId: editAlm.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'alumni'),
            employmentStatuses: CONFIG.employmentStatuses,
            employmentSectors: CONFIG.employmentSectors,
            employmentLocations: CONFIG.employmentLocations,
            editAlmWork,
            editAlm
        }
        
        res.render('admin/alumni/update-work.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.6 Submit Update Alumni Records - Work
router.patch('/admin/alumni-records/:almId/edit/work', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
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
                employmentStatus: employmentStatus,
                from: from,
                to: to,
                isPresent: isPresent
            })
            await editAlmWork.save()
        }

        flash.ok(req, 'alumni', 'Updated the work details.')
        res.redirect(`/admin/alumni-records/${editAlm.refNumber}/view#content3`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});
// C.7 Upload Alumni Profile Picture
router.post('/admin/upload/:almId', middlewares.guardRoute(['update_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let editAlm = res.alm

        let editUser = await req.app.locals.db.models.User.findOne({
            where: {
                id: editAlm.userId
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

        flash.ok(req, 'alumni', 'Profile picture of this alumni has been updated successfully.');
    } catch (err) {
        console.error(err)
        flash.error(req, 'alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});

// Print Alumni Records
router.get('/admin/alumni-records/:almId/print', middlewares.guardRoute(['read_alumni']), middlewares.getAlm(), async (req, res, next) => {
    try {
        let viewAlm = res.alm

        let user = await req.app.locals.db.models.User.findOne({
            where: {
                id: viewAlm.userId
            }
        })

        let educ = await req.app.locals.db.models.Education.findOne({
            where: {
                almId: viewAlm.refNumber
            }
        })

        let work = await req.app.locals.db.models.Work.findOne({
            where: {
                almId: viewAlm.refNumber
            }
        })

        let data = {
            flash: flash.get(req, 'print-alumni'),
            viewAlm,
            user,
            educ,
            work
        }

        res.render('admin/alumni/print.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'print-alumni', err.message);
        return res.redirect('/admin/alumni-records')
    }
});

//// Report Visualization Routes
router.use('/admin/report-visualization', middlewares.requireAuthUser)

// Filter Report Visualizations
router.get('/admin/report-visualization', middlewares.guardRoute(['read_all_report_visualization']), async (req, res, next) => {
    try {
        let s1 = req.query?.yearGraduated
        let s2 = req.query?.campus
        let s3 = req.query?.college
        let s4 = req.query?.course
        let s5 = req.query?.track
        let s6 = req.query?.strand
        let s7 = req.query?.degree
        let s8 = req.query?.employmentStatus
        let s9 = req.query?.employmentLocation
        let s10 = req.query?.employmentSector
        let s11 = req.query?.workProgramAlignment
        let whereConditions1 = [];
        let whereConditions2 = [];
        let alumni = [];
        
        if (s1) {
            whereConditions1.push({ yearGraduated: { [Op.like]: `%${s1}%` } });
        }
        if (s2) {
            whereConditions1.push({ campus: { [Op.like]: `%${s2}%` } });
        }
        if (s3) {
            whereConditions1.push({ college: { [Op.like]: `%${s3}%` } });
        }
        if (s4) {
            whereConditions1.push({ course: { [Op.like]: `%${s4}%` } });
        }
        if (s5) {
            whereConditions1.push({ track: { [Op.like]: `%${s5}%` } });
        }
        if (s6) {
            whereConditions1.push({ strand: { [Op.like]: `%${s6}%` } });
        }
        if (s7) {
            whereConditions1.push({ degree: s7 });
        }
        if (s8) {
            whereConditions2.push({ employmentStatus: s8 });
        }
        if (s9) {
            whereConditions2.push({ employmentLocation: s9 });
        }
        if (s10) {
            whereConditions2.push({ employmentSector: s10 });
        }
        if (s11) {
            whereConditions2.push({ workProgramAlignment: s11 });
        }

        if (whereConditions1.length === 0 && whereConditions2.length === 0) {
            // If no filters are applied, we can skip the where clause
            whereConditions1 = [{}]; // Use an empty object to avoid Sequelize errors
            whereConditions2 = [{}]; // Use an empty object to avoid Sequelize errors
        } else {
            // Fetch alumni records based on the constructed where conditions
            alumni = await req.app.locals.db.models.Alumni.findAll({
                include: [
                    {
                        model: req.app.locals.db.models.Education,
                        required: true, // Change to true if you want only alumni with education records
                        where: whereConditions1.length > 0 ? { [Op.and]: whereConditions1 } : {} // Use the constructed conditions or an empty object
                    },
                    {
                        model: req.app.locals.db.models.Work,
                        required: true, // Change to true if you want only alumni with work records
                        where: whereConditions2.length > 0 ? { [Op.and]: whereConditions2 } : {} // Use the constructed conditions or an empty object
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
        }

        let data = {
            flash: flash.get(req, 'report-visualization'),
            alumni,
            degrees: CONFIG.degrees,
            tracks: CONFIG.tracks,
            strands: CONFIG.strands,
            employmentStatuses: CONFIG.employmentStatuses,
            employmentLocations: CONFIG.employmentLocations,
            employmentSectors: CONFIG.employmentSectors,
            s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11
        }

        console.log(alumni)

        res.render('admin/report-visualization/all.html', data);
    } catch (err) {
        console.error(err)
        flash.error(req, 'report-visualization', err.message);
        return res.redirect('/admin/report-visualization')
    }
});

module.exports = router;