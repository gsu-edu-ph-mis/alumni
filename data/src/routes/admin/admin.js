// Core modules

// External modules
const express = require('express')
const flash = require('kisapmata')

// Modules
const middlewares = require('../../middlewares')

// Router
let router = express.Router()

router.use('/admin', middlewares.requireAuthAdmin)

router.get('/admin', middlewares.guardRoute(['read_admin_dashboard']), async (req, res, next) => {
    try {
        res.redirect('/admin/alumnis')
    } catch (err) {
        next(err);
    }
});



module.exports = router;