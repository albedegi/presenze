// === CONFIG ===
const TARGET_NAME = 'IFind_216E'; // nome esatto del tuo portachiavi
const TARGET_NAME_PREFIX = 'IFind_'; // fallback: accetta qualunque IFind_*
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

// === Verifica Bluetooth (per nome / prefisso) ===
async function verifyBluetooth() {
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome/Edge su Android o PC.');
    return;
  }

  try {
    setStatus('🔍 Ricerca del dispositivo IFind in corso...');

    // Usiamo due filtri in OR: nome esatto e prefisso
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { name: TARGET_NAME },
        { namePrefix: TARGET_NAME_PREFIX }
      ]
      // Nota: niente services qui — i key-finder spesso non espongono un servizio GATT standard
    });

    if (!device) {
      setStatus('❌ Nessun dispositivo selezionato.');
      return;
    }

    const name = device.name || 'Sconosciuto';
    // Verifica forte sul nome esatto, con fallback sul prefisso
    const matchExact = name === TARGET_NAME;
    const matchPrefix = name.startsWith(TARGET_NAME_PREFIX);

    if (matchExact || matchPrefix) {
      setStatus(`✅ Rilevato ${name}. Sei in aula.`);
      verifyBtn.style.display = 'none';
      formContainer.style.display = 'block';
      dataInput.value = itNow();
    } else {
      setStatus(`❌ Trovato ${name}, ma non corrisponde al dispositivo IFind atteso.`);
    }
  } catch (err) {
    console.error('Errore scansione BLE:', err);
    setStatus('⚠️ Nessun dispositivo trovato o permesso negato. Attiva il portachiavi (modo pairing) e riprova.');
  }
}

// === Invio form → Google Sheets (Apps Script) ===
async function submitPresence(e) {
  e.preventDefault();
  const submitBtn = presenceForm.querySelector('button[type="submit"]');
  try {
    if (submitBtn) submitBtn.disabled = true;
    if (!dataInput.value) dataInput.value = itNow();

    const params = new URLSearchParams(new FormData(presenceForm));
    await fetch(SHEET_WEBAPP_URL + '?' + params.toString(), { method: 'GET', mode: 'no-cors' });

    alert('Presenza registrata ✅');
    presenceForm.reset();
    formContainer.style.display = 'none';
    verifyBtn.style.display = 'inline-block';
    setStatus('Puoi chiudere la pagina.');
  } catch (err) {
    console.error('Errore invio:', err);
    alert('❌ Errore nell’invio. Controlla la connessione e riprova.');
  } finally {
    const submitBtn2 = presenceForm.querySelector('button[type="submit"]');
    if (submitBtn2) submitBtn2.disabled = false;
  }
}

// === Eventi ===
verifyBtn?.addEventListener('click', verifyBluetooth);
presenceForm?.addEventListener('submit', submitPresence);
