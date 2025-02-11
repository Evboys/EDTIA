FROM node:22.12.0
LABEL vendor="Thomas"
ENV DEBIAN_FRONTEND=noninteractive

# Install requirements
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git nano openssl apt-transport-https lsb-release ca-certificates sudo

# Configure datetime (timezone) + lang
RUN rm -f /etc/localtime && ln -s /usr/share/zoneinfo/Europe/Paris /etc/localtime
RUN apt-get update && apt-get install -y --no-install-recommends locales &&\
    locale-gen en_US.UTF-8 &&\
    echo "environment=LANG=\"en_US.utf8\", LC_ALL=\"en_US.UTF-8\", LC_LANG=\"en_US.UTF-8\"" > /etc/default/locale
RUN chmod 0755 /etc/default/locale
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8

# Create a user
# RUN useradd -ms /bin/bash guest
# RUN usermod -aG sudo guest

# Project 
# USER root
WORKDIR /usr/src
COPY . ./

RUN npm install
RUN npm run build

RUN rm -rf /var/lib/apt/lists/*
# USER guest
EXPOSE 1880
HEALTHCHECK CMD curl --fail http://127.0.0.1:80/health || exit 1
CMD npm run dev-server
