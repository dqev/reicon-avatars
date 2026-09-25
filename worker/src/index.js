import { generateAvatar, PALETTES } from './avatar.js';

// In-memory IP rate limiter map for Cloudflare Worker instance
const ipRateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_LIMIT = 100; // 100 requests / minute per IP

/**
 * Perform sliding window rate limiting by client IP
 */
function checkRateLimit(clientIp, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  let record = ipRateMap.get(clientIp);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
    ipRateMap.set(clientIp, record);
  } else {
    record.count += 1;
  }

  // Cleanup old records periodically
  if (ipRateMap.size > 10000) {
    for (const [ip, data] of ipRateMap.entries()) {
      if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
        ipRateMap.delete(ip);
      }
    }
  }

  const remaining = Math.max(0, limit - record.count);
  const resetSec = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
  const isExceeded = record.count > limit;

  return { isExceeded, remaining, resetSec, limit };
}

/**
 * Normalize double/triple '?' query parameter typos into '&'
 */
function normalizeUrl(rawUrl) {
  const firstQ = rawUrl.indexOf('?');
  if (firstQ === -1) return new URL(rawUrl);
  const originAndPath = rawUrl.slice(0, firstQ);
  const queryString = rawUrl.slice(firstQ + 1).replace(/\?/g, '&');
  return new URL(originAndPath + '?' + queryString);
}

/**
 * Standard CORS & Cache headers with optional Content-Disposition filename
 */
function getResponseHeaders(contentType, extraHeaders = {}, filename = null) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'CDN-Cache-Control': 'public, max-age=31536000, immutable',
    ...extraHeaders
  };

  if (filename) {
    headers['Content-Disposition'] = `inline; filename="${filename}"`;
  }

  return headers;
}

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getResponseHeaders('text/plain')
      });
    }

    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    // 2. Rate Limiting Check
    const limitSetting = env?.MAX_REQUESTS_PER_MINUTE ? parseInt(env.MAX_REQUESTS_PER_MINUTE, 10) : DEFAULT_LIMIT;
    const rateLimit = checkRateLimit(clientIp, limitSetting);
    const rateHeaders = {
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetSec)
    };

    if (rateLimit.isExceeded) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please wait ${rateLimit.resetSec} seconds.`,
        limit: rateLimit.limit
      }), {
        status: 429,
        headers: getResponseHeaders('application/json', {
          ...rateHeaders,
          'Retry-After': String(rateLimit.resetSec)
        })
      });
    }

    // 3. Route Handling & Query Parsing
    const normalizedUrl = normalizeUrl(request.url);
    const pathSegments = normalizedUrl.pathname.split('/').filter(Boolean); // e.g. ['v1', 'svg', 'john']

    // Cloudflare Edge Cache API Lookup
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(normalizedUrl.toString(), request);

    if (cache) {
      try {
        let cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const newHeaders = new Headers(cachedResponse.headers);
          Object.entries(rateHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          newHeaders.set('X-Cache-Status', 'HIT');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            headers: newHeaders
          });
        }
      } catch (cacheErr) {
        console.warn('Edge cache match error:', cacheErr);
      }
    }

    // Parse shape parameter (default to 'square')
    let queryShape = (normalizedUrl.searchParams.get('shape') || 'square').toLowerCase().trim();
    if (!['circle', 'squircle', 'square'].includes(queryShape)) {
      queryShape = 'square';
    }

    // Parse size / width / height parameter
    const rawSize = normalizedUrl.searchParams.get('size') || normalizedUrl.searchParams.get('width') || normalizedUrl.searchParams.get('height') || '500';
    let querySize = parseInt(rawSize, 10);
    if (isNaN(querySize) || querySize <= 0) querySize = 500;
    if (querySize > 2000) querySize = 2000;

    // Default Landing / Root Health
    if (pathSegments.length === 0 || pathSegments[0] !== 'v1') {
      return new Response(JSON.stringify({
        name: "Reicon Avatars API",
        version: "v1",
        status: "operational",
        endpoints: {
          svg: "/v1/svg/{seed}?shape=square|circle|squircle&size=500",
          json: "/v1/json/{seed}"
        },
        documentation: "https://github.com/dqev/reicon-avatars"
      }, null, 2), {
        status: 200,
        headers: getResponseHeaders('application/json', rateHeaders)
      });
    }

    const [, format, ...seedParts] = pathSegments;
    const seed = seedParts.join('/') || 'avatar';
    const safeSeedFilename = encodeURIComponent(seed);

    try {
      let response;
      if (format === 'svg') {
        const svgContent = generateAvatar(seed, queryShape, querySize);
        response = new Response(svgContent, {
          status: 200,
          headers: getResponseHeaders(
            'image/svg+xml; charset=utf-8',
            { ...rateHeaders, 'X-Cache-Status': 'MISS' },
            `${safeSeedFilename}.svg`
          )
        });
      } else if (format === 'json') {
        const svgContent = generateAvatar(seed, queryShape, querySize);
        const jsonBody = JSON.stringify({
          seed,
          shape: queryShape,
          size: querySize,
          svg: svgContent
        });
        response = new Response(jsonBody, {
          status: 200,
          headers: getResponseHeaders(
            'application/json',
            { ...rateHeaders, 'X-Cache-Status': 'MISS' }
          )
        });
      } else {
        return new Response(JSON.stringify({ error: `Unsupported format '${format}'. Supported: svg, json` }), {
          status: 400,
          headers: getResponseHeaders('application/json', rateHeaders)
        });
      }

      // Store in Cloudflare Cache asynchronously if cache is available and status is OK
      if (cache && response.status === 200 && ctx?.waitUntil) {
        ctx.waitUntil(
          cache.put(cacheKey, response.clone()).catch(err => console.warn('Cache put error:', err))
        );
      }
      return response;

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal avatar generation error', details: err.message }), {
        status: 500,
        headers: getResponseHeaders('application/json', rateHeaders)
      });
    }
  }
};
