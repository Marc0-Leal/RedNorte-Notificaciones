require("dotenv").config();
const express = require("express");
const amqp = require("amqplib");
const templates = require("./emails/templates");
const resend = require('./emails/mailer');

const app = express();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME = process.env.QUEUE_NAME   || "email_queue";
const PORT = process.env.PORT         || 3001;

app.use(express.json());

let publishChannel = null;

app.post("/send-email", async (req, res) => {
  const { to, tipoAviso, fecha, fechaAnterior, fechaNueva } = req.body;

  if (!to || !tipoAviso)
    return res.status(400).json({ error: "Faltan campos requeridos: to, tipoAviso" });

  if (!publishChannel)
    return res.status(503).json({ error: "RabbitMQ aún no está listo, reintenta en unos segundos" });

  let email;

  if (tipoAviso === "citaConfirmada") {
    if (!fecha)
      return res.status(400).json({ error: "citaConfirmada requiere: fecha" });
    email = templates.citaConfirmada(to, fecha);

  } else if (tipoAviso === "citaEliminada") {
    if (!fecha)
      return res.status(400).json({ error: "citaEliminada requiere: fecha" });
    email = templates.citaEliminada(to, fecha);

  } else if (tipoAviso === "citaCambiada") {
    if (!fechaAnterior || !fechaNueva)
      return res.status(400).json({ error: "citaCambiada requiere: fechaAnterior, fechaNueva" });
    email = templates.citaCambiada(to, fechaAnterior, fechaNueva);

  } else {
    return res.status(400).json({ error: `tipoAviso desconocido: "${tipoAviso}"` });
  }

  try {
    publishChannel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify({ ...email, enqueuedAt: new Date().toISOString() })),
      { persistent: true }
    );
    console.log(`[producer] Queued ${tipoAviso} → ${to}`);
    res.json({ ok: true, message: `Correo en cola para ${to}` });
  } catch (err) {
    console.error("[producer] Queue error:", err.message);
    res.status(500).json({ error: "No se pudo encolar el correo" });
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
        const { data, error } = await resend.emails.send({
          from:    'RedNorte Notificaciones <onboarding@resend.dev>',
          to:      payload.to,
          subject: payload.subject,
          text:    payload.text,
        });

        if (error) throw new Error(error.message);

        console.log(`[consumer] Enviado! ID: ${data.id}`);
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