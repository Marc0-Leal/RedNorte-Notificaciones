const templates = {

  citaEliminada: (toEmail) => ({
    to:      toEmail,
    subject: "Eliminación de cita",
    text:    "Su cita el dia martes se ha eliminado. Muchas Gracias.",
  }),
 
  citaCambiada: (toEmail, diaAnterior, diaNuevo) => ({
    to:      toEmail,
    subject: "Cambio de cita — RedNorte",
    text:    `Su cita del dia ${diaAnterior} ha sido cambiada al dia ${diaNuevo}. Muchas Gracias.`,
  }),

  citaConfirmada: (toEmail, dia, hora) => ({
    to:      toEmail,
    subject: "Confirmación de cita — RedNorte",
    text:    `Su cita ha sido confirmada para el dia ${dia} a las ${hora}. Muchas Gracias.`,
  }),
};
 
module.exports = templates;