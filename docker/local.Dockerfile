FROM node:22.15-alpine

LABEL org.opencontainers.image.title = "CMNW"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY ../package.json ./
RUN yarn install

COPY .. .

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
  && nest build warcraft-logs

CMD wait && ["node"]
