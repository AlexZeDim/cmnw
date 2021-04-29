FROM node:latest
WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY package.json ./
RUN npm install

COPY . .

RUN nest build keys \
  && nest build items \
  && nest build guilds \
  && nest build realms \
  && nest build auctions \
  && nest build wowtoken \
  && nest build characters \
  && nest build conglomerat \
  && nest build wowprogress

CMD wait && ["node"]
