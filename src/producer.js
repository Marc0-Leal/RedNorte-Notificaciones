require("dotenv").config();
const amqp = require("amqplib");
const templates = require("./emails/templates");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE_NAME   = process.env.QUEUE_NAME   || "email_queue";


async function queueEmail(email) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel    = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  const payload = JSON.stringify({ ...email, enqueuedAt: new Date().toISOString() });
  channel.sendToQueue(QUEUE_NAME, Buffer.from(payload), { persistent: true })

  await channel.close();
  await connection.close();
}

//Change variable toEmail to GET from the backend
async function main() {

  const toEmail    = "ben.avilar@duocuc.cl";
  const tipoAviso  = "citaConfirmada"; // Variable para tipo de notificación: citaEliminada: eliminacíon de cita | citaCambiada:  Cambio de cita. | citaConfirmada: Cita aceptada

  let email;

  if(tipoAviso == "citaEliminada"){
    email = templates.citaEliminada(toEmail);
  } else if (tipoAviso === "citaCambiada") {
    email = templates.citaCambiada(toEmail, "martes", "jueves");
  } else if (tipoAviso === "citaConfirmada") {
    email = templates.citaConfirmada(toEmail, "viernes", "10:00");
  } else {
    console.error(`Error, aviso desconocido "${tipoAviso}"`);
    process.exit(1);
  }
  await queueEmail(email);
  console.log("correo enviado.");
}

main().catch((err) => {
  console.error("Producer error:", err.message);
  process.exit(1);
});