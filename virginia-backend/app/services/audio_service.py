import whisper

model = whisper.load_model("base")  # usar "small" para mais precisão


async def transcribe_audio(file_path: str) -> str:
    """Transcreve áudio para texto usando Whisper local."""
    result = model.transcribe(file_path, language="pt")
    return result["text"]
