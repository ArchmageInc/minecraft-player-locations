class SocketClient {
    debug = false;
    url = "";
    _connection = null;
    _retryMs = 15000;
    _messageHandlers = [];
    
    constructor(url) {
        this.url = url;
    };
    
    onMessage(callback) {
        this._messageHandlers.push(callback);
    }
    
    connect () {
        if (this._connection) {
            if (this.debug) {
                console.info('Attempted to connect while already connected.');
            }
            return;
        }
        if (this.debug) {
            console.info('Attempting to create a new connection.');
        }
        this._connection = new WebSocket(this.url);
        this._connection.onopen = this._onOpen.bind(this);
        this._connection.onclose = this._onClose.bind(this);
        this._connection.onerror = this._onError.bind(this);
        this._connection.onmessage = this._onMessage.bind(this);
    }
    
    disconnect () {
        this._connection.close();
    }
    
    _onMessage (msg) {
        try{
            let data = JSON.parse(msg.data);
            if (this.debug) { 
                console.info('WebSocket data received: ', data);
            }
            
            this._messageHandlers.forEach((callback) => {
                callback(data);
            });
            
        } catch (error) {
            console.error('Error parsing WebSocket message: ', error);
        }
    }
    
    _onError (error) {
        console.error('WebSocket error: ', error);
    }
    
    _onClose () {
        if (this.debug) {
            console.warn(`WebSocket connection closed while in debug mode, manually reconnect.`);
        } else{
            console.warn(`WebSocket connection closed, retrying connection in ${this._retryMs} ms.`);
            this._connection = null;
            setTimeout(this.connect.bind(this), this._retryMs);
        }
    }
    
    _onOpen () {
        if (this.debug) {
            console.info('WebSocket connection opened.');
        }
    }
    
}