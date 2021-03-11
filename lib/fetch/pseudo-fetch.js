const { AsyncResource } = require('async_hooks')
const http = require('http')

const Client = require('../core/client')

class AbortError extends Error {
	constructor() {
		super(...arguments)
	}
}

class ReadableStreamAsAsyncIterator {
	constructor (data) {
		this.data = data
		this.disturbed = false
	}
	async *[Symbol.asyncIterator]() {
		this.disturbed = true
		yield* this.data
	}
}

class Body {
	constructor(input = null) {
		this.body = input
	}
	get bodyUsed () {
		return this.body != null && this.body.disturbed
	}
	async text() {
		let res = ''
		for await (const chunk of this.body) {
			res += chunk.toString('utf-8')
		}
		return res
	}
	async json() {
		return JSON.parse(await this.text())
	}
}

class Response extends Body {
	constructor(data) {
		super(new ReadableStreamAsAsyncIterator(data))
	}
}

function fetch (input, { method, headers, signal } = {}) {
	return new Promise((resolve, reject) => {
		const url = new URL(input)
		const client = new Client(url.origin)
	
		if (signal) {
			signal.once('abort', () => {
				throw new AbortError()
			})
		}

		const data = []
	
		client.dispatch({
			path: url.pathname,
			method,
			headers
		}, {
			onConnect: () => {},
			onError: error => reject(error),
			onHeaders: () => {},
			onData: chunk => {
				data.push(chunk)
			},
			onComplete: () => {
				resolve(new Response(data))
			}
		})
	})
}

const server = http.createServer((request, response) => {
	response.end('Hello, World!')
})

server.listen(() => {
	fetch(`http://localhost:${server.address().port}`, {
		method: 'GET',
		headers: {
			'undici': 'fetch'
		}
	}).then(response => response.text()).then(text => {
		console.log(text)
	}).catch(error => console.error(error))
})
