const player = document.getElementById('player');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const reportForm = document.getElementById('report-form');
const snapshot = document.getElementById('snapshot');
const saveBtn = document.getElementById('save-btn');
const titleInput = document.getElementById('report-title');
const cameraInterface = document.getElementById('camera-interface');
const fallbackInterface = document.getElementById('fallback-interface');

function initCamera() {
    if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
        cameraInterface.style.display = 'none';
        fallbackInterface.style.display = 'block';
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            player.srcObject = stream;
        })
        .catch(err => {
            console.warn("Camera access denied/error:", err);
            cameraInterface.style.display = 'none';
            fallbackInterface.style.display = 'block';
        });
}

captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    context.drawImage(player, 0, 0);
    
    snapshot.src = canvas.toDataURL('image/png');
    cameraInterface.style.display = 'none';
    reportForm.style.display = 'block';
    
    const stream = player.srcObject;
    if(stream) stream.getTracks().forEach(track => track.stop());
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW Registered'); 
            })
            .catch(err => console.log('SW Registration failed:', err));
    });
}

saveBtn.addEventListener('click', async () => {
    const report = {
        title: titleInput.value,
        image: snapshot.src,
        timestamp: new Date().toISOString()
    };

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        await saveReportOffline(report);
        
        const sw = await navigator.serviceWorker.ready;
        try {
            await sw.sync.register('sync-reports');
            alert('Izvještaj spremljen! Bit će poslan čim uhvatimo internet.');
        } catch (err) {
            console.error(err);
        }
    } else {
        alert('Vaš preglednik ne podržava Background Sync.');
    }
    
    window.location.reload();
});

initCamera();

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function configurePushSub() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    if (sub === null) {

      const vapidPublicKey = 'BEimQ-nTSO9Z7JKzR5stCCTl9bh946Hk8nJ59yYtuJwv96f2DGD5JCkxg_nL2a_We88wzOukdGFUjztwvs3Yf6U';
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub)
      });
      console.log("Pretplata na Push uspješna!");
    }
  } catch (error) {
    console.error("Greška kod Push pretplate:", error);
  }
}

navigator.serviceWorker.register('/sw.js').then(() => {
    configurePushSub();
});