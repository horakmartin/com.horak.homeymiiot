const Homey = require("homey");
const miio = require("miio");

const params = [
  { siid: 2, piid: 1 }, //onoff
  { siid: 2, piid: 2 }, //fault
  { siid: 2, piid: 5 }, //fan level
  { siid: 2, piid: 6 }, //target humidity
  { siid: 3, piid: 1 }, //relative-humidity
  { siid: 3, piid: 7 }, //temperature
  { siid: 5, piid: 1 }, //alarm
  { siid: 6, piid: 1 }, //light
];

class XiaoMiHumidifier2Lite extends Homey.Device {
  async onInit() {
    //if (process.env.DEBUG === '1') {
		//	require('inspector').open(9222, '0.0.0.0', true);
		//}

    this.log('Device derma.humidifier.jsq2w has been initialized');

    this.initialize = this.initialize.bind(this);
    this.driver = this.homey.drivers.getDriver("deerma.humidifier.jsq2w");
    this.data = this.getData();
    this.initialize();
    this.log("Mi Homey device init | name: " + this.getName() + " - class: " + this.getClass() + " - data: " + JSON.stringify(this.data));
  }

  async initialize() {
    this.registerActions();
    this.registerCapabilities();
    this.getHumidifierStatus();
  }

  registerActions() {
    const { actions } = this.driver;
    this.homey.flow.getActionCard("deerma_humidifier_jsq5_fan_level");
  }

  registerCapabilities() {
    this.registerOnOffButton("onoff");
    this.registerTargetRelativeHumidity("dim");
    this.registerFanLevel("deerma_humidifier_jsq5_fan_level");
  }

  getHumidifierStatus() {
    miio
      .device({ address: this.getSetting("deviceIP"), token: this.getSetting("deviceToken") })
      .then((device) => {
        if (!this.getAvailable()) {
          this.setAvailable();
        }
        this.device = device;

        this.device
          .call("get_properties", params, { retries: 1 })
          .then((result) => {
            const powerResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
            const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
            const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
            const deviceTargetHumidityResult = result.filter((r) => r.siid == 2 && r.piid == 6)[0];
            const deviceTemperatureResult = result.filter((r) => r.siid == 3 && r.piid == 7)[0];
            const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
            const deviceBuzzerResult = result.filter((r) => r.siid == 5 && r.piid == 1)[0];
            const deviceLedBrightnessResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];

            this.updateCapabilityValue("onoff", powerResult.value);
            this.updateCapabilityValue("deerma_humidifier_jsq5_fan_level", "" + deviceFanLevelResult.value);
            this.updateCapabilityValue("dim", +deviceTargetHumidityResult.value);
            this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
            this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
            this.updateCapabilityValue("alarm_water", +deviceFaultResult.value != 0);

            this.setSettings({ led: !!deviceLedBrightnessResult.value });
            this.setSettings({ buzzer: deviceBuzzerResult.value });
          })
          .catch((error) => this.log("Sending commmand 'get_properties' error: ", error));

        const update = this.getSetting("updateTimer") || 60;
        this.updateTimer(update);
      })
      .catch((error) => {
        this.setUnavailable(error.message);
        clearInterval(this.updateInterval);
        setTimeout(() => {
          this.getHumidifierStatus();
        }, 10000);
      });
  }

  updateTimer(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      this.device
        .call("get_properties", params, { retries: 1 })
        .then((result) => {
          if (!this.getAvailable()) {
            this.setAvailable();
          }
          const powerResult = result.filter((r) => r.siid == 2 && r.piid == 1)[0];
          const deviceFaultResult = result.filter((r) => r.siid == 2 && r.piid == 2)[0];
          const deviceFanLevelResult = result.filter((r) => r.siid == 2 && r.piid == 5)[0];
          const deviceTargetHumidityResult = result.filter((r) => r.siid == 2 && r.piid == 6)[0];
          const deviceTemperatureResult = result.filter((r) => r.siid == 3 && r.piid == 7)[0];
          const deviceHumidityResult = result.filter((r) => r.siid == 3 && r.piid == 1)[0];
          const deviceBuzzerResult = result.filter((r) => r.siid == 5 && r.piid == 1)[0];
          const deviceLedBrightnessResult = result.filter((r) => r.siid == 6 && r.piid == 1)[0];

          this.updateCapabilityValue("onoff", powerResult.value);
          this.updateCapabilityValue("deerma_humidifier_jsq5_fan_level", "" + deviceFanLevelResult.value);
          this.updateCapabilityValue("dim", +deviceTargetHumidityResult.value);
          this.updateCapabilityValue("measure_humidity", +deviceHumidityResult.value);
          this.updateCapabilityValue("measure_temperature", +deviceTemperatureResult.value);
          this.updateCapabilityValue("alarm_water", +deviceFaultResult.value != 0);

          this.setSettings({ led: !!deviceLedBrightnessResult.value });
          this.setSettings({ buzzer: deviceBuzzerResult.value });
        })
        .catch((error) => {
          this.log("Sending commmand error: ", error);
          this.setUnavailable(error.message);
          clearInterval(this.updateInterval);
          setTimeout(() => {
            this.getHumidifierStatus();
          }, 1000 * interval);
        });
    }, 1000 * interval);
  }

  updateCapabilityValue(capabilityName, value) {
    if (this.getCapabilityValue(capabilityName) != value) {
      this.setCapabilityValue(capabilityName, value)
        .then(() => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability successfully updated");
        })
        .catch((error) => {
          this.log("[" + this.data.id + "] [" + capabilityName + "] [" + value + "] Capability not updated because there are errors: " + error.message);
        });
    }
  }

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    if (oldSettings.changedKeys.includes("updateTimer") || oldSettings.changedKeys.includes("deviceIP") || oldSettings.changedKeys.includes("deviceToken")) {
      this.getHumidifierStatus();
      return true;
    }

    if (oldSettings.changedKeys.includes("led")) {
      this.device
        .call("set_properties", [{ siid: 6, piid: 1, value: oldSettings.newSettings.led }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + oldSettings.newSettings.led);
          return true;
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          callback(error, false);
        });
    }

    if (oldSettings.changedKeys.includes("buzzer")) {
      this.device
        .call("set_properties", [{ siid: 5, piid: 1, value: oldSettings.newSettings.buzzer }], { retries: 1 })
        .then(() => {
          this.log("Sending " + this.getName() + " commmand: " + oldSettings.newSettings.buzzer);
          return true;
        })
        .catch((error) => {
          this.log("Sending commmand 'set_properties' error: ", error);
          return(error, false);
        });
    }
  }

  registerOnOffButton(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 1, value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerTargetRelativeHumidity(name) {
    this.registerCapabilityListener(name, async (value) => {
      let humidity = value * 100;

      this.device
        .call("set_properties", [{ siid: 2, piid: 6, value: humidity }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFanLevel(name) {
    this.registerCapabilityListener(name, async (value) => {
      this.device
        .call("set_properties", [{ siid: 2, piid: 5, value: +value }], { retries: 1 })
        .then(() => this.log("Sending " + name + " commmand: " + value))
        .catch((error) => this.log("Sending commmand 'set_properties' error: ", error));
    });
  }

  registerFanLevelAction(name, action) {
    action.registerRunListener(async (args, state) => {
      try {
        miio
          .device({
            address: args.device.getSetting("deviceIP"),
            token: args.device.getSetting("deviceToken"),
          })
          .then((device) => {
            device
              .call("set_properties", [{ siid: 2, piid: 5, value: +args.modes }], { retries: 1 })
              .then(() => {
                this.log("Set 'set_properties': ", args.modes);
                device.destroy();
              })
              .catch((error) => {
                this.log("Set 'set_properties' error: ", error.message);
                device.destroy();
              });
          })
          .catch((error) => {
            this.log("miio connect error: " + error);
          });
      } catch (error) {
        this.log("catch error: " + error);
      }
    });
  }

  onDeleted() {
    this.log("Device deleted");
    clearInterval(this.updateInterval);
    if (typeof this.device !== "undefined") {
      this.device.destroy();
    }
  }
}

module.exports = XiaoMiHumidifier2Lite;
