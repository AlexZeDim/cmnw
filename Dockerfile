FROM node:latest
WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli \
  && apt-get update \
  && apt-get install -y wget gnupg ca-certificates \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  # We install Chrome to get all the OS level dependencies, but Chrome itself
  # is not actually used as it's packaged in the node puppeteer library.
  # Alternatively, we could could include the entire dep list ourselves
  # (https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix)
  # but that seems too easy to get out of date.
  && apt-get install -y google-chrome-stable \
  && rm -rf /var/lib/apt/lists/* \
  && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
  && chmod +x /usr/sbin/wait-for-it.sh

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
