/* global overviewer */

class PlayerLocations {
    url = 'ws://' + window.location.hostname + ':8888'
    serverInformation = null
    playerInformation = null
    playerList = null
    options = {
        showServerInfo: true,
        showPlayerInfo: true,
        showPlayerList: true
    }
    _client = null
    _debug = false
    
    constructor(options) {
        this._client = new SocketClient(this.url);
        this.options = options ? options : this.options;
        
        if (this.options.showServerInfo) {
            this.serverInformation = new ServerInformation(this._client);
        }
        if (this.options.showPlayerInfo) {
            this.playerInformation = new PlayerInformation(this._client);
        }
        if (this.options.showPlayerList) {
            this.playerList = new PlayerList(this._client);
        }
        overviewer.util.ready(this.initialize.bind(this));
    }
    
    initialize() {
        this._client.connect();
    }
    
    debugOn() {
        this._debug = true;
        this._client.debug = true;
    }
    
    debugOff() {
        this._debug = false;
        this._client.debug = false;
    }
    
}

var playerLocations = new PlayerLocations();
