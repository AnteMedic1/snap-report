const express = require('express');
const webpush = require('web-push');
const path = require('path');

const app = express();

// POVEĆAN LIMIT: Ovo rješava PayloadTooLargeError jer su slike velike
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Tvoji VAPID ključevi
const publicVapidKey = 'BEimQ-nTSO9Z7JKzR5stCCTl9bh946Hk8nJ59yYtuJwv96f2DGD5JCkxg_nL2a_We88wzOukdGFUjztwvs3Yf6U';
const privateVapidKey = 'kQMQSjRZafqup65AqxB4ROVLm8r84WgqPlekxYTqCMk';

let subscription = null;

webpush.setVapidDetails('mailto:am53377@fer.hr', publicVapidKey, privateVapidKey);

// Endpoint za spremanje pretplate
app.post('/subscribe', (req, res) => {
  subscription = req.body;
  console.log("Pretplata spremljena na serveru.");
  res.status(201).json({});
});

// Endpoint za primanje "izvještaja" (Sync)
app.post('/sync-report', (req, res) => {
  const data = req.body;
  
  // Ispisujemo naslov/opis izvještaja u terminal
  console.log('Primljen izvještaj na serveru:', data.title || data.description || "Novi izvještaj");

  // Slanje stvarne Push notifikacije
  if (subscription) {
    const payload = JSON.stringify({ 
        title: 'SnapReport', 
        body: 'Vaš izvještaj je uspješno poslan!' 
    });
    
    webpush.sendNotification(subscription, payload)
        .then(() => console.log("Push notifikacija poslana!"))
        .catch(err => console.error("Greška pri slanju notifikacije:", err));
  } else {
    console.log("Nema aktivne pretplate, ne mogu poslati push.");
  }

  res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));