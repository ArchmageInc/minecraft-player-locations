/* global overviewer, L */

class PlayerList {
    _client = null;
    open = false;
    
    constructor(socketClient) {
        this._client = socketClient;
        this._client.onMessage(this._update.bind(this));
        overviewer.util.ready(this.initialize.bind(this));
        
    }
    
    initialize() {
        this.ListClass = L.Control.extend({
            options: {
                position: 'topleft'
            },
            initialize: (options) => {
                L.Util.setOptions(this, options);
                this.list_div = L.DomUtil.create('div', 'player-list-container');
                this.list_toggle = L.DomUtil.create('div', 'list-toggle', this.list_div);
                this.list_ul = L.DomUtil.create('ul', 'player-list', this.list_div);
                
            },
            render: (players) => {
                /* TODO: 
                 * - Setup handlers to goto player on map
                 */
                this.list_ul.innerHTML = '';
                players.forEach(this._playerHTML.bind(this));
            },
            onAdd: () => {
                return this.list_div;
            }
            /* TODO:
             * - Setup toggle to hide / show control
             */
        });
        this.list = new this.ListClass();
        
        this.list.addTo(overviewer.map);
    }
    
    _playerHTML(player) {
        let li = L.DomUtil.create('li', 'player-info', this.list_ul);
        li.innerHTML = `
            <div class="player-icon" onclick="playerLocations.playerInformation.togglePlayerPopup('${player.name}')"><img src="https://overviewer.org/avatar/${player.name}" width="16" height="32" /></div>
            <div class="player-card">
                <div calss="player-name">${player.name}</div>
                <div class="xp"><div class="level">${player.level}</div></div>
                <div class="hearts health-${Math.min(Math.ceil(player.health),20)}"></div>
                <div class="food hunger-${Math.min(Math.ceil(player.food),20)}"></div>
                <div class="air air-${Math.min(Math.ceil(player.air / 30),10)}"></div>
            </div>
        `;
        L.DomEvent.disableClickPropagation(li);
    }
    
    _update(data) {
        this.list.render(data.players);
    }

}