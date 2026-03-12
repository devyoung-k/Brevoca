from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Scriba API"
    app_env: str = "development"
    api_prefix: str = "/v1"
    postgres_dsn: str = "postgresql://scriba:scriba@localhost:5432/scriba"
    redis_url: str = "redis://localhost:6379/0"
    storage_endpoint: str = "http://localhost:9000"
    storage_bucket: str = "scriba-dev"

    model_config = SettingsConfigDict(
        env_prefix="SCRIBA_",
        extra="ignore",
    )


settings = Settings()
