FROM node:17-alpine3.12

ARG SSH_KEY

ENV SSH_KEY=$CMNW_STORAGE

RUN sh -c 'echo $SSH_KEY'

RUN apk add git openssh-client

RUN apk add git

RUN mkdir -p -m 0600 ~/.ssh && touch .ssh/known_hosts && ssh-keyscan github.com >> ~/.ssh/known_hosts

RUN ssh-agent sh -c 'ssh-add $SSH_KEY'

WORKDIR /usr/src/app

RUN git clone git@github.com:AlexZeDim/cmnw-storage.git

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
