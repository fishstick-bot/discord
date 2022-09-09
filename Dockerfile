FROM node:alpine as app_builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN apk --no-cache --virtual build-dependencies add \
    python \
    && yarn install \
    && apk del build-dependencies

COPY ./ ./

RUN yarn build

CMD [ "node", "dist" ]