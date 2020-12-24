/* global overviewer, L */

class ServerInformation {
    _client = null;
    clock = null;
    ClockClass = null;
    clockImageDict = {
        0: "clock_00.png",
        1: "clock_01.png",
        2: "clock_02.png",
        3: "clock_03.png",
        4: "clock_04.png",
        5: "clock_05.png",
        6: "clock_06.png",
        7: "clock_07.png",
        8: "clock_08.png",
        9: "clock_09.png",
        10: "clock_10.png",
        11: "clock_11.png",
        12: "clock_12.png",
        13: "clock_13.png",
        14: "clock_14.png",
        15: "clock_15.png",
        16: "clock_16.png",
        17: "clock_17.png",
        18: "clock_18.png",
        19: "clock_19.png",
        20: "clock_20.png",
        21: "clock_21.png",
        22: "clock_22.png",
        23: "clock_23.png",
        24: "clock_24.png",
        25: "clock_25.png",
        26: "clock_26.png",
        27: "clock_27.png",
        28: "clock_28.png",
        29: "clock_29.png",
        30: "clock_30.png",
        31: "clock_31.png",
        32: "clock_32.png",
        33: "clock_33.png",
        34: "clock_34.png",
        35: "clock_35.png",
        36: "clock_36.png",
        37: "clock_37.png",
        38: "clock_38.png",
        39: "clock_39.png",
        40: "clock_40.png",
        41: "clock_41.png",
        42: "clock_42.png",
        43: "clock_43.png",
        44: "clock_44.png",
        45: "clock_45.png",
        46: "clock_46.png",
        47: "clock_47.png",
        48: "clock_48.png",
        49: "clock_49.png",
        50: "clock_50.png",
        51: "clock_51.png",
        52: "clock_52.png",
        53: "clock_53.png",
        54: "clock_54.png",
        55: "clock_55.png",
        56: "clock_56.png",
        57: "clock_57.png",
        58: "clock_58.png",
        59: "clock_59.png",
        60: "clock_60.png",
        61: "clock_61.png",
        62: "clock_62.png",
        63: "clock_63.png",
        64: "clock_64.png"
    };
    
    constructor(socketClient) {
        this._client = socketClient;
        this._client.onMessage(this._update.bind(this));
        overviewer.util.ready(this.initialize.bind(this));
    }
    
    initialize() {
        this.ClockClass = L.Control.extend({
            initialize: (clockImageDict, options) => {
                L.Util.setOptions(this, options);
                this.clock_img = L.DomUtil.create('img', 'clock');
                this.imagedict = clockImageDict;
            },
            render: (currentGameTime) => {
                this.clock_img.src = this.imagedict[Math.floor(currentGameTime/375)];
            },
            onAdd: () => {
                return this.clock_img;
            }
        });
        
        this.clock = new this.ClockClass(this.clockImageDict);
        this.clock.addTo(overviewer.map);
    }
    
    _update(data) {
        this.clock.render(data.timeOfDay);
    }
}