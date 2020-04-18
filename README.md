# CapTP Stream

A simple module for using [Agoric's CapTP](https://github.com/Agoric/agoric-sdk/tree/master/packages/captp) over a traditional [Node.js stream](https://nodejs.org/api/stream.html#stream_stream).

## Installation

`npm i captp-stream -S`
or
`yarn add captp-stream -S`

## Usage

Loosely adapted from the test:

```javascript
const makeCapTpFromStream = require('../');
const harden = require('@agoric/harden');
const makeDuplexPair = require('../src/duplex-socket');

// Assume two duplex streams connected to each other:
const { clientSide, serverSide } = makeDuplexPair();

// Server
// A bootstrap should be an object with only functions on it.
const serverApi = harden({
  foo: async (arg) => { if (arg === 'bar') { return harden('baz') } },
});
makeCapTpFromStream('server', serverSide, serverApi);

// Client
const { getBootstrap, E } = makeCapTpFromStream('client', clientSide, harden({}));

// Closure to get an async function:
(async () => {

  const result = await E(getBootstrap()).foo('bar');
  // result === 'baz'

})()
```

## CapTP Syntax

### A brief note on CapTP goals and some history to help introduce the concepts.

I'm not going to lie, as a more traditional-style JS dev, I was pretty confused when I came upon CapTP's syntax. It introduces a couple concepts that Agoric is pursuing changes to the language to better support.

That may sound scary, but Agoric's CTO Mark Miller is also [the inventor of Promises](https://www.youtube.com/watch?v=24FzHoAVC10), and sees features of CapTP as the natural extension of the promise: To go beyond sharing a single asynchronous result, but instead to share an intuitively asynchronous _interface_, that is safely isolated from its consumer, and able to distrust.

I happened to be a natural student of CapTP because we had used [dnode](https://www.npmjs.com/package/dnode) in [MetaMask](https://metamask.io) to provide its API to websites, and I had even written a module intending to improve on it in a couple of ways called [capnode](https://www.npmjs.com/package/capnode).

In all three examples, a server or host feeds a JavaScript object to an object that is also connected by a communication channel to a client. The module then reproduces that API for the client.

In dnode, this object required callback-functions, which made tons of sense and still works wonderfully despite years of neglect (ain't that the dream?).

Capnode I consider mostly an experiment and wouldn't recommend in production right now, but aimed for a more flexible surface, which supports passing Promises and event emitters (callbacks aren't cleaned up after use, and so all functions included a `.dealloc()` method, which is both neat and hacky, and could be automated once JS standardizes the [WeakRef](https://github.com/tc39/proposal-weakrefs), another Agoric proposal, to allow user-space reference tracking).

While I believe capnode feels more intuitive and ergonomic to me and probably most other modern-style JS devs, I have come to appreciate that CapTP has been crafted in a way to maximize safety and minimize run-time surprises. For this reason, I would not want to maintain a library to rival it, and I am exploring the experience of using it, hence creating this module.

## The Setup and its Types

```javascript
const { getBootstrap, E } = makeCapTpFromStream('client', clientSide, harden({}));
```

That's a big mouthful, so let me try saying that in typescript (by the way, I have not written this module in TypeScript because _Presences_ are effectively impossible to type at build time, and if you don't believe me, check out the capnode code, it's recursive types and `<any>` calls everywhere.):

```typescript
type makeCapTP = (streamId: string, stream: Stream, bootstrap: Bootstrap) => {
  getBootstrap: () => Promise<RemoteInterface>,
  E: EventualSend,
  abort: Function, // Cleans up memory. Good for disconnection.
}

type EventualSend = (RemoteInterface | Promise<RemoteInterface) => RemoteInterface;
```

### Bootstrap

The bootstrap is the API your host will make available to the client on the other side of the connection when it requests the bootstrap.

The bootstrap _must be hardened_, like with `@agoric/harden`, which recursively ensures that every child of the object is immutable, so we can say that it will consistently reflect the view that is being represented to the consumer.

CapTP also has another transport constraint that is worth mentioning here. It's a safety property, but could be surprising. All records passed back and forth (I believe this only refers to return values, not parameters) must be either:

- An interface (I think Agoric may prefer a different word here): An Object where all entries of all its descendents are functions.
- A "Record": An Object where no entries of any of its descendents are functions.

### EventualSend

The `E` object is a single character long because:
- It stands for a long word, [EventualSend](https://github.com/tc39/proposal-eventual-send).
- It is intended to be used _a lot_.

You can think of the `E` as the `Q` people would carry around their code before Promises were natively included in the language: It's a constructor for a new kind of object that is related to wanting to represent this remote computer in a more useful way.

When we call `getBootstrap()` by itself, we get a Promise for an object whose functions will trigger the bootstrap provided on the other side. That's typical RPC stuff. But when we pass the bootstrap to the `E` function, something strange happens:

```javascript
const result = await E(getBootstrap()).foo('bar');
```

By passing the _pending promise_ to the `E()` method, we are able to call functions on the interface _before it is locally available_.

This is made possible because actually `E()` is cheating: It doesn't know what the remote interface is, but it allows you to call any method name on it by returning a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object (another Agoric invention), which allows an object to have a custom "trap" handler that interprets any property access, even one not defined, introducing meta-programming to JavaScript.

Furthermore, you can use E to return a series of values in a chain:

```javascript
await E(E(getBootstrap()).getPizzeria('best')).orderPizza('large');
```

I would like to point out two things:
- Yes, that looks pretty ugly (good news soon, keep reading!)
- This is actually pretty elegantly representing a series of asynchronous operations.

The library is currently written in a way so that these "pipelined promises" can queue up into a single message, allowing the elimination of round-trips between client and server, the way [Capn' Proto](https://capnproto.org/) does it (another project inspired by Agoric and Mark Miller, [as described in this fun video](https://www.youtube.com/watch?v=acMsHx5XFbQ)). Used correctly, this can enormously reduce latency for clients that rely on making lots of local decisions based on remote information.

#### Syntax Improvement Potential

Because that syntax can quickly get unwieldy to manage, just as promises brought us `.then()` and eventually `await`, Agoric is currently promoting a language feature at TC-39 called [Wavy Dot](https://github.com/tc39/proposal-wavy-dot), which would reduce the `E()` call to a `~.` like so:

```javascript
await getBootstrap()~.getPizzeria('best')~.orderPizza('large');
```
I like this solution fine, I think it has a similar quality to the [optional chaining](https://github.com/tc39/proposal-optional-chaining) feature at TC39 (`myObject?.usePropertyIfExistent()`).

Oddly enough, Wavy Dot was having trouble getting traction last I was at TC-39, I think partly because most of the members of the panel have not tried programming in this way before. Most devs today see GraphQL as the pinnacle of API services, and I don't think are so used to mixing additional remotely-defined interfaces in ther API results. That's too bad, because this pattern most resembles the normal object/parameter passing that allows JavaScript to enable the [ocap-security](https://en.wikipedia.org/wiki/Object-capability_model) of [Secure EcmaScript](https://github.com/tc39/proposal-ses).

Naturally, Agoric has authored an [Acorn transform](https://github.com/Agoric/agoric-sdk/tree/master/packages/acorn-eventual-send) to insert wavy-dot support into build systems, although it isn't documented to a point where I've felt comfortable using it yet.

