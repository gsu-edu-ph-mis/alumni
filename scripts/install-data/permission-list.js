/**
 * Permission checks are hardcoded in route middlewares.
 * Code should be updated together with this list.
 */

// Core modules

// External modules

// Modules

module.exports = [

    // Admin
    'read_admin_dashboard',

    'read_all_alumni',
    'create_alumni',
    'read_alumni',
    'update_alumni',
    'delete_alumni',

    'read_all_registration',
    'read_registration',
    'approve_registration',
    'delete_registration',

    // Alumni related
    'read_own_record',
    'update_own_record',

    // Own account related - admin users
    'read_own_account',
    'update_own_password',

    //// Sys admin stuff //

    'read_all_permission',
    'create_permission',
    'read_permission',
    'update_permission',
    'delete_permission',

    'read_all_role',
    'create_role',
    'read_role',
    'update_role',
    'delete_role',

    'read_all_user',
    'create_user',
    'read_user',
    'update_user',
    'activate_deactivate_user',
    'delete_user',

    // Security related settings
    'read_all_security',
    'create_security',
    'read_security',
    'update_security',
    'delete_security',

]