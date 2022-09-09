FROM node:latest as app_builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN apk --no-cache --virtual build-dependencies add
RUN yarn install
RUN apk del build-dependencies

COPY ./ ./

RUN yarn build

CMD [ "node", "dist" ]