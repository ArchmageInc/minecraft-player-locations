const WebSocket = require('ws');
const Rcon = require('modern-rcon');
const Fs = require('fs');
const Https = require('https');

const config = {
  WEBSOCKET_PORT: Number(process.env.WEBSOCKET_PORT) || 8888,
  WEBSOCKET_KEY: process.env.WEBSOCKET_KEY || '',
  WEBSOCKET_CERT: process.env.WEBSOCKET_CERT || '',
  RCON_HOST: process.env.RCON_HOST,
  RCON_PORT: Number(process.env.RCON_PORT) || 25575,
  RCON_PASSWORD: process.env.RCON_PASSWORD,
  RCON_TIMEOUT: process.env.RCON_TIMEOUT || 5000,
  frequency: 1000,
  debug: process.env.DEBUG || false,
  maxErrors: 5
};

const emptyData = JSON.stringify({});

var rcon,
  connections = [],
  playerData = emptyData,
  rconErrorCount = 0,
  wsIdCounter = 1,
  loopId = -1;

async function initializeRcon() {
  console.info(`Initializing RCON connection to ${config.RCON_HOST}:${config.RCON_PORT}`);
  try {
    rcon = new Rcon(config.RCON_HOST, config.RCON_PORT, config.RCON_PASSWORD, config.RCON_TIMEOUT);
    await connectRcon();
  } catch (error) {
    console.error('Failed to initialize RCON connection');
    if (error.code == 'ECONNREFUSED')
      console.error('RCON port not listening');
    else
      console.error(error);
  }
}

async function connectRcon() {
  if (rcon && !rcon.hasAuthed) {
    console.info('Attempting to establish an RCON connection');
    await rcon.connect();
    console.info('RCON connection established');
    rconErrorCount = 0;
  } else if (!rcon) {
    throw new Error('RCON object not initialized');
  }
}

async function resetRcon() {
  try {
    if (rcon) {
      // custom fix: disconnect is not timing out by itself
      await Promise.any(
        rcon.disconnect(), // try to disconnect
        new Promise(resolve => setTimeout(resolve, config.RCON_TIMEOUT)) // or time out
      );
      rcon = null;
    }
  } catch (error) {
    rcon = null;
  }
}

function initializeWebSocketServer() {
  console.info(`Starting WebSocket Server on port ${config.WEBSOCKET_PORT}`);
  try {
    let webSocketServer;
    if (config.WEBSOCKET_KEY && config.WEBSOCKET_CERT) {
      console.info('Using a secure connection');
      const server = Https.createServer({
        key: Fs.readFileSync(config.WEBSOCKET_KEY),
        cert: Fs.readFileSync(config.WEBSOCKET_CERT)
      });
      webSocketServer = new WebSocket.Server({
        server: server
      });
      server.listen(config.WEBSOCKET_PORT);
    } else {
      webSocketServer = new WebSocket.Server({
        port: config.WEBSOCKET_PORT
      });
    }
    webSocketServer.on('connection', openWebSocketConnection);
  } catch (error) {
    console.error(`Failed to initialize WebSocket Server: `, error);
  }
}

function openWebSocketConnection(ws, req) {
  ws.rconId = wsIdCounter++;
  if (config.debug)
    console.info(`WebSocket connection ${ws.rconId} opened from ${req.connection.remoteAddress}`);
  connections.push(ws);
  ws.on('close', closeWebSocketConnection);
  ws.send(playerData); // send current data
  if (loopId === -1) {
    loopId = setTimeout(loop, config.frequency); // enable loop for first connection
    if (config.debug)
      console.info('Loop started');
  }
}

function closeWebSocketConnection() {
  const index = connections.indexOf(this);
  if (index >= 0)
    connections.splice(index, 1);
  if (config.debug)
    console.info(`WebSocket connection ${this.rconId} closed`);
};

async function loop() {
  if (connections.length === 0) {
    // disable loop, it's not needed atm
    loopId = -1;
    playerData = emptyData;
    if (config.debug)
      console.info('Loop stopped (no connections)');
    return;
  }

  // reconnect
  try {
    if (!rcon)
      await initializeRcon();
    if (!rcon.hasAuthed)
      await connectRcon();
  } catch (error) {
    console.error(`Could not establish rcon connection. Reason: ${error.message}`);
    loopId = setTimeout(loop, config.frequency);
    return;
  }

  // update
  const lastData = playerData;
  try {
    await updatePlayerData();
  } catch (error) {
    console.error(`Could not update player data. Reason: ${error.message}`);
    rconErrorCount++;
    if (rconErrorCount >= config.maxErrors) {
      console.info('Too many RCON errors, attempting to re-establish connection...');
      playerData = emptyData; // reset data too
      await resetRcon();
    }
  }
  if (lastData === playerData) { // nothing changed, skip update
    loopId = setTimeout(loop, config.frequency);
    return;
  }

  // send
  if (config.debug)
    console.info(`Sending player data to ${connections.length} connections`, playerData);
  try {
    connections.forEach((conn) => {
      conn.send(playerData);
    });
  } finally {
    loopId = setTimeout(loop, config.frequency);
  }
}

// 1.16: Additional 'of' after 'max'
const playerListRegex = /There are \d+ of a max(?: of)? \d+ players online: ((?:[^\s,]+,?\s?)*)/
const playerPosRegex = /has the following entity data: \[(-?\d+.?\d*)d, (-?\d+.?\d*)d, (-?\d+.?\d*)d\]/
// 1.16: Dimension can be a string like 'minecraft:overworld'
const playerDimRegex = /has the following entity data: (-?\d+|"[^\s]+")/
const knownDims = ['minecraft:the_nether', 'minecraft:overworld', 'minecraft:the_end'];
async function updatePlayerData() {
  // list players
  const listResponse = await rcon.send('list');
  let regexMatch = playerListRegex.exec(listResponse);
  if (regexMatch === null)
    throw new Error(`Invalid response while listing online players. Response was: ${listResponse}`);

  // to array
  let players = regexMatch[1].split(', ');
  players = players.filter(p => p).sort(); // this ensures comparability for changes

  if (players.length === 0) {
    playerData = emptyData;
    return; // nothing to do
  }

  // get every position
  let newData = {};
  for (const player of players) {
    // position
    let playerResult = await rcon.send(`data get entity ${player} Pos`);
    if (playerResult === 'No entity was found')
      continue; // player left
    regexMatch = playerPosRegex.exec(playerResult);
    if (regexMatch === null)
      throw new Error(`Invalid response while getting player position for player ${player}. Response was: ${playerResult}`);
    const x = parseFloat(regexMatch[1]), y = parseFloat(regexMatch[2]), z = parseFloat(regexMatch[3]);

    // dimension
    playerResult = await rcon.send(`data get entity ${player} Dimension`);
    if (playerResult === 'No entity was found')
      continue; // player left
    regexMatch = playerDimRegex.exec(playerResult);
    if (regexMatch === null)
      throw new Error(`Invalid response while getting player dimension for player ${player}. Response was: ${playerResult}`);
    const dim = parseInt(regexMatch[1]);
    let dim = parseInt(regexMatch[1], 10);
    if (isNaN(dim))
      dim = regexMatch[1].slice(1, -1); // starting with 1.16: dimension is already a string but in quotes
    else
      dim = dim >= -1 && dim <= 1 ? knownDims[dim + 1] : "unknown";

    // combine
    newData[player] = {
      name: player,
      x: x,
      y: y,
      z: z,
      dimension: dim
    };
  }

  // save
  playerData = JSON.stringify(newData);
}

// entry point
initializeRcon();
initializeWebSocketServer();
