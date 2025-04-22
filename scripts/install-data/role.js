/**
 * Roles are a group of permissions.
 */

// Core modules

// External modules

// Modules
const allPermissions = require('./permission-list');

const ROLES = [
    {
        key: 'admin',
        name: 'System Admin',
        description: 'Can do anything.',
        permissions: allPermissions
    },
    {
        key: 'manager',
        name: 'Manager',
        description: 'Manage queues and tickets.',
        permissions: [
            'read_all_counter',
            'create_counter',
            'read_counter',
            'update_counter',

            'read_all_ticket',
            'create_ticket',
            'read_ticket',
            'update_ticket',
            'delete_ticket',
        ]
    },
    
   
]

module.exports = ROLES