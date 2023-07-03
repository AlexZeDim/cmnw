FROM arm64v8/node:lts AS node_arm

FROM arm64v8/ubuntu:20.04

COPY --from=node_arm / /

ARG CR_PAT
ENV CR_PAT=$CR_PAT

LABEL org.opencontainers.image.title = "OSINT"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.vendor = "AlexZeDim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/AlexZeDim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/AlexZeDim/cmnw"
LABEL org.opencontainers.image.description = "Intelligence always wins"

WORKDIR /usr/src/app

# Clone config from private github repo #
RUN git config --global url."https://alexzedim:${CR_PAT}@github.com/".insteadOf "https://github.com/"
RUN git clone https://github.com/AlexZeDim/cmnw-secrets.git
RUN mv cmnw-secrets/* .
RUN rm -rf cmnw-secrets

COPY package.json ./

# Installing private github packages #
RUN echo //npm.pkg.github.com/:_authToken=${CR_PAT} >> ~/.npmrc
RUN echo @alexzedim:registry=https://npm.pkg.github.com/ >> ~/.npmrc

RUN yarn install --network-timeout 1000000

COPY . .

RUN apt install firefox
RUN apt install chromium-browser

RUN npm install -g @nestjs/cli

# Installing playwright #
RUN npx playwright install-deps --dry-run
RUN npx playwright install

RUN nest build characters \
  && nest build guilds \
  && nest build keys \
  && nest build osint \
  && nest build wowprogress \
  && nest build realms

CMD ["node"]

