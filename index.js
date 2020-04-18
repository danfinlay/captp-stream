const capTp = require('@agoric/captp');
const { makeCapTP } = capTp;

function makeCapTpFromStream (streamId, stream, bootstrap) {

  const send = (obj) => {
    console.log(`${streamId} is sending ${JSON.stringify(obj)}`)
    stream.write(obj);
  };

  const { dispatch, getBootstrap, abort } = makeCapTP(streamId, send, bootstrap);

  stream.on('data', (obj) => {
    console.log(`${streamId} received ${JSON.stringify(obj)}`)
    dispatch(obj)
  });

  stream.on('close', (reason) => abort(reason));
  stream.on('end', (reason) => abort(reason));
  stream.on('error', (reason) => abort(reason));

  return { getBootstrap, abort }
}

module.exports = makeCapTpFromStream;

