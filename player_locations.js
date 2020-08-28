window.PlayerLocations = {
  socketUrl: 'ws://' + window.location.hostname + ':8888',
  debug: false,
  connection: null,
  playerMarkers: {},
  currentPlayers: [],
  initialize: () => {
    window.PlayerLocations.connect();
    overviewer.map.on('baselayerchange', window.PlayerLocations.onLayerChange);
  },
  updatePlayers: (playerList) => {
    window.PlayerLocations.currentPlayers = playerList;
    window.PlayerLocations.createPlayerMarkers();
  },
  createPlayerMarkers: () => {

    for (let playerName in window.PlayerLocations.playerMarkers) {
      if( !window.PlayerLocations.currentPlayers.filter(player => player.name === playerName).length ) {
        window.PlayerLocations.playerMarkers[playerName].remove();
        delete window.PlayerLocations.playerMarkers[playerName];
      }
    }
    
    for (let index in window.PlayerLocations.currentPlayers) {
        let playerData = window.PlayerLocations.currentPlayers[index];
        let coords = window.PlayerLocations.getDimensionalCoords(playerData);
        let latlng = overviewer.util.fromWorldToLatLng(coords.x, coords.y, coords.z, window.PlayerLocations.getCurrentTileSet());
        let marker = window.PlayerLocations.playerMarkers[playerData.name];
        
        if (marker) {
            marker.setLatLng(latlng);
        } else {
            marker = L.marker(latlng, 
                {
                    title: playerData.name
                }
            )
            .setIcon(
                L.icon({
                    iconUrl: "https://overviewer.org/avatar/" + playerData.name,
                    iconSize: [16, 32],
                    iconAnchor: [8, 32],
                    popupAnchor: [0, -32]
                })
            )
            .bindPopup(
                L.popup({
                    closeButton: false,
                    keepInView: true,
                    autoPanPadding: [40, 40],
                    className: 'player-location-popup'
                })
                .setContent( (layer) => {
                    return `${layer.playerData.name}`
                })
            )
            .addTo(overviewer.map);
            
            window.PlayerLocations.playerMarkers[playerData.name] = marker;
        }
        
        marker.playerData = playerData;
        
        if (marker.getPopup().isOpen()) {
            marker.getPopup().update();
        }
    }
  },
  getDimensionalCoords: (player) => {
    let currentWorldName = overviewer.current_layer[overviewer.current_world].tileSetConfig.name.toLowerCase();
    let playerDimension = player.position.dimension.split(':')[1].toLowerCase();
    
    if (currentWorldName === "nether" && playerDimension === "overworld") {
        return {
            x: player.position.x / 8,
            y: player.position.y,
            z: player.position.z / 8
        };
    }
    
    if (currentWorldName === "overworld" && playerDimension === "nether") {
        return {
            x: player.position.x * 8,
            y: player.position.y,
            z: player.position.z * 8
        };
    }
    
    return {
        x: player.position.x, 
        y: player.position.y, 
        z: player.position.z
    };
    
  },
  onLayerChange: () => {
    window.PlayerLocations.createPlayerMarkers(window.PlayerLocations.currentPlayers);
  },
  getCurrentTileSet: () => {
    let name = overviewer.current_world;
    for (let index in overviewerConfig.tilesets) {
      let tileset = overviewerConfig.tilesets[index];
      if (tileset.world === name) {
        return tileset;
      }
    }
  },
  onSocketMessage: (msg) =>  {
    try{
        let data = JSON.parse(msg.data);
        if(window.PlayerLocations.debug) {
            console.info('WebSocket received data:', data);
        }
        window.PlayerLocations.updatePlayers(data.players);
    }catch(error) {
        console.error('Error parsing WebSocket message', error);
    }
  },
  onSocketError: (error) => {
    console.error(`WebSocket error ${error}`);
  },
  onSocketClose: () => {
    console.info('WebSocket Connection closed');
    window.PlayerLocations.connection = null;
    setTimeout(window.PlayerLocations.connect, 15000);
  },
  onSocketOpen: () => {
    console.info('WebSocket Connection opened');
  },
  connect: () => {
    if (window.PlayerLocations.connection) {
        return;
    }
    window.PlayerLocations.connection = new WebSocket(window.PlayerLocations.socketUrl);
    window.PlayerLocations.connection.onopen = window.PlayerLocations.onSocketOpen;
    window.PlayerLocations.connection.onerror = window.PlayerLocations.onSocketError;
    window.PlayerLocations.connection.onmessage = window.PlayerLocations.onSocketMessage;
    window.PlayerLocations.connection.onclose = window.PlayerLocations.onSocketClose;
  }
};

overviewer.util.ready(window.PlayerLocations.initialize);
