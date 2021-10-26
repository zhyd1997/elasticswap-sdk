import chai from 'chai';
import SDK from '../dist/index.js';
const { assert } = chai;

describe('SDK', () => {
  it('Can be created via constructor', async () => {
   const sdk = new SDK({});
  });
});