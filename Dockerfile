# Start your image with a node base image
ARG NODE_VERSION=node:14-alpine


FROM $NODE_VERSION AS dependency-base
# FROM alpine:3.14 AS dependency-base

# The /app directory should act as the main application directory
WORKDIR /app

# RUN apk add --no-cache --update nodejs=14.21.3-r0 npm=7.17.0-r0

# Copy the app package and package-lock.json file
COPY package*.json ./
# RUN npm config set -g registry https://registry.npmmirror.com

RUN npm ci 

FROM dependency-base AS production-base
# Copy local directories to the current local directory of our docker image (/app)
COPY nuxt.config.js ./
COPY ./static ./static
COPY ./server ./server
COPY ./layouts ./layouts
COPY ./pages ./pages
COPY ./plugins ./plugins
COPY ./assets ./assets
COPY .eslintrc.js ./
COPY .eslintignore ./
COPY pm2system.config.js ./
# Install node packages, install serve, build the app, and remove dependencies at the end
RUN  npm run build 
# RUN  npm prune --production

# FROM $NODE_VERSION AS production
FROM alpine:3.14 AS production


WORKDIR /app
RUN apk add --no-cache --update nodejs=14.21.3-r0
COPY --from=production-base /app /app

ENV HOST=0.0.0.0
EXPOSE 3031

# Start the app using serve command
CMD [ "node", "/app/server/index.js" ]
# CMD [ "node", "run" ,"Start" ]