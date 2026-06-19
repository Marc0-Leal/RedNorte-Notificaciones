const templates = {

  citaConfirmada: (toEmail, fecha) => ({
    to:      toEmail,
    subject: "Confirmación de cita — RedNorte",
    text:    `Su cita ha sido confirmada para el día ${fecha}. Muchas Gracias.\n\nRedNorte Gestión Médica`,
  }),

  citaEliminada: (toEmail, fecha) => ({
    to:      toEmail,
    subject: "Eliminación de cita — RedNorte",
    text:    `Su cita del día ${fecha} ha sido eliminada. Si tiene dudas, contáctenos.\n\nRedNorte Gestión Médica`,
  }),

  citaCambiada: (toEmail, fechaAnterior, fechaNueva) => ({
    to:      toEmail,
    subject: "Cambio de cita — RedNorte",
    text:    `Su cita del día ${fechaAnterior} ha sido reprogramada al día ${fechaNueva}. Muchas Gracias.\n\nRedNorte Gestión Médica`,
  }),
};

module.exports = templates;
