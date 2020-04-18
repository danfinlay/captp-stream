const capTp = require('@agoric/captp');
const { makeCapTP, E } = capTp;

function makeCapTpFromStream (streamId, stream, bootstrap) {

  const send = (obj) => {
    stream.write(obj);
  };

  const { dispatch, getBootstrap, abort } = makeCapTP(streamId, send, bootstrap);

  stream.on('data', (obj) => {
    dispatch(obj)
  });

  stream.on('close', (reason) => abort(reason));
  stream.on('end', (reason) => abort(reason));
  stream.on('error', (reason) => abort(reason));

  return { getBootstrap, abort, E }
}

module.exports = makeCapTpFromStream;

