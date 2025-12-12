# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (sharp, etc)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install instead of npm ci to avoid lock file issues
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set dummy environment variables for build (will be overridden at runtime)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXTAUTH_SECRET="dummy-secret-for-build"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV LINE_CHANNEL_ACCESS_TOKEN="dummy-token"
ENV LINE_CHANNEL_SECRET="dummy-secret"
ENV SLIP_APIKEY="dummy-key"
ENV CREDITMODE="true"
ENV EXPECTED_RECEIVER_NAME_TH="บุญญฤทธิ์ ส"
ENV EXPECTED_RECEIVER_NAME_EN="BOONYARIT S"
ENV EXPECTED_ACCOUNT_NUMBER="6639546442"
ENV EXPECTED_BANK_ID="006"
ENV R2_ACCOUNT_ID="dummy-r2-account"
ENV R2_ACCESS_KEY_ID="dummy-r2-key"
ENV R2_SECRET_ACCESS_KEY="dummy-r2-secret"
ENV R2_BUCKET_NAME="line-bot-slips"
ENV R2_PUBLIC_URL="https://dummy.r2.dev"
ENV SET_ADMIN_GROUP_TOKEN="dummy-admin-token"

# Generate Drizzle ORM types
RUN npm run db:generate

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for sharp
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

# Set to production environment
ENV NODE_ENV=production

# Create public directory
RUN mkdir -p ./public

# Copy necessary files from builder
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/lib ./lib

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
