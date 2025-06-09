import test from 'node:test';
import assert from 'node:assert';
import { MeuralClient } from '../meural.js';
import Module from 'node:module';

const axiosMock = async (url, opts = {}) => {
  axiosMock.calls.push({ url, opts });
  return { data: { token: 'abc', data: [{ id: 1 }] } };
};
axiosMock.calls = [];

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'axios') return axiosMock;
  if (request === 'form-data') return class FormData {};
  return originalLoad(request, parent, isMain);
};

test('authenticate stores token and uses axios', async () => {
  const client = new MeuralClient('u', 'p');
  await client.authenticate();
  assert.strictEqual(client.authToken, 'abc');
  assert.ok(axiosMock.calls[0].url.includes('authenticate'));
  Module._load = originalLoad;
});
