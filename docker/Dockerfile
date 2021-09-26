# ---- Base Node ----
FROM node:16-alpine AS base
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt
COPY package.json package-lock.json* ./

# Stage: Building
FROM base AS builder
RUN apk --no-cache add git
# Install library dependencies
RUN if [ "$NODE_ENV" = "production" ] ; then npm ci --only=prod; else npm i; fi
RUN npm cache clean --force

# Stage: Execution
FROM base
WORKDIR /opt/app
COPY . /opt/app
COPY --from=builder /opt/node_modules /opt/node_modules

EXPOSE 3000
CMD npm start
