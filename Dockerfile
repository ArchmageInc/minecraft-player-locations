FROM node:8.15.1-alpine

EXPOSE 8888

COPY ./ /home/node/app

WORKDIR /home/node/app

USER node

CMD ["node","server.js"]