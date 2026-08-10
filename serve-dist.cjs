const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const host = process.env.HOST || '0.0.0.0'
const portText = process.argv[2] || process.env.PORT || '80'
const port = Number(portText)
const distRoot = path.resolve(__dirname, 'dist')

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${portText}`)
  process.exit(1)
}

const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
}

function sendText(response, statusCode, text, extraHeaders = {}) {
  const body = Buffer.from(text)
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end(body)
}

function serveFile(request, response, filePath, stats) {
  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stats.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  const stream = fs.createReadStream(filePath)
  stream.on('error', () => {
    if (!response.headersSent) {
      sendText(response, 500, '500 Internal Server Error\n')
    } else {
      response.destroy()
    }
  })
  stream.pipe(response)
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, '405 Method Not Allowed\n', { Allow: 'GET, HEAD' })
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    sendText(response, 400, '400 Bad Request\n')
    return
  }

  if (pathname === '/') {
    response.writeHead(302, { Location: '/dist/', 'Cache-Control': 'no-store' })
    response.end()
    return
  }

  if (pathname === '/dist') {
    response.writeHead(302, { Location: '/dist/', 'Cache-Control': 'no-store' })
    response.end()
    return
  }

  if (!pathname.startsWith('/dist/')) {
    sendText(response, 404, '404 Not Found\n')
    return
  }

  const relativePath = pathname.slice('/dist/'.length).replaceAll('/', path.sep)
  let filePath = path.resolve(distRoot, relativePath)

  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
    sendText(response, 403, '403 Forbidden\n')
    return
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
      fs.stat(filePath, (indexError, indexStats) => {
        if (indexError || !indexStats.isFile()) {
          sendText(response, 404, '404 Not Found\n')
          return
        }
        serveFile(request, response, filePath, indexStats)
      })
      return
    }

    if (error || !stats.isFile()) {
      const message = fs.existsSync(distRoot)
        ? '404 Not Found\n'
        : '404 Not Found: the dist directory does not exist yet.\n'
      sendText(response, 404, message)
      return
    }

    serveFile(request, response, filePath, stats)
  })
})

server.on('error', (error) => {
  console.error(`Failed to start server: ${error.message}`)
  process.exitCode = 1
})

server.listen(port, host, () => {
  console.log(`Serving only: ${distRoot}`)
  console.log(`Local URL:    http://localhost:${port}/dist/`)
  if (!fs.existsSync(distRoot)) {
    console.log('Note: dist does not exist yet. Keep this window open and create it later.')
  }
  console.log('Press Ctrl+C to stop.')
})
