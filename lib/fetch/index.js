// @ts-check

// 2.1 https://fetch.spec.whatwg.org/#url

const localSchemes = new Set([ 'about', 'blob', 'data' ])

/**
 * 
 * @param {string} scheme 
 * @returns {boolean}
 */
function isLocalScheme (scheme) {
	return localSchemes.has(scheme)
}

/**
 * 
 * @param {{ scheme: string }} url 
 * @returns {boolean}
 */
function isLocalURL (url) {
	return isLocalScheme(url.scheme)
}

const HTTPSchemes = new Set([ 'http', 'https' ])

/**
 * 
 * @param {string} scheme 
 * @returns {boolean}
 */
function isHTTPScheme (scheme) {
	return HTTPSchemes.has(scheme)
}

/**
 * 
 * @param {string} scheme 
 * @returns {boolean}
 */
function isFetchScheme (scheme) {
	return isLocalScheme(scheme) || scheme === 'file' || isHTTPScheme(scheme)
}

// 2.2 https://fetch.spec.whatwg.org/#http

const HTTPTabOrSpace = new Set([ 0x0009, 0x0020 ])
const HTTPWhitespace = new Set([ 0x000A, 0x000D, ...HTTPTabOrSpace ])
const HTTPNewlineByte = new Set([ 0x0A, 0x0D ])
const HTTPTabOrSpaceByte = new Set([ 0x09, 0x20 ])
const HTTPWhitespaceByte = new Set([ ...HTTPNewlineByte, ...HTTPTabOrSpace ])

/**
 * Currently invalid
 * https://fetch.spec.whatwg.org/#collect-an-http-quoted-string
 * @param {string} input 
 * @param {number} position 
 * @param {boolean} [extractValueFlag]
 * @returns {string}
 */
function collectAnHTTPQuotedString (input, position, extractValueFlag) {
		let positionStart = position
		let value = ''

		assert(input.codePointAt(position) === 0x0022, new Error('First character in input must be U+0022 (")'))

		position++
		while (true) {
				let codePoint = input.codePointAt(position)
				while ( position < input.length && (codePoint !== 0x0022 && codePoint !== 0x005C)) {
						value += String.fromCodePoint(codePoint)
						position++
						codePoint = input.codePointAt(position)
				}

				if (position >= input.length) {
						break
				}

				const quoteOrBackslash = input.codePointAt(position)

				position++

				if (quoteOrBackslash === 0x005C) {
						if (position >= input.length) {
								value += String.fromCodePoint(0x005C)
								break
						}
						value += input.charAt(position)
						position++
				} else {
						assert(quoteOrBackslash === 0x0022, new Error('quoteOrBackslash expected to be "'))
						break
				}
		}

		if (extractValueFlag) {
				return value
		}

		return input.substring(positionStart, position)
}

// 2.2.1 https://fetch.spec.whatwg.org/#methods

const CORSSafelistedMethods = new Set(['GET', 'HEAD', 'POST'])

function isCORSSafelistedMethod (method) {
	return CORSSafelistedMethods.has(method)
}

const forbiddenMethods = new Set(['CONNECT', 'TRACE', 'TRACK'])

function isForbiddenMethod (method) {
	return forbiddenMethods.has(method.toUpperCase())
}

const normalizedMethods = new Set([...CORSSafelistedMethods, 'DELETE', 'OPTIONS', 'PUT'])

function normalizeMethod (method) {
	const normalizedMethod = method.toUpperCase()
	return normalizedMethods.has(normalizedMethod)? normalizeMethod : method
}

// 2.2.2 https://fetch.spec.whatwg.org/#terminology-headers

class HeadersList {
	constructor () {
		/** @type {Map<string, string[]>} */
		this.headers = new Map()
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-get-structured-header
	 * @param {string} name 
	 * @param {string} type 
	 * @returns 
	 */
	getStructuredFieldValue (name, type) {
		assert(
			type === 'dictionary' || type === 'list' || type === 'item',
			new Error('type must be one of "dictionary", "list", or "item"')
		)
		const value = this.get(name)
		if (value === null) {
			return null
		}
		const result = parseStructuredFields(value, type)
		return !result ? null : result
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-set-structured-header
	 * @param {string} name 
	 * @param {string} structuredValue 
	 */
	setStructureFieldValue (name, structuredValue) {
		const serializedValue = serializeStructuredField(structuredValue)
		this.set(name, serializedValue)
	}

	/**
	 * https://fetch.spec.whatwg.org/#header-list-contains
	 * @param {string} name 
	 * @returns {boolean}
	 */
	contains (name) {
		return this.headers.has(name.toLowerCase())
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-get
	 * @param {string} name 
	 * @returns {string | null}
	 */
	get (name) {
		name = name.toLowerCase()
		const header = this.headers.get(name)
		return header === undefined ? null : header.join(', ')
	}

	/**
	 * Currently failing due to invalid collectAnHTTPQuotedString method
	 * https://fetch.spec.whatwg.org/#concept-header-list-get-decode-split
	 * @param {string} name 
	 * @returns {string[]}
	 */
	getDecodeAndSplit (name) {
		const initialValue = this.get(name)
		if (initialValue === null) {
			return null
		}
		// skip isomorphic decoding ; input = initialValue
		let position = 0
		let values = []
		let value = ''
		while (position < initialValue.length) {
			let codePoint = initialValue.codePointAt(position)
			while (position < initialValue.length && (codePoint !== 0x0022 && codePoint !== 0x002C)) {
				console.log(position, value, codePoint)
				value += String.fromCodePoint(codePoint)
				position++
				codePoint = initialValue.codePointAt(position)
			}
			if (position < initialValue.length) {
				if (codePoint === 0x0022) {
					value += collectAnHTTPQuotedString(initialValue, position)
					if (position < initialValue.length) {
						continue
					}
				} else {
					assert(codePoint === 0x002C, new Error('expected a U+002c (,) character, found ' + String.fromCodePoint(codePoint)))
					position++
				}
			}
			value = value.replace(/^[\t\x20]+|[\t\x20]+$/g, '')
			values.push(value)
			value = ''
		}
		return values
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-append
	 * @param {string} name 
	 * @param {string} value 
	 */
	append(name, value) {
		name = name.toLowerCase()
		const header = this.headers.get(name)
		if (header === undefined) {
			this.headers.set(name, [value])
		} else {
			header.push(value)
		}
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-delete
	 * @param {string} name 
	 */
	delete (name) {
		name = name.toLowerCase()
		this.headers.delete(name)
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-set
	 * @param {string} name 
	 * @param {string} value 
	 */
	set (name, value) {
		name = name.toLowerCase()
		this.headers.set(name, [value])
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-combine
	 * @param {string} name 
	 * @param {string} value 
	 */
	combine (name, value) {
		name = name.toLowerCase()
		const header = this.headers.get(name)
		if (header === undefined) {
			this.headers.set(name, [value])
		} else {
			header[0] += `, ${value}`
		}
	}
	
	/**
	 * https://fetch.spec.whatwg.org/#convert-header-names-to-a-sorted-lowercase-set
	 * @returns {string[]}
	 */
	convertHeaderNamesToSortedLowercaseSet () {
		const names = Array.from(this.headers.keys())
		const headerNames = names.map(name => name.toLowerCase())
		return headerNames.sort()
	}

	/**
	 * https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine
	 * @returns {string[][]}
	 */
	sortAndCombine () {
		const names = this.convertHeaderNamesToSortedLowercaseSet()
		const headers = names.map(name => {
			const value = this.get(name)
			assert(value !== null, new Error('value should not be null'))
			return [name, value]
		})
		return headers
	}
}

/**
 * https://fetch.spec.whatwg.org/#concept-header-value-normalize
 * @param {string} potentialValue 
 * @returns {string}
 */
function normalizeValue (potentialValue) {
	return potentialValue.replace(/^[\n\t\r\x20]+|[\n\t\r\x20]+$/g, '')
}

/**
 * @typedef {{ name: string, value: string }} Header
 * @typedef {{ essence: string }} MIMEType
 */

/**
 * https://fetch.spec.whatwg.org/#cors-safelisted-request-header
 * @param {Header} header 
 * @returns {boolean}
 */
function isCORSSafelistedRequestHeader (header) {
	let value = header.value
	switch (header.name.toLowerCase()) {
		case 'accept': {
			if (containsCORSUnsafeRequestHeaderByte(value)) {
				return false
			}
			break
		}
		case 'accept-language':
		case 'content-language': {
			if (/[\x30-\x39\x41-\x5A\x61-\x7A\x20\x2A\x2C\x2D\x2E\x3B\x3D]/.test(value)) {
				return false
			}
			break
		}
		case 'content-type': {
			if (containsCORSUnsafeRequestHeaderByte(value)) {
				return false
			}

			let mimeType = parseMIMEType(value)
			if (mimeType === false || !new Set(['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain' ]).has(mimeType.essence)) {
				return false
			}
			break
		}
		default:
			return false
	}
	return value.length <= 128
}

/**
 * https://fetch.spec.whatwg.org/#cors-unsafe-request-header-byte
 * @param {string} headerValue 
 * @returns {boolean}
 */
function containsCORSUnsafeRequestHeaderByte (headerValue) {
	return /[\x00-\x08\x10-\x20\x22\x28\x29\x3A\x3C\x3E\x3F\x40\x5B\x5C\x7B\x7D\x7F]/.test(headerValue)
}

/**
 * https://fetch.spec.whatwg.org/#cors-unsafe-request-header-names
 * @param {HeadersList} headersList
 * @return {string[]}
 */
function CORSUnsafeRequestHeaderNames ({ headers }) {
	const unsafeNames = []
	const potentiallyUnsafeNames = []
	let safelistValueSize = 0
	for (const [name, _value] of headers) {
		const value = _value.join(', ')
		if (!isCORSSafelistedRequestHeader({ name, value })) {
			unsafeNames.push(name)
		} else {
			potentiallyUnsafeNames.push(name)
			safelistValueSize+=value.length
		}
	}
	if (safelistValueSize > 1024) {
		for (const name of potentiallyUnsafeNames) {
			unsafeNames.push(name)
		}
	}
	return unsafeNames.map(name => name.toLowerCase()).sort()
}

/**
 * https://fetch.spec.whatwg.org/#cors-non-wildcard-request-header-name
 * @param {string} name 
 * @returns {boolean}
 */
function isCORSNonWildcardRequestHeaderName (name) {
	return name.toLowerCase() === 'authorization'
}

/**
 * https://fetch.spec.whatwg.org/#privileged-no-cors-request-header-name
 * @param {string} name 
 * @returns {boolean}
 */
function isPrivilegedNoCORSRequestHeaderName (name) {
	return name.toLowerCase() === 'range'
}

const CORSSafelistedResponseHeaderNames = new Set([
	'cache-control',
	'content-langauge',
	'content-length',
	'content-type',
	'expires',
	'last-modified',
	'pragma'
])

/**
 * 
 * @param {string} name 
 * @param {string[]} list 
 */
function isCORSSafelistedResponseHeaderName (name, list) {
	return CORSSafelistedResponseHeaderNames.has(name) || list.some(value => !isForbiddenResponseHeaderName(value))
}

const forbiddenResponseHeaderNames = new Set([
	'set-cookie',
	'set-cookie2'
])

/**
 * https://fetch.spec.whatwg.org/#forbidden-response-header-name
 * @param {string} name 
 * @returns {boolean}
 */
function isForbiddenResponseHeaderName (name) {
	return forbiddenResponseHeaderNames.has(name.toLowerCase())
}

function isNoCORSSafelistedRequestHeaderName (name) {
	
}

/**
 * 
 * @param {string} value 
 * @param {string} type 
 * @returns {string | false}
 */
function parseStructuredFields (value, type) { 
	/* TODO */
	return false
}

/**
 * 
 * @param {string} structuredValue
 * @returns {string}
 */
function serializeStructuredField(structuredValue) { 
	/* TODO */
	return structuredValue
}

/**
 * 
 * @param {string} value 
 * @return {MIMEType | false}
 */
function parseMIMEType (value) {
	/* TODO */
	return false
}

// util

/**
 * 
 * @param {boolean} condition 
 * @param {Error} error 
 */
function assert (condition, error) {
	if (!condition) {
		throw error
	}
}

module.exports = {
	collectAnHTTPQuotedString,
	HeadersList
}