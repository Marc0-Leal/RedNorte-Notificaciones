const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const validateEmail = require('../middleware/validacionesEmail');

function mockReq(body) { return { body }; }
function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json   = (body)  => { res.body = body; return res; };
  return res;
}

describe('validacionesEmail.js', () => {

  // ─────────────────────── Campos requeridos ───────────────────────────
  test('retorna 400 si falta "to"', () => {
    const req = mockReq({ tipoAviso: 'citaConfirmada', fecha: '2025-06-13' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('to'));
  });

  test('retorna 400 si falta "tipoAviso"', () => {
    const req = mockReq({ to: 'a@b.com', fecha: '2025-06-13' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('tipoAviso'));
  });

  //─────────────────────── citaConfirmada ──────────────────────────────
  test('citaConfirmada: retorna 400 si falta fecha', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaConfirmada' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('fecha'));
  });

  test('citaConfirmada: llama next() y setea req.email si es válido', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaConfirmada', fecha: '2025-06-13' });
    const res = mockRes();
    let nextCalled = false;
    validateEmail(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled, 'next() no fue llamado');
    assert.ok(req.email, 'req.email no fue seteado');
    assert.equal(req.email.to, 'a@b.com');
    assert.ok(req.email.subject.includes('Confirmación'));
  });

  // ─────────────────────── citaEliminada ───────────────────────────────
  test('citaEliminada: retorna 400 si falta fecha', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaEliminada' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
  });

  test('citaEliminada: llama next() y setea req.email si es válido', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaEliminada', fecha: '2025-06-13' });
    const res = mockRes();
    let nextCalled = false;
    validateEmail(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled);
    assert.ok(req.email.subject.includes('Eliminación'));
  });

  // ─────────────────────── citaCambiada ────────────────────────────────────
  test('citaCambiada: retorna 400 si falta fechaAnterior', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaCambiada', fechaNueva: '2025-06-20' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('fechaAnterior'));
  });

  test('citaCambiada: retorna 400 si falta fechaNueva', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaCambiada', fechaAnterior: '2025-06-13' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('fechaNueva'));
  });

  test('citaCambiada: llama next() y pone req.email si es válido', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaCambiada', fechaAnterior: '2025-06-13', fechaNueva: '2025-06-20' });
    const res = mockRes();
    let nextCalled = false;
    validateEmail(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled);
    assert.ok(req.email.subject.includes('Cambio'));
    assert.ok(req.email.text.includes('2025-06-13'));
    assert.ok(req.email.text.includes('2025-06-20'));
  });

  //─────────────────────── tipoAviso desconocido ────────────────────────────
  test('retorna 400 para tipoAviso desconocido', () => {
    const req = mockReq({ to: 'a@b.com', tipoAviso: 'citaInventada', fecha: '2025-06-13' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('citaInventada'));
  });

  //─────────────────────── estructura de req.email ─────────────────────────
  test('req.email contiene to, subject y text', () => {
    const req = mockReq({ to: 'paciente@rednorte.cl', tipoAviso: 'citaConfirmada', fecha: '2025-07-01' });
    const res = mockRes();
    validateEmail(req, res, () => {});
    assert.ok(req.email.to);
    assert.ok(req.email.subject);
    assert.ok(req.email.text);
  });
});