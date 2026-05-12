from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    anthropic_api_key: str
    rag_working_dir: str = "./rag_storage"
    app_port: int = 8000
    app_env: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
