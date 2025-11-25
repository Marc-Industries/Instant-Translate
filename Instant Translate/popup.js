// Popup script per gestire le impostazioni
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');
  const apiProviderSelect = document.getElementById('apiProvider');
  const apiKeyInput = document.getElementById('apiKey');
  const hfApiKeyInput = document.getElementById('hfApiKey');
  const hfModelSelect = document.getElementById('hfModel');
  const languageSelect = document.getElementById('targetLanguage');
  const status = document.getElementById('status');
  
  const geminiKeyGroup = document.getElementById('geminiKeyGroup');
  const hfKeyGroup = document.getElementById('hfKeyGroup');
  const hfModelGroup = document.getElementById('hfModelGroup');

  // Carica le impostazioni salvate
  chrome.storage.sync.get(['apiKey', 'hfApiKey', 'targetLanguage', 'apiProvider', 'hfModel'], (result) => {
    if (result.apiProvider) {
      apiProviderSelect.value = result.apiProvider;
      toggleProviderFields(result.apiProvider);
    }
    
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    
    if (result.hfApiKey) {
      hfApiKeyInput.value = result.hfApiKey;
    }
    
    if (result.targetLanguage) {
      languageSelect.value = result.targetLanguage;
    }
    
    if (result.hfModel) {
      hfModelSelect.value = result.hfModel;
    }
  });

  // Gestisci il cambio di provider
  apiProviderSelect.addEventListener('change', (e) => {
    toggleProviderFields(e.target.value);
  });

  function toggleProviderFields(provider) {
    if (provider === 'huggingface') {
      geminiKeyGroup.style.display = 'none';
      hfKeyGroup.style.display = 'block';
      hfModelGroup.style.display = 'block';
    } else {
      geminiKeyGroup.style.display = 'block';
      hfKeyGroup.style.display = 'none';
      hfModelGroup.style.display = 'none';
    }
  }

  // Gestisci il salvataggio
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const apiProvider = apiProviderSelect.value;
    const targetLanguage = languageSelect.value;
    
    let apiKey = '';
    
    if (apiProvider === 'gemini') {
      apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        showStatus('Please enter a Gemini API key', 'error');
        return;
      }
    } else {
      apiKey = hfApiKeyInput.value.trim();
      if (!apiKey) {
        showStatus('Please enter a Hugging Face API key', 'error');
        return;
      }
    }

    const hfModel = hfModelSelect.value;

    // Salva le impostazioni
    chrome.storage.sync.set({
      apiKey: apiKey,
      hfApiKey: apiProvider === 'huggingface' ? apiKey : hfApiKeyInput.value.trim(),
      targetLanguage: targetLanguage,
      apiProvider: apiProvider,
      hfModel: hfModel
    }, () => {
      showStatus('Settings saved successfully!', 'success');
      
      // Ricarica tutte le tab per applicare le nuove impostazioni
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url && !tab.url.startsWith('chrome://')) {
            chrome.tabs.reload(tab.id);
          }
        });
      });
    });
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
});