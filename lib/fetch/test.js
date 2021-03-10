'use strict'

const { collectAnHTTPQuotedString, HeadersList } = require('./index')

{
	const collectAnHTTPQuotedStringTests = [
		["\"\\", "\"\\", "\\", 2],
		["\"Hello\" World", "\"Hello\"", "Hello", 7],
		["\"Hello \\\\ World\\\"\"", "\"Hello \\\\ World\\\"\"", "Hello \\ World\"", 18]
	]
	
	function testCollectAnHTTPQuotedString (tests) {
		const results = []
		for (const [input, expectedOutput, expectedExtractValueOutput, finalPosValue] of tests) {
				const actualOutput = collectAnHTTPQuotedString(input, 0)
				const actualExtractValueOutput = collectAnHTTPQuotedString(input, 0, true)
				results.push({
						input,
						output: {
								expected: expectedOutput,
								actual: actualOutput
						},
						extractValueOutput: {
								expected: expectedExtractValueOutput,
								actual: actualExtractValueOutput
						},
						pass: {
							output: expectedOutput === actualOutput,
							extractValueOutput: expectedExtractValueOutput === actualExtractValueOutput
						}
				})
		}
		console.table(results)
	}
	
	// testCollectAnHTTPQuotedString(collectAnHTTPQuotedStringTests)
}

{
	const tests = [
		[
			[
				[['A', 'nosniff, ']],
				[['A', 'nosniff'], ['B', 'sniff'], ['A', '']]
			],
			['nosniff', '']
		],
		[
			[
				[['A', 'text/html;", x/x']],
				[['A', 'text/html;"'], ['A', 'x/x']]
			],
			['text/html;", x/x']
		]
	]

	for (const [inputSets, output] of tests) {
		for (const inputSet of inputSets) {
			const hl = new HeadersList()
			for (const [name, value] of inputSet) {
				hl.append(name, value)
			}
			console.log('Expected', output)
			console.log('Actual', hl.getDecodeAndSplit('A'))
		}
	}
}

