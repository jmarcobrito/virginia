import logging
import time
import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.database import supabase

router = APIRouter()

ACTIVE_KEY = "whatsapp_active_instance"
PENDING_KEY = "whatsapp_pending_instance"


def _headers():
    return {"apikey": settings.evolution_api_key}


def _get_setting(key: str) -> str | None:
    try:
        r = supabase.table("settings").select("value").eq("key", key).execute()
        return r.data[0]["value"] if r.data else None
    except Exception:
        return None


def _upsert_setting(key: str, value: str):
    existing = supabase.table("settings").select("key").eq("key", key).execute()
    if existing.data:
        supabase.table("settings").update({"value": value}).eq("key", key).execute()
    else:
        supabase.table("settings").insert({"key": key, "value": value}).execute()


async def _connection_state(client: httpx.AsyncClient, instance: str) -> str:
    try:
        r = await client.get(
            f"{settings.evolution_api_url}/instance/connectionState/{instance}",
            headers=_headers(),
            timeout=5.0,
        )
        return r.json().get("instance", {}).get("state", "close")
    except Exception:
        return "close"


async def _phone_from_instance(client: httpx.AsyncClient, instance: str) -> str | None:
    try:
        r = await client.get(
            f"{settings.evolution_api_url}/instance/fetchInstances",
            headers=_headers(),
            timeout=5.0,
        )
        for inst in r.json():
            if inst.get("instance", {}).get("instanceName") == instance:
                owner = inst.get("instance", {}).get("owner", "")
                return owner.replace("@s.whatsapp.net", "") if owner else None
    except Exception:
        pass
    return None


async def _delete_instance(client: httpx.AsyncClient, instance: str):
    try:
        await client.delete(
            f"{settings.evolution_api_url}/instance/delete/{instance}",
            headers=_headers(),
            timeout=5.0,
        )
    except Exception:
        pass


async def _promote_pending_to_active(client: httpx.AsyncClient, new_instance: str):
    old = _get_setting(ACTIVE_KEY)
    _upsert_setting(ACTIVE_KEY, new_instance)
    _upsert_setting(PENDING_KEY, "")
    if old and old != new_instance:
        await _delete_instance(client, old)


@router.get("/status")
async def get_status():
    active = _get_setting(ACTIVE_KEY) or settings.evolution_instance_name

    async with httpx.AsyncClient() as client:
        try:
            state = await _connection_state(client, active)
            if state == "open":
                phone = await _phone_from_instance(client, active)
                return {"status": "connected", "instance": active, "phone": phone}
            if state == "connecting":
                return {"status": "connecting", "instance": active, "phone": None}
            return {"status": "disconnected", "instance": active, "phone": None}
        except httpx.RequestError:
            return {"status": "unreachable", "instance": active, "phone": None}


@router.post("/connect")
async def connect_new():
    """Cria nova instância na Evolution API e retorna QR code como base64."""
    new_instance = f"virginia-{int(time.time())}"

    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                f"{settings.evolution_api_url}/instance/create",
                headers=_headers(),
                json={
                    "instanceName": new_instance,
                    "integration": "WHATSAPP-BAILEYS",
                    "qrcode": True,
                    "webhook": {
                        "url": f"{settings.n8n_url}/webhook/whatsapp-incoming",
                        "byEvents": False,
                        "base64": False,
                        "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
                    },
                },
                timeout=15.0,
            )
        except httpx.RequestError:
            raise HTTPException(503, "Evolution API não está acessível")

        if r.status_code not in (200, 201):
            raise HTTPException(502, f"Evolution API: {r.text}")

        qr_r = await client.get(
            f"{settings.evolution_api_url}/instance/connect/{new_instance}",
            headers=_headers(),
            timeout=10.0,
        )
        qr_data = qr_r.json()
        qr = qr_data.get("base64") or qr_data.get("qrcode", {}).get("base64")

    _upsert_setting(PENDING_KEY, new_instance)
    return {"instance": new_instance, "qr": qr}


@router.get("/qr/{instance}")
async def refresh_qr(instance: str):
    """
    Retorna QR atualizado de uma instância pendente.
    Se a instância já conectou, promove-a a ativa e retorna status=connected.
    """
    async with httpx.AsyncClient() as client:
        try:
            state = await _connection_state(client, instance)

            if state == "open":
                await _promote_pending_to_active(client, instance)
                phone = await _phone_from_instance(client, instance)
                return {"status": "connected", "qr": None, "phone": phone}

            qr_r = await client.get(
                f"{settings.evolution_api_url}/instance/connect/{instance}",
                headers=_headers(),
                timeout=10.0,
            )
            qr_data = qr_r.json()
            qr = qr_data.get("base64") or qr_data.get("qrcode", {}).get("base64")
            return {"status": "pending", "qr": qr, "phone": None}

        except httpx.RequestError:
            raise HTTPException(503, "Evolution API não está acessível")


@router.get("/qrcode")
async def get_qrcode():
    instance = settings.evolution_instance_name
    async with httpx.AsyncClient() as client:
        try:
            # Verifica se a instância já existe
            check = await client.get(
                f"{settings.evolution_api_url}/instance/connectionState/{instance}",
                headers=_headers(),
                timeout=5.0,
            )
        except httpx.RequestError:
            raise HTTPException(503, "Evolution API não está acessível")

        # Cria a instância se não existir (404 = não encontrada)
        if check.status_code == 404:
            try:
                create = await client.post(
                    f"{settings.evolution_api_url}/instance/create",
                    headers=_headers(),
                    json={
                        "instanceName": instance,
                        "integration": "WHATSAPP-BAILEYS",
                        "qrcode": True,
                        "webhook": {
                            "url": f"{settings.n8n_url}/webhook/whatsapp-incoming",
                            "byEvents": False,
                            "base64": False,
                            "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
                        },
                    },
                    timeout=15.0,
                )
            except httpx.RequestError:
                raise HTTPException(503, "Evolution API não está acessível")

            if create.status_code not in (200, 201):
                raise HTTPException(502, f"Evolution API: {create.text}")

        try:
            r = await client.get(
                f"{settings.evolution_api_url}/instance/connect/{instance}",
                headers=_headers(),
                timeout=10.0,
            )
        except httpx.RequestError:
            raise HTTPException(503, "Evolution API não está acessível")

        if r.status_code not in (200, 201):
            raise HTTPException(502, f"Evolution API: {r.text}")

        qr_data = r.json()
        qr = qr_data.get("base64") or qr_data.get("qrcode", {}).get("base64")
        return {"qr": qr}


@router.delete("/disconnect")
async def disconnect():
    active = _get_setting(ACTIVE_KEY)
    if not active:
        return {"success": True}

    async with httpx.AsyncClient() as client:
        try:
            r = await client.delete(
                f"{settings.evolution_api_url}/instance/logout/{active}",
                headers=_headers(),
                timeout=5.0,
            )
            logging.info("Evolution API logout — status: %s body: %s", r.status_code, r.text)
        except httpx.RequestError as e:
            logging.warning("Evolution API logout falhou (RequestError): %s", e)

    _upsert_setting(ACTIVE_KEY, "")
    return {"success": True}
