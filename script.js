// === CONFIGURAZIONE ===
// UUID del servizio BLE che trasmetti dal tuo telefono con l'app "Beacon Simulator" (o simili).
// Sostituisci con l'UUID esatto che hai impostato nel beacon!
const TARGET_UUID = '12345678-90AB-CDEF-1234-567890ABCDEF';

// URL della tua Web App Apps Script (già pubblicata)
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec';

// === ELEMENTI UI ===
const verifyBtn = document.getElementById('verifyBtn');
const statusEl = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const presenceForm = document.getElementById('presenceForm');
const dataInput = document.getElementById('data');

// === UTIL ===
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
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome/Edge su Android, Windows o Chromebook.');
    return;
  }

  try {
    setStatus('🔍 Ricerca del beacon del docente in corso...');
    // Filtra direttamente per il servizio/UUID del tuo beacon
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [TARGET_UUID] }]
    });

    if (!device) {
      setStatus('❌ Nessun dispositivo selezionato.');
      return;
    }

    // Se arriviamo qui, il dispositivo con il servizio TARGET_UUID è stato trovato
    setStatus('✅ Beacon rilevato! Sei in aula.');
    if (verifyBtn) verifyBtn.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';
    if (dataInput) dataInput.value = itNow();

  } catch (err) {
    // Possibili cause: permesso negato, beacon non in trasmissione, UUID errato
    setStatus('⚠️ Nessun beacon trovato o permesso negato. Verifica Bluetooth, vicinanza e riprova.');
    // console.error(err);
  }
}

// === INVIO FORM → GOOGLE SHEETS (Apps Script) ===
async function submitPresence(e) {
  e.preventDefault();
  const submitBtn = presenceForm.querySelector('button[type="submit"]');
  try {
    if (submitBtn) submitBtn.disabled = true;

    // Prepara i parametri (GET -> doGet in Apps Script)
    const formData = new FormData(presenceForm);
    // Assicura timestamp locale anche se l'utente modifica la data
    if (dataInput && !dataInput.value) dataInput.value = itNow();

    const params = new URLSearchParams(formData);
    const url = SHEET_WEBAPP_URL + '?' + params.toString();

    const res = await fetch(url, { method: 'GET', mode: 'no-cors' });
    // mode: 'no-cors' non permette di leggere la risposta, ma l'Apps Script riceve i dati

    alert('Presenza registrata ✅');
    presenceForm.reset();
    if (formContainer) formContainer.style.display = 'none';
    if (verifyBtn) verifyBtn.style.display = 'inline-block';
    setStatus('Puoi chiudere la pagina.');

  } catch (err) {
    alert('❌ Errore nell’invio. Controlla la connessione e riprova.');
    // console.error(err);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// === BIND EVENTI ===
if (verifyBtn) verifyBtn.addEventListener('click', verifyBluetooth);
if (presenceForm) presenceForm.addEventListener('submit', submitPresence);
