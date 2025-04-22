// Core modules

// External modules
const express = require('express');

// Modules

// Routes
let router = express.Router();
router.use(require('./routes/public'));
router.use(require('./routes/protected'));
router.use(require('./routes/admin/auth'));
router.use(require('./routes/admin/admin'));
router.use(require('./routes/admin/alumni'));
router.use(require('./routes/admin/user'));

// 404 Page
router.use((req, res) => {
    res.status(404)
    if (req.xhr) { // response when req was ajax
        return res.send("Page not found.")
    }
    res.render('error.html', { error: "Page not found." });
});


module.exports = router;