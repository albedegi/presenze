// === CONFIG ===
const TARGET_NAME = 'IFind_216E';
const TARGET_PREFIX = 'IFind_';
const SCAN_TIMEOUT_MS = 10000; // quanto a lungo cercare il portachiavi
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec';

// === UI ===
const verifyBtn = document.getElementById('verifyBtn');
const statusEl = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const presenceForm = document.getElementById('presenceForm');
const dataInput = document.getElementById('data');

// === Utils ===
const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };
const itNow = () => { try { return new Date().toLocaleString('it-IT'); } catch { return new Date().toISOString(); } };

// === Sblocca form ===
function unlockForm(msg = '✅ Dispositivo trovato! Sei in aula.') {
  setStatus(msg);
  verifyBtn.style.display = 'none';
  formContainer.style.display = 'block';
  dataInput.value = itNow();
}

// === 1) Tenta SCAN PASSIVO (no pairing) con Web Bluetooth Scanning API ===
async function tryPassiveScan() {
  if (!navigator.bluetooth?.requestLEScan) {
    return false; // API non disponibile -> usa fallback
  }

  // Suggerimenti UI
  setStatus('🔍 Ricerca in corso (scan passivo, nessun pairing)… Avvicina il portachiavi e attivalo (beep/lampeggio).');

  // Accetta tutti gli advertising; filtriamo in codice per nome
  let scan;
  try {
    scan = await navigator.bluetooth.requestLEScan({
      // Se preferisci, puoi usare filters: [{ name: TARGET_NAME }, { namePrefix: TARGET_PREFIX }]
      acceptAllAdvertisements: true,
      keepRepeatedDevices: false
    });
  } catch (e) {
    // L’utente può aver negato il permesso “Dispositivi nelle vicinanze”
    return false;
  }

  return new Promise((resolve) => {
    let found = false;

    function onAdv(ev) {
      // Alcuni device espongono name in ev.device.name o in ev.name (dipende dalla piattaforma)
      const n1 = ev.device?.name || '';
      const n2 = ev.name || '';
      const name = n1 || n2 || '';

      if (name === TARGET_NAME || name.startsWith(TARGET_PREFIX)) {
        found = true;
        navigator.bluetooth.removeEventListener('advertisementreceived', onAdv);
        try { scan.stop(); } catch {}
        unlockForm(`✅ Rilevato ${name}. Sei in aula.`);
        resolve(true);
      }
    }

    navigator.bluetooth.addEventListener('advertisementreceived', onAdv);

    // Timeout scan
    setTimeout(() => {
      if (!found) {
        navigator.bluetooth.removeEventListener('advertisementreceived', onAdv);
        try { scan.stop(); } catch {}
        resolve(false);
      }
    }, SCAN_TIMEOUT_MS);
  });
}

// === 2) Fallback: chooser filtrato SOLO IFind_* (nessun pairing richiesto) ===
async function tryChooserFiltered() {
  setStatus('🔎 Ricerca con chooser (seleziona il portachiavi IFind quando compare)…');

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: TARGET_NAME }, { namePrefix: TARGET_PREFIX }]
      // niente services: molti key-finder non espongono GATT standard
    });

    if (!device) {
      setStatus('❌ Nessun dispositivo selezionato.');
      return false;
    }

    const name = device.name || 'Sconosciuto';
    if (name === TARGET_NAME || name.startsWith(TARGET_PREFIX)) {
      unlockForm(`✅ Rilevato ${name}. Sei in aula.`);
      return true;
    } else {
      setStatus(`❌ Trovato "${name}", ma non è il portachiavi IFind.`);
      return false;
    }
  } catch (err) {
    setStatus('⚠️ Nessun dispositivo trovato o permesso negato nel chooser.');
    return false;
  }
}

// === Entrypoint: verifica prossimità ===
async function verifyBluetooth() {
  // Requisiti base
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome o Edge su Android/Windows/Chromebook.');
    return;
  }

  // Android: assicurati che a Chrome sia concessa la "Posizione"
  // iOS/Safari non supporta questa funzionalità

  // 1) Prova SCAN PASSIVO (meglio) — nessun pairing, nessuna scelta manuale
  const okPassive = await tryPassiveScan();
  if (okPassive) return;

  // 2) Se non disponibile o non trovato entro il timeout, passa al CHOOSER filtrato IFind_*
  const okChooser = await tryChooserFiltered();
  if (okChooser) return;

  setStatus('❌ Non ho rilevato il portachiavi. Riattivalo (modalità pairing), avvicinalo (≤2–3 m) e riprova.');
}

// === Invio → Google Sheets ===
async function submitPresence(e) {
  e.preventDefault();
  const btn = presenceForm.querySelector('button[type="submit"]');
  try {
    btn && (btn.disabled = true);
    if (!dataInput.value) dataInput.value = itNow();

    const params = new URLSearchParams(new FormData(presenceForm));
    await fetch(SHEET_WEBAPP_URL + '?' + params.toString(), { method: 'GET', mode: 'no-cors' });

    alert('Presenza registrata ✅');
    presenceForm.reset();
    formContainer.style.display = 'none';
    verifyBtn.style.display = 'inline-block';
    setStatus('Puoi chiudere la pagina.');
  } catch (err) {
    alert('❌ Errore nell’invio. Riprova.');
  } finally {
    btn && (btn.disabled = false);
  }
}

// === Eventi ===
verifyBtn?.addEventListener('click', verifyBluetooth);
presenceForm?.addEventListener('submit', submitPresence);
