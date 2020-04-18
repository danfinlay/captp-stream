const test = require('tape');
const makeDuplexPair = require('../src/duplex-socket');
const makeCapTpFromStream = require('../');
const harden = require('@agoric/harden');
const { E } = require('@agoric/captp');

test('basic connection', async (t) => {

  // Assume two duplex streams connected to each other:
  const { clientSide, serverSide } = makeDuplexPair();

  // Server
  // A bootstrap should be an object with only functions on it.
  const serverApi = harden({
    foo: async (arg) => { if (arg === 'bar') { return harden('baz') } },
  });
  makeCapTpFromStream('server', serverSide, serverApi);

  // Client
  const { getBootstrap } = makeCapTpFromStream('client', clientSide, harden({}));

    const result = E(getBootstrap()).foo('bar');
    t.ok('then' in result, 'thennable');
    t.equals(typeof result.then, 'function', 'thennable func');
    result.then((res) => {
      t.equal(res, 'baz', 'method was remotely invoked');
      t.end();
    })
    .catch((err) => {
      t.fail(err);
      t.end();
    })

})

