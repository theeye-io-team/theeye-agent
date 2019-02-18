FROM ubuntu

MAINTAINER jailbirt@gmail.com
RUN apt update && apt install -y \
curl jq imagemagick locales nodejs npm \
&& rm -rf /var/lib/apt/lists/*

WORKDIR /

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod -v +x /docker-entrypoint.sh

# uncomment the chosen locale to enable it's generation
RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen  
# generate chosen locale
RUN locale-gen en_US.UTF-8
# set system-wide locale settings
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
# verify modified configuration
RUN dpkg-reconfigure --frontend noninteractive locales  

#PreInstall Theeye Agent.
RUN  /usr/bin/curl -s "https://s3.amazonaws.com/theeye.agent/linux/setup.sh"|bash -s

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["/opt/theeye-agent/runBinary.sh"]
