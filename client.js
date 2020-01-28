window.PlayerLocations = {
  socketUrl: 'ws://' + window.location.hostname + ':8888',
  debug: false,
  connection: {},
  playerMarkers: {},
  createPlayerMarkers: (list) => {

    for (let playerName in window.PlayerLocations.playerMarkers) {
      if( !list.hasOwnProperty(playerName) ) {
        window.PlayerLocations.playerMarkers[playerName].remove();
        delete window.PlayerLocations.playerMarkers[playerName];
      }
    }
   
    for (let playerName in list) {
      let playerData = list[playerName];
      let multi = playerData.dimension === "-1" ? 8 : 1;
      let latlng = overviewer.util.fromWorldToLatLng(playerData.x * multi, playerData.y, playerData.z * multi, window.PlayerLocations.getCurrentTileSet());
      
      if (window.PlayerLocations.playerMarkers[playerName]) {
        window.PlayerLocations.playerMarkers[playerName].setLatLng(latlng);
      } else {
        let icon =L.icon({
          iconUrl: "https://overviewer.org/avatar/" + playerName,
          iconSize: [16, 32],
          iconAnchor: [15, 33]
        });

        let marker = L.marker(latlng, {
          icon: icon,
          title: playerName
        });

        marker.addTo(overviewer.map);

        window.PlayerLocations.playerMarkers[playerName] = marker;
      }

    }
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
  initialize: () => {
    window.PlayerLocations.connect();
  },
  connect: () => {
    let connection = new WebSocket(window.PlayerLocations.socketUrl);
    window.PlayerLocations.connection = connection;
    connection.onopen = () => {
      console.info('WebSocket Connection opened');
    };
    connection.onerror = (error) => {
      console.error(`WebSocket error ${error}`);
      setTimeout(window.PlayerLocations.connect, 3000);
    };
    connection.onmessage = (msg) => {
      try{
        let data = JSON.parse(msg.data);
        if(window.PlayerLocations.debug) {
          console.info('WebSocket received data:', data);
        }
        window.PlayerLocations.createPlayerMarkers(data);
      }catch(error) {
        console.error('Error parsing WebSocket message', error);
      }
    };
    connection.onclose = () => {
      console.info('WebSocket Connection closed');
      setTimeout(window.PlayerLocations.connect(), 3000);
    };
  }
};

overviewer.util.ready(window.PlayerLocations.initialize);
