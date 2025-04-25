FROM node:22.15

ARG CR_PAT
ENV CR_PAT=$CR_PAT

LABEL org.opencontainers.image.title = "CMNW"
LABEL org.opencontainers.image.vendor = "cmnw"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"

RUN apt-get update

RUN apt-get install -y git

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

RUN git config --global url."https://alexzedim:${CR_PAT}@github.com/".insteadOf "https://github.com/"

RUN git clone https://github.com/alexzedim/cmnw-secrets.git

RUN mv cmnw-secrets/* cmnw-secrets/.[^.]* . && rmdir cmnw-secrets/

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
  && nest build valuations \
  && nest build characters \
  && nest build wowprogress \
  && nest build warcraft-logs

CMD wait && ["node"]

