FROM node:12-alpine

EXPOSE 8888

COPY ./ /home/node/app

WORKDIR /home/node/app

USER node

CMD ["node","server.js"]