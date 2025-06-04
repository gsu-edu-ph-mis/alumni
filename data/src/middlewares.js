
// Core modules
const fs = require('fs')

// External modules
const access = require('acrb')
const lodash = require('lodash');

// Modules
const uploader = require('./uploader')


module.exports = {
    rateLimit: async (req, res, next) => {
        try {
            if (ENV !== 'dev') await new Promise(resolve => setTimeout(resolve, 5000)) // Rate limit if on live 
            next();
        } catch (err) {
            next(err)
        }
    },
    allowIp: async (req, res, next) => {
        try {
            if (CONFIG.ipCheck === false) {
                return next();
            }

            let ips = await req.app.locals.db.models.AllowedIP.findAll(); // Get from db
            let allowed = lodash.map(ips, (ip) => { // Simplify
                return ip.address;
            })

            if (allowed.length <= 0) { // If none from db, get from config
                allowed = CONFIG.ip.allowed;
            }
            let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;

            if (allowed.includes(ip) || allowed.length <= 0) {
                return next();
            }
            res.setHeader('X-IP', ip);
            res.status(400).send('Access denied from ' + ip)
        } catch (err) {
            next(err);
        }
    },
    antiCsrfCheck: async (req, res, next) => {
        try {
            let acsrf = lodash.get(req, 'body.acsrf')

            if (lodash.get(req, 'session.acsrf') === acsrf) {
                return next();
            }
            throw new Error(`Anti-CSRF error detected.`)
        } catch (err) {
            next(err);
        }
    },
    guardRoute: (permissions, condition = 'and') => {
        return async (req, res, next) => {
            try {
                let user = res.user
                let rolesList = await req.app.locals.db.models.Role.findAll()
                if (condition === 'or') {
                    if (!access.or(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Must have one of these permissions: ${permissions.join(', ')}.`
                        })
                    }
                } else {
                    if (!access.and(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Required all these permissions: ${permissions.join(', ')}.`
                        })
                    }
                }
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getService: (options = {}) => {
        return async (req, res, next) => {
            try {
                let serviceId = lodash.get(req, 'params.serviceId')
                let service = null
                let serviceGroup = null
                if (serviceId) {
                    service = await req.app.locals.db.models.Service.findOne({
                        where: {
                            id: serviceId
                        },
                        ...options
                    })
                    if (service) {
                        serviceGroup = await req.app.locals.db.models.Group.findOne({
                            where: {
                                id: service.groupId
                            },
                            ...options
                        })
                    }

                }

                if (!service) throw new Error('Service not found.')

                res.service = service
                res.serviceGroup = serviceGroup

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getUser: (options = {}, options2 = {}) => {
        return async (req, res, next) => {
            try {
                let userId = req.params.userId || ''
                let user = await req.app.locals.db.models.User.findOne({
                    where: {
                        id: userId
                    },
                    ...options
                })
                if (!user) throw new Error('User not found.')
                res.user = user
                next();
            } catch (err) {
                next(err)
            }
        }
    },
    getReg: (options = {}, options2 = {}) => {
        return async (req, res, next) => {
            try {
                let regId = req.params.regId || ''
                let reg = await req.app.locals.db.models.UserVerification.findOne({
                    where: {
                        refNumber: regId
                    },
                    ...options
                })
                if (!reg) throw new Error('Registration not found.')
                res.reg = reg
                next();
            } catch (err) {
                next(err)
            }
        }
    },
    getAlm: (options = {}, options2 = {}) => {
        return async (req, res, next) => {
            try {
                let almId = req.params.almId || ''
                let alm = await req.app.locals.db.models.Alumni.findOne({
                    where: {
                        refNumber: almId
                    },
                    ...options
                })
                if (!alm) throw new Error('Alumni Record not found.')
                res.alm = alm
                next();
            } catch (err) {
                next(err)
            }
        }
    },
    dataUrlToReqFiles: (names = []) => {
        return async (req, res, next) => {
            try {

                names.forEach((fieldName) => {
                    let fieldValue = lodash.get(req, `body.${fieldName}`)
                    if (fieldValue) {
                        lodash.set(req, `files.${fieldName}`, [
                            uploader.toReqFile(fieldValue)
                        ])
                    }
                })

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    handleExpressUploadMagic: async (req, res, next) => {
        try {
            let files = lodash.get(req, 'files', [])
            let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload)
            let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

            let uploadList = uploader.generateUploadList(imageVariants, localFiles)
            let saveList = uploader.generateSaveList(imageVariants, localFiles)
            await uploader.uploadToS3Async(uploadList)
            await uploader.deleteUploadsAsync(localFiles, imageVariants)
            req.localFiles = localFiles
            req.imageVariants = imageVariants
            req.saveList = saveList
            next()
        } catch (err) {
            next(err)
        }
    },
    handleUpload: (o) => {
        return async (req, res, next) => {
            try {
                let files = lodash.get(req, 'files', [])
                let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload, o.allowedMimes)
                let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

                let uploadList = uploader.generateUploadList(imageVariants, localFiles)
                let saveList = uploader.generateSaveList(imageVariants, localFiles)
                await uploader.uploadToS3Async(uploadList)
                await uploader.deleteUploadsAsync(localFiles, imageVariants)
                req.localFiles = localFiles
                req.imageVariants = imageVariants
                req.saveList = saveList
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    requireAuthUser: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/login')
            }
            let user = await req.app.locals.db.models.User.findOne({
                where: {
                    id: authUserId
                },
            })

            if (!user) {
                return res.redirect('/logout') // Prevent redirect loop when user is null
            }
            if (!user.active) {
                return res.redirect('/logout')
            }
            res.user = user
            next()
        } catch (err) {
            next(err)
        }
    },
    requireAuthAdmin: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/login')
            }
            let user = await req.app.locals.db.models.User.findOne({
                where: {
                    id: authUserId
                },
            })

            if (!user) {
                return res.redirect('/logout') // Prevent redirect loop when user is null
            }
            if (!user.active) {
                return res.redirect('/logout')
            }
            res.user = user
            next()
        } catch (err) {
            next(err)
        }
    },
    requireAuthViewer: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId') // User login
            let authPasscodeId = lodash.get(req, 'session.authPasscodeId') // Passcode

            if (!authUserId && !authPasscodeId) {
                return res.redirect('/')
            }

            next()
        } catch (err) {
            next(err)
        }
    },
    /**
     * See: https://expressjs.com/en/api.html#app.locals
     * See: https://expressjs.com/en/api.html#req.app
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perAppViewVars: function (req, res, next) {
        try {
            req.app.locals.app = {
                title: CONFIG.app.title,
                description: CONFIG.description,
            }

            req.app.locals.CONFIG = lodash.cloneDeep(CONFIG) // Config
            req.app.locals.ENV = ENV
            req.app.locals.VERSION = `2023.11`
            req.app.locals.SERVER_URL = CONFIG.app.url
            req.app.locals.SOCKET_URL = `//${req.headers['host']}`

            let courses = fs.readFileSync(`${CONFIG.app.dir}/scripts/install-data/courses.csv`, { encoding: 'utf8' })
            courses = courses.split("\n")
            courses = courses.map(e => {
                e = e.split(',')
                return {
                    id: e.at(0),
                    name: e.at(1)
                }
            })
            req.app.locals.COURSES = courses

            let colleges = fs.readFileSync(`${CONFIG.app.dir}/scripts/install-data/colleges.csv`, { encoding: 'utf8' })
            colleges = colleges.split("\n")
            colleges = colleges.map(e => {
                e = e.split(',')
                return {
                    id: e.at(0),
                    name: e.at(1)
                }
            })
            req.app.locals.COLLEGES = colleges

            let campuses = fs.readFileSync(`${CONFIG.app.dir}/scripts/install-data/campuses.csv`, { encoding: 'utf8' })
            campuses = campuses.split("\n")
            campuses = campuses.map(e => {
                e = e.split(',')
                return {
                    id: e.at(0),
                    name: e.at(1)
                }
            })
            req.app.locals.CAMPUSES = campuses
            
            next()
        } catch (error) {
            next(error);
        }
    },
    /**
     * See: https://expressjs.com/en/api.html#res.locals
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perRequestViewVars: async (req, res, next) => {
        try {
            res.locals.user = null
            let authUserId = lodash.get(req, 'session.authUserId');
            if (authUserId) {
                let user = await req.app.locals.db.models.User.findByPk(authUserId)
                if (user) {
                    user = user.toJSON() // Plain object
                    user = lodash.pickBy(user, (_, key) => {
                        return !['createdAt', 'updatedAt', '__v', 'passwordHash', 'salt'].includes(key) // Remove these props
                    })
                }
                res.locals.user = user
            }

            res.locals.acsrf = lodash.get(req, 'session.acsrf');

            res.locals.url = req.url
            res.locals.urlPath = req.path
            res.locals.query = req.query

            let bodyClass = 'page' + (req.baseUrl + req.path).replace(/\//g, '-');
            bodyClass = lodash.trim(bodyClass, '-');
            bodyClass = lodash.trimEnd(bodyClass, '.html');
            res.locals.bodyClass = bodyClass; // global body class css

            res.locals.hideNav = lodash.get(req, 'cookies.hideNav', 'true')

            next();
        } catch (error) {
            next(error);
        }
    },
    saneTitles: async (req, res, next) => {
        try {
            if (!res.locals.title && !req.xhr) {
                let title = lodash.trim(req.originalUrl.split('/').join(' '));
                title = lodash.trim(title.replace('-', ' '));
                let words = lodash.map(title.split(' '), (word) => {
                    return lodash.capitalize(word);
                })
                title = words.join(' - ')
                if (title) {
                    res.locals.title = `${title} | ${req.app.locals.app.title} `;
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    socket: {
        expressToSocketMiddleware: (middleware) => {
            return (socket, next) => {
                return middleware(socket.request, {}, next)
            }
        },
        authByPasscode: (socket, next) => {
            let authUserId = lodash.get(socket, 'request.session.authPasscodeId');
            if (!authUserId) {
                next(new Error("Unauthorized"));
            } else {
                next()
            }
        },
        authByPassword: (socket, next) => {
            let authUserId = lodash.get(socket, 'request.session.authUserId');
            if (!authUserId) {
                next(new Error("Unauthorized"));
            } else {
                next()
            }
        },
        onTvConnect: (io, app) => {
            return (socketInstance) => {
                let room = lodash.get(socketInstance, 'handshake.query.room')

                if (room) {
                    console.log(`socketInstance ${socketInstance.id} to room ${room}`)
                    socketInstance.join(room)
                }

                socketInstance.on("disconnect", (reason) => {
                    console.log('disconnect', reason)
                })

                socketInstance.on("fullScreen", (arg) => {
                    console.log('fullScreen', arg);
                })


            }
        },
        onProctorConnect: (io, app) => {
            return (socketInstance) => {
                let room = lodash.get(socketInstance, 'handshake.query.room')

                if (room) {
                    console.log(`socketInstance ${socketInstance.id} to room ${room}`)
                    socketInstance.join(room)
                }

                socketInstance.on("disconnect", (reason) => {
                    console.log('disconnect', reason)
                })


                socketInstance.on("fullScreen", (arg) => {
                    console.log('fullScreen', arg);
                })


            }
        }
    }
}