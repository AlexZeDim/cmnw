FROM node:latest
WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY package.json ./
RUN npm install

COPY . .

RUN nest build keys \
  && nest build realms

CMD wait && ["node"]
