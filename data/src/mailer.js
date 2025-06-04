/**
 * https://morioh.com/p/ca75996654d1
 * https://myaccount.google.com/lesssecureapps
 * 
 */

//// Core modules

//// External modules
const nodemailer = require('nodemailer');

//// Modules
const nunjucksEnv = require('./nunjucks-env')

const mailerAdd = CRED.mailer.email;
const mailerPass = CRED.mailer.appPass;
// You need 2-Step Verification first in your google account. Then create an app password.

const transport2 = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: mailerAdd,
        pass: mailerPass
    }
});

module.exports = {
    sendForgot: async (templateVars) => {
        templateVars['baseUrl'] = `${CONFIG.app.url}`
        templateVars['previewText'] = templateVars['previewText'] || `Forgot password...`
        let mailOptions = {
            from: `Alumni Portal <alumni-noreply@gsu.edu.ph>`,
            to: templateVars['email'],
            subject: `Alumni Portal - ${templateVars['previewText']}`,
            html: nunjucksEnv.render('emails/forgot.html', templateVars),
        }
        let info = await transport2.sendMail(mailOptions)
        return info
    }
}