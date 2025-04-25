FROM arm64v8/node:lts

ARG CR_PAT
ENV CR_PAT=$CR_PAT

# Set image labels #
LABEL org.opencontainers.image.title = "Gold"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"
LABEL org.opencontainers.image.licenses = "MPL-2.0"
LABEL org.opencontainers.image.description = "CMNW"

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

RUN npm install -g @nestjs/cli
RUN nest build gold

CMD ["node", "dist/apps/gold/main.js"]



