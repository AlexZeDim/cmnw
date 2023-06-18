FROM node:lts

ARG CR_PAT
ENV CR_PAT=$CR_PAT

LABEL org.opencontainers.image.title = "Characters"
LABEL org.opencontainers.image.vendor = "AlexZeDim"
LABEL org.opencontainers.image.url = "https://i.imgur.com/CY0Kqy3.png"
LABEL org.opencontainers.image.source = "https://github.com/AlexZeDim/cmnw"

RUN apt-get update && apt-get install -y git

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

RUN git config --global url."https://alexzedim:${CR_PAT}@github.com/".insteadOf "https://github.com/"

RUN git clone https://github.com/AlexZeDim/cmnw-secrets.git

RUN mv cmnw-secrets/* .

RUN rm -rf cmnw-secrets

COPY package.json ./

# Notice part below this line
# This is needed for installing private github packages
RUN echo //npm.pkg.github.com/:_authToken=${CR_PAT} >> ~/.npmrc
RUN echo @alexzedim:registry=https://npm.pkg.github.com/ >> ~/.npmrc

RUN yarn install

COPY . .

RUN nest build characters

CMD wait && ["node", "dist/apps/characters/main.js"]



