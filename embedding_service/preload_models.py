import os
from sentence_transformers import SentenceTransformer
from transformers import CLIPProcessor, CLIPModel, pipeline

# 1. Set the Cache Directory
# This matches the ENV variable in the Dockerfile
cache_dir = "/app/model_cache"
os.environ["HF_HOME"] = cache_dir

print(f"--- 📥 Starting Model Download to {cache_dir} ---")

# ---------------------------------------------------------
# 1. Text Embedding Model (BGE-M3)
# ---------------------------------------------------------
print("... Downloading BGE-M3 (Text) ...")
text_model_id = "BAAI/bge-m3"
# This downloads the model structure and weights
SentenceTransformer(text_model_id, cache_folder=cache_dir)


# ---------------------------------------------------------
# 2. Vision Embedding Model (CLIP)
# ---------------------------------------------------------
print("... Downloading CLIP (Vision) ...")
clip_model_id = "laion/CLIP-ViT-B-32-laion2B-s34B-b79K"
# Download Processor (tokenizer/image config) and Model
CLIPProcessor.from_pretrained(clip_model_id, cache_dir=cache_dir)
CLIPModel.from_pretrained(clip_model_id, cache_dir=cache_dir)


# ---------------------------------------------------------
# 3. Intent Classification Model (Zero-Shot)
# ---------------------------------------------------------
print("... Downloading BART-Large-MNLI (Intent) ...")
intent_model_id = "facebook/bart-large-mnli"
# Initializing the pipeline triggers the download
pipeline(
    "zero-shot-classification", 
    model=intent_model_id, 
    model_kwargs={"cache_dir": cache_dir}
)

print("--- ✅ All Models Downloaded Successfully ---")