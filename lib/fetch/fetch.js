// @ts-check

/**
 * 
 * @param {RequestInfo} input 
 * @param {RequestInit} [init] 
 * @returns {Promise<Response>}
 */
function fetch(input, init = {}) {
	return new Promise((resolve, reject) => {
		let requestObject
		try {
			requestObject = new Request(input, init)
		} catch (error) {
			return reject(error)
		}
		let request = requestObject.request
	
		if (requestObject.signal.aborted) {
			abort(this, request, null)
			return
		}
	
		// 5. service worker 
	
		let responseObject = null
		
		// 7. realm
	
		let locallyAborted = false
	
		requestObject.signal.on('abort', () => {
			locallyAborted = true
			abort(this, request, responseObject)
			return
		})
	
		_fetch(request, {
			processResponse: response => {
				if (locallyAborted) {
					return
				}
				if (response.aborted) {
					abort(this, request, responseObject)
				}
				if (isNetworkError(response)) {
					reject(new TypeError('response is a network error'))
				}
				responseObject = new Response(response, 'immutable')
				resolve(responseObject)
			}
		})
	})

	/**
	 * 
	 * @param {Promise} promise 
	 * @param {Request} request 
	 * @param {Response} responseObject 
	 * @returns 
	 */
	function abort(promise, request, responseObject) {
		let error = new Error() // replace with 'AbortError'

		promise.reject(error)
		if (request.body != null && request.body.readable) {
			request.body.cancel(error)
		}
		if (responseObject == null) {
			return
		}
		let response = responseObject.response
		if (response.body != null && response.body.readable) {
			response.body.error(error)
		}
	}
}

module.exports = {
	default: fetch,
	fetch
}