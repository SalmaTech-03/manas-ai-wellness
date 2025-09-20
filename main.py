# main.py - FINAL VERSION (Affirmation Art Removed)

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
import google.generativeai as genai
import nltk
from pydub import AudioSegment

# --- START OF THE FFMPEG FIX ---
AudioSegment.converter = "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"
AudioSegment.ffprobe = "C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe"
# --- END OF THE FFMPEG FIX ---

# --- NLTK Setup ---
try: nltk.data.find('tokenizers/punkt')
except nltk.downloader.DownloadError: print("--- First time setup: Downloading NLTK tokenizer... ---"); nltk.download('punkt')

print(f"--- [{time.ctime()}] --- Starting Manas AI Backend ---")

# --- Setup and Configuration ---
load_dotenv(); app = FastAPI(); device = "cuda" if torch.cuda.is_available() else "cpu"
GEMINI_MODEL_VERSION = 'gemini-2.5-flash'
print(f"--- [{time.ctime()}] --- FastAPI app instance created. Using device: {device} ---")

# --- CORS Middleware ---
origins = [ "http://localhost:8000", "https://127.0.0.1:8000", "http://127.0.0.1:8000", "null" ]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
print(f"--- [{time.ctime()}] --- CORS middleware configured. ---")

# --- Global variable for speaker embeddings ---
speaker_embeddings = None

# --- AI Model Loading ---
try:
    HF_TOKEN = os.getenv("HUGGING_FACE_TOKEN")
    print(f"\n--- [{time.ctime()}] --- Loading standard NLP models... ---")
    intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", token=HF_TOKEN, device=device)
    qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad", token=HF_TOKEN, device=device)
    print(f"--- [{time.ctime()}] --- Standard NLP models LOADED successfully. ---\n")

    print(f"--- [{time.ctime()}] --- Loading Text-to-Speech (TTS) models... ---")
    tts_processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
    tts_model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts").to(device)
    tts_vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan").to(device)
    try:
        print("--- Attempting to load preferred speaker embeddings... ---")
        speaker_embeddings = load_dataset("Matthijs/cmu-arctic-xvectors-slt", split="validation")[7306]["xvector"].unsqueeze(0).to(device)
        print("--- Preferred speaker embeddings loaded successfully. ---")
    except Exception as e:
        print(f"--- WARNING: Could not load preferred speaker embeddings: {e}. Falling back to generic. ---")
        speaker_embeddings = torch.randn((1, 512)).to(device)
    print(f"--- [{time.ctime()}] --- TTS models LOADED successfully. ---\n")
    
    print(f"--- [{time.ctime()}] --- Loading Speech-to-Text (STT) model... ---")
    stt_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-base", device=device)
    print(f"--- [{time.ctime()}] --- STT model LOADED successfully. ---\n")
    
    print(f"--- [{time.ctime()}] --- Loading Audio Generation model (MusicGen)... ---")
    audio_gen_processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    audio_gen_model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small").to(device)
    print(f"--- [{time.ctime()}] --- Audio Generation model LOADED successfully. ---\n")

except Exception as e:
    print(f"--- FATAL ERROR loading Hugging Face models: {e} ---")
    intent_classifier, qa_pipeline, tts_processor, tts_model, tts_vocoder, stt_pipeline, audio_gen_processor, audio_gen_model = [None]*8

try:
    print(f"--- [{time.ctime()}] --- Configuring Google Gemini model ({GEMINI_MODEL_VERSION})... ---")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key: print("--- WARNING: GEMINI_API_KEY not found. AI features will fail. ---"); gemini_model = None
    else: genai.configure(api_key=gemini_api_key); gemini_model = genai.GenerativeModel(GEMINI_MODEL_VERSION); print(f"--- [{time.ctime()}] --- Gemini model configured successfully. ---")
except Exception as e: print(f"--- FATAL ERROR configuring Gemini: {e} ---"); gemini_model = None

# --- API Data Models ---
class TextRequest(BaseModel): text: str
class MoodRequest(BaseModel): mood: str
class IntentRequest(BaseModel): text: str; candidate_labels: list[str]
class QaRequest(BaseModel): context: str; question: str
class PoemRequest(BaseModel): prompt: str
class ChatRequest(BaseModel): history: list[dict]
class MeditationRequest(BaseModel): topic: str; duration: str
class GoalRequest(BaseModel): goal: str
class RiddleRequest(BaseModel): question: str
class SoundscapeRequest(BaseModel): word: str

# --- API Endpoints ---
@app.post("/api/generate-soundscape")
async def generate_soundscape(request: SoundscapeRequest):
    if not gemini_model or not audio_gen_model or not audio_gen_processor: raise HTTPException(status_code=500, detail="A required AI model is not loaded.")
    try:
        audio_prompt_generator = f"""A user has provided a single word that represents a feeling: '{request.word}'. Create a short, descriptive prompt for an audio generation AI. The prompt should describe a 5-10 second ambient soundscape that captures the essence of this word. Focus on textures and atmosphere. Example for 'Peace': A serene soundscape of gentle rainfall on large leaves, with distant, soft wind chimes."""
        audio_prompt_response = gemini_model.generate_content(audio_prompt_generator)
        audio_prompt = audio_prompt_response.text.strip().replace("\n", " ")
        print(f"--- Generated Audio Prompt: {audio_prompt} ---")

        inputs = audio_gen_processor(text=[audio_prompt], padding=True, return_tensors="pt").to(device)
        audio_values = audio_gen_model.generate(**inputs, max_new_tokens=256)
        
        sampling_rate = audio_gen_model.config.audio_encoder.sampling_rate
        audio_numpy = audio_values.cpu().numpy().squeeze()
        
        buffer = io.BytesIO()
        sf.write(buffer, audio_numpy, samplerate=sampling_rate, format='WAV')
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e: print(f"--- Soundscape Generation Error: {e} ---"); raise HTTPException(status_code=500, detail="The cave's echoes are silent right now.")

@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    if not stt_pipeline: raise HTTPException(status_code=500, detail="Speech-to-Text model not loaded.")
    try:
        audio_bytes = await audio_file.read(); buffer = io.BytesIO(audio_bytes)
        audio = AudioSegment.from_file(buffer); audio = audio.set_frame_rate(16000).set_channels(1)
        wav_buffer = io.BytesIO(); audio.export(wav_buffer, format="wav"); wav_buffer.seek(0)
        wav_bytes = wav_buffer.read(); result = stt_pipeline(wav_bytes); return {"text": result["text"].strip()}
    except Exception as e: print(f"--- Transcription Error: {e} ---"); raise HTTPException(status_code=500, detail="Failed to transcribe audio.")
@app.post("/api/text-to-speech")
async def text_to_speech(request: TextRequest):
    if not all([tts_processor, tts_model, tts_vocoder, speaker_embeddings is not None]): raise HTTPException(status_code=500, detail="TTS models not loaded.")
    try:
        sentences = nltk.sent_tokenize(request.text); chunks = [s for s in sentences if s.strip()]
        all_speech = [tts_model.generate_speech(tts_processor(text=c, return_tensors="pt").to(device)["input_ids"], speaker_embeddings, vocoder=tts_vocoder) for c in chunks]
        final_speech = torch.cat(all_speech, dim=0); buffer = io.BytesIO(); sf.write(buffer, final_speech.cpu().numpy(), samplerate=16000, format='WAV'); buffer.seek(0)
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e: print(f"--- TTS PROCESSING ERROR: {e} ---"); raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/analyze-intent")
async def analyze_intent(request: IntentRequest):
    if not intent_classifier: return {"error": "Intent model not loaded."}
    return intent_classifier(request.text, candidate_labels=request.candidate_labels)
@app.post("/api/qa")
async def question_answering(request: QaRequest):
    if not qa_pipeline: return {"error": "QA model not loaded."}
    return qa_pipeline(question=request.question, context=request.context)
@app.post("/api/generate-poem")
async def generate_poem(request: PoemRequest):
    if not gemini_model: return {"error": "Gemini model not loaded."}
    response = gemini_model.generate_content(request.prompt); return {"poem": response.text}
@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    if not gemini_model: return {"error": "Gemini model not loaded."}
    chat = gemini_model.start_chat(history=request.history[:-1]); response = chat.send_message(request.history[-1]['parts'][0]['text'])
    return {"text": response.text}
@app.post("/api/summarize-chat")
async def summarize_chat(request: ChatRequest):
    if not gemini_model: return {"error": "Gemini model not loaded."}
    conversation_text = "\n".join([f"{msg['role'].replace('model', 'Manas')}: {msg['parts'][0]['text']}" for msg in request.history])
    prompt = f'You are a reflective wellness companion. Summarize this conversation supportively in the second person ("You expressed..."), identify feelings, highlight advice, and end on a hopeful note. Be concise (3-4 sentences). Conversation:\n---\n{conversation_text}\n---\nSummary:'
    response = gemini_model.generate_content(prompt); return {"summary": response.text}
@app.post("/api/generate-meditation")
async def generate_meditation(request: MeditationRequest):
    if not gemini_model: return {"error": "Gemini model not loaded."}
    prompt = f'You are a calm meditation guide. Write a script on "{request.topic}" for a {request.duration} duration. Structure with paragraphs and [PAUSE] markers. Be soothing.'
    response = gemini_model.generate_content(prompt); return {"script": response.text}
@app.post("/api/coach-goal")
async def coach_goal(request: GoalRequest):
    if not gemini_model: return {"error": "Gemini model not loaded."}
    prompt = f'You are Manas, an AI Goal Coach. Turn the user\'s goal: "{request.goal}" into a 3-step S.M.A.R.T. action plan. For each step, provide a clear title and encouraging explanation. Be supportive.'
    response = gemini_model.generate_content(prompt); return {"plan": response.text}
@app.post("/api/get-wisdom-riddle")
async def get_wisdom_riddle(request: RiddleRequest):
    if not gemini_model: raise HTTPException(status_code=500, detail="Gemini model not loaded.")
    prompt = f"""You are the 'Wisdom Stone of Manas,' an ancient, mystical, and slightly playful oracle. A user has asked you: "{request.question}". Respond not with a direct answer, but with a short, cryptic, one or two-sentence riddle or koan to guide their reflection. Be intriguing. Do not use quotation marks."""
    response = gemini_model.generate_content(prompt); return {"riddle": response.text.strip()}

# --- Frontend Serving ---
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/")
async def read_index(): return FileResponse('static/index.html')

print(f"\n--- [{time.ctime()}] --- All routes defined. The server is now ready for Uvicorn to start. ---")