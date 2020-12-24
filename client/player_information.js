/* global overviewer, overviewerConfig, L */

class PlayerInformation {
    debug = false    
    currentPlayers = []
    playerMarkers = {}
    _client = null
    
    constructor(socketClient) {
        this._client = socketClient;
        this._client.onMessage(this._update.bind(this));
        overviewer.util.ready(this.initialize.bind(this));
    }
    
    initialize() {
        overviewer.map.on('baselayerchange', this.updatePlayers.bind(this));
    }
    
    updatePlayers() {
        this._clearOfflinePlayers();
        this.currentPlayers.forEach((player) => {
            let marker = this.playerMarkers[player.name];
            if (!marker) {
                marker = this._createMarker(player);
                this.playerMarkers[player.name] = marker;
            }
            
            marker.player = player;
            marker.setLatLng(this._getProperLatLng(player));
            
            if (marker.getPopup().isOpen()) {
                marker.getPopup().update();
            }
        });
    }
    
    togglePlayerPopup(playerName) {
        if (!this.playerMarkers[playerName].isPopupOpen()) {
            overviewer.map.flyTo(this.playerMarkers[playerName].getLatLng());
        }
        this.playerMarkers[playerName].togglePopup();
    }
    
    _clearOfflinePlayers() {
        for (let playerName in this.playerMarkers) {
            if (!this.currentPlayers.filter(player => player.name === playerName).length) {
                this.playerMarkers[playerName].remove();
                delete this.playerMarkers[playerName];
            }
        }
    }
    
    _getProperLatLng(player) {
        let currentWorldName = overviewer.current_layer[overviewer.current_world].tileSetConfig.name.toLowerCase();
        let playerDimension = player.position.dimension.split(':')[1].toLowerCase();
        let position = {
            x: player.position.x, 
            y: player.position.y, 
            z: player.position.z
        };
        
        if ((/nether/i).test(currentWorldName) && (/overworld/i).test(playerDimension)) {
            position = {
                x: player.position.x / 8,
                y: player.position.y,
                z: player.position.z / 8
            };
        }

        if ((/overworld/i).test(currentWorldName) && (/nether/i).test(playerDimension)) {
            position = {
                x: player.position.x * 8,
                y: player.position.y,
                z: player.position.z * 8
            };
        }
        
        return overviewer.util.fromWorldToLatLng(position.x, position.y, position.z, this._getCurrentTileSet());
        
    }
    
    _getCurrentTileSet() {
        return overviewerConfig.tilesets.filter((tileset) => {return tileset.world === overviewer.current_world;})[0];
    }
    
    _createMarker(player) {
        let marker = L.marker([0,0],
            {
                title: player.name
            }
        )
        .setIcon(
            L.icon({
                iconUrl: `https://overviewer.org/avatar/${player.name}`,
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
            }).setContent( (layer) => {
                return `<div>${layer.player.name}</div>
                    <div class="xp"><div class="level">${layer.player.level}</div></div>
                    <div class="hearts health-${Math.min(Math.ceil(layer.player.health),20)}"></div>
                    <div class="food hunger-${Math.min(Math.ceil(layer.player.food),20)}"></div>
                    <div class="air air-${Math.min(Math.ceil(layer.player.air / 30),10)}"></div>
                `;
            })
        )
        .addTo(overviewer.map);

        marker.player = player;
        return marker;
    }
    
    _update(data) {
        this.currentPlayers = data.players;
        this.updatePlayers();
    }
}
