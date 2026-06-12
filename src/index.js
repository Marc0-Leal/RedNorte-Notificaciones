require("dotenv").config();
const express     = require("express");
const amqp        = require("amqplib");
const templates   = require("./emails/templates");
const transporter = require("./emails/mailer");

const app          = express();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME   = process.env.QUEUE_NAME   || "email_queue";
const PORT         = process.env.PORT         || 3001;
const GMAIL_USER   = process.env.GMAIL_USER;

app.use(express.json());

let publishChannel = null;

async function connectRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel    = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return channel;
}

app.post("/send-email", async (req, res) => {
  const { to, tipoAviso, fecha, hora, fechaAnterior, horaAnterior, fechaNueva, horaNueva } = req.body;

  if (!to || !tipoAviso) {
    return res.status(400).json({ error: "Faltan campos requeridos: to, tipoAviso" });
  }

  let email;

  if (tipoAviso === "citaConfirmada") {
    if (!fecha || !hora)
      return res.status(400).json({ error: "citaConfirmada requiere: fecha, hora" });
    email = templates.citaConfirmada(to, fecha, hora);

  } else if (tipoAviso === "citaEliminada") {
    if (!fecha || !hora)
      return res.status(400).json({ error: "citaEliminada requiere: fecha, hora" });
    email = templates.citaEliminada(to, fecha, hora);

  } else if (tipoAviso === "citaCambiada") {
    if (!fechaAnterior || !horaAnterior || !fechaNueva || !horaNueva)
      return res.status(400).json({ error: "citaCambiada requiere: fechaAnterior, horaAnterior, fechaNueva, horaNueva" });
    email = templates.citaCambiada(to, fechaAnterior, horaAnterior, fechaNueva, horaNueva);

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
    res.json({ ok: true, message: `Correo encolado para ${to}` });
  } catch (err) {
    console.error("[producer] Queue error:", err.message);
    res.status(500).json({ error: "No se pudo encolar el correo" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

async function startConsumer(channel) {
  await transporter.verify();
  console.log("[consumer] Gmail SMTP listo");

  channel.prefetch(1);
  console.log(`[consumer] Esperando correos en la cola: "${QUEUE_NAME}"\n`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    const payload = JSON.parse(msg.content.toString());
    console.log(`[consumer] Enviando → ${payload.to} | "${payload.subject}"`);

    try {
      const result = await transporter.sendMail({
        from:    `"RedNorte Notificaciones" <${GMAIL_USER}>`,
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

async function main() {
  publishChannel = await connectRabbitMQ();
  console.log("[rabbitmq] Conectado a RabbitMQ");

  await startConsumer(publishChannel);

  app.listen(PORT, () => {
    console.log(`[server] Escuchando en puerto ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
