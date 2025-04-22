// Core modules

// External modules
const express = require('express')
const flash = require('kisapmata')
const { Op } = require("sequelize")

// Modules
const middlewares = require('../../middlewares')
const passwordMan = require('../../password-man')

// Router
let router = express.Router()

router.use('/admin/users', middlewares.requireAuthUser)

// All
router.get(['/admin/users', '/admin/users.json'], middlewares.guardRoute(['read_all_user']), async (req, res, next) => {
    try {
        let users = await req.app.locals.db.models.User.findAll()

        let data = {
            flash: flash.get(req, 'user'),
            users
        }
        if (req.originalUrl.includes('.json')) {
            return res.send(data)
        }
        res.render('admin/user/all.html', data);
    } catch (err) {
        next(err);
    }
});

// Create
router.get('/admin/users/create', middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        let groups = await req.app.locals.db.models.Group.findAll()
        let roles = await req.app.locals.db.models.Role.findAll()
        let data = {
            roles,
            groups,
            password: passwordMan.genPassphrase(4)
        }
        res.render('admin/user/create.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/users/regen', middlewares.antiCsrfCheck, middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        res.send({
            data: passwordMan.genPassphrase(4)
        })
    } catch (err) {
        next(err);
    }
})
router.post('/admin/users', middlewares.antiCsrfCheck, middlewares.guardRoute(['create_user']), async (req, res, next) => {
    try {
        let body = req.body

        // console.log(body)
        // return res.send(body)

        if (body.username.length <= 2) {
            throw new Error('Username too short.')
        }
        let dupe = await req.app.locals.db.models.User.findOne({
            where: {
                username: body.username
            }
        })
        if (dupe) {
            throw new Error(`Username ${dupe.username} already exists.`)
        }


        let salt = passwordMan.randomString(16)
        let passwordHash = passwordMan.hashPassword(body.password, salt)
        let createdUser = await req.app.locals.db.models.User.create({
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


// Update
router.get('/admin/users/:userId', middlewares.guardRoute(['read_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let roles = await req.app.locals.db.models.Role.findAll()

        let data = {
            flash: flash.get(req, 'user'),
            roles,
            editUser
        }
        res.render('admin/user/update.html', data);
    } catch (err) {
        next(err);
    }
});
router.patch('/admin/users/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['update_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let body = req.body

        if ('username' in body) {
            if (body.username.length <= 2) {
                throw new Error('Username too short.')
            }
            let dupe = await req.app.locals.db.models.User.findOne({
                where: {
                    id: {
                        [Op.ne]: editUser.id
                    },
                    username: body.username
                }
            })
            if (dupe) {
                throw new Error(`Username ${dupe.username} already exists.`)
            }

            editUser.set({
                username: body.username,
            });
        }
        if ('password' in body) {
            if (body.password) { // Not blank
                let passwordHash = passwordMan.hashPassword(body.password, editUser.salt)
                editUser.set({
                    passwordHash: passwordHash,
                });
            }
        }

        if ('role' in body) {
            editUser.set({
                roles: [body.role],
            });
        }

        await editUser.save()

        flash.ok(req, 'user', 'Updated user.')
        res.redirect(`/admin/users/${editUser.id}`)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/users/:userId/delete', middlewares.guardRoute(['delete_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user
        let roles = await req.app.locals.db.models.Role.findAll()

        let data = {
            flash: flash.get(req, 'user'),
            roles,
            editUser
        }
        res.render('admin/user/delete.html', data);
    } catch (err) {
        next(err);
    }
});

router.delete('/admin/users/:userId', middlewares.antiCsrfCheck, middlewares.guardRoute(['delete_user']), middlewares.getUser(), async (req, res, next) => {
    try {
        let editUser = res.user

        await editUser.destroy({ force: true })

        flash.ok(req, 'user', 'Deleted user.')
        res.redirect(`/admin/users`)
    } catch (err) {
        next(err);
    }
});


module.exports = router;