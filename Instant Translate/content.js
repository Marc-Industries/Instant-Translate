// Content script semplificato per debug
console.log('AI Writer: Script caricato');

// Variabili globali
let settings = {
  targetLanguage: 'English',
  apiKey: '',
  apiProvider: 'gemini',
  hfModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1'
};

let currentInput = null;
let debounceTimer = null;
let lastProcessedText = '';
let isProcessing = false;

// Carica impostazioni
chrome.storage.sync.get(['targetLanguage', 'apiKey', 'apiProvider', 'hfModel'], function(result) {
  if (result.apiKey) {
    settings = {
      targetLanguage: result.targetLanguage || 'English',
      apiKey: result.apiKey,
      apiProvider: result.apiProvider || 'gemini',
      hfModel: result.hfModel || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    };
    console.log('AI Writer: Configurazione caricata', settings.apiProvider);
    init();
  } else {
    console.warn('AI Writer: Nessuna API key configurata');
  }
});

// Inizializza
function init() {
  document.addEventListener('focusin', function(e) {
    const el = e.target;
    if (el.tagName === 'TEXTAREA' || 
        (el.tagName === 'INPUT' && el.type === 'text') ||
        el.contentEditable === 'true') {
      currentInput = el;
      setupInput(el);
    }
  });
  
  console.log('AI Writer: Inizializzato');
}

// Setup input
function setupInput(el) {
  if (el.dataset.aiWriter) return;
  el.dataset.aiWriter = 'true';
  
  el.addEventListener('input', function(e) {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(function() {
      handleInput(e.target);
    }, 1000);
  });
}

// Gestisci input
function handleInput(el) {
  const text = el.value || el.textContent || '';
  const words = text.trim().split(/\s+/).filter(w => w);
  
  console.log('AI Writer: Input rilevato, parole:', words.length);
  
  if (words.length < 2) {
    console.log('AI Writer: Testo troppo corto');
    return;
  }
  
  if (text === lastProcessedText || isProcessing) {
    console.log('AI Writer: Già processato o in elaborazione');
    return;
  }
  
  lastProcessedText = text;
  processText(text, el);
}

// Processa testo
async function processText(text, el) {
  if (!settings.apiKey) {
    console.error('AI Writer: API key mancante');
    return;
  }
  
  isProcessing = true;
  console.log('AI Writer: Inizio elaborazione...');
  
  try {
    const suggestion = await callAPI(text);
    console.log('AI Writer: Suggerimento ricevuto:', suggestion);
    
    if (suggestion && suggestion.toLowerCase() !== text.toLowerCase()) {
      showBubble(suggestion, el);
    } else {
      showSuccess(el);
    }
  } catch (err) {
    console.error('AI Writer: Errore API', err);
    showError(el, err.message);
  } finally {
    isProcessing = false;
  }
}

// Chiama API
async function callAPI(text) {
  if (settings.apiProvider === 'gemini') {
    return await callGemini(text);
  } else {
    return await callHuggingFace(text);
  }
}

// Gemini
async function callGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${settings.apiKey}`;
  
  const body = {
    contents: [{ parts: [{ text: text }] }],
    systemInstruction: {
      parts: [{
        text: `Rewrite this text into perfect ${settings.targetLanguage}. If in another language, translate. If has errors, correct. If already perfect, return unchanged. Output ONLY the text, no explanations.`
      }]
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 150
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error('Gemini API error: ' + response.status);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

// Hugging Face
async function callHuggingFace(text) {
  const url = `https://api-inference.huggingface.co/models/${settings.hfModel}`;
  
  const prompt = `Rewrite into perfect ${settings.targetLanguage}: ${text}\n\nRewritten:`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.1,
        return_full_text: false
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('HuggingFace API error: ' + response.status);
  }
  
  const data = await response.json();
  let result = data[0]?.generated_text?.trim() || null;
  
  if (result) {
    result = result.replace(/^Rewritten:\s*/i, '').trim();
  }
  
  return result;
}

// Mostra bubble
function showBubble(text, el) {
  removeBubble();
  
  const rect = el.getBoundingClientRect();
  const bubble = document.createElement('div');
  bubble.id = 'ai-writer-bubble';
  
  bubble.style.cssText = `
    position: fixed;
    left: ${rect.left + 10}px;
    top: ${rect.bottom - 50}px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    background: #374151;
    border-radius: 9999px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    padding: 8px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  const textDiv = document.createElement('div');
  textDiv.textContent = text;
  textDiv.style.cssText = `
    padding: 0 12px;
    color: #f3f4f6;
    font-size: 14px;
    cursor: pointer;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  
  textDiv.onclick = function() {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = text;
    } else {
      el.textContent = text;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    removeBubble();
    showSuccess(el);
  };
  
  const closeBtn = document.createElement('div');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    padding: 0 8px;
    color: #9ca3af;
    cursor: pointer;
    font-size: 16px;
  `;
  closeBtn.onclick = removeBubble;
  
  bubble.appendChild(textDiv);
  bubble.appendChild(closeBtn);
  document.body.appendChild(bubble);
  
  console.log('AI Writer: Bubble mostrato');
}

// Rimuovi bubble
function removeBubble() {
  const bubble = document.getElementById('ai-writer-bubble');
  if (bubble) bubble.remove();
}

// Mostra successo
function showSuccess(el) {
  const rect = el.getBoundingClientRect();
  const msg = document.createElement('div');
  msg.textContent = '✓ Perfect!';
  msg.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width/2}px;
    top: ${rect.top - 35}px;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #059669;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-family: system-ui;
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

// Mostra errore
function showError(el, error) {
  const rect = el.getBoundingClientRect();
  const msg = document.createElement('div');
  msg.textContent = '⚠ ' + error;
  msg.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width/2}px;
    top: ${rect.top - 35}px;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #dc2626;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-family: system-ui;
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// Aggiorna settings
chrome.storage.onChanged.addListener(function(changes) {
  if (changes.apiKey) settings.apiKey = changes.apiKey.newValue;
  if (changes.targetLanguage) settings.targetLanguage = changes.targetLanguage.newValue;
  if (changes.apiProvider) settings.apiProvider = changes.apiProvider.newValue;
  if (changes.hfModel) settings.hfModel = changes.hfModel.newValue;
  console.log('AI Writer: Settings aggiornati');
});