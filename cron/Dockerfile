# ── build stage ──────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o cron-runner ./main.go

# ── runtime stage ─────────────────────────────────────────────────────────────
# debian slim so we can install mongosh from the official MongoDB repo
FROM debian:bookworm-slim

# install mongosh
RUN apt-get update && apt-get install -y --no-install-recommends \
        wget gnupg ca-certificates \
    && wget -qO /etc/apt/trusted.gpg.d/mongodb.asc \
        https://www.mongodb.org/static/pgp/server-7.0.asc \
    && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
        > /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update && apt-get install -y --no-install-recommends mongodb-mongosh \
    && apt-get purge -y --auto-remove wget gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/cron-runner ./
COPY scripts/ ./scripts/

# Railway Cron: container runs, exits with 0 on success, non-zero on failure.
# Set MONGO_URI and SCRIPT_PATH in the Railway service environment variables.
CMD ["./cron-runner"]
