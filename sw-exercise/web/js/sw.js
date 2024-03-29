'use strict';

const version = 8;
let isOnline = true;
let isLoggedIn = false;
let cacheName = `ramblings-${version}`;

const urlsToCache = {
  loggedOut: [
    '/',
    '/about',
    '/login',
    '/contact',
    '/404',
    '/offline',
    '/js/blog.js',
    '/js/home.js',
    '/js/login.js',
    '/js/add-post.js',
    '/css/style.css',
    '/images/logo.gif',
    '/images/offline.png'
  ]
};

self.addEventListener('install', onInstall);
self.addEventListener('activate', onActivate);
self.addEventListener('message', onMessage);
self.addEventListener('fetch', onFetch);

main().catch(console.error);

async function onFetch(fetchEvent) {
  fetchEvent.respondWith(router(fetchEvent.request));
}

async function router(request) {
  let url = new URL(request.url);
  let reqURL = url.pathname;
  let cache = await caches.open(cacheName);

  if (url.origin === location.origin) {
    // if it is an API call
    if (/^\/api\/.+$/.test(reqURL)) {
      let res;

      if (isOnline) {
        try {
          let fetchOptions = {
            method: request.method,
            headers: request.headers,
            credentials: 'same-origin',
            cache: 'no-store'
          };

          res = await fetch(request.url, fetchOptions);

          if (res && res.ok) {
            // cache only the get requests
            if (request.method === 'GET') {
              await cache.put(reqURL, res.clone());
            }

            return res;
          }
        } catch (error) {}
      }
      res = await cache.match(reqURL);

      if (res) {
        return res.clone();
      }

      return notFoundResponse();
    }
    // requesting a page
    else if (request.headers.get('Accept').includes('text/html')) {
      // login-aware page
      if (/^\/(?:login|logout|add-post)$/.test(reqURL)) {
      } else {
        let res;

        //network first, then cache for pages
        if (isOnline) {
          try {
            let fetchOptions = {
              method: request.method,
              headers: request.headers,
              cache: 'no-store'
            };

            res = await fetch(request.url, fetchOptions);

            if (res && res.ok) {
              if (!res.headers.get('X-Not-Found')) {
                await cache.put(reqURL, res.clone());
              }
            }

            return res;
          } catch (error) {}
        }
        res = await cache.match(reqURL);

        if (res) {
          return res.clone();
        }

        return await cache.match('/offline');
      }
    } else {
      //cache first
      let res = await cache.match(reqURL);

      if (res) {
        return res;
      }

      if (isOnline) {
        try {
          let fetchOptions = {
            method: request.method,
            headers: request.headers,
            cache: 'no-store'
          };

          res = await fetch(request.url, fetchOptions);

          if (res && res.ok) {
            await cache.put(reqURL, res.clone());
            return res;
          }
        } catch (error) {}
      }

      return notFoundResponse();
    }
  }

  //TODO: figure out CORS requests
}

function notFoundResponse() {
  return new Response('', {
    status: 404,
    statusText: 'Not found'
  });
}

async function onInstall(event) {
  console.log(`Service Worker ${version} is installed.`);
  self.skipWaiting();
}
async function onActivate(event) {
  event.waitUntil(handleActivation());
}

async function main() {
  await sendMessage({ requestStatusUpdate: true });
  await cacheLoggedOutFiles();
}

async function handleActivation(params) {
  await clearCaches();
  await cacheLoggedOutFiles(/*forceReload=*/ true);
  await clients.claim();

  console.log(`Service Worker ${version} is activated.`);
}

async function sendMessage(msg) {
  let allClients = await clients.matchAll({ includeUncontrolled: true });

  return Promise.all(
    allClients.map(function clientMsg(client) {
      let channel = new MessageChannel();

      channel.port1.onmessage = onMessage;
      return client.postMessage(msg, [channel.port2]);
    })
  );
}

async function onMessage(event) {
  let { data } = event;

  if (data.statusUpdate) {
    ({ isLoggedIn, isOnline } = data.statusUpdate);
    console.log(`SW (v${version}), status update... isOnline: ${isOnline}, isLoggedIn: ${isLoggedIn}`);
  }
}

async function cacheLoggedOutFiles(forceReload = false) {
  let cache = await caches.open(cacheName);

  return Promise.all(
    urlsToCache.loggedOut.map(async function requestFile(url) {
      try {
        let res;

        if (!forceReload) {
          res = await cache.match(url);

          if (res) {
            return res;
          }
        }

        let fetchOptions = {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-cache'
        };

        res = await fetch(url, fetchOptions);

        if (res.ok) {
          await cache.put(url, res);
        }
      } catch (error) {}
    })
  );
}

async function clearCaches() {
  let cacheNames = await caches.keys();
  let oldCachesNames = cacheNames.filter(function matchOldCache(cacheName) {
    if (/^ramblings-\d+$/.test(cacheName)) {
      let [, cacheVersion] = cacheName.match(/^ramblings-(\d+)$/);
      cacheVersion = cacheVersion != null ? Number(cacheVersion) : cacheVersion;

      return cacheVersion > 0 && cacheVersion !== version;
    }
  });

  return Promise.all(
    oldCachesNames.map(function deleteCache(cacheName) {
      return caches.delete(cacheName);
    })
  );
}
