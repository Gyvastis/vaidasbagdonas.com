// owner must set PIXEL_ID before launch, see paslaugos/data/ads/SETUP.md
const PIXEL_ID = ''; // Meta Pixel ID; empty = no banner, no tracking
const MAILTO = 'info@vaidasbagdonas.com';
const ENDPOINT = '/api/lead';

const CONSENT_KEY = 'vb-consent';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

const readStorage = (storage, key) => { try { return storage.getItem(key); } catch { return null; } };
const writeStorage = (storage, key, value) => { try { storage.setItem(key, value); } catch { /* private mode */ } };

function captureUtm() {
  const params = new URLSearchParams(location.search);
  const stored = JSON.parse(readStorage(sessionStorage, 'vb-utm') || '{}');
  UTM_KEYS.forEach(key => { if (params.get(key)) stored[key] = params.get(key).slice(0, 200); });
  writeStorage(sessionStorage, 'vb-utm', JSON.stringify(stored));
  const form = document.getElementById('lead-form');
  UTM_KEYS.forEach(key => { form.elements[key].value = stored[key] || ''; });
}

function loadPixel() {
  if (!PIXEL_ID || window.fbq) return;
  const fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
}

function setupConsent() {
  if (!PIXEL_ID) return;
  const choice = readStorage(localStorage, CONSENT_KEY);
  if (choice === 'granted') return loadPixel();
  if (choice === 'denied') return;
  const banner = document.getElementById('consent');
  banner.hidden = false;
  banner.addEventListener('click', event => {
    const value = event.target.dataset.consent;
    if (!value) return;
    writeStorage(localStorage, CONSENT_KEY, value);
    banner.hidden = true;
    if (value === 'granted') loadPixel();
  });
}

function trackLead() {
  if (window.fbq && readStorage(localStorage, CONSENT_KEY) === 'granted') window.fbq('track', 'Lead');
}

function mailtoFallback(data) {
  const body = [`Vardas: ${data.name}`, `Kontaktas: ${data.contact}`, `Dabartinė svetainė: ${data.website || '-'}`, `Ko reikia: ${data.need}`, `Žinutė: ${data.message}`].join('\n');
  location.href = `mailto:${MAILTO}?subject=${encodeURIComponent('Svetainės užklausa')}&body=${encodeURIComponent(body)}`;
}

const setStatus = (text, isError = false) => {
  const status = document.getElementById('form-status');
  status.textContent = text;
  status.classList.toggle('error', isError);
};

async function submitLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type=submit]');
  const data = Object.fromEntries(new FormData(form));
  data.consent = form.elements.consent.checked;
  if (data.botcheck) return;
  if (!data.consent) { setStatus('Pažymėkite sutikimą dėl duomenų panaudojimo.', true); return; }

  button.disabled = true;
  setStatus('Siunčiama…');
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 400 && result.error) { setStatus('Patikrinkite laukus: reikia vardo, telefono ar el. pašto, žinutės ir sutikimo.', true); return; }
    if (!response.ok || !result.ok) throw new Error(response.status);
    trackLead();
    form.reset();
    captureUtm();
    setStatus('Ačiū, užklausa gauta! Atsakysiu per 24 val. (paprastai greičiau).');
  } catch {
    setStatus('Nepavyko išsiųsti. Atidaromas el. laiškas.', true);
    mailtoFallback(data);
  } finally {
    button.disabled = false;
  }
}

captureUtm();
setupConsent();
document.getElementById('lead-form').addEventListener('submit', submitLead);
