var godot = require('godot');
var st = require('./');
//godot.producer.register('sensortag',st);
godot.createServer({
  reactors: [
    function(s) {
      s.pipe(godot.console());
    }
  ]
}).listen(1337);

godot.createClient({
  producers: [
    st()
  ]
}).connect(1337);