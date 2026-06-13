const { TransactionalEmailsApi, SendSmtpEmail } = require('@getbrevo/brevo');

const emailAPI = new TransactionalEmailsApi();
emailAPI.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;

const sendEmail = async (to, subject, text) => {
  const message = new SendSmtpEmail();
  message.subject = subject;
  message.textContent = text;
  message.sender = { name: 'RedNorte', email: process.env.SENDER_EMAIL };
  message.to = [{ email: to }];

  await emailAPI.sendTransacEmail(message);
};

module.exports = sendEmail;