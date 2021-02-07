# Class: Client

Extends: `events.EventEmitter`

A basic HTTP/1.1 client, mapped on top a single TCP/TLS connection. Pipelining is disabled by default.

Imports: `http`, `stream`, `events`

## `new Client(url, [options])`

Arguments:

* **url** `URL | string` - It should only include the protocol, hostname, and port.
* **options** `object` (optional)
  * **bodyTimeout** `number | null` (optional) - Default: `30e3` -
  * **headersTimeout** `number | null` (optional) - Default: `30e3` - Node.js v14+ - The amount of time the parser will wait to receive the complete HTTP headers. Defaults to 30 seconds.
  * **keepAliveMaxTimeout** `number | null` (optional) - Default: `600e3` - The maximum allowed `idleTimeout` when overriden by *keep-alive* hints from the server. Defaults to 10 minutes.
  * **keepAliveTimeout** `number | null` (optional) - Default: `4e3` - The timeout after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overriden by *keep-alive* hints from the server. Defaults to 4 seconds.
  * **keepAliveTimeoutThreshold** `number | null` (optional) - Default: `1e3` - A number subtracted from server *keep-alive* hints when overriding `idleTimeout` to account for timing inaccuries caused by e.g. transport latency. Defaults to 1 second.
  * **maxHeaderSize** `number | null` (optional) - Default: `16384` - The maximum length of request headers in bytes. Defaults to 16KiB.
  * **pipelining** `number | null` (optional) - Default: `1` - The amount of concurrent requests to be sent over the single TCP/TLS connection according to [RFC7230](https://tools.ietf.org/html/rfc7230#section-6.3.2). Carefully consider your workload and environment before enabling concurrent requests as pipelining may reduce performance if used incorrectly. Pipelining is sensitive to network stack settings as well as head of line blocking caused by e.g. long running requests. Set to `0` to disable keep-alive connections.
  * **socketPath** `string | null` (optional) - Default: `null` - An IPC endpoint, either Unix domain socket or Windows named pipe.
  * **tls** `TlsOptions | null` (optional) - Default: `null` - An options object which in the case of `https` will be passed to [`tls.connect`](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback).

Returns: `Client`

#### Example:

```js
'use strict'
const { Client } = require('undici')

const client = Client('http://localhost:3000')
```

## Instance Methods

### `Client.close()` _(2 overloads)_

Closes the client and gracefully waits for enqueued requests to complete before invoking the callback (or returnning a promise if no callback is provided).

#### (1) `Client.close()`

Returns: `Promise<void>`

#### (2) `Client.close(callback)`

Arguments:

* **callback** `() => void`

### `Client.connect()` _(2 overloads)_

Starts two-way communications with the requested resource.

#### (1) `Client.connect(options)`

Arguments:

* **options** `ConnectOptions`

Returns: `Promise<ConnectData>`

#### (2) `Client.connect(options, callback)`

Arguments:

* **options** `ConnectOptions`
* **callback** `(err: Error, data: ConnectData) => void`

#### Parameter: `ConnectOptions`

* **path** `string`
* **headers** `IncomingHttpHeaders | null` (optional) - Default: `null`
* **headersTimeout** `number` (optional) - Default: `30e3` - The timeout after which a request will time out, in milliseconds. Monitors time between receiving a complete headers. Use 0 to disable it entirely. Defaults to 30 seconds.
* **signal** `AbortSignal | EventEmitter | null` (optional) - Default: `null`

#### Parameter: `ConnectData`

* **statusCode** `number`
* **headers** `IncomingHttpHeaders`
* **socket** `Duplex`
* **opaque** `unknown`

### `Client.destroy()` _(4 overloads)_

Destroy the client abruptly with the given error. All the pending and running requests will be asynchronously aborted and error. Waits until socket is closed before invoking the callback (or returnning a promise if no callback is provided). Since this operation is asynchronously dispatched there might still be some progress on dispatched requests.

#### (1) `Client.destroy()`

Returns: `Promise<void>`

#### (2) `Client.destroy(error)`

Arguments:

* **error** `Error | null`

Returns: `Promise<void>`

#### (3) `Client.destroy(callback)`

Arguments:

* **callback** `() => void`

#### (4) `Client.destroy(error, callback)`

Arguments:

* **error** `Error | null`
* **callback** `() => void`

### `Client.dispatch(options, handlers)`

This is the low level API which all the preceding APIs are implemented on top of.

This API is expected to evolve through semver-major versions and is less stable than the preceding higher level APIs. It is primarily intended for library developers who implement higher level APIs on top of this.

Arguments:

* **options** `DispatchOptions`
* **handlers** `DispatchHandlers`

Returns: `void`

#### Example 1 - Basic GET request:

```js
'use strict'
const { createServer } = require('http')
const { Client } = require('undici')

const server = createServer((request, response) => {
  response.end('Hello, World!')
})
server.listen(() => {
  const client = new Client(`http://localhost:${server.address().port}`)

  const data = []

  client.dispatch({
    path: '/',
    method: 'GET',
    headers: {
      'x-foo': 'bar'
    }
  }, {
    onConnect: () => {
      console.log('Connected!')
    },
    onError: (error) => {
      console.error(error)
    },
    onHeaders: (statusCode, headers) => {
      console.log(`onHeaders | statusCode: ${statusCode} | headers: ${headers}`)
    },
    onData: (chunk) => {
      console.log('onData : chunk received')
      data.push(chunk)
    },
    onComplete: (trailers) => {
      console.log(`onComplete | trailers: ${trailers}`)
      const res = Buffer.concat(data).toString('utf8')
      console.log(`Data: ${res}`)
      client.close()
      server.close()
    }
  })
})
```

#### Example 2 - Upgrade Request:

> ⚠️ Incomplete

```js
'use strict'
const { createServer } = require('http')
const { Client } = require('undici')

const server = createServer((request, response) => {
  response.end('Hello, World!')
})
server.listen(() => {
  const client = new Client(`http://localhost:${server.address().port}`)

  client.dispatch({
    path: '/',
    method: 'CONNECT',
  }, {
    onConnect: () => {},
    onError: (error) => {},
    onUpgrade: () => {}
  })

  client.dispatch({
    path: '/',
    upgrade: 'Websocket'
  }, {
    onConnect: () => {},
    onError: (error) => {},
    onUpgrade: () => {}
  })
})
```

#### Parameter: `DispatchOptions`

* **path** `string`
* **method** `string`
* **body** `string | Buffer | Uint8Array | stream.Readable | null` (optional) - Default: `null`
* **headers** `http.IncomingHttpHeaders | null` (optional) - Default: `null`
* **idempotent** `boolean` (optional) - Default: `true` if `method` is `'HEAD'` or `'GET'` - Whether the requests can be safely retried or not. If `false` the request won't be sent until all preceeding requests in the pipeline has completed.
* **upgrade** `string | null` (optional) - Default: `method === 'CONNECT' || null` - Upgrade the request. Should be used to specify the kind of upgrade i.e. `'Websocket'`.

#### Parameter: `DispatchHandlers`

* **onConnect** `(abort: () => void) => void` - Invoked before request is dispatched on socket. May be invoked multiple times when a request is retried when the request at the head of the pipeline fails.
* **onError** `(error: Error) => void` - Invoked when an error has occurred.
* **onUpgrade** `(statusCode: number, headers: string[] | null, socket: Duplex) => void` (optional) - Invoked when request is upgraded. Required if `DispatchOptions.upgrade` is defined or `DispatchOptions.method === 'CONNECT'`.
* **onHeaders** `(statusCode: number, headers: string[] | null, resume: () => void) => boolean` - Invoked when statusCode and headers have been received. May be invoked multiple times due to 1xx informational headers. Not required for `upgrade` requests.
* **onData** `(chunk: Buffer) => boolean` - Invoked when response payload data is received. Not required for `upgrade` requests.
* **onComplete** `(trailers: string[] | null) => void` - Invoked when response payload and trailers have been received and the request has completed. Not required for `upgrade` requests.

### `Client.pipeline(options, handler)`

Arguments:

* **options** `PipelineOptions`
* **handler** `(data: PipelineHandlerData) => Readable`

Returns: `Duplex`

#### Parameter: PipelineOptions

Extends: `RequestOptions`

* **objectMode** `boolean` (optional) - Default: `false` - Set to `true` if the `handler` will return an object stream.

#### Parameter: PipelineHandlerData

* **statusCode** `number`
* **headers** `IncomingHttpHeaders`
* **opaque** `unknown`
* **body** `Readable`

### `Client.request()` _(2 overloads)_

Performs a HTTP request

#### (1) `Client.request(options)`

Arguments:

* **options** `RequestOptions`

Returns: `Promise<ResponseData>`

#### (2) `Client.request(options, callback)`

Arguments:

* **options** `RequestOptions`
* **callback** `(error: Error | null, data: ResponseData) => void`

#### Parameter: `RequestOptions`

Extends: `DispatchOptions`

* **opaque** `unknown` (optional)
* **signal** `AbortSignal | EventEmitter | null` (optional) - Default: `null`

#### Parameter: `ResponseData`

* **statusCode** `number`
* **headers** `IncomingHttpHeaders`
* **body** `Readable`
* **opaque** `unknown`

### `Client.stream()` _(2 overloads)_

A faster version of `Client.request`

#### (1) `Client.stream(options, factory)`

Arguments:

* **options** `RequestOptions`
* **factory** `(data: StreamFactoryData) => Writable`

Returns: `Promise<StreamData>`

#### (2) `Client.stream(options, factory, callback)`

Arguments:

* **options** `RequestOptions`
* **factory** `(data: StreamFactoryData) => Writable`
* **callback** `(error: Error | null, data: StreamData) => void`

#### Parameter: `StreamFactoryData`

* **statusCode** `number`
* **headers** `IncomingHttpHeaders`
* **opaque** `unknown`

#### Parameter: `StreamData`

* **opaque** `unknown`
* **trailers** `Record<string, unknown>`

### `Client.upgrade()` _(2 overloads)_

#### (1) `Client.upgrade(options)`

Arguments:

* **options** `UpgradeOptions`

Returns: `Promise<UpgradeData>`

#### (2) `Client.upgrade(options, callback)

Arguments:

* **options** `UpgradeOptions`
* **callback** `(error: Error | null, data: UpgradeData) => void`

#### Parameter: `UpgradeOptions`

* **path** `string`
* **method** `string` (optional)
* **headers** `IncomingHttpHeaders | null` (optional) - Default: `null`
* **headersTimeout** `number` (optional) - Default: `30e3` - The timeout after which a request will time out, in milliseconds. Monitors time between receiving a complete headers. Use 0 to disable it entirely. Defaults to 30 seconds.
* **protocol** `string` (optional) - Default: `'Websocket'` - A string of comma separated protocols, in descending preference order.
* **signal** `AbortSignal | EventEmitter | null` (optional) - Default: `null`

## Instance Properties

### `Client.busy`

* `boolean`

True if pipeline is saturated or blocked. Indicates whether dispatching further requests is meaningful.

### `Client.closed`

* `boolean`

True after `client.close()` has been called.

### `Client.connected`

* `boolean`

True if the client has an active connection. The client will lazily create a connection when it receives a request and will destroy it if there is no activity for the duration of the `timeout` value.

### `Client.destroyed`

* `destroyed`

True after `client.destroyed()` has been called or `client.close()` has been called and the client shutdown has completed.

### `Client.pending`

* `number`

Number of queued requests.

### `Client.pipelining`

* `number`

Property to get and set the pipelining factor.

### `Client.running`

* `number`

Number of inflight requests.

### `Client.size`

* `number`

Number of pending and running requests.

## Instance Events

### Event: `'connect'`

Emitted when a socket has been created and connected. The client will connect once `Client.size > 0`.

### Event: `'disconnect'`

Returns:

* **error** `Error`

Emitted when socket has disconnected. The first argument of the event is the error which caused the socket to disconnect. The client will reconnect if or once `Client.size > 0`.

### Event: `'drain'`

Emitted when pipeline is no longer fully saturated.