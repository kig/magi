if (typeof Magi == 'undefined') Magi = {};

Magi.loadLibrary = function() {
  var libs = [
    "matrix.js",
    "gl_util.js", "scenegraph.js", "scene_util.js",
    "tar.js", "obj_loader.js", "bin_loader.js"
  ];
  var scripts = document.getElementsByTagName('script');
  var prefix = "";
  var elem = document.head.firstChild;
  for (var i=0; i<scripts.length; i++) {
    var s = scripts[i];
    var src = s.getAttribute('src');
    if (src && (/(^|\/)magi\.js$/).test(src)) {
      prefix = src.slice(0,-7);
      elem = s;
      break;
    }
  }
  for (var i=0; i<libs.length; i++) {
    libs[i] = prefix + libs[i];
  }
  var self = this;
  Magi.loadScripts(libs, function(){ self.loaded(); });
};

Magi.loadScripts = function(libs, onload) {
  var l = libs[0];
  var e = document.createElement('script');
  e.setAttribute('type', 'text/javascript');
  e.setAttribute('src', l);
  var self = this;
  e.addEventListener('load', function() {
    if (libs.length <= 1) {
      onload();
    } else {
      self.loadScripts(libs.slice(1), onload);
    }
  }, false);
  document.head.appendChild(e);
};

Magi.loadListeners = [];
Magi.addLoadListener = function(f){ this.loadListeners.push(f); };

Magi.loaded = function() {
  for (var i=0; i<this.loadListeners.length; i++) {
    this.loadListeners[i].call(this);
  }
  if (this.onload) this.onload();
};

Magi.loadLibrary();

