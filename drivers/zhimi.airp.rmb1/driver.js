const Homey = require("homey");
const miio = require("miio");

class MiAirPurifier4Lite extends Homey.Driver {
  async onInit() {
    this.log('MyDriver has been initialized');
    const airPurifierMode = this.homey.flow.getActionCard("zhimi_airpurifier_mb4_mode");
  }

  onPair(socket) {
    let pairingDevice = {};
    pairingDevice.name = "Xiaomi Smart Air Purifier 4 Lite";
    pairingDevice.settings = {};
    pairingDevice.data = {};

    socket.on("connect", (data, callback) => {
      this.data = data;
      miio
        .device({ address: data.ip, token: data.token })
        .then((device) => {
          device
            .call("miIO.info", [])
            .then((value) => {
              if (value.model == this.data.model) {
                pairingDevice.data.id = value.mac;
                const params = [{ siid: 2, piid: 1 }];
                device
                  .call("get_properties", params, {
                    retries: 1,
                  })
                  .then((result) => {
                    if (result && result[0].code === 0) {
                      let resultData = {
                        state: result[0],
                      };
                      pairingDevice.settings.deviceIP = this.data.ip;
                      pairingDevice.settings.deviceToken = this.data.token;
                      if (this.data.timer < 5) {
                        pairingDevice.settings.updateTimer = 5;
                      } else if (this.data.timer > 3600) {
                        pairingDevice.settings.updateTimer = 3600;
                      } else {
                        pairingDevice.settings.updateTimer = parseInt(this.data.timer);
                      }

                      callback(null, resultData);
                    }
                  })
                  .catch((error) => callback(null, error));
              } else {
                let result = {
                  notDevice: "It is not Xiaomi Smart Air Purifier 4 Lite",
                };
                pairingDevice.data.id = null;
                callback(null, result);
              }
            })
            .catch((error) => callback(null, error));
        })
        .catch((error) => {
          if (error == "Error: Could not connect to device, handshake timeout") {
            callback(null, "timeout");
          }
          if (error == "Error: Could not connect to device, token might be wrong") {
            callback(null, "wrongToken");
          } else {
            callback(error, "Error");
          }
        });
    });

    socket.on("done", (data, callback) => {
      callback(null, pairingDevice);
    });
  }
}

module.exports = MiAirPurifier4Lite;
