'use strict'

const { test } = require('tap')
const { Client } = require('..')
const http = require('http')

test('end process on idle', (t) => {
  t.plan(2)

  const server = http.createServer((req, res) => {
    res.end()
  })
  t.teardown(server.unref.bind(server))

  server.keepAliveTimeout = 99999

  server.listen(0, async () => {
    const client = new Client(`http://localhost:${server.address().port}`)
    client.request({ path: '/', method: 'GET' }, (err, { body }) => {
      t.error(err)
      body
        .resume()
        .on('end', () => {
          t.pass()
          setTimeout(() => {
            throw new Error('asd')
          }, 2e3).unref()
        })
    })
  })
})
