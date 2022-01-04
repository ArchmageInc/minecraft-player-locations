FROM node:12-alpine

EXPOSE 8888
WORKDIR /home/node/app

COPY ./package*.json ./
RUN npm install

COPY . .
USER node
CMD ["node","server.js"]
