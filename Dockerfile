FROM node:17
MAINTAINER me

RUN apt-get update

RUN apt-get install -y git

WORKDIR /usr/src/app

RUN git init

RUN git clone https://${CR_PAT}@github.com/AlexZeDim/cmnw-secrets.git

RUN npm install -g @nestjs/cli

COPY package.json ./
RUN yarn install

COPY . .

RUN nest build conglomerat \
  && nest build osint \
  && nest build dma \
  && nest build keys \
  && nest build gold \
  && nest build items \
  && nest build ladder \
  && nest build guilds \
  && nest build realms \
  && nest build pricing \
  && nest build auctions \
  && nest build contracts \
  && nest build discord \
  && nest build wowtoken \
  && nest build valuations \
  && nest build characters \
  && nest build wowprogress \
  && nest build warcraftlogs \
  && nest build oracle \
  && nest build oraculum

CMD wait && ["node"]
