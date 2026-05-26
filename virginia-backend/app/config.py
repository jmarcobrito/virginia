from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    anthropic_api_key: str
    rag_working_dir: str = "./rag_storage"
    app_port: int = 8000
    app_env: str = "development"
    evolution_api_url: str = "http://localhost:8080"
    evolution_api_key: str
    evolution_instance_name: str
    n8n_url: str = "http://host.docker.internal:5678"
    virginia_webhook_secret: str = ""
    storage_bucket: str = "virginia-documents"
    max_upload_bytes: int = 20 * 1024 * 1024
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    cors_origin_regex: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
