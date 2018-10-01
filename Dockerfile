#FROM node:0.12
FROM node:6.11
MAINTAINER Javier Ailbirt <jailbirt@interactar.com>
ENV destDir /src/theeye-agent
# Create app directory
RUN mkdir -p ${destDir}
# Install Supervisor
RUN npm install -g supervisor
# Google API
RUN npm install googleapis@27 --save
# Install Convert and jq
RUN apt-get update 
RUN apt-get install -y jq imagemagick locales

# uncomment chosen locale to enable it's generation
RUN sed -i 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen  
# generate chosen locale
RUN locale-gen en_US.UTF-8
# set system-wide locale settings
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8
ENV LC_ALL en_US.UTF-8
# verify modified configuration
RUN dpkg-reconfigure --frontend noninteractive locales  

#Set working Directory
WORKDIR ${destDir}
# Bundle app source
COPY . ${destDir}
# Install app dependencies
RUN cd ${destDir}; npm install
#Fix Permissions.
RUN mkdir ${destDir}/.tmp
RUN chmod -R 1777 ${destDir}/.tmp
# Bundle app source
#No Port Exposition actually need it. EXPOSE 6080
#Env variables.
#By default run prod, If development is requiered This command would be overriden by docker-compose up

# Set the locale
CMD [ "/src/theeye-agent/run.sh" ]
