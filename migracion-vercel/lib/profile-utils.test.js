const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAvatarUrl, buildFullName } = require('./profile-utils.js');

test('buildFullName returns the user full name from the stored fields', () => {
  assert.equal(buildFullName({ nombre: 'Ana', apellido: 'García' }), 'Ana García');
  assert.equal(buildFullName({ nombre: 'Ana', apellido: '' }), 'Ana');
});

test('resolveAvatarUrl returns a safe fallback avatar for missing data', () => {
  assert.equal(resolveAvatarUrl(''), '/default-avatar.svg');
  assert.equal(resolveAvatarUrl(null), '/default-avatar.svg');
  assert.equal(resolveAvatarUrl('https://cdn.example.com/avatar.png'), 'https://cdn.example.com/avatar.png');
  assert.equal(resolveAvatarUrl('img/avatar.png'), '/img/avatar.png');
});
