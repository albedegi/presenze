// === CONFIG ===
const TARGET_NAME = 'IFind_216E';
const TARGET_PREFIX = 'IFind_';
const SCAN_TIMEOUT_MS = 10000;

// URL Apps Script pubblicato come Web App (verifica che termini con /exec)
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec';

// === UI ELEMENTS ===
const verifyBtn = document.getElementById('verifyBtn');
const statusEl = document.getElementById('status');
const presenceForm = document.getElementById('presenceForm');
const dataInput = document.getElementById('data');

// === Utils ===
const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };
const itNow = () => new Date().toLocaleString('it-IT');

// === Sblocca form ===
function unlockForm(msg = '✅ Dispositivo trovato! Sei in aula.') {
  setStatus(msg);
  verifyBtn.style.display = 'none';
  presenceForm.style.display = 'block';
  dataInput.value = itNow();
}

// === SCAN PASSIVO (senza pairing) ===
async function tryPassiveScan() {
  if (!navigator.bluetooth?.requestLEScan) return false;

  setStatus('🔍 Ricerca in corso (scan passivo)… Avvicina il portachiavi e attivalo.');
  let scan;
  try {
    scan = await navigator.bluetooth.requestLEScan({
      acceptAllAdvertisements: true,
      keepRepeatedDevices: false
    });
  } catch {
    return false;
  }

  return new Promise((resolve) => {
    let found = false;

    function onAdv(ev) {
      const name = ev.device?.name || ev.name || '';
      if (name === TARGET_NAME || name.startsWith(TARGET_PREFIX)) {
        found = true;
        navigator.bluetooth.removeEventListener('advertisementreceived', onAdv);
        try { scan.stop(); } catch {}
        unlockForm(`✅ Rilevato ${name}. Sei in aula.`);
        resolve(true);
      }
    }

    navigator.bluetooth.addEventListener('advertisementreceived', onAdv);

    setTimeout(() => {
      if (!found) {
        navigator.bluetooth.removeEventListener('advertisementreceived', onAdv);
        try { scan.stop(); } catch {}
        resolve(false);
      }
    }, SCAN_TIMEOUT_MS);
  });
}

// === Fallback chooser ===
async function tryChooserFiltered() {
  setStatus('🔎 Ricerca dispositivi (seleziona il portachiavi IFind se appare)…');
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: TARGET_NAME }, { namePrefix: TARGET_PREFIX }]
    });
    if (!device) return false;
    const name = device.name || 'Sconosciuto';
    if (name === TARGET_NAME || name.startsWith(TARGET_PREFIX)) {
      unlockForm(`✅ Rilevato ${name}. Sei in aula.`);
      return true;
    }
    setStatus(`❌ Trovato "${name}", ma non è il portachiavi IFind.`);
    return false;
  } catch {
    setStatus('⚠️ Nessun dispositivo trovato o permesso negato.');
    return false;
  }
}

// === Verifica Bluetooth ===
async function verifyBluetooth() {
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome o Edge su Android/Windows.');
    return;
  }

  const okPassive = await tryPassiveScan();
  if (okPassive) return;

  const okChooser = await tryChooserFiltered();
  if (okChooser) return;

  setStatus('❌ Non ho rilevato il portachiavi. Riattivalo e riprova.');
}

// === Invio dati a Google Sheet ===
async function submitPresence(e) {
  e.preventDefault();
  const btn = presenceForm.querySelector('button[type="submit"]');
  try {
    btn.disabled = true;
    if (!dataInput.value) dataInput.value = itNow();

    const params = new URLSearchParams(new FormData(presenceForm));
    params.append('user-agent', navigator.userAgent);

    await fetch(SHEET_WEBAPP_URL + '?' + params.toString(), {
      method: 'GET',
      mode: 'no-cors'
    });

    alert('Presenza registrata ✅');
    presenceForm.reset();
    presenceForm.style.display = 'none';
    verifyBtn.style.display = 'inline-block';
    setStatus('Puoi chiudere la pagina.');
  } catch {
    alert('❌ Errore nell’invio. Riprova.');
  } finally {
    btn.disabled = false;
  }
}

verifyBtn.addEventListener('click', verifyBluetooth);
presenceForm.addEventListener('submit', submitPresence);
