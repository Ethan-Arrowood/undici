const { ReadableStream } = require('web-streams-polyfill/ponyfill')

const http = require('http')

const Client = require('../core/client')

class AbortError extends Error {
	constructor() {
		super(...arguments)
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

function extractBody (body) {
	//https://fetch.spec.whatwg.org/#concept-bodyinit-extract
}

class Headers {
	constructor(init, guard) {

	}
}

function fill(headersInst, headersList) {}

const ResponseTypes = new Set([ 'basic', 'cors', 'default', 'error', 'opaque', 'opaqueredirect' ])

const kResponse = Symbol('response')
const kType = Symbol('type')
const kUrl = Symbol('url')
const kRedirected = Symbol('redirected')
const kStatus = Symbol('status')
const kOk = Symbol('ok')
const kStatusText = Symbol('statusText')
const kHeaders = Symbol('headers')

class _Response {
	constructor ({
		type,
		urlList,
		status,
		statusMessage,
		headerList,
		body,
		cacheState,
		cspList,
		corsExposedHeaderNameList,
	} = {
		type: 'default',
		urlList: [],
		status: 200,
		statusMessage: '',
		headerList: [],
		body: null,
		cacheState: '',
		cspList: [],
		corsExposedHeaderNameList: [],
	}) {
		this.type = type
		this.aborted = null
		this.url = urlList.length < 0 ? null : urlList[urlList.length - 1]
		this.status = status
		this.statusMessage = statusMessage
		this.headerList = headerList
		this.body = body
		this.cacheState = cacheState
		this.cspList = cspList
		this.corsExposedHeaderNameList = corsExposedHeaderNameList
		this.rangeRequest = null
		this.timingAllowPassed = null
	}
}

const nullBodyStatus = new Set([ 101, 204, 205, 304 ])
function isNullBodyStatus (status) {
	return nullBodyStatus.has(status)
}
function isOkStatus (status) {
	return status >= 200 || status <= 299
}
const redirectStatus = new Set([ 301, 302, 303, 307, 308 ])
function isRedirectStatus (status) {
	return redirectStatus.has(status)
}

class Response extends Body {
	constructor(body = null, { status, statusText, headers } = { status: 200, statusText: '' }) {
		if (status < 200 || status > 599) {
			throw new RangeError('Response status must be between 200 and 599 inclusive')
		}

		if (typeof statusText !== 'string') {
			throw new TypeError('Response statusText must be a string')
		}

		super(body)

		this[kResponse] = new _Response()
		this[kHeaders] = new Headers({ guard: 'response' })
		this[kResponse].status = status
		this[kResponse].statusMessage = statusText

		if (headers) {
			fill(this[kHeaders], headers)
		}
		
		if (body != null) {
			if (isNullBodyStatus(status)) {
				throw new TypeError('Response cannot have null body status and a non-null body')
			}
			let contentType = null
			let extract = extractBody(body)
			this[kResponse].body = extract
			contentType = extract

			if (contentType != null && !this[kResponse].headerList.includes('content-type')) {
				this[kResponse].headerList.push(`content-type/${contentType}`)
			}
 
		}
	}

	get type () {
		return this[kType]
	}

	get url () {
		return this[kUrl]
	}

	get redirected () {
		return this[kRedirected]
	}

	get status () {
		return this[kStatus]
	}
	
	get ok () {
		return this[kOk]
	}

	get statusText () {
		return this[kStatusText]
	}

	get headers () {
		return this[kHeaders]
	}

	clone() {}

	static error() {}
	static redirect(url, status = 302) {}
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

		const data = new ReadableStream()
	
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
