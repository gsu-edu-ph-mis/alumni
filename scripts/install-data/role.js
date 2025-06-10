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
        description: 'Manage alumni records and registrations.',
        permissions: [
            'read_all_alumni',
            'create_alumni',
            'read_alumni',
            'update_alumni',
            'delete_alumni',

            'read_all_report_visualization',

            'read_all_registration',
            'read_registration',
            'approve_registration',
            'delete_registration',

            'read_own_account',
            'update_own_password',

            'read_all_user',
            'read_user',
            'update_user',
            'activate_deactivate_user',
        ]
    },
    {
        key: 'alumni',
        name: 'Alumni',
        description: 'Update own alumni record.',
        permissions: [
            'read_own_record',
            'update_own_record',

            'read_own_account',
            'update_own_password',
        ]
    },
   
]

module.exports = ROLES