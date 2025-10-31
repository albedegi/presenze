// === CONFIGURAZIONE ===
// Nome del tuo beacon (impostato in Beacon Simulator)
const TARGET_NAME = 'BeaconProf';

// URL della tua Web App Apps Script (pubblicata come "chiunque con il link")
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec';

// === ELEMENTI UI ===
const verifyBtn = document.getElementById('verifyBtn');
const statusEl = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const presenceForm = document.getElementById('presenceForm');
const dataInput = document.getElementById('data');

// === FUNZIONI DI SUPPORTO ===
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function itNow() {
  try {
    return new Date().toLocaleString('it-IT');
  } catch {
    return new Date().toISOString();
  }
}

// === VERIFICA BLUETOOTH ===
async function verifyBluetooth() {
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome/Edge su Android o PC.');
    return;
  }

  try {
    setStatus('🔍 Ricerca beacon del docente in corso...');
    // Usiamo una ricerca più permissiva: accetta tutti i dispositivi ma filtra per nome
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    });

    if (!device) {
      setStatus('❌ Nessun dispositivo selezionato.');
      return;
    }

    // Mostra il nome rilevato (anche "N/A" se non trasmesso)
    const foundName = device.name || 'Sconosciuto';
    console.log('Dispositivo trovato:', foundName);

    if (foundName.includes(TARGET_NAME)) {
      setStatus(`✅ Beacon rilevato (${foundName})! Sei in aula.`);
      if (verifyBtn) verifyBtn.style.display = 'none';
      if (formContainer) formContainer.style.display = 'block';
      if (dataInput) dataInput.value = itNow();
    } else {
      setStatus(`❌ Trovato ${foundName}, ma non corrisponde al beacon del docente.`);
    }
  } catch (err) {
    console.error('Errore scansione BLE:', err);
    setStatus('⚠️ Nessun beacon trovato o permesso negato. Verifica Bluetooth, vicinanza e riprova.');
  }
}

// === INVIO FORM → GOOGLE SHEETS (Apps Script) ===
async function submitPresence(e) {
  e.preventDefault();
  const submitBtn = presenceForm.querySelector('button[type="submit"]');
  try {
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(presenceForm);
    if (dataInput && !dataInput.value) dataInput.value = itNow();

    const params = new URLSearchParams(formData);
    const url = SHEET_WEBAPP_URL + '?' + params.toString();

    await fetch(url, { method: 'GET', mode: 'no-cors' });

    alert('Presenza registrata ✅');
    presenceForm.reset();
    if (formContainer) formContainer.style.display = 'none';
    if (verifyBtn) verifyBtn.style.display = 'inline-block';
    setStatus('Puoi chiudere la pagina.');
  } catch (err) {
    console.error('Errore invio:', err);
    alert('❌ Errore nell’invio. Controlla la connessione e riprova.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// === EVENT LISTENERS ===
if (verifyBtn) verifyBtn.addEventListener('click', verifyBluetooth);
if (presenceForm) presenceForm.addEventListener('submit', submitPresence);
