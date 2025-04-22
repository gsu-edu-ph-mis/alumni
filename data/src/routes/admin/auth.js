// Core modules
const { timingSafeEqual } = require('crypto')

// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')

// Modules
const middlewares = require('../../middlewares')
const passwordMan = require('../../password-man')

// Router
let router = express.Router()


router.get('/admin-login', async (req, res, next) => {
    try {
        let ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
        let data = {
            ip
        }
        res.render('admin/login.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin-login', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }
        if (CONFIG.ipCheck && !CONFIG.ip.allowed.includes(ip)) {
            throw new Error(`IP "${ip}" is not allowed.`)
        }

        let post = req.body;

        let username = lodash.get(post, 'username', '');
        let password = lodash.trim(lodash.get(post, 'password', ''))

        // Find admin
        let user = await req.app.locals.db.models.User.findOne({
            where: { username: username }
        });
        if (!user) {
            throw new Error('Incorrect username.')
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Check password
        let passwordHash = passwordMan.hashPassword(password, user.salt);
        if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
            flash.error(req, 'login', 'Incorrect password.');
            return res.redirect(`/admin-login?username=${username}`);
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user.id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);

        if (user.roles.includes('admin')) {
            return res.redirect('/admin/alumnis')
        }
        if (user.roles.includes('manager')) {
            return res.redirect('/admin/alumnis')
        }
       
        return res.redirect('/');
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/admin-login');
    }
});

router.get('/admin-logout', async (req, res, next) => {
    try {
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.authPasscodeId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);
        res.clearCookie(CONFIG.session.name, CONFIG.session.cookie);

        res.redirect('/admin-login');
    } catch (err) {
        next(err);
    }
});

module.exports = router;