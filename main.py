# main.py - FINAL, COMPLETE, AND VERIFIED (v2.5 with Better Prompts)

import os
import time
import io
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline, SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan, AutoProcessor, MusicgenForConditionalGeneration
from datasets import load_dataset
from dotenv import load_dotenv
import nltk
from pydub import AudioSegment
import re
import requests
import google.generativeai as genai

# --- FFMPEG FIX ---
if os.name == 'nt':
    try:
        ffmpeg_path = "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"
        if not os.path.exists(ffmpeg_path):
             print(f"--- WARNING: FFMPEG not found at default path. Audio processing might fail. ---")
        AudioSegment.converter = ffmpeg_path
        AudioSegment.ffprobe = "C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe"
    except Exception as e:
        print(f"--- FFMPEG setup warning: {e} ---")

# --- NLTK Setup ---
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

print(f"--- [{time.ctime()}] --- Starting Manas AI Backend (GEMINI-POWERED) ---")

# --- Setup and Configuration ---
load_dotenv()
app = FastAPI()
device = "cuda" if torch.cuda.is_available() else "cpu"

# --- Gemini Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_model = None
if not GEMINI_API_KEY:
    print("\n" + "="*80 + "\nFATAL ERROR: GEMINI_API_KEY not found in .env file.\n" + "="*80 + "\n")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        print(f"--- [{time.ctime()}] --- Gemini API Key loaded and model configured successfully. ---")
    except Exception as e:
        print(f"--- FATAL ERROR configuring Gemini: {e} ---")

print(f"--- [{time.ctime()}] --- FastAPI app instance created. Using device: {device} ---")

# --- CORS Middleware ---
origins = ["*"] 
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
print(f"--- [{time.ctime()}] --- CORS middleware configured to allow all origins. ---")

# --- AI Model Loading (Local models) ---
stt_pipeline = None
tts_processor, tts_model, tts_vocoder, speaker_embeddings = None, None, None, None
audio_gen_processor, audio_gen_model = None, None
try:
    print(f"\n--- [{time.ctime()}] --- Loading local models (Speech, Audio)... ---")
    tts_processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
    tts_model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts").to(device)
    tts_vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan").to(device)
    try:
        speaker_embeddings = load_dataset("Matthijs/cmu-arctic-xvectors-slt", split="validation")[7306]["xvector"].unsqueeze(0).to(device)
    except Exception:
        print("--- WARNING: Could not load preferred speaker embeddings. Falling back to generic. ---")
        speaker_embeddings = torch.randn((1, 512)).to(device)
    print(f"--- [{time.ctime()}] --- TTS models LOADED successfully. ---\n")
    stt_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-base", device=0 if device == 'cuda' else -1)
    print(f"--- [{time.ctime()}] --- STT model LOADED successfully. ---\n")
    audio_gen_processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    audio_gen_model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small").to(device)
    print(f"--- [{time.ctime()}] --- Audio Generation model LOADED successfully. ---\n")
except Exception as e:
    print(f"--- FATAL ERROR loading local Hugging Face models: {e} ---")

# --- API Data Models ---
class TextRequest(BaseModel): text: str
class PoemRequest(BaseModel): prompt: str
class ChatRequest(BaseModel): history: list[dict]
class GoalRequest(BaseModel): goal: str
class RiddleRequest(BaseModel): question: str
class SoundscapeRequest(BaseModel): word: str
class SafeZoneRequest(BaseModel): latitude: float; longitude: float
class DetoxRequest(BaseModel): name: str; duration: str
class MeditationRequest(BaseModel): topic: str; duration: str

# --- API Endpoints ---
@app.post("/api/generate-soundscape")
async def generate_soundscape(request: SoundscapeRequest):
    if not gemini_model or not audio_gen_model: raise HTTPException(status_code=500, detail="A required AI model is not loaded.")
    try:
        prompt_for_prompt = f"""
        A user wants a soundscape for the word '{request.word}'. 
        Write a short, vivid, and descriptive prompt for an audio generation AI. 
        The prompt should describe a soothing, ambient, melodic, and pleasant soundscape. 
        Focus on calming, gentle, and harmonious sounds. Avoid harsh, sudden, or dissonant noises.
        For example: "A gentle, calming synth pad with soft, echoing piano notes."
        """
        response = gemini_model.generate_content(prompt_for_prompt)
        audio_prompt = response.text.strip()
        
        inputs = audio_gen_processor(text=[audio_prompt], padding=True, return_tensors="pt").to(device)
        audio_values = audio_gen_model.generate(**inputs, max_new_tokens=768)
        
        sampling_rate = audio_gen_model.config.audio_encoder.sampling_rate
        buffer = io.BytesIO()
        sf.write(buffer, audio_values.cpu().numpy().squeeze(), samplerate=sampling_rate, format='WAV')
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e:
        print(f"--- Soundscape Generation Error: {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-poem")
async def generate_poem(request: PoemRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        response = gemini_model.generate_content(request.prompt)
        return {"poem": response.text}
    except Exception as e:
        print(f"--- Gemini API Error (Poem): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        valid_history = [msg for msg in request.history if 'parts' in msg and msg['parts']]
        chat = gemini_model.start_chat(history=valid_history[:-1])
        response = chat.send_message(valid_history[-1]['parts'][0]['text'])
        return {"text": response.text}
    except Exception as e:
        print(f"--- Gemini API Error (Chat): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coach-goal")
async def coach_goal(request: GoalRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        prompt = f'You are Manas, an AI Goal Coach. Turn the user\'s goal: "{request.goal}" into a supportive 3-step S.M.A.R.T. action plan. For each step, provide a clear title and an encouraging explanation. Be motivating.'
        response = gemini_model.generate_content(prompt)
        return {"plan": response.text}
    except Exception as e:
        print(f"--- Gemini API Error (Goal): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/get-wisdom-riddle")
async def get_wisdom_riddle(request: RiddleRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        prompt = f'You are a mystical Wisdom Stone. A user asked: "{request.question}". Respond with a short, cryptic, one or two-sentence riddle. Do not use quotation marks.'
        response = gemini_model.generate_content(prompt)
        return {"riddle": response.text.strip()}
    except Exception as e:
        print(f"--- Gemini API Error (Riddle): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-meditation")
async def generate_meditation(request: MeditationRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        prompt = f'You are a calm meditation guide. Write a script on "{request.topic}" for a {request.duration} duration, using [PAUSE] markers for pauses. Be soothing and gentle.'
        response = gemini_model.generate_content(prompt)
        return {"script": response.text}
    except Exception as e:
        print(f"--- Gemini API Error (Meditation): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-detox-pledge")
async def generate_detox_pledge(request: DetoxRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        prompt = f"Create a short, empowering pledge for a user named '{request.name}' starting a '{request.duration}' digital detox. Single sentence."
        response = gemini_model.generate_content(prompt)
        return {"pledge": response.text.strip().replace('"', '')}
    except Exception as e:
        print(f"--- Gemini API Error (Pledge): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/generate-detox-completion")
async def generate_detox_completion():
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not configured.")
    try:
        prompt = "Write a short, congratulatory message for a user who completed a digital detox."
        response = gemini_model.generate_content(prompt)
        return {"message": response.text.strip().replace('"', '')}
    except Exception as e:
        print(f"--- Gemini API Error (Detox Completion): {e} ---")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/safe-zones")
async def get_safe_zones(request: SafeZoneRequest):
    overpass_url = "http://overpass-api.de/api/interpreter"
    radius = 2000 
    query = f"""[out:json];(nwr["amenity"~"library|park|cafe"](around:{radius},{request.latitude},{request.longitude}););out center;"""
    try:
        response = requests.post(overpass_url, data=query, timeout=10)
        response.raise_for_status()
        data = response.json()
        places = [{'name': e['tags'].get('name'), 'type': e['tags'].get('amenity', 'place').title(), 'rating': 'N/A', 'vicinity': e['tags'].get('addr:street', 'Location data not available')} for e in data.get('elements', []) if 'name' in e.get('tags', {})]
        return {"places": places[:5]}
    except requests.exceptions.RequestException as e:
        print(f"--- OpenStreetMap API Error: {e} ---")
        raise HTTPException(status_code=500, detail="Failed to fetch safe zones.")

@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    if not stt_pipeline: raise HTTPException(status_code=500, detail="STT model not loaded.")
    try:
        audio_bytes = await audio_file.read(); buffer = io.BytesIO(audio_bytes)
        audio = AudioSegment.from_file(buffer).set_frame_rate(16000).set_channels(1)
        wav_buffer = io.BytesIO(); audio.export(wav_buffer, format="wav"); wav_buffer.seek(0)
        result = stt_pipeline(wav_buffer.read()); return {"text": result["text"].strip()}
    except Exception as e: print(f"--- Transcription Error: {e} ---"); raise HTTPException(status_code=500, detail="Failed to transcribe audio.")

@app.post("/api/text-to-speech")
async def text_to_speech(request: TextRequest):
    if not all([tts_processor, tts_model, tts_vocoder, speaker_embeddings is not None]): raise HTTPException(status_code=500, detail="TTS models not loaded.")
    try:
        chunks = re.split(r'(?<=[.!?])\s+', request.text); chunks = [s.strip() for s in chunks if s.strip()]
        all_speech = [tts_model.generate_speech(tts_processor(text=c, return_tensors="pt").to(device)["input_ids"], speaker_embeddings, vocoder=tts_vocoder) for c in chunks]
        final_speech = torch.cat(all_speech, dim=0); buffer = io.BytesIO(); sf.write(buffer, final_speech.cpu().numpy(), samplerate=16000, format='WAV'); buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e: print(f"--- TTS PROCESSING ERROR: {e} ---"); raise HTTPException(status_code=500, detail=str(e))

# --- Frontend Serving ---
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')

print(f"\n--- [{time.ctime()}] --- Backend is fully loaded and ready. ---")