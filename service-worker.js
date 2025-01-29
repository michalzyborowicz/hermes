const CACHE_NAME = 'hermes-app-cache-v1'
const urlsToCache = ['/', '/index.html', '/css/main.css', '/js/main.js', '/images/logo.png']

// Install event: Cache static assets
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			console.log('Opened cache')
			return cache.addAll(urlsToCache)
		})
	)
})

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (cacheName !== CACHE_NAME) {
						console.log('Deleting old cache:', cacheName)
						return caches.delete(cacheName)
					}
				})
			)
		})
	)
})

// Fetch event: Serve cached files or fallback
self.addEventListener('fetch', event => {
	event.respondWith(
		caches.match(event.request).then(response => {
			// Return cached response if found
			return response || fetch(event.request)
		})
	)
})
