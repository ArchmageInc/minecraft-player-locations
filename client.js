window.PlayerLocations = {
  socketUrl: 'ws://' + window.location.hostname + ':8888',
  debug: false,
  connection: null,
  playerMarkers: {},
  createPlayerMarkers: (list) => {

    for (let playerName in window.PlayerLocations.playerMarkers) {
      if( !list.hasOwnProperty(playerName) ) {
        window.PlayerLocations.playerMarkers[playerName].remove();
        delete window.PlayerLocations.playerMarkers[playerName];
      }
    }
    
    for (let index in list) {
        let playerData = list[index];
        let latlng = overviewer.util.fromWorldToLatLng(playerData.position.x, playerData.position.y, playerData.position.z, window.PlayerLocations.getCurrentTileSet());
        
        if (window.PlayerLocations.playerMarkers[playerData.name]) {
            window.PlayerLocations.playerMarkers[playerData.name].setLatLng(latlng);
        } else {
            let icon =L.icon({
                iconUrl: "https://overviewer.org/avatar/" + playerData.name,
                iconSize: [16, 32],
                iconAnchor: [15, 33]
            });

            let marker = L.marker(latlng, {
                icon: icon,
                title: playerData.name
            });

            marker.addTo(overviewer.map);

            window.PlayerLocations.playerMarkers[playerData.name] = marker;
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
    if (window.PlayerLocations.connection) {
        return;
    }
    let connection = new WebSocket(window.PlayerLocations.socketUrl);
    window.PlayerLocations.connection = connection;
    connection.onopen = () => {
      console.info('WebSocket Connection opened');
    };
    connection.onerror = (error) => {
      console.error(`WebSocket error ${error}`);
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
        window.PlayerLocations.connection = null;
        setTimeout(window.PlayerLocations.connect, 15000);
    };
  }
};

overviewer.util.ready(window.PlayerLocations.initialize);
