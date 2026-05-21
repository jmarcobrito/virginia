import anthropic
import base64
import json
from app.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

EXTRACTION_PROMPT = """
Analise este documento e extraia as seguintes informações em JSON puro, sem markdown:
{
  "name": "nome descritivo do documento",
  "type": "um de: Contrato, Nota Fiscal, Procuração, Escritura, Orçamento, Boleto, Álvará, Seguro, Certidão, Áudio, Outro",
  "parties": ["lista de partes envolvidas, pessoas ou empresas"],
  "value": 0.00,
  "expires_at": "YYYY-MM-DD ou null",
  "tags": ["tags relevantes"],
  "summary": "resumo em 1-2 frases do conteúdo do documento"
}

Retorne APENAS o JSON. Sem texto adicional, sem markdown, sem explicações.
Se algum campo não estiver claro no documento, use null para datas/valores e lista vazia para arrays.
"""


async def extract_metadata(file_path: str, file_format: str) -> dict:
    """Usa Claude Vision para extrair metadados estruturados do documento."""

    with open(file_path, "rb") as f:
        file_data = base64.standard_b64encode(f.read()).decode("utf-8")

    media_types = {
        "PDF": "application/pdf",
        "IMG": "image/jpeg",
        "PNG": "image/png",
        "JPG": "image/jpeg",
    }
    media_type = media_types.get(file_format.upper(), "image/jpeg")

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document" if media_type == "application/pdf" else "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": file_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": EXTRACTION_PROMPT,
                    },
                ],
            }
        ],
    )

    raw = message.content[0].text.strip()
    return json.loads(raw)
