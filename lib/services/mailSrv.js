/**
 * Created by hce on 06/05/15.
 * Updated by mict 20/03/20
 *
 * This service provides functionality to
 * send official Codeboard emails.
 *
 */

const nodemailer = require('nodemailer');
const Promise = require('bluebird');
const config = require('../config/config.js');

// create reusable transport object (using default SMTP transport)
// promisify the transport and sendMail operations
const transporter = nodemailer.createTransport({
  sendmail: true,
  newline: 'unix',
  path: '/usr/sbin/sendmail', // use system's sendmail binary to send email
  args: ['-i', '-t'],
});

/**
 * Sends an email throught the Codeboard Email account.
 * @param {String} aFrom sender address of the email
 * @param {String} aTo receiver address of the email
 * @param {String} aSubject the email's subject
 * @param {String} aText the email's text
 * @return {Promise} a bluebird promise that resolves to function(error, info)
 */
const sendMail = async function (aFrom, aTo, aSubject, aText) {
  try {
    const mail = await transporter.sendMail({
      from: aFrom,
      to: aTo,
      subject: aSubject,
      text: aText,
    });
    console.log(`Message sent: ${mail.messageId}`);
  } catch (err) {
    throw err;
  }
};

/**
 * This mail is sent when the teacher writes something in the chat
 * @returns {Promise}
 */
const sendTeacherAddedAnswerMail = async function (email, name, projectName) {
  let teacherAddedAnswerMail = {
    from: 'noreply@codeboard.sml.zhaw.ch "Codeboard"',
    to: email,
    subject: 'Frage zur Aufgabe ' + projectName,
    text:
      'Hallo ' +
      name +
      '\n\n' +
      'Deine Frage wurde beantwortet. Du findest die Antwort unterhalb deiner Frage.\n' +
      'Wenn du weitere Fragen hast, kannst du diese auf dem gleichen Weg stellen.\n\n' +
      'Gruss\n' +
      'Codeboard\n\n' +
      '--------------------------------------------------\n' +
      'Dies ist eine automatisch generierte Nachricht. Antworten auf diese E-Mail werden nicht gelesen.\n',
  };

  // send the mail and return a promise
  return await sendMail(
    teacherAddedAnswerMail.from,
    teacherAddedAnswerMail.to,
    teacherAddedAnswerMail.subject,
    teacherAddedAnswerMail.text
  );
};

/**
 * This mail is sent when a student requests helps in the chat
 * @returns {Promise}
 */
const sendStudentRequestsHelpMail = async function (name, projectName, courseName, chatLineReference) {
  let studentRequestsHelpMail = {
    from: 'noreply@codeboard.sml.zhaw.ch "Codeboard"',
    to: 'javakurs.iwi@zhaw.ch "ZHAW SML Java Kurs"',
    subject: `Neue Hilfe-Anfrage${courseName ? ' (' + courseName + ')' : ''}`,
    text:
      `Hallo\n\n` +
      `"${name}" benötigt Hilfe bei der Aufgabe "${projectName}":\n` +
      `${config.host}${chatLineReference}\n\n` +
      `Gruss\n` +
      `Codeboard\n\n`,
  };

  // send the mail and return a promise
  return await sendMail(
    studentRequestsHelpMail.from,
    studentRequestsHelpMail.to,
    studentRequestsHelpMail.subject,
    studentRequestsHelpMail.text
  );
};

// export the service functions
module.exports = {
  sendMail,
  sendTeacherAddedAnswerMail,
  sendStudentRequestsHelpMail,
};
