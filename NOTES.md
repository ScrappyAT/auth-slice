# Build notes

## Port 5432 already allocated

**Symptom.** `docker compose up -d` failed with "Bind for 0.0.0.0:5432 failed:
port is already allocated". The container was created but never started.

**Investigation.** `netstat -ano | findstr :5432` gave PID 14752. `tasklist`
identified it as com.docker.backend.exe, which ruled out a native Postgres
service and pointed at another container instead. `docker ps -a` showed
draganddrop-postgres-1, from a project four weeks old, publishing 5432 and
auto-started by Docker Desktop.

**Cause.** A container from an unrelated project held the host port. Nothing
to do with this project's config.

**Fix.** Published mine on host port 5433 rather than stopping the other
container, so both projects run at once. Updated DATABASE_URL to match.