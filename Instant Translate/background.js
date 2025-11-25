// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Writer extension installed');
  
  // Imposta valori predefiniti
  chrome.storage.sync.get(['targetLanguage', 'apiProvider', 'hfModel'], (result) => {
    const defaults = {};
    
    if (!result.targetLanguage) {
      defaults.targetLanguage = 'English';
    }
    
    if (!result.apiProvider) {
      defaults.apiProvider = 'gemini';
    }
    
    if (!result.hfModel) {
      defaults.hfModel = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    }
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});

// Gestisci messaggi dal content script se necessario
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSuggestion') {
    // Qui potresti gestire le richieste API in modo centralizzato
    // se preferisci non farle direttamente dal content script
  }
  return true;
});