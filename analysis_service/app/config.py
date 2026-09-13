from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # No defaults for secrets/identity: the process must fail to start
    # rather than silently point at the wrong database or accept a
    # predictable JWT secret. See implementation/RUNBOOK.md and .env.example.
    mongodb_uri: str
    jwt_secret: str
    institute_id: str
    allowed_origins: list[str]

    jwt_issuer: str = "cognitest-auth"
    jwt_audience: str = "cognitest-students"

    # Cookie security. Only ever set False for local HTTP development, and
    # never in a deployed environment (see DEPLOYMENT_PLAN.md).
    cookie_secure: bool = True

    # Number of trusted reverse-proxy hops in front of this service. 0 means
    # "trust request.client.host directly, do not read X-Forwarded-For".
    # Only raise this if the reverse proxy is configured to overwrite (not
    # append to) X-Forwarded-For for untrusted clients.
    trusted_proxy_count: int = 0

    max_safe_integer: int = 9_007_199_254_740_991
    max_string_length: int = 10000
    max_array_size: int = 1000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def _validate_secret_strength(self) -> "Settings":
        if len(self.jwt_secret.encode("utf-8")) < 32:
            raise ValueError(
                "JWT_SECRET must be at least 32 bytes long "
                "(RFC 7518 minimum recommended length for HS256)"
            )
        return self


settings = Settings()
