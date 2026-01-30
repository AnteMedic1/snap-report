importScripts('js/idb-helper.js'); // Učitaj helper unutar SW-a

const CACHE_NAME = 'snap-report-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/app.js',
    '/js/idb-helper.js',
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// 1. Install - Caching App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// 2. Activate - Cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

// 3. Fetch - Cache First Strategy for Static Assets
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    console.log("Offline smo, ne mogu dohvatiti: " + event.request.url);
                });
            })
    );
});

// 4. Background Sync Event
self.addEventListener('sync', event => {
    if (event.tag === 'sync-reports') {
        event.waitUntil(sendOfflineReports());
    }
});

// Funkcija za slanje podataka iz IndexedDB na Server
async function sendOfflineReports() {
    console.log("Započinjem dohvaćanje podataka iz IDB...");
    
    // Dohvaćamo sve izvještaje iz IndexedDB
    const reports = await getAllReports(); 

    if (!reports || reports.length === 0) {
        console.log("Nema izvještaja za slanje.");
        return;
    }

    for (const report of reports) {
        try {
            // Linija koja stvara varijablu 'response'
            const response = await fetch('/sync-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });

            // SADA smiješ koristiti 'response' jer je definiran liniju iznad
            if (response.ok) {
                console.log("Server primio podatke. ID za brisanje je:", report.id);
                await deleteReport(report.id); 
                console.log("Izvještaj uspješno obrisan iz IndexedDB-a.");
            } else {
                console.warn("Server je vratio grešku, ne brišem iz baze.");
            }
        } catch (error) {
            console.error('Mrežna greška pri slanju na server:', error);
        }
    }
}

// 5. Push Notification Event
self.addEventListener('push', event => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png'
    });
});