const sendEmail = async (to, subject, text) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':     process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender:      { name: 'RedNorte', email: process.env.SENDER_EMAIL },
      to:          [{ email: to }],
      subject:     subject,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Brevo API error');
  }
};

module.exports = sendEmail;