FROM node:22.15-alpine

LABEL org.opencontainers.image.title = "keys"
LABEL org.opencontainers.image.vendor = "alexzedim"
LABEL org.opencontainers.image.url = "https://raw.githubusercontent.com/alexzedim/cmnw-next/master/public/static/cmnw.png"
LABEL org.opencontainers.image.source = "https://github.com/alexzedim/cmnw"

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY package.json ./
RUN yarn install

COPY . .

RUN nest build keys

CMD ["node", "dist/apps/keys/main.js"]
