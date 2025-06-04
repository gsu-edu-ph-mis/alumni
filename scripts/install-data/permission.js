/**
 * Permission checks are hardcoded in route middlewares.
 * Code should be updated together with this list.
 */

// Core modules

// External modules

// Modules

let perms = require('./permission-list')

module.exports = perms.map(p => {
    return {
        key: p
    }
})