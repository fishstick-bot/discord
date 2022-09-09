FROM node:alpine as app_builder

WORKDIR /src/fishstick-discord

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY ./ ./

RUN yarn build

CMD [ "node", "dist" ]