// Core modules

// External modules
const express = require('express')
const lodash = require('lodash')
const { PhAddress } = require('ph-address')

// Core modules
const util = require('util')

// Modules
const middlewares = require('../middlewares');
// const s3 = require('../aws-s3');

// Router
let router = express.Router()

router.get('/courses', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        search = new RegExp(search, 'i')
       
        let courses = req.app.locals.COURSES.filter(course => search.test(course.id) || search.test(course.name))
        return res.send(courses)

    } catch (err) {
        next(err);
    }
});

router.get('/colleges', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        search = new RegExp(search, 'i')
       
        let colleges = req.app.locals.COLLEGES.filter(course => search.test(course.id) || search.test(course.name))
        return res.send(colleges)

    } catch (err) {
        next(err);
    }
});

router.get('/campuses', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        search = new RegExp(search, 'i')
       
        let campuses = req.app.locals.CAMPUSES.filter(course => search.test(course.id) || search.test(course.name))
        return res.send(campuses)

    } catch (err) {
        next(err);
    }
});

router.get('/address', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        const phAddress = new PhAddress()
        const addressFinder = await phAddress.useSqlite()
        const formatter = (a) => {
            let full = []
            if (a.name) full.push(a.name)
            if (a.cityMunName) full.push(a.cityMunName)
            if (a.provName && (a.provName !== a.cityMunName)) full.push(a.provName)

            return {
                name: full.join(', '),
                id: a.psgc
            }
        }
        let addresses = await addressFinder.find(search, 2, 5, formatter)
        return res.send(addresses)

    } catch (err) {
        next(err);
    }
});

// View s3 object using html page
router.get('/file-viewer/:bucket/:prefix/:key', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        let url = s3.getSignedUrl('getObject', {
            Bucket: bucket,
            Key: prefix + '/' + key
        })

        res.render('file-viewer.html', {
            url: url,
        });
    } catch (err) {
        next(err);
    }
});

// Get s3 object content
router.get('/file-getter/:bucket/:prefix/:key', async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        let url = s3.getSignedUrl('getObject', {
            Bucket: bucket,
            Key: prefix + '/' + key,
        })

        res.redirect(url);
    } catch (err) {
        next(err);
    }
});


module.exports = router;