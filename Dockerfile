FROM ubuntu

MAINTAINER jailbirt@gmail.com

COPY docker-entrypoint.sh /docker-entrypoint.sh
# Install Puppeteer under /node_modules so it's available system-wide
COPY misc/puppeteer/package.json /
COPY misc/puppeteer/package-lock.json /

WORKDIR /

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV LC_ALL en_US.UTF-8

# Install Puppeteer under /node_modules so it's available system-wide
ADD ./misc/puppeteer/package.json ./misc/puppeteer/package-lock.json /

RUN apt update && apt install -y --no-install-recommends curl jq imagemagick locales \
     # Install latest chrome dev package, which installs the necessary libs to
     # make the bundled version of Chromium that Puppeteer installs work.
     && apt-get install -y wget --no-install-recommends \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y google-chrome-unstable --no-install-recommends \
     && rm -rf /var/lib/apt/lists/* \
     && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     && echo "llegue hasta acá 1" \
     && chmod +x /usr/sbin/wait-for-it.sh \
     && chmod -v +x /docker-entrypoint.sh \
     # uncomment the chosen locale to enable it's generation
     && sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen   \
     # generate chosen locale
     && locale-gen en_US.UTF-8 \
     # set system-wide locale settings
     && dpkg-reconfigure --frontend noninteractive locales \
     && echo "llegue hasta acá 2" \
     && npm install \
     #PreInstall Theeye Agent.
     && /usr/bin/curl -s "https://s3.amazonaws.com/theeye.agent/linux/setup.sh"|bash -s \
     && chmod 666 /etc/theeye/theeye.conf \
     #CleanUpLibs
     && rm -rf /var/lib/apt/lists/*

#PreInstall Theeye Agent.
RUN /usr/bin/curl -s "https://s3.amazonaws.com/theeye.agent/linux/setup.sh" | bash -s
RUN chmod 666 /etc/theeye/theeye.conf

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["/opt/theeye-agent/runBinary.sh"]
