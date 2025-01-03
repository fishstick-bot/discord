FROM node:latest as app_builder

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

# RUN apk --no-cache --update --virtual build-dependencies add
RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev 
RUN yarn install
# RUN apk del build-dependencies

COPY ./ ./

RUN yarn build

CMD [ "node", "dist" ]