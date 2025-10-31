// === CONFIGURAZIONE EDDYSTONE-UID ===
const EDDYSTONE_UUID = 0xFEAA;

// Incolla qui i valori come li vedi nell'app (con o senza "0x", con spazi, ecc.)
const NAMESPACE_HEX = '535597e035114f974185';      // es: '0x53 0x55 0x97 ...' OK
const INSTANCE_HEX  = '200219821234';              // es: '0x20 0x02 0x19 0x82 0x12 0x34' OK

// URL della tua Web App Apps Script
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

/**
 * Converte stringhe hex molto flessibili in Uint8Array.
 * Accetta:
 *  - "535597e0..." (tutto attaccato)
 *  - "53 55 97 e0 ..." (con spazi)
 *  - "0x53 0x55 ..." (con prefisso 0x per ogni byte)
 *  - misto maiuscole/minuscole
 * Se expectedBytes è impostato, valida la lunghezza.
 */
function parseHexFlexible(input, expectedBytes = null) {
  if (!input || typeof input !== 'string') throw new Error('Valore hex mancante');
  // 1) prova formato compatto puro (solo [0-9a-f])
  const compact = input.replace(/[^0-9a-fA-F]/g, '');
  const isEven = compact.length % 2 === 0 && compact.length > 0;

  let bytes = [];
  if (isEven && (expectedBytes === null || compact.length === expectedBytes * 2)) {
    for (let i = 0; i < compact.length; i += 2) {
      bytes.push(parseInt(compact.slice(i, i + 2), 16));
    }
  } else {
    // 2) estrai tutte le coppie hex (gestisce "0x.." e spazi)
    const pairs = [...input.matchAll(/(?:0x)?([0-9a-fA-F]{2})/g)].map(m => m[1]);
    bytes = pairs.map(p => parseInt(p, 16));
  }

  if (expectedBytes !== null && bytes.length !== expectedBytes) {
    throw new Error(`Lunghezza errata: attesi ${expectedBytes} byte, trovati ${bytes.length}`);
  }
  return new Uint8Array(bytes);
}

// Costruisce il filtro per Eddystone-UID (Namespace obbligatorio, Instance opzionale)
// Frame: 0x00 (UID), 1B TxPower (variabile), 10B Namespace, 6B Instance, 2B RFU
function buildEddystoneUidFilter(namespaceStr, instanceStr) {
  const ns = parseHexFlexible(namespaceStr, 10);
  const inst = (instanceStr && instanceStr.trim().length) ? parseHexFlexible(instanceStr, 6) : null;

  const len = 1 + 1 + 10 + (inst ? 6 : 0);
  const dataPrefix = new Uint8Array(len);
  const mask       = new Uint8Array(len);

  // Frame type
  dataPrefix[0] = 0x00;   // UID frame
  mask[0]       = 0xFF;   // confronta

  // TxPower (variabile): non confrontare
  dataPrefix[1] = 0x00;
  mask[1]       = 0x00;

  // Namespace
  dataPrefix.set(ns, 2);
  mask.set(new Uint8Array(10).fill(0xFF), 2);

  // Instance (se presente)
  if (inst) {
    dataPrefix.set(inst, 12);
    mask.set(new Uint8Array(6).fill(0xFF), 12);
  }

  // Debug (facoltativo)
  // console.log('dataPrefix', Array.from(dataPrefix).map(b=>b.toString(16).padStart(2,'0')).join(' '));
  // console.log('mask      ', Array.from(mask).map(b=>b.toString(16).padStart(2,'0')).join(' '));
  return { dataPrefix, mask };
}

// === VERIFICA BLUETOOTH ===
async function verifyBluetooth() {
  if (!('bluetooth' in navigator)) {
    setStatus('⚠️ Browser non supporta Web Bluetooth. Usa Chrome/Edge su Android o PC.');
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

    setStatus('✅ Beacon Eddystone corrispondente rilevato! Sei in aula.');
    verifyBtn.style.display = 'none';
    formContainer.style.display = 'block';
    dataInput.value = itNow();

  } catch (err) {
    console.error('Errore scansione Eddystone:', err);
    setStatus('⚠️ Nessun beacon trovato o permesso negato. Controlla Namespace/Instance e che il frame sia Eddystone-UID.');
  }
}

// === INVIO FORM → GOOGLE SHEETS ===
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

// === EVENTI ===
verifyBtn?.addEventListener('click', verifyBluetooth);
presenceForm?.addEventListener('submit', submitPresence);
