const capTp = require('@agoric/captp');
const { makeCapTP, E } = capTp;
const { Duplex } = require('stream');

function makeCapTpFromStream (streamId, bootstrap) {
  let dispatch, getBootstrap, abort;

  const stream = new Duplex();

  stream._read = noop;

  const send = (obj) => {
    stream.push(JSON.stringify(obj));
  };

  const capTp = makeCapTP(streamId, send, bootstrap);
  ({ dispatch, getBootstrap, abort } = capTp);

  stream._write = (obj, enc, cb) => {
    try {
      dispatch(JSON.parse(obj));
    } catch (err) {
      return cb(err);
    }
    cb();    
  };

  stream._writev = (chunks, cb) => {
    try {
      chunks.forEach((obj) => {
        dispatch(JSON.parse(obj));
      });
    } catch (err) {
      return cb(err);
    }
    cb();
  }

  stream._final = (cb) => {
    abort();
    cb();
  }

  return { getBootstrap, abort, E, captpStream: stream }
};

module.exports = makeCapTpFromStream;

function noop () {}