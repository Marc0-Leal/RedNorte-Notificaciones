const templates = require('../emails/templates');

const validateEmail = (req, res, next) => {
  const { to, tipoAviso, fecha, fechaAnterior, fechaNueva } = req.body;

  if (!to || !tipoAviso)
    return res.status(400).json({ error: "Faltan campos requeridos: to, tipoAviso" });

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

  req.email = email; 
  next();
};

module.exports = validateEmail;