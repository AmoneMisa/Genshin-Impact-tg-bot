# Telegram bot + Mini App server (node miniapp-entry.js).
#
# Built and published to GHCR by GitHub Actions on every push to master
# (.github/workflows/miniapp-ci.yml); servers pull the image instead of building.
#
# Secrets never enter the image: config.js and .env are excluded by
# .dockerignore; docker/entrypoint.sh builds config.js from BOT_TOKEN / ADMIN_ID
# at start-up. Runtime state (trusted chats, photo id cache, logs) lives in the
# /app/state volume.

# Node.js 24 is the current LTS line (matches .nvmrc and CI).
FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    MINI_APP_HOST=0.0.0.0 \
    MINI_APP_PORT=8080

WORKDIR /app

# Dependencies first so source edits don't reinstall them.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --chown=node:node . .
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/state \
    && chown node:node /app /app/state

USER node

EXPOSE 8080
VOLUME ["/app/state"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.MINI_APP_PORT || 8080) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "miniapp-entry.js"]
