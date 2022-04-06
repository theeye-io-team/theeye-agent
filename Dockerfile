FROM node:14
MAINTAINER Javier Ailbirt <jailbirt@gmail.com>
MAINTAINER Facundo Gonzalez <facugon@theeye.io>

ENV destDir=/src/theeye/agent
RUN mkdir -p ${destDir}
WORKDIR ${destDir}
COPY . ${destDir}

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# puppeteer extras
RUN apt update \
      && apt install -y --no-install-recommends wget curl jq imagemagick locales gnupg libxss1 libxtst6 gcc g++ make build-essential ripmime poppler-utils isync rename tzdata mpack mutt git \
      && sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
      && locale-gen \
      && wget --no-check-certificate -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
      && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
      && apt-get update \
      && apt-get install -y google-chrome-stable --no-install-recommends \
      && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
      && chmod +x /usr/sbin/wait-for-it.sh \
      && ([ ! -d "${destDir}/downloads" ] && mkdir ${destDir}/downloads || echo "dir exists") && cd ${destDir}/downloads && npm install puppeteer \
      && rm -rf /var/lib/apt/lists/*

# base agent build
RUN apt update && apt install -y build-essential \
      && npm install -g pkg \
      && cd ${destDir} \
      && ls -l . \
      && bash ./misc/compiler.sh \
      && bash ./misc/packager.sh

CMD ["bin/theeye-agent"]
