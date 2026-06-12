require("dotenv").config();
const amqp        = require("amqplib");
const transporter = require("./emails/mailer");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME   = process.env.QUEUE_NAME   || "email_queue";
const GMAIL_USER   = process.env.GMAIL_USER;

async function main() {
  await transporter.verify();
  console.log("[consumer] Gmail SMTP listo\n");

  const connection = await amqp.connect(RABBITMQ_URL);
  const channel    = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  channel.prefetch(1);
  console.log(`[consumer] Esperando correos en la cola: "${QUEUE_NAME}"\n`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log(`[consumer] Enviando → ${payload.to} | "${payload.subject}"`);

    try {
      const result = await transporter.sendMail({
        from:    `"RedNorte Notifications" <${GMAIL_USER}>`,
        to:      payload.to,
        subject: payload.subject,
        text:    payload.text,
      });

      console.log(`[consumer] Enviado! Message ID: ${result.messageId}\n`);
      channel.ack(msg);

    } catch (err) {
      console.error(`[consumer] Falló: ${err.message}\n`);
      const requeue = !msg.fields.redelivered;
      channel.nack(msg, false, requeue);
    }
  });
}

main().catch((err) => {
  console.error("[consumer] Error fatal:", err.message);
  process.exit(1);
});
