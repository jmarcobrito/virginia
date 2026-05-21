from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    anthropic_api_key: str
    rag_working_dir: str = "./rag_storage"
    app_port: int = 8000
    app_env: str = "development"
    evolution_api_url: str = "http://localhost:8080"
    evolution_api_key: str = "iris_evo_key"
    n8n_url: str = "http://host.docker.internal:5678"

    class Config:
        env_file = ".env"


settings = Settings()
