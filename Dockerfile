FROM node:17
MAINTAINER me

ARG SSH_KEY

ENV SSH_KEY=$CMNW_STORAGE

RUN apt-get update

RUN apt-get install -y git openssh-client bash

RUN mkdir /root/.ssh/

RUN echo -n "$SSH_KEY" | base64 --decode > /root/.ssh/id_rsa

RUN chmod 600 /root/.ssh/id_rsa

# Create known_hosts
RUN touch /root/.ssh/known_hosts

RUN ssh-keyscan github.com >> /root/.ssh/known_hosts

RUN eval `ssh-agent -s` && ssh-add /root/.ssh/id_rsa

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
