let config = {
  //socketUrl: 'ws://example.com:8888',
  //debug: false,
  //reconnectTime: 5000,
  //defaultChecked: true,
  //addPopup: true
};

function PlayerLocations(config) {
  this.socketUrl = config.socketUrl || ((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.hostname + ':8888');
  this.debug = config.debug || false;
  this.reconnectTime = config.reconnectTime || 5000;
  this.defaultChecked = config.defaultChecked || true;
  this.addPopup = config.addPopup || true;

  this._connection = null;
  this._visibleMarkers = {};
  this._list = {};
  this._layerGroup = null;
  this._ctrl = null;
  this._onLayerAdd = this.onLayerAdd.bind(this);
  this._currentWorld = null;

  overviewer.util.ready(this.reinitialize.bind(this));
  console.info('Player locations plugin for Overviewer loaded');
}

PlayerLocations.prototype.reinitialize = function () {
  if (this._connection === null)
    this.connect(); // first connect

  if (this._ctrl) {
    // remove old and reset
    this._ctrl.remove();
    this._visibleMarkers = {};
    this._layerGroup = null;
    this._ctrl = null;
    window.overviewer.off('layeradd', this._onLayerAdd);
  }

  // add new
  this._layerGroup = L.layerGroup();
  this._ctrl = L.control.layers([], { 'Players': this._layerGroup }, { collapsed: false })
    .addTo(window.overviewer.map);
  if (this.defaultChecked)
    this._layerGroup.addTo(window.overviewer.map);

  this._currentWorld = window.overviewer.current_world;
  window.overviewer.map.on('layeradd', this._onLayerAdd);
  if (this.debug)
    console.info('Player locations plugin for Overviewer initialized');
  if (this._list.length > 0)
    this.updatePlayerMarkers(this._list); // add markers
};

PlayerLocations.prototype.updatePlayerMarkers = function (newList, worldChanged) {
  const newKeys = Object.keys(newList);
  const oldKeys = Object.keys(this._visibleMarkers);
  worldChanged = worldChanged || false;
  const currentDimension = this.getCurrentDimension();

  // remove old players and update existing
  oldKeys.forEach((player) => {
    // world changed, player left, player changed dimensions
    if (worldChanged || !newKeys.includes(player) || newList[player].dimension !== currentDimension) {
      this._visibleMarkers[player].remove();
      delete this._visibleMarkers[player];
    } else
      this._visibleMarkers[player].setLatLng(this.getLatLngForPlayer(newList[player]));
  });

  // add new markers for new players
  newKeys.forEach((player) => {
    // world changed, player joined, player changed dimension
    if ((worldChanged || !oldKeys.includes(player)) && newList[player].dimension === currentDimension) {
      const icon = L.icon({
        iconUrl: 'https://overviewer.org/avatar/' + encodeURIComponent(player),
        iconSize: [16, 32],
        iconAnchor: [20, 30],
        popupAnchor: [-13, -29]
      });

      const marker = L.marker(this.getLatLngForPlayer(newList[player]), {
        icon: icon,
        title: player
      });
      if (this.addPopup)
        marker.bindPopup(player);

      marker.addTo(this._layerGroup);

      this._visibleMarkers[player] = marker;
    }
  });

  this._list = newList;
  if (this.debug)
    console.info('Player markers updated', worldChanged, currentDimension, this._list, this._currentWorld);
};

PlayerLocations.prototype.getLatLngForPlayer = function (playerData) {
  return window.overviewer.util.fromWorldToLatLng(playerData.x, playerData.y, playerData.z, this.getCurrentTileSet());
};

PlayerLocations.prototype.getCurrentDimension = function () {
  // NOTE: this doesn't work for multi world setups or more than these 3 dimensions
  const world = window.overviewer.current_world;
  if (world.endsWith('nether'))
    return -1;
  if (world.endsWith('end'))
    return 1;
  return 0; // default (overworld)
}

PlayerLocations.prototype.getCurrentTileSet = function () {
  return window.overviewer.current_layer[window.overviewer.current_world].tileSetConfig;
};

PlayerLocations.prototype.onLayerAdd = function (layerEvent) {
  // TODO add special event to overviewer itself, this is bad
  try {
    if (this.debug)
      console.info('onLayerAdd', this._currentWorld, window.overviewer.current_world);
    if (this._currentWorld !== window.overviewer.current_world) {
      // switched dimension
      this._currentWorld = window.overviewer.current_world;
      this._ctrl.remove();
      this._ctrl.addTo(window.overviewer.map); // readd menu -> move to bottom
      this.updatePlayerMarkers(this._list, true); // world changed
    }
  } catch (error) {
    if (this.debug)
      console.error('onLayerAdd', error, layerEvent);
  }
};

PlayerLocations.prototype.connect = function () {
  const ws = new WebSocket(this.socketUrl);
  this._connection = ws;
  if (this.debug) {
    ws.onopen = () => {
      console.info('WebSocket connection opened');
    };
  }
  ws.onerror = (error) => {
    if (error.message != null)
      console.error(`WebSocket error: ${error.message}`);
    else
      console.error(`WebSocket error`);
    if (this.debug)
      console.error(error);
  };
  ws.onmessage = (msg) => {
    try {
      let data = JSON.parse(msg.data);
      if (this.debug)
        console.info('WebSocket received data', data);
      this.updatePlayerMarkers(data);
    } catch (error) {
      console.error(`Error parsing WebSocket message: ${error.message}`);
      if (this.debug)
        console.error(error);
    }
  };
  ws.onclose = () => {
    if (this.debug)
      console.info('WebSocket Connection closed');
    this.updatePlayerMarkers({}); // remove markers
    setTimeout(this.connect.bind(this), this.reconnectTime);
  };
};

// initialize
window.PlayerLocations = new PlayerLocations(config);
