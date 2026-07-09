const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../emails/templates');

describe('templates.js', () => {

  test('citaConfirmada genera email correcto', () => {
    const email = templates.citaConfirmada('paciente@gmail.com', '2025-06-13');
    assert.equal(email.to, 'paciente@gmail.com');
    assert.equal(email.subject, 'Confirmación de cita — RedNorte');
    assert.ok(email.text.includes('2025-06-13'));
    assert.ok(email.text.includes('RedNorte Gestión Médica'));
  });

  test('citaEliminada genera email correcto', () => {
    const email = templates.citaEliminada('paciente@gmail.com', '2025-06-13');
    assert.equal(email.to, 'paciente@gmail.com');
    assert.equal(email.subject, 'Eliminación de cita — RedNorte');
    assert.ok(email.text.includes('2025-06-13'));
    assert.ok(email.text.includes('contáctenos'));
  });

  test('citaCambiada genera email correcto', () => {
    const email = templates.citaCambiada('paciente@gmail.com', '2025-06-13', '2025-06-20');
    assert.equal(email.to, 'paciente@gmail.com');
    assert.equal(email.subject, 'Cambio de cita — RedNorte');
    assert.ok(email.text.includes('2025-06-13'));
    assert.ok(email.text.includes('2025-06-20'));
  });

  test('todos los templates incluyen el destinatario correcto', () => {
    const to = 'test@rednorte.cl';
    assert.equal(templates.citaConfirmada(to, '2025-01-01').to, to);
    assert.equal(templates.citaEliminada(to, '2025-01-01').to, to);
    assert.equal(templates.citaCambiada(to, '2025-01-01', '2025-01-02').to, to);
  });

  test('todos los templates tienen subject, text y to', () => {
    const campos = ['to', 'subject', 'text'];
    const emails = [
      templates.citaConfirmada('a@b.com', '2025-01-01'),
      templates.citaEliminada('a@b.com', '2025-01-01'),
      templates.citaCambiada('a@b.com', '2025-01-01', '2025-01-02'),
    ];
    for (const email of emails) {
      for (const campo of campos) {
        assert.ok(email[campo], `Falta campo "${campo}" en template`);
      }
    }
  });
});