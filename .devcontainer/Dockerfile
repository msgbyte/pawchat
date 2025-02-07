FROM mcr.microsoft.com/devcontainers/javascript-node:1-18-bullseye

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends iputils-ping

RUN wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
RUN chmod +x /usr/local/bin/mc

# [Optional] Uncomment if you want to install an additional version of node using nvm
ARG EXTRA_NODE_VERSION=18
RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
