import chai from 'chai';
import elasticSwapSDK from '../dist/index.js';
import fetch from 'node-fetch';
const { assert } = chai;

describe('SDK', () => {
  it('Can be created via constructor', async () => {
    const env = {
      networkId: 1,
    };
    const sdk = new elasticSwapSDK.SDK({env, customFetch: fetch});
    assert.isNotNull(sdk);
  });
});