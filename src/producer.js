require("dotenv").config();
const express   = require("express");
const amqp      = require("amqplib");
const templates = require("./emails/templates");

const app          = express();
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME   = process.env.QUEUE_NAME   || "email_queue";
const PORT         = process.env.PORT         || 3001;

app.use(express.json());


async function queueEmail(email) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel    = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify({ ...email, enqueuedAt: new Date().toISOString() })),
    { persistent: true }
  );

  await channel.close();
  await connection.close();
}

app.post("/send-email", async (req, res) => {
  const {
    to,
    tipoAviso,
    fecha,
    fechaAnterior,
    fechaNueva,
    horaNueva,
  } = req.body;

  if (!to || !tipoAviso) {
    return res.status(400).json({ error: "Faltan campos requeridos: to, tipoAviso" });
  }

  let email;

  if (tipoAviso === "citaConfirmada") {
    if (!fecha || !hora)
      return res.status(400).json({ error: "citaConfirmada requiere: fecha" });
    email = templates.citaConfirmada(to, fecha);

  } else if (tipoAviso === "citaEliminada") {
    if (!fecha || !hora)
      return res.status(400).json({ error: "citaEliminada requiere: fecha" });
    email = templates.citaEliminada(to, fecha);

  } else if (tipoAviso === "citaCambiada") {
    if (!fechaAnterior || !horaAnterior || !fechaNueva || !horaNueva)
      return res.status(400).json({ error: "cita Cambiada requiere: fechaAnterior, fechaNueva" });
    email = templates.citaCambiada(to, fechaAnterior, fechaNueva);

  } else {
    return res.status(400).json({ error: `tipoAviso desconocido: "${tipoAviso}"` });
  }

  try {
    await queueEmail(email);
    console.log(`[producer] Queued ${tipoAviso} → ${to}`);
    res.json({ ok: true, message: `Correo encontrado para ${to}` });
  } catch (err) {
    console.error("[producer] Queue error:", err.message);
    res.status(500).json({ error: "No se pudo encontrar el correo" });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`[producer] Listening on port ${PORT}`);
});