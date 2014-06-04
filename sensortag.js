var producer = require('godot-producer');
var Tist = require('tist');

var SensorTagProducer = module.exports = producer(
  function constructor(options) {
    options || (options = {});
    var self = this;

    this.metrics = {};
    this.mappings = options.mappings||{};
    this.tist = options.tist || new Tist(options.uuids, options.tistOptions);
    this.tist.on('device', function onTistDevice(device) {
      device.on('metric', function onMetric(name, value) {
        self.metrics[name] || (self.metrics[name] = []);
        self.metrics[name].push({
          value: value,
          when: Date.now(),
          device: device.uuid
        });
      });
    });
  },
  function produce() {
    var self = this;
    var metrics = this.metrics;

    Object.keys(metrics).forEach(function(sensor) {
      var metric = metrics[sensor];
      var average = metric.reduce(function (prev, row) {
        return (prev + row.value) / 2;
      }, 0);
      var device = metric[0].device;

      self.emit('data', {
        service: sensor,
        host: self.mappings[device]||device,
        meta: {
          uuid: device,
        },
        metric: average
      });
    });

    this.metrics = {};
  }
);