// Core modules
let { timingSafeEqual } = require('crypto')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Op, where } = require("sequelize")
// const nodemailer = require('nodemailer');

// Modules
const mailer = require('../mailer')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('home.html')
    } catch (err) {
        next(err)
    }
});

router.get('/background', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('background.html')
    } catch (err) {
        next(err)
    }
});

router.get('/map', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('map.html')
    } catch (err) {
        next(err)
    }
});

router.get('/organizational-structure', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('organizational-structure.html')
    } catch (err) {
        next(err)
    }
});

router.get('/office', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('office.html')
    } catch (err) {
        next(err)
    }
});

router.get('/login', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }
        
        res.render('login.html', {
            flash: flash.get(req, 'login'),
            username: lodash.get(req, 'query.username', ''),
        });
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/login');
    }
});

router.post('/login', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        let post = req.body;

        let username = lodash.get(post, 'username', '');
        let password = lodash.trim(lodash.get(post, 'password', ''))

        // Find admin
        let user = await req.app.locals.db.models.User.findOne({ 
            where: { 
                username: username 
            } 
        })
        if (!user) {
            throw new Error('Incorrect username.')
        }

        if (!user.active) {
            throw new Error('Your account has been deactivated. Please contact the system administrator for assistance.');
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(password, user.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
            flash.error(req, 'login', 'Incorrect password.');
            return res.redirect(`/login?username=${username}`);
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user.id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);
            
        if (user.roles == 'admin' || user.roles == 'manager') {
            return res.redirect('/admin/alumni-records');
        } else if (user.roles == 'alumni') {
            return res.redirect('/me');
        }
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/login');
    }
});

router.get('/logout', async (req, res, next) => {
    try {
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.authPasscodeId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);
        res.clearCookie(CONFIG.session.name, CONFIG.session.cookie);

        res.redirect('/');
    } catch (err) {
        next(err);
    }
});

router.get('/register', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/admin/alumni-records`)
        }
        res.render('register.html', {
            flash: flash.get(req, 'register'),
            suffixes: CONFIG.suffixes
        });
    } catch (err) {
        next(err);
    }
});

router.post('/register', async (req, res, next) => {
    try {
        let payload = JSON.parse(req?.body?.payload)
        console.log(payload)

        let firstName = lodash.trim(lodash.get(payload, 'firstName', ''))
        let middleName = lodash.trim(lodash.get(payload, 'middleName', ''))
        let lastName = lodash.trim(lodash.get(payload, 'lastName', ''))
        let suffix = lodash.trim(lodash.get(payload, 'suffix', ''))
        let email = lodash.trim(lodash.get(payload, 'email', ''))
        let acceptedDataPrivacy = lodash.trim(lodash.get(payload, 'acceptedDataPrivacy'))

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

        if (!email) {
            throw new Error('Email is required.')
        } else {
            email = email.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email) === false) {
                throw new Error('Invalid email.')
            }
        }
        
        if (!acceptedDataPrivacy) {
            throw new Error('You must have read and accepted the Data Privacy and Consent Form is required.')
        }

        // Check email availability
        let existingEmail = await req.app.locals.db.models.Alumni.findOne({
            where: {
                email: email
            }
        })
        if (existingEmail) {
            throw new Error(`Email "${email}" is already registered.`)
        }

        // Delete expired
        await req.app.locals.db.models.UserVerification.destroy({
            where: {
                expiredAt: {
                    [Op.lte]: moment().toDate()
                }
            }
        });

        // Rate limit creation of unverified accounts
        let unverified = await req.app.locals.db.models.UserVerification.findOne({
            where: { 
                payload: { 
                    email: email
                }
            } 
        })
        if (unverified) {
            throw new Error(`You still have a pending registration. Please wait patiently while the Alumni Affairs Office verifies your request.`)
        }

        let refNo = await passwordMan.randomEightDigit()
        let verificationPayload = {
            firstName: firstName,
            middleName: middleName,
            lastName: lastName,
            suffix: suffix,
            email: email,
            role: 'alumni',
            acceptedDataPrivacy: acceptedDataPrivacy,
        }

        let momentNow = moment()
        unverified = await req.app.locals.db.models.UserVerification.create({
            refNumber: refNo,
            payload: verificationPayload,
            createdAt: momentNow.toDate(),
            expiredAt: momentNow.clone().add(30, 'days').toDate(),
        })

        res.redirect(`/register-pending?ref=${refNo}&firstName=${firstName}&email=${email}`)
    } catch (err) {
        console.error(err)
        flash.error(req, 'register', err.message)
        res.redirect(`/register`)
    }
});

router.get('/register-pending', async (req, res, next) => {
    try {
        const refNo = req.query.ref || '';
        const firstName = req.query.firstName || '';
        const email = req.query.email || '';

        const existingRefNo = await req.app.locals.db.models.UserVerification.findOne({
             where: { 
                refNumber: refNo 
            } 
        });
        if (!existingRefNo) {
            throw new Error('Invalid reference number.')
        }

        res.render('register-pending.html', {
            refNo,
            firstName,
            email,
        });
    } catch (err) {
        console.error(err)
        flash.error(req, 'register', err.message)
        res.redirect(`/register`)
    }
});

// View Data Privacy and Consent Form
router.get('/data-privacy', async (req, res, next) => {
    try {        
        res.render('data-privacy.html');
    } catch (err) {
        next(err);
    }
});

// Display Reset Page
router.get('/reset', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }
        
        res.render('reset.html', {
            flash: flash.get(req, 'forgot')
        });
    } catch (err) {
        next(err);
    }
});

// Submit Reset Request
router.post('/reset', async (req, res, next) => {
    try {
        let post = req.body;

        let username = lodash.get(post, 'username', '');

        // Find admin
        let user = await req.app.locals.db.models.User.findOne({ 
            where: { 
                username: username 
            } 
        })
        if (!user) {
            throw new Error('Incorrect username.')
        }

        if (!user.active) {
            throw new Error('Your account has been deactivated. Please contact the system administrator for assistance.');
        }

        if (!user.roles.includes('alumni')) {
            throw new Error('This is for alumni accounts only. Please contact the system administrator for assistance.');
        }

        // Find alumni
        let alumni = await req.app.locals.db.models.Alumni.findOne({ 
            where: { 
                userId: user.id,
                email: { [Op.ne]: null, [Op.ne]: '' }
            } 
        })

        if(!alumni) {
            throw new Error(`You don't have an email associated with your account. Please contact the system administrator for assistance.`);
        }

        let email = alumni.email;

        if (email) {
            email = email.trim()
            if (/^[\w-\.+]+@([\w-]+\.)+[\w-]{2,4}$/g.test(email) === false) {
                throw new Error('Invalid email.')
            }
        }

        // Delete expired
        await req.app.locals.db.models.PasswordReset.destroy({
            where: {
                expiredAt: {
                    [Op.lte]: moment().toDate()
                }
            }
        });

        let alreadyRequested = await req.app.locals.db.models.PasswordReset.findOne({ 
            where: { 
                createdBy: email,
            } 
        })
        if (alreadyRequested) {
            throw new Error('You already sent a request for a password reset. Please check your email.')
        }

        let secureKey = await passwordMan.randomStringAsync(32)
        let resetLink = `${CONFIG.app.url}/forgotten/${secureKey}`
        let hash = passwordMan.hashSha256(resetLink)
        resetLink += '?hash=' + hash

        let momentNow = moment()
        passwordReset = await req.app.locals.db.models.PasswordReset.create({
            secureKey: secureKey,
            createdBy: email,
            payload: {
                url: resetLink,
                userId: user.id,
                hash: hash
            },
            createdAt: momentNow.toDate(),
            expiredAt: momentNow.clone().add(1, 'hour').toDate(),
        })

        let data = {
            email: email,
            firstName: alumni.firstName,
            resetLink: `${resetLink}`
        }

        await mailer.sendForgot(data)

        res.redirect(`/sent?email=${email}`);
    } catch (err) {
        console.error(err)
        flash.error(req, 'forgot', err.message);
        return res.redirect('/reset');
    }
});

router.get('/sent', async (req, res, next) => {
    try {
        let authUserId = lodash.get(req, 'session.authUserId')

        if (authUserId) {
            let user = await req.app.locals.db.models.User.findByPk(authUserId)
            
            if (user.roles == 'admin' || user.roles == 'manager') {
                return res.redirect('/admin/alumni-records');
            } else if (user.roles == 'alumni') {
                return res.redirect('/me');
            }
        }

        res.render('sent.html', {
            email: lodash.get(req, 'query.email', '')
        })
    } catch (err) {
        next(err)
    }
});

router.get('/forgotten/:secureKey', async (req, res, next) => {
    try {

        await req.app.locals.db.models.PasswordReset.destroy({
            where: {
                expiredAt: {
                    [Op.lte]: moment().toDate()
                }
            }
        });

        // Find
        let secureKey = lodash.get(req, 'params.secureKey')
        if (!secureKey) {
            throw new Error('Missing secureKey.')
        }

        let passwordReset = await req.app.locals.db.models.PasswordReset.findOne({ 
            where: { 
                secureKey: secureKey,
            } 
        })
        if (!passwordReset) {
            throw new Error('Link not found.')
        }

        let hash = lodash.get(req, 'query.hash')
        if (!hash) {
            throw new Error('Missing hash.')
        }

        let resetLink = `${CONFIG.app.url}/forgotten/${secureKey}`
        if (hash != passwordMan.hashSha256(resetLink)) {
            throw new Error('Invalid hash.')
        }

        // Find admin
        let alumni = await req.app.locals.db.models.Alumni.findOne({
            where: { 
                email: passwordReset.createdBy,
            } 
        });
        if (!alumni) {
            throw new Error('Email not found.')
        }

        let user = await req.app.locals.db.models.User.findOne({
            where: { 
                id: alumni.userId,
            } 
        });
        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Gen password
        let password = passwordMan.genPassword(8)
        let passwordHash = passwordMan.hashPassword(password, user.salt)
        user.passwordHash = passwordHash
        await user.save()

        // Delete current password reset log
        await req.app.locals.db.models.PasswordReset.destroy({
            where: {
                id: passwordReset.id,
            }
        });

        return res.render('forgotten.html', {
            username: user.username,
            password: password,
        });
    } catch (err) {
        console.error(err)
        flash.error(req, 'forgot', err.message);
        return res.redirect('/forgot');
    }
});

module.exports = router;