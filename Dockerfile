
# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

# Start from the Node.js base image
FROM node:20-alpine

# Use production node environment by default.
ENV NODE_ENV development

RUN mkdir /texlive-setup
WORKDIR /texlive-setup

# Install dependencies required for TeX Live
RUN apk --no-cache add perl wget xz tar ca-certificates fontconfig-dev gcompat python3 py3-pip git

# Download and install TeX Live
RUN wget -q http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz \
    && mkdir install-tl \
    && tar xzf install-tl-unx.tar.gz -C install-tl --strip-components 1

# Install TeX Live
WORKDIR /texlive-setup/install-tl
COPY texlive.profile texlive.profile
RUN ./install-tl --profile=texlive.profile
ENV PATH="/usr/local/texlive/2021/bin/x86_64-linux:${PATH}"

# Update tlmgr and configure it for on-the-fly installation
RUN tlmgr update --self && \
    tlmgr update --all && \
    tlmgr option -- autobackup 0 && \
    tlmgr option repository ctan
    
RUN tlmgr update --self && \
    tlmgr install texliveonfly

# Install npm patch
RUN npm install -g npm@10.7.0

# Install fonts
RUN apk add --no-cache font-noto ttf-freefont msttcorefonts-installer
RUN update-ms-fonts
RUN tlmgr install collection-fontsrecommended
RUN fc-cache -f

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Run the application as a non-root user. NEEDs write access to /usr/src/app
# USER node

# Copy the rest of the source files into the image.
COPY . .

RUN npm install

# Expose the port that the application listens on.
# EXPOSE 1234
