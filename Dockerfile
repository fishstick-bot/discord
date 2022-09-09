FROM node:alpine as app_builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install

COPY ./ ./

RUN yarn build

CMD [ "node", "dist" ]