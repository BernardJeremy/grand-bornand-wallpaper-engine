# syntax=docker/dockerfile:1
FROM nginx:alpine-slim

# curl is required by fetch_panoramas.sh (also at runtime, for the cron job).
# Kept in its own early layer so it is cached across content changes.
RUN apk add --no-cache curl

# Allowlist-only nginx config: serves just the site files, not fetch_panoramas.sh.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Relative paths in fetch_panoramas.sh resolve here, including for `docker exec`.
WORKDIR /usr/share/nginx/html

# Drop the default nginx welcome page.
RUN rm -f ./*.html

# Static site, ordered from least to most frequently changed.
COPY weather_codes_data.json styles.css ./
COPY index.html script.js ./
COPY --chmod=755 fetch_panoramas.sh ./

# Populate panoramas_cache.json once at build time.
# Change CACHE_BUST (e.g. --build-arg CACHE_BUST=$(date +%s)) to force a fresh fetch.
ARG CACHE_BUST=0
RUN ./fetch_panoramas.sh
