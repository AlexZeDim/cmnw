FROM node:17
MAINTAINER me

ARG CMNW_VAULT

ENV CMNW_VAULT=$SSH_KEY

RUN apt-get update \
 && apt-get install -y git ssh

RUN mkdir /root/.ssh/
RUN echo "${CMNW_VAULT}" > /root/.ssh/id_rsa
RUN chmod 600 /root/.ssh/id_rsa

RUN touch /root/.ssh/known_hosts
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

RUN git clone git@github.com:AlexZeDim/cmnw-secrets.git

WORKDIR /usr/src/app

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
