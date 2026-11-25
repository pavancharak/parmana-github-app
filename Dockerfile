# Production image for the GitHub App process (apps/github-app).
# Base image pins Node 24, the target runtime in the specification.
FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Install only production dependencies, from the lockfile.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/github-client/package.json packages/github-client/
COPY packages/tenant-context/package.json packages/tenant-context/
COPY apps/github-app/package.json apps/github-app/
RUN pnpm install --frozen-lockfile --prod

COPY packages/github-client/src packages/github-client/src
COPY packages/tenant-context/src packages/tenant-context/src
COPY apps/github-app/src apps/github-app/src
COPY database database

# Run as the unprivileged built-in user, never as root.
USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# tsx runs the TypeScript sources directly. A compiled build is a follow-up
# (see docs/operations/DEPLOYMENT.md, known limitations).
CMD ["node", "--import", "tsx", "apps/github-app/src/main.ts"]
