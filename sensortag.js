var producer = require('godot-producer');
var Tist = require('tist');
var groupBy = require('group-by');
var debug = require('debug')('godot-sensortag');

var SensorTagProducer = module.exports = producer(
  function constructor(options) {
    options || (options = {});
    options.tistOptions || (options.tistOptions = {});

    this.watch = options.tistOptions.watch;
    this.sensors = options.tistOptions.sensors || [];
    var self = this;

    if (options.metricTags !== false) {
      this.metricTags = [].slice.call(options.metricTags||SensorTagProducer.metricTags);
    }
    this.metrics = [];
    this.devices = [];
    this.mappings = options.mappings||{};
    this.tist = options.tist || new Tist(options.uuids, options.tistOptions);
    this.tist.on('device', function onTistDevice(device) {
      debug('device arrived %s', device.uuid)
      self.devices.push(device);
      device.once('disconnect', function() {
        var index = self.devices.indexOf(device);
        self.devices.slice(index, 1);
        device.removeListener('metric');
        device = null;
      });
      device.on('metric', function onMetric(name, value) {
        self.metrics.push({
          sensor: name,
          value: value,
          when: Date.now(),
          device: device.uuid
        });
      });
    });
  },
  function produce() {
    var self = this;
    var send = function(metrics) {
      var events = toEvents(metrics, self.mappings, self.values, self.metricTags);
      events.forEach(function(data) {
        debug('emitting data %j', data);
        self.emit('data', data);
      });
    };

    if (this.watch === false && this.devices.length === 0) {
      debug('no device yet, nothing to crunch');
      return;
    }

    if (this.watch === false) {
      this.devices.forEach(function(device) {
        this.sensors.forEach(function(sensor) {
          device.read(sensor, function(err, metrics) {
            var list = metrics.map(function(metric) {
              return {
                sensor: metric.name,
                value: metric.value,
                when: Date.now(),
                device: device.uuid
              };
            });
            send(list);
          });
        });
      }, this);
    } else {
      send(this.metrics);
    }

    this.metrics = [];
  }
);

function toEvents(metrics, mappings, values, metricsTags) {
  debug('crunching metrics %j', metrics);
  var list = [];
  var byDevices = groupBy(metrics, 'device'); 
  Object.keys(byDevices).forEach(function(device) {
    var bySensors = groupBy(byDevices[device], 'sensor')
    Object.keys(bySensors).forEach(function(sensor) {
      var sensorValues = bySensors[sensor];
      var average;
      if (sensorValues.length === 1) {
        average = sensorValues[0].value;
      } else {
        average = sensorValues.reduce(function (prev, row) {
          return (prev + row.value) / 2;
        }, 0);
      }

      var data = {
        service: sensor,
        host: mappings[device]||device,
        meta: {
          uuid: device,
        },
        tags: (values.tags||[]).concat(metricsTags),
        metric: average
      };
      list.push(data);
    });
  });
  return list;
}
SensorTagProducer.metricTags = ['st-metric'];