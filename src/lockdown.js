import 'ses';
import '@agoric/eventual-send/shim.js';

const consoleTaming = '%NODE_ENV%' === 'production' ? 'safe' : 'unsafe';

const { pow: mathPow } = Math;
Math.pow = (base, exp) =>
  typeof base === 'bigint' && typeof exp === 'bigint'
    ? base ** exp
    : mathPow(base, exp);

lockdown({
  __allowUnsafeMonkeyPatching__: 'unsafe',
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
  consoleTaming: consoleTaming,
});
