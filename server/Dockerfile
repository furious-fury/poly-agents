FROM node:22-alpine

WORKDIR /app

# Copy source code (Moved up for debugging context)
COPY . .

# Install production dependencies
RUN npm install --legacy-peer-deps

# Build Arguments
ARG DATABASE_URL
ARG DIRECT_URL

# Set as Env Vars for Prisma Generate
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "dist/src/server.js"]
