require("dotenv").config();
const express   = require("express");
const amqp      = require("amqplib");
const sendEmail = require('./emails/mailer');
const validateEmail = require('./middleware/validacionesEmail');
const app          = express();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME   = process.env.QUEUE_NAME   || "email_queue";
const PORT         = process.env.PORT         || 3001;

app.use(express.json());

let publishChannel = null;

app.post("/send-email", validateEmail, async (req, res) => {
  if (!publishChannel)
    return res.status(503).json({ error: "RabbitMQ aún no está listo, reintenta en unos segundos" });

  try {
    publishChannel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify({ ...req.email, enqueuedAt: new Date().toISOString() })),
      { persistent: true }
    );
    console.log(`[producer] Queued ${req.body.tipoAviso} → ${req.body.to}`);
    res.json({ ok: true, message: `Correo en cola para ${req.body.to}` });
  } catch (err) {
    console.error("[producer] Queue error:", err.message);
    res.status(500).json({ error: "No se pudo colocar en cola el correo" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`[server] Escuchando en puerto ${PORT}`);
});

async function startBackgroundServices() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel    = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    publishChannel = channel;
    console.log("[rabbitmq] Conectado a RabbitMQ");

    channel.prefetch(1);
    console.log(`[consumer] Esperando correos en la cola: "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      const payload = JSON.parse(msg.content.toString());
      console.log(`[consumer] Enviando → ${payload.to} | "${payload.subject}"`);

      try {
        await sendEmail(payload.to, payload.subject, payload.text);
        console.log(`[consumer] Enviado! → ${payload.to}`);
        channel.ack(msg);
      } catch (err) {
        console.error(`[consumer] Falló: ${err.message}`);
        const requeue = !msg.fields.redelivered;
        channel.nack(msg, false, requeue);
      }
    });
  } catch (err) {
    console.error("[startup] Error conectando servicios:", err.message);
    process.exit(1);
  }
}

startBackgroundServices();
