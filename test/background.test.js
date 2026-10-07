import test from 'node:test';
import assert from 'node:assert/strict';
const listeners = {};
let rules = [{ pattern: '^https://example\\.com/', username: 'demo', password: 'dummy' }];
let fail = false;
globalThis.chrome = {
  storage: {local: {setAccessLevel: async (options) => assert.equal(options.accessLevel, 'TRUSTED_CONTEXTS'), get: async () => {
    if (fail) throw new Error('storage unavailable');
    return {authRules: rules};
  }}},
  webRequest: Object.fromEntries(['onAuthRequired', 'onCompleted', 'onErrorOccurred'].map(name => [name, {addListener: callback => {listeners[name] = callback;}}])),
};
await import('../background.js');
const auth = (patch = {}) => new Promise(resolve => listeners.onAuthRequired({requestId: '1', url: 'https://example.com/', scheme: 'basic', ...patch}, resolve));
test('responds once, cleans up, ignores proxy and non-Basic authentication, and fails closed', async () => {
  const results = await Promise.all([auth(), auth()]);
  assert.equal(results.filter(result => result.authCredentials).length, 1);
  assert.deepEqual(results.find(result => result.authCredentials).authCredentials, {username: 'demo', password: 'dummy'});
  assert.deepEqual(await auth(), {});
  listeners.onCompleted({requestId: '1'});
  assert.deepEqual(await auth({isProxy: true}), {});
  assert.deepEqual(await auth({scheme: 'digest'}), {});
  assert.ok((await auth()).authCredentials);
  listeners.onErrorOccurred({requestId: '1'});
  rules = [];
  assert.deepEqual(await auth(), {});
  fail = true;
  assert.deepEqual(await auth(), {});
});
