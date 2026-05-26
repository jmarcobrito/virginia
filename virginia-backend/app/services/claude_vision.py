import base64
import json
import re

import anthropic

from app.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

EXTRACTION_PROMPT = """
Analise este documento e extraia as seguintes informacoes em JSON puro, sem markdown:
{
  "name": "nome descritivo do documento",
  "type": "um de: Contrato, Nota Fiscal, Procuracao, Escritura, Orcamento, Boleto, Alvara, Seguro, Certidao, Audio, Outro",
  "parties": ["lista de partes envolvidas, pessoas ou empresas"],
  "value": 0.00,
  "expires_at": "YYYY-MM-DD ou null",
  "tags": ["tags relevantes"],
  "summary": "resumo em 1-2 frases do conteudo do documento"
}

Retorne APENAS o JSON. Sem texto adicional, sem markdown, sem explicacoes.
Se algum campo nao estiver claro no documento, use null para datas/valores e lista vazia para arrays.
"""


def _parse_json_response(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude retornou JSON invalido: {e}\nResposta: {raw[:200]}")


async def extract_metadata(
    file_path: str,
    file_format: str,
    media_type: str | None = None,
    text_content: str | None = None,
) -> dict:
    """Usa Claude para extrair metadados estruturados do documento."""

    if file_format == "AUD":
        prompt = f"{EXTRACTION_PROMPT}\n\nTranscricao do audio:\n{text_content or ''}"
        message = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_json_response(message.content[0].text)

    with open(file_path, "rb") as f:
        file_data = base64.standard_b64encode(f.read()).decode("utf-8")

    media_types = {
        "PDF": "application/pdf",
        "IMG": media_type or "image/jpeg",
        "PNG": "image/png",
        "JPG": "image/jpeg",
    }
    resolved_media_type = media_type or media_types.get(file_format.upper(), "image/jpeg")

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document"
                        if resolved_media_type == "application/pdf"
                        else "image",
                        "source": {
                            "type": "base64",
                            "media_type": resolved_media_type,
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

    return _parse_json_response(message.content[0].text)
