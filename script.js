// === CONFIGURAZIONE EDDYSTONE-UID ===
// UUID servizio Eddystone
const EDDYSTONE_UUID = 0xFEAA;

// Namespace (10 byte / 20 hex) e Instance (6 byte / 12 hex)
const NAMESPACE_HEX = '535597e035114f974185';   // tuo namespace
const INSTANCE_HEX  = '200219821234';           // tua instance

// URL della tua Web App Apps Script (già pubblicata come "chiunque con il link")
const SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec';

// === ELEMENTI UI ===
const verifyBtn = document.getElementById('verifyBtn');
const statusEl = document.getElementById('status');
const formContainer = document.getElementById('formContainer');
const presenceForm = document.getElementById('presenceForm');
const dataInput = document.getElementById('data');

// === UTILS ===
const setStatus = (m) => { if (statusEl) statusEl.textContent = m; };
const itNow = () => { try { return new Date().toLocaleString('it-IT'); } catch { return new Date().toISOString(); } };

function hexToBytes(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) throw new Error('Hex non valido');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

// Costruisce il filtro per Eddystone-UID (namespace + instance)
function buildEddystoneUidFilter(namespaceHex, instanceHex) {
  const ns = hexToBytes(namespaceHex);
  if (ns.length !== 10) throw new Error('Namespace deve essere 10 bytes (20 hex).');

  let inst = null;
  if (instanceHex && instanceHex.trim().length > 0) {
    inst = hexToBytes(instanceHex);
    if (inst.length !== 6) throw new Error('Instance deve essere 6 bytes (12 hex).');
  }

  // Frame type (0x00), TX Power (1 byte variabile), Namespace (10B), Instance (6B)
  const len = 1 + 1 + 10 + (inst ? 6 : 0);
  const dataPrefix = new Uint8Array(len);
  const mask       = new Uint8Array(len);

  dataPrefix[0] = 0x00; // Frame Type UID
  mask[0]       = 0xFF;

  dataPrefix[1] = 0x00; // Tx Power placeholder
  mask[1]       = 0x00; // ignorato

  dataPrefix.set(ns, 2);
  mask.set(new Uint8Array(10).fill(0xFF), 2);

  if (inst) {
    dataPrefix.set(inst, 12);
    mask.set(new Uint8Array(6).fill(0xFF), 12);
  }

  return { dataPrefix, mask };
}

// === VERIFICA BLUETOOTH ===
async function verifyBluetooth() {
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Il tuo browser non supporta Web Bluetooth. Usa Chrome/Edge su Android o PC.');
    return;
  }

  try {
    setStatus('🔍 Ricerca del beacon Eddystone del docente...');
    const { dataPrefix, mask } = buildEddystoneUidFilter(NAMESPACE_HEX, INSTANCE_HEX);

    const device = await navigator.bluetooth.requestDevice({
      filters: [{
        serviceData: [{
          service: EDDYSTONE_UUID,
          dataPrefix,
          mask
        }]
      }]
    });

    if (!device) {
      setStatus('❌ Nessun dispositivo selezionato.');
      return;
    }

    setStatus('✅ Beacon Eddystone corretto rilevato! Sei in aula.');
    verifyBtn.style.display = 'none';
    formContainer.style.display = 'block';
    dataInput.value = itNow();

  } catch (err) {
    console.error('Errore scansione Eddystone:', err);
    setStatus('⚠️ Nessun beacon corrispondente trovato o permesso negato. Controlla namespace/instance e riprova.');
  }
}

// === INVIO FORM → GOOGLE SHEETS ===
async function submitPresence(e) {
  e.preventDefault();
  const submitBtn = presenceForm.querySelector('button[type="submit"]');
  try {
    if (submitBtn) submitBtn.disabled = true;
    if (dataInput && !dataInput.value) dataInput.value = itNow();

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
    if (submitBtn) submitBtn.disabled = false;
  }
}

// === EVENTI ===
verifyBtn?.addEventListener('click', verifyBluetooth);
presenceForm?.addEventListener('submit', submitPresence);
