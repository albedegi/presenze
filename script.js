const TARGET_NAME = "BeaconProf"; // nome Bluetooth del docente
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzF2rMdgE5fRBPSJMZ_yxNP1Nz3sVL_Jxm-rTCltoveXs_JlCxb9E7YH1rW4fCf-CAg/exec"; // URL Apps Script

document.getElementById("verifyBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  try {
    status.textContent = "🔍 Ricerca dispositivi Bluetooth vicini...";
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });

    if (device.name && device.name.includes(TARGET_NAME)) {
      status.textContent = "✅ Dispositivo rilevato! Sei in aula.";
      document.getElementById("verifyBtn").style.display = "none";
      document.getElementById("formContainer").style.display = "block";
      document.getElementById("data").value = new Date().toLocaleString("it-IT");
    } else {
      status.textContent = "❌ Non è stato trovato il dispositivo del docente.";
    }
  } catch (error) {
    status.textContent = "⚠️ Autorizzazione negata o nessun dispositivo trovato.";
  }
});

// invio dati al Google Sheet
document.getElementById("presenceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const params = new URLSearchParams(formData);
  try {
    await fetch(SHEET_WEBAPP_URL + "?" + params.toString());
    alert("Presenza registrata ✅");
    e.target.reset();
    document.getElementById("formContainer").style.display = "none";
  } catch (err) {
    alert("Errore nell'invio. Riprova.");
  }
});
