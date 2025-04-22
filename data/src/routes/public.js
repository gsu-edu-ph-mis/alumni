// Core modules
let { timingSafeEqual } = require('crypto')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Op } = require("sequelize")

// Modules
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/', async (req, res, next) => {
    try {
        res.render('home.html')
    } catch (err) {
        next(err)
    }
});

router.get('/q/me', async (req, res, next) => {
    try {
        res.render('q.html')
    } catch (err) {
        next(err)
    }
});

router.get('/login', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/admin/all`)
        }
        res.render('login.html', {
            flash: flash.get(req, 'login'),
            username: lodash.get(req, 'query.username', ''),
        });
    } catch (err) {
        next(err);
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
        let user = await req.app.locals.db.models.User.findOne({ where: { username: username } })
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
            return res.redirect(`/login?username=${username}`);
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user.id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);
        if(user.roles.includes('qtv')){
            return res.redirect('/q/group/1');
        }

        res.redirect('/admin/counter/all');
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


router.get(['/q/:ticketNumber', '/q/:ticketNumber/response.json'], async (req, res, next) => {
    try {
        let ticket = await req.app.locals.db.models.Ticket.findOne({
            where: {
                ticketNumber: req.params.ticketNumber
            }
        })
        if (!ticket) {
            throw new Error('Ticket not found.')
        }

        
        let counter = await req.app.locals.db.models.Counter.findOne({
            where: {
                id: 1
            },
            raw: true
        })
        if (!counter) {
            throw new Error('Counter not found.')
        }

        let tickets = await req.app.locals.db.models.Ticket.findAll({
            where: {
                groupId: counter.groupId
            },
            order: [
                ['priority', 'DESC'],
                ['createdAt', 'ASC'],
            ],
            raw: true
        })

        // Populate counter.ticket based on counter.ticketId
        let index = tickets.findIndex(ticket => {
            return ticket.id === counter.ticketId
        })

        counter.ticket = null
        if (index > -1) {
            counter.ticket = tickets.splice(index, 1).pop()
        }

        const group = await req.app.locals.db.models.Counter.findOne({
            where: {
                id: counter.groupId
            },
            raw: true
        })
        if(!group){
            throw new Error('Group not found.')
        }

        let data = {
            ticketNumber: req.params.ticketNumber,
            counter: counter,
            ticket: ticket,
            tickets: tickets,
            group: group,
        }
        if(req.originalUrl.includes('.json')){
            return res.send(data)
        }
        res.render('q-ticket.html', data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;