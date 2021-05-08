FROM node:latest
WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY package.json ./
RUN npm install

COPY . .

RUN nest build conglomerat \
  && nest build keys \
  && nest build gold \
  && nest build items \
  && nest build guilds \
  && nest build realms \
  && nest build pricing \
  && nest build auctions \
  && nest build discord \
  && nest build wowtoken \
  && nest build valuations \
  && nest build characters \
  && nest build wowprogress \
  && nest build warcraftlogs

CMD wait && ["node"]
