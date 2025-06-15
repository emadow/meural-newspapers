import test from 'node:test';
import assert from 'node:assert';
import Module from 'node:module';

const axiosMock = async (url, opts = {}) => {
  axiosMock.calls.push({ url, opts });
  return { data: { token: 'abc', data: [{ id: 1 }] } };
};
axiosMock.calls = [];

// ensure axios and form-data are mocked before module load
async function loadClient() {
  const original = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'axios') return axiosMock;
    if (request === 'form-data') return class FormData {};
    return original(request, parent, isMain);
  };
  const mod = await import('../meural.js');
  Module._load = original;
  return mod.MeuralClient;
}

test('authenticate stores token and uses axios', async () => {
  const MeuralClient = await loadClient();
  const client = new MeuralClient('u', 'p');
  await client.authenticate();
  assert.strictEqual(client.authToken, 'abc');
  assert.ok(axiosMock.calls[0].url.includes('authenticate'));
});
