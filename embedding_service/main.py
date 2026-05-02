import os
import requests
import torch
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
from transformers import CLIPProcessor, CLIPModel, pipeline
from sentence_transformers import SentenceTransformer

# --- SETUP ---
app = FastAPI(title="Nexus Embedding Microservice")

# Force HuggingFace to look at our preloaded cache
os.environ["HF_HOME"] = "/app/model_cache"

# Hardware Acceleration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 Embedding Service starting on device: {DEVICE}")

# Model IDs (Must match preload_models.py)
TEXT_MODEL_ID = "BAAI/bge-m3"
CLIP_MODEL_ID = "laion/CLIP-ViT-B-32-laion2B-s34B-b79K"
INTENT_MODEL_ID = "facebook/bart-large-mnli"

# --- GLOBAL MODEL STORAGE ---
text_model = None       # BGE-M3
clip_model = None       # CLIP (Model)
clip_processor = None   # CLIP (Processor)
intent_pipeline = None  # Zero-Shot Classifier

@app.on_event("startup")
async def load_models():
    global text_model, clip_model, clip_processor, intent_pipeline
    
    # 1. Load Text Embedding Model
    print("⏳ Loading BGE-M3 (Text)...")
    try:
        text_model = SentenceTransformer(TEXT_MODEL_ID, device=DEVICE, cache_folder=os.getenv("HF_HOME"))
        print("✅ BGE-M3 Ready.")
    except Exception as e:
        print(f"❌ Failed to load Text Model: {e}")

    # 2. Load Vision Model (CLIP)
    print("⏳ Loading CLIP (Vision)...")
    try:
        clip_model = CLIPModel.from_pretrained(CLIP_MODEL_ID, cache_dir=os.getenv("HF_HOME")).to(DEVICE)
        clip_processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID, cache_dir=os.getenv("HF_HOME"))
        print("✅ CLIP Ready.")
    except Exception as e:
        print(f"❌ Failed to load CLIP: {e}")

    # 3. Load Intent Classification Model
    print("⏳ Loading Zero-Shot Classifier (Intent)...")
    try:
        # Pipeline handles device automatically if we pass the integer (-1 for cpu, 0 for cuda:0)
        device_id = 0 if DEVICE == "cuda" else -1
        intent_pipeline = pipeline(
            "zero-shot-classification", 
            model=INTENT_MODEL_ID, 
            device=device_id,
            model_kwargs={"cache_dir": os.getenv("HF_HOME")}
        )
        print("✅ Intent Classifier Ready.")
    except Exception as e:
        print(f"❌ Failed to load Intent Model: {e}")

# --- SCHEMAS ---

class TextRequest(BaseModel):
    text: str

class ImageRequest(BaseModel):
    image_url: str

class IntentRequest(BaseModel):
    query: str
    labels: List[str]

class VectorResponse(BaseModel):
    embedding: List[float]

# --- ENDPOINTS ---

@app.get("/health")
def health_check():
    return {
        "status": "active", 
        "device": DEVICE, 
        "models_loaded": {
            "text_embedding": text_model is not None,
            "clip_vision": clip_model is not None,
            "intent_classifier": intent_pipeline is not None
        }
    }

# 1. Standard Text Embedding (Semantic Search)
@app.post("/embed/text", response_model=VectorResponse)
async def embed_text(req: TextRequest):
    """Generates 1024-dim vector using BGE-M3."""
    if not text_model:
        raise HTTPException(status_code=503, detail="Text model not loaded")
    
    if not req.text or not req.text.strip():
        return {"embedding": [0.0] * 1024}

    try:
        embedding = text_model.encode(req.text)
        return {"embedding": embedding.tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. CLIP Image Embedding (Visual Search)
@app.post("/embed/image", response_model=VectorResponse)
async def embed_image(req: ImageRequest):
    """Generates 512-dim vector from Image URL using CLIP."""
    if not clip_model:
        raise HTTPException(status_code=503, detail="CLIP model not loaded")

    try:
        response = requests.get(req.image_url, stream=True, timeout=5)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))

        inputs = clip_processor(images=image, return_tensors="pt").to(DEVICE)
        
        with torch.no_grad():
            outputs = clip_model.get_image_features(**inputs)

        # Normalize
        outputs = outputs / outputs.norm(p=2, dim=-1, keepdim=True)
        return {"embedding": outputs.squeeze().tolist()}
    
    except Exception as e:
        print(f"Image embed error: {e}")
        return {"embedding": [0.0] * 512}

# 3. CLIP Text Embedding (Text-to-Image Search)
@app.post("/embed/clip_text", response_model=VectorResponse)
async def embed_clip_text(req: TextRequest):
    """Generates 512-dim vector from Text using CLIP (for visual matching)."""
    if not clip_model:
        raise HTTPException(status_code=503, detail="CLIP model not loaded")
    
    try:
        inputs = clip_processor(text=[req.text], return_tensors="pt", padding=True).to(DEVICE)
        
        with torch.no_grad():
            outputs = clip_model.get_text_features(**inputs)
            
        # Normalize
        outputs = outputs / outputs.norm(p=2, dim=-1, keepdim=True)
        return {"embedding": outputs.squeeze().tolist()}
        
    except Exception as e:
        print(f"CLIP Text embed error: {e}")
        return {"embedding": [0.0] * 512}

# 4. Intent Classification
@app.post("/predict/intent")
async def predict_intent(req: IntentRequest):
    """Classifies query into supplied labels."""
    if not intent_pipeline:
        raise HTTPException(status_code=503, detail="Intent model not loaded")
    
    try:
        # Returns dict: {'sequence': str, 'labels': List[str], 'scores': List[float]}
        result = intent_pipeline(req.query, req.labels)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))