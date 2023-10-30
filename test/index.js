import '../src/lockdown.js';
import test from 'tape';
import assert from 'assert';
import { E, Far, getInterfaceOf, passStyleOf } from '@endo/far';
import makeCapTpFromStream from '../index.js';
import makeDuplexPair from '../src/duplex-socket.js';
import pumpify from 'pumpify';

test('basic connection', async (t) => {

  // Assume two duplex streams connected to each other:
  const { clientSide, serverSide } = makeDuplexPair();

  // Server
  // A bootstrap should be an object with only functions on it.
  async function foo (arg) { if (arg === 'bar') { return harden('baz') } }
  const serverApi = Far('background-api', {
    foo,
  });
  const { captpStream: serverStream } = makeCapTpFromStream('server', serverApi);
  pumpify(serverStream, serverSide, serverStream);

  // Client
  const { getBootstrap, E, captpStream: clientStream } = makeCapTpFromStream('client', harden({}));
  pumpify(clientStream, clientSide, clientStream);

  try {
    const result = await E(getBootstrap()).foo('bar');
    t.equal(result, 'baz', 'method was remotely invoked');
    t.end();
  } catch (err) {
    t.fail(err);
    t.end();
  }

});

