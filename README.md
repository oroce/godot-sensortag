Sensortag producer for [http://github.com/nodejitsu/godot](godot).

### Example

    var godot = require('godot');
    var sensortag = require('godot-sensortag');
    godot.producer.register('sensortag', sensortag);
    godot.createClient({
      type: 'tcp',,
      producers: [
        godot.producer()
          .sensortag({
            sensors: [
              'irTemperature'
            ]
          })
      ]
    }).connect(1337);
