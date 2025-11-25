import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

# --- 1. CONFIGURAZIONE DEL MODELLO (Legge le variabili da Render) ---

# Legge le variabili d'ambiente impostate su Render
MODEL_ID = os.environ.get("MODEL_ID", "microsoft/Phi-3-mini-4k-instruct")
HF_TOKEN = os.environ.get("HF_TOKEN")

if not HF_TOKEN:
    # Se il token non è impostato, lancia un errore grave all'avvio
    raise ValueError("HF_TOKEN non è stato impostato. L'API non può connettersi a Hugging Face.")

# Utilizza la GPU se disponibile, altrimenti la CPU
device = 0 if torch.cuda.is_available() else -1

print(f"Loading Model: {MODEL_ID} on device: {'GPU' if device == 0 else 'CPU'}")

try:
    # Inizializza la pipeline di generazione di testo con Phi-3 Mini
    generator = pipeline(
        "text-generation", 
        model=MODEL_ID,
        token=HF_TOKEN,  # Utilizza il token per l'autenticazione
        device=device,
        # Aggiungere parametri specifici per Phi-3 (trust_remote_code=True può essere necessario)
    )
except Exception as e:
    print(f"ERRORE CRITICO: Impossibile caricare il modello. Controlla RAM/GPU. Dettaglio: {e}")
    raise HTTPException(status_code=500, detail="Model Loading Failed") from e


# --- 2. DEFINIZIONE DELL'API ---

app = FastAPI()

# Schema per i dati in input (richiesta di traduzione)
class TranslationRequest(BaseModel):
    text: str
    target_language: str

# Endpoint per la traduzione/assistenza alla scrittura
@app.post("/api/translate")
def translate_text(request: TranslationRequest):
    """Genera una traduzione o assiste la scrittura usando Phi-3 Mini."""
    
    # Costruisce il prompt specifico per Phi-3 Mini per la traduzione
    prompt = (
        f"<|user|>Traduci il seguente testo in {request.target_language} e mantieni lo stile originale: "
        f"'{request.text}'<|end|>\n<|assistant|>"
    )

    try:
        result = generator(
            prompt,
            max_new_tokens=256,
            do_sample=True,
            temperature=0.7,
            num_return_sequences=1
        )
        
        # Estrae il testo generato
        generated_text = result[0]['generated_text'].split('<|assistant|>')[-1].strip()

        return {"translation": generated_text}

    except Exception as e:
        # Gestisce eventuali errori durante l'inferenza
        print(f"Errore durante l'inferenza: {e}")
        raise HTTPException(status_code=500, detail="Errore durante la generazione del testo")

# Endpoint di salute
@app.get("/health")
def health_check():
    """Endpoint per verificare se il servizio è attivo."""
    return {"status": "ok", "model": MODEL_ID}

# --- FINE CODICE API ---
