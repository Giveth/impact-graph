// import nodemailer from "nodemailer";
// tslint:disable-next-line:no-var-requires
import { logger } from './logger';

// tslint:disable-next-line:no-var-requires
const nodemailer = require('nodemailer');

export async function sendEmail(email: string, url: string) {
  const account = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: account.user, // generated ethereal user
      pass: account.pass, // generated ethereal password
    },
  });

  const mailOptions = {
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: email, // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: `<a href="${url}">${url}</a>`, // html body
  };

  const info = await transporter.sendMail(mailOptions);

  logger.debug('Message sent: %s', info.messageId);
  // Preview only available when sending through an Ethereal account
  logger.debug('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}
