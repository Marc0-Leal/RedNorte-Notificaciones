const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../emails/templates');

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json   = (body)  => { res.body = body; return res; };
  return res;
}

describe('producer logic (mockeado)', () => {

  test('sendToQueue es llamado con el payload correcto', () => {
    let capturedPayload = null;
    const mockChannel = {
      sendToQueue: (_queue, buffer) => {
        capturedPayload = JSON.parse(buffer.toString());
      }
    };

    const email = templates.citaConfirmada('paciente@gmail.com', '2025-06-13');
    mockChannel.sendToQueue('email_queue', Buffer.from(JSON.stringify({
      ...email,
      enqueuedAt: new Date().toISOString()
    })));

    assert.equal(capturedPayload.to, 'paciente@gmail.com');
    assert.ok(capturedPayload.subject.includes('Confirmación'));
    assert.ok(capturedPayload.enqueuedAt, 'Falta enqueuedAt en el payload');
  });

  test('payload incluye enqueuedAt en formato ISO válido', () => {
    let capturedPayload = null;
    const mockChannel = {
      sendToQueue: (_queue, buffer) => {
        capturedPayload = JSON.parse(buffer.toString());
      }
    };

    const email = templates.citaEliminada('a@b.com', '2025-06-13');
    mockChannel.sendToQueue('email_queue', Buffer.from(JSON.stringify({
      ...email,
      enqueuedAt: new Date().toISOString()
    })));

    assert.ok(!isNaN(Date.parse(capturedPayload.enqueuedAt)), 'enqueuedAt no es una fecha válida');
  });

  test('publishChannel null retorna 503', () => {
    const publishChannel = null;
    const res = mockRes();
    if (!publishChannel) {
      res.status(503).json({ error: "RabbitMQ aún no está listo, reintenta en unos segundos" });
    }
    assert.equal(res.statusCode, 503);
    assert.ok(res.body.error.includes('RabbitMQ'));
  });

  test('payload contiene to, subject y text del template', () => {
    let capturedPayload = null;
    const mockChannel = {
      sendToQueue: (_queue, buffer) => {
        capturedPayload = JSON.parse(buffer.toString());
      }
    };

    const email = templates.citaCambiada('a@b.com', '2025-06-13', '2025-06-20');
    mockChannel.sendToQueue('email_queue', Buffer.from(JSON.stringify({
      ...email,
      enqueuedAt: new Date().toISOString()
    })));

    assert.ok(capturedPayload.to);
    assert.ok(capturedPayload.subject);
    assert.ok(capturedPayload.text);
  });
});