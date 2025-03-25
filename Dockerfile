FROM node:18
#
# al cambiar la version de node del container hay que cambiar
# la version de node utilizada en el compilador mas abajo en la llamada
# 
# ejemplo 
#   bash ./misc/compiler.sh "linux" "node16" 
#

MAINTAINER Facundo Gonzalez <facugon@theeye.io>
MAINTAINER Javier Ailbirt <jailbirt@theeye.io>

ENV destDir=/src/theeye/agent
RUN mkdir -p ${destDir}
WORKDIR ${destDir}
COPY . ${destDir}

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

ARG APP_VERSION
ENV THEEYE_AGENT_VERSION $APP_VERSION

RUN echo APP_VERSION is $APP_VERSION; \
      echo NODE_ENV is $NODE_ENV;

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# puppeteer extras
RUN apt update && apt install -y --no-install-recommends \
      wget curl jq imagemagick locales gnupg libxss1 libxtst6 awscli libx11-xcb1 \
      libxcomposite1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 \
      libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
      libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
      libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
      libxrandr2 libxrender1 libxss1 libxtst6 \
    && sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && locale-gen \
     # Install latest chrome dev package, which installs the necessary libs to
     # make the bundled version of Chromium that Puppeteer installs work.
    && wget --no-check-certificate -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
     && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     && chmod +x /usr/sbin/wait-for-it.sh \
     && ([ ! -d "${destDir}/downloads" ] && mkdir ${destDir}/downloads || echo "dir exists") && cd ${destDir}/downloads && npm install puppeteer \
     #&& chmod -v +x /docker-entrypoint.sh \
     # CleanUpLibs
     && rm -rf /var/lib/apt/lists/*

# base agent build
RUN npm install -g pkg \
      && cd ${destDir} \
      && ls -l . \
      && bash ./misc/compiler.sh "linux" "node18" \
      && bash ./misc/packager.sh

CMD ["bin/theeye-agent"]
