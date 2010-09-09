
Magi = {};

R = function(start, end) {
  var a = []
  for (var i=start; i<end; i++) a.push(i)
  return a
}
Rg = function(start, last) {
  return R(start, last+1)
}

/**
  Delete the first instance of obj from the array.

  @param obj The object to delete
  @return true on success, false if array contains no instances of obj
  @type boolean
  @addon
  */
Array.prototype.deleteFirst = function(obj) {
  for (var i=0; i<this.length; i++) {
    if (this[i] == obj) {
      this.splice(i,1)
      return true
    }
  }
  return false
}

/**
  Returns true if f returns true for all elements in this.
  */
Array.prototype.all = function(f) {
  for (var i=0; i<this.length; i++) {
    if (!f(this[i], i, this)) return false
  }
  return true
}

/**
  Returns true if f returns true for any element in this.
  */
Array.prototype.any = function(f) {
  for (var i=0; i<this.length; i++) {
    if (f(this[i], i, this)) return true
  }
  return false
}

/**
  Returns true if all the elements in this are non-null attributes of obj.
  */
Array.prototype.allIn = function(obj) {
  return this.all(function(k){ return obj[k] != null })
}

/**
  Returns true if any element in this is a non-null attribute of obj.
  */
Array.prototype.anyIn = function(obj) {
  return this.any(function(k){ return obj[k] != null })
}

/**
  Compares two arrays for equality. Returns true if the arrays are equal.
  */
Array.prototype.equals = function(array) {
  if (!array) return false
  if (this.length != array.length) return false
  for (var i=0; i<this.length; i++) {
    var a = this[i]
    var b = array[i]
    if (a.equals && typeof(a.equals) == 'function') {
      if (!a.equals(b)) return false
    } else if (a != b) {
      return false
    }
  }
  return true
}

/**
  Rotates the first element of an array to be the last element.
  Rotates last element to be the first element when backToFront is true.

  @param {boolean} backToFront Whether to move the last element to the front or not
  @return The last element when backToFront is false, the first element when backToFront is true
  @addon
  */
Array.prototype.rotate = function(backToFront) {
  if (backToFront) {
    this.unshift(this.pop())
    return this[0]
  } else {
    this.push(this.shift())
    return this[this.length-1]
  }
}
/**
  Returns a random element from the array.

  @return A random element
  @addon
 */
Array.prototype.random = function() {
  return this[Math.floor(Math.random()*this.length)]
}

Array.prototype.flatten = function() {
  var a = []
  for (var i=0; i<this.length; i++) {
    var e = this[i]
    if (e.flatten) {
      var ef = e.flatten()
      for (var j=0; j<ef.length; j++) {
        a[a.length] = ef[j]
      }
    } else {
      a[a.length] = e
    }
  }
  return a
}

Array.prototype.take = function() {
  var a = []
  for (var i=0; i<this.length; i++) {
    var e = []
    for (var j=0; j<arguments.length; j++) {
      e[j] = this[i][arguments[j]]
    }
    a[i] = e
  }
  return a
}

if (!Array.prototype.pluck) {
  Array.prototype.pluck = function(key) {
    var a = []
    for (var i=0; i<this.length; i++) {
      a[i] = this[i][key]
    }
    return a
  }
}

Array.prototype.set = function(key, value) {
  for (var i=0; i<this.length; i++) {
    this[i][key] = value
  }
}

Array.prototype.allWith = function() {
  var a = []
  topLoop:
  for (var i=0; i<this.length; i++) {
    var e = this[i]
    for (var j=0; j<arguments.length; j++) {
      if (!this[i][arguments[j]])
        continue topLoop
    }
    a[a.length] = e
  }
  return a
}

Array.prototype.bsearch = function(key) {
  var low = 0
  var high = this.length - 1
  while (low <= high) {
    var mid = low + ((high - low) >> 1) // low + (high - low) / 2, int division
    var midVal = this[mid]

    if (midVal < key)
      low = mid + 1
    else if (midVal > key)
      high = mid - 1
    else
      return mid
  }
  return -1
}

Array.prototype.sortNum = function() {
  return this.sort(function(a,b){ return (a > b ? 1 : (a < b ? -1 : 0)) })
}

Element.prototype.append = function() {
  for(var i=0; i<arguments.length; i++) {
    if (typeof(arguments[i]) == 'string') {
      this.appendChild(T(arguments[i]))
    } else {
      this.appendChild(arguments[i])
    }
  }
}

// some common helper methods

if (!Function.prototype.bind) {
  /**
    Creates a function that calls this function in the scope of the given
    object.

      var obj = { x: 'obj' }
      var f = function() { return this.x }
      window.x = 'window'
      f()
      // => 'window'
      var g = f.bind(obj)
      g()
      // => 'obj'

    @param object Object to bind this function to
    @return Function bound to object
    @addon
    */
  Function.prototype.bind = function(object) {
    var t = this
    return function() {
      return t.apply(object, arguments)
    }
  }
}

if (!Array.prototype.last) {
  /**
    Returns the last element of the array.

    @return The last element of the array
    @addon
    */
  Array.prototype.last = function() {
    return this[this.length-1]
  }
}
if (!Array.prototype.indexOf) {
  /**
    Returns the index of obj if it is in the array.
    Returns -1 otherwise.

    @param obj The object to find from the array.
    @return The index of obj or -1 if obj isn't in the array.
    @addon
    */
  Array.prototype.indexOf = function(obj) {
    for (var i=0; i<this.length; i++)
      if (obj == this[i]) return i
    return -1
  }
}
/**
  Iterate function f over each element of the array and return an array
  of the return values.

  @param f Function to apply to each element
  @return An array of return values from applying f on each element of the array
  @type Array
  @addon
  */
Array.prototype.map = function(f) {
  var na = new Array(this.length)
  if (f)
    for (var i=0; i<this.length; i++) na[i] = f(this[i], i, this)
  else
    for (var i=0; i<this.length; i++) na[i] = this[i]
  return na
}
Array.prototype.forEach = function(f) {
  for (var i=0; i<this.length; i++) f(this[i], i, this)
}
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function(f, s) {
    var i = 0
    if (arguments.length == 1) {
      s = this[0]
      i++
    }
    for(; i<this.length; i++) {
      s = f(s, this[i], i, this)
    }
    return s
  }
}
if (!Array.prototype.find) {
  Array.prototype.find = function(f) {
    for(var i=0; i<this.length; i++) {
      if (f(this[i], i, this)) return this[i]
    }
  }
}

if (!String.prototype.capitalize) {
  /**
    Returns a copy of this string with the first character uppercased.

    @return Capitalized version of the string
    @type String
    @addon
    */
  String.prototype.capitalize = function() {
    return this.replace(/^./, this.slice(0,1).toUpperCase())
  }
}

if (!String.prototype.escape) {
  /**
    Returns a version of the string that can be used as a string literal.

    @return Copy of string enclosed in double-quotes, with double-quotes
            inside string escaped.
    @type String
    @addon
    */
  String.prototype.escape = function() {
    return '"' + this.replace(/"/g, '\\"') + '"'
  }
}
if (!String.prototype.splice) {
  String.prototype.splice = function(start, count, replacement) {
    return this.slice(0,start) + replacement + this.slice(start+count)
  }
}
if (!String.prototype.strip) {
  /**
    Returns a copy of the string with preceding and trailing whitespace
    removed.

    @return Copy of string sans surrounding whitespace.
    @type String
    @addon
    */
  String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '')
  }
}

if (!window['$A']) {
  /**
    Creates a new array from an object with #length.
    */
  $A = function(obj) {
    var a = new Array(obj.length)
    for (var i=0; i<obj.length; i++)
      a[i] = obj[i]
    return a
  }
}

if (!window['$']) {
  $ = function(id) {
    return document.getElementById(id)
  }
}

if (!Math.sinh) {
  /**
    Returns the hyperbolic sine of x.

    @param x The value for x
    @return The hyperbolic sine of x
    @addon
    */
  Math.sinh = function(x) {
    return 0.5 * (Math.exp(x) - Math.exp(-x))
  }
  /**
    Returns the inverse hyperbolic sine of x.

    @param x The value for x
    @return The inverse hyperbolic sine of x
    @addon
    */
  Math.asinh = function(x) {
    return Math.log(x + Math.sqrt(x*x + 1))
  }
}
if (!Math.cosh) {
  /**
    Returns the hyperbolic cosine of x.

    @param x The value for x
    @return The hyperbolic cosine of x
    @addon
    */
  Math.cosh = function(x) {
    return 0.5 * (Math.exp(x) + Math.exp(-x))
  }
  /**
    Returns the inverse hyperbolic cosine of x.

    @param x The value for x
    @return The inverse hyperbolic cosine of x
    @addon
    */
  Math.acosh = function(x) {
    return Math.log(x + Math.sqrt(x*x - 1))
  }
}

/**
  Creates and configures a DOM element.

  The tag of the element is given by name.

  If params is a string, it is used as the innerHTML of the created element.
  If params is a DOM element, it is appended to the created element.
  If params is an object, it is treated as a config object and merged
  with the created element.

  If params is a string or DOM element, the third argument is treated
  as the config object.

  Special attributes of the config object:
    * content
      - if content is a string, it is used as the innerHTML of the
        created element
      - if content is an element, it is appended to the created element
    * style
      - the style object is merged with the created element's style

  @param {String} name The tag for the created element
  @param params The content or config for the created element
  @param config The config for the created element if params is content
  @return The created DOM element
  */
E = function(name) {
  var el = document.createElement(name);
  for (var i=1; i<arguments.length; i++) {
    var params = arguments[i];
    if (typeof(params) == 'string') {
      el.innerHTML += params;
    } else if (params.DOCUMENT_NODE) {
      el.appendChild(params);
    } else if (params.length) {
      for (var j=0; j<params.length; j++) {
        var p = params[j];
        if (params.DOCUMENT_NODE)
          el.appendChild(p);
        else
          el.innerHTML += p;
      }
    } else {
      if (params.style) {
        var style = params.style;
        params = Object.clone(params);
        delete params.style;
        Object.forceExtend(el.style, style);
      }
      if (params.content) {
        if (typeof(params.content) == 'string') {
          el.appendChild(T(params.content));
        } else {
          var a = params.content;
          if (!a.length) a = [a];
          a.forEach(function(p){ el.appendChild(p); });
        }
        params = Object.clone(params)
        delete params.content
      }
      Object.forceExtend(el, params)
    }
  }
  return el;
}
// Safari requires each canvas to have a unique id.
E.lastCanvasId = 0
/**
  Creates and returns a canvas element with width w and height h.

  @param {int} w The width for the canvas
  @param {int} h The height for the canvas
  @param config Optional config object to pass to E()
  @return The created canvas element
  */
E.canvas = function(w,h,config) {
  var id = 'canvas-uuid-' + E.lastCanvasId
  E.lastCanvasId++
  if (!config) config = {}
  return E('canvas', Object.extend(config, {id: id, width: w, height: h}))
}

E.make = function(tagName){
  return (function() {
    var args = [tagName];
    for (var i=0; i<arguments.length; i++) args.push(arguments[i]);
    return E.apply(E, args);
  });
}
E.tags = "a abbr acronym address area audio b base bdo big blockquote body br button canvas caption center cite code col colgroup dd del dfn div dl dt em fieldset form frame frameset h1 h2 h3 h4 h5 h6 head hr html i iframe img input ins kbd labeel legend li link map meta noframes noscript object ol optgroup option p param pre q s samp script select small span strike strong style sub sup table tbody td textarea tfoot th thead title tr tt u ul var video".toUpperCase().split(" ");
(function() {
  E.tags.forEach(function(t) {
    window[t] = E[t] = E.make(t);
  });
  var makeInput = function(t) {
    return (function(value) {
      var args = [{type: t}];
      var i = 0;
      if (typeof(value) == 'string') {
        args[0].value = value;
        i++;
      }
      for (; i<arguments.length; i++) args.push(arguments[i]);
      return E.INPUT.apply(E, args);
    });
  };
  var inputs = ['SUBMIT', 'TEXT', 'RESET', 'HIDDEN', 'CHECKBOX'];
  inputs.forEach(function(t) {
    window[t] = E[t] = makeInput(t);
  });
})();

/**
  Creates a cropped version of an image.
  Does the cropping by putting the image inside a DIV and using CSS
  to crop the image to the wanted rectangle.

  @param image The image element to crop.
  @param {int} x The left side of the crop box.
  @param {int} y The top side of the crop box.
  @param {int} w The width of the crop box.
  @param {int} h The height of the crop box.
  */
E.cropImage = function(image, x, y, w, h) {
  var i = image.cloneNode(false)
  Object.forceExtend(i.style, {
    position: 'relative',
    left: -x + 'px',
    top : -y + 'px',
    margin: '0px',
    padding: '0px',
    border: '0px'
  })
  var e = E('div', {style: {
    display: 'block',
    width: w + 'px',
    height: h + 'px',
    overflow: 'hidden'
  }})
  e.appendChild(i)
  return e
}

/**
  Shortcut for document.createTextNode.

  @param {String} text The text for the text node
  @return The created text node
  */
T = function(text) {
  return document.createTextNode(text)
}

/**
  Merges the src object's attributes with the dst object, ignoring errors.

  @param dst The destination object
  @param src The source object
  @return The dst object
  @addon
  */
Object.forceExtend = function(dst, src) {
  for (var i in src) {
    try{ dst[i] = src[i] } catch(e) {}
  }
  return dst
}
// In case Object.extend isn't defined already, set it to Object.forceExtend.
if (!Object.extend)
  Object.extend = Object.forceExtend

/**
  Merges the src object's attributes with the dst object, preserving all dst
  object's current attributes.

  @param dst The destination object
  @param src The source object
  @return The dst object
  @addon
  */
Object.conditionalExtend = function(dst, src) {
  for (var i in src) {
    if (dst[i] == null)
      dst[i] = src[i]
  }
  return dst
}

/**
  Creates and returns a shallow copy of the src object.

  @param src The source object
  @return A clone of the src object
  @addon
  */
Object.clone = function(src) {
  if (!src || src == true)
    return src
  switch (typeof(src)) {
    case 'string':
      return Object.extend(src+'', src)
      break
    case 'number':
      return src
      break
    case 'function':
      obj = eval(src.toSource())
      return Object.extend(obj, src)
      break
    case 'object':
      if (src instanceof Array) {
        return Object.extend([], src)
      } else {
        return Object.extend({}, src)
      }
      break
  }
}

/**
  Creates and returns an Image object, with source URL set to src and
  onload handler set to onload.

  @param {String} src The source URL for the image
  @param {Function} onload The onload handler for the image
  @return The created Image object
  @type {Image}
  */
Object.loadImage = function(src, onload) {
  var img = new Image()
  if (onload)
    img.onload = onload
  img.src = src
  return img
}

/**
  Returns true if image is fully loaded and ready for use.

  @param image The image to check
  @return Whether the image is loaded or not
  @type {boolean}
  @addon
  */
Object.isImageLoaded = function(image) {
  if (image.tagName == 'CANVAS') return true
  if (!image.complete) return false
  if (image.naturalWidth != null && image.naturalWidth == 0) return false
  if (image.width == null || image.width == 0) return false
  return true
}

/**
  Sums two objects.
  */
Object.sum = function(a,b) {
  if (a instanceof Array) {
    if (b instanceof Array) {
      var ab = []
      for (var i=0; i<a.length; i++) {
        ab[i] = a[i] + b[i]
      }
      return ab
    } else {
      return a.map(function(v){ return v + b })
    }
  } else if (b instanceof Array) {
    return b.map(function(v){ return v + a })
  } else {
    return a + b
  }
}

/**
  Substracts b from a.
  */
Object.sub = function(a,b) {
  if (a instanceof Array) {
    if (b instanceof Array) {
      var ab = []
      for (var i=0; i<a.length; i++) {
        ab[i] = a[i] - b[i]
      }
      return ab
    } else {
      return a.map(function(v){ return v - b })
    }
  } else if (b instanceof Array) {
    return b.map(function(v){ return a - v })
  } else {
    return a - b
  }
}

/**
  Deletes all attributes from an object.
  */
Object.clear = function(obj) {
  for (var i in obj) delete obj[i]
  return obj
}

if (!window.Mouse) Mouse = {}
/**
  Returns the coordinates for a mouse event relative to element.
  Element must be the target for the event.

  @param element The element to compare against
  @param event The mouse event
  @return An object of form {x: relative_x, y: relative_y}
  */
Mouse.getRelativeCoords = function(element, event) {
  var xy = {x:0, y:0}
  var osl = 0
  var ost = 0
  var el = element
  while (el) {
    osl += el.offsetLeft
    ost += el.offsetTop
    el = el.offsetParent
  }
  xy.x = event.pageX - osl
  xy.y = event.pageY - ost
  return xy
}

Browser = (function(){
  var ua = window.navigator.userAgent
  var safari = ua.match(/Safari/)
  var mobile = ua.match(/Mobile/)
  var webkit = ua.match(/WebKit\/\d+/)
  var khtml = ua.match(/KHTML/)
  var gecko = ua.match(/Gecko/)
  var ie = ua.match(/Explorer/)
  if (mobile && safari) return 'Mobile Safari'
  if (safari) return 'Safari'
  if (webkit) return 'Webkit'
  if (khtml) return 'KHTML'
  if (gecko) return 'Gecko'
  if (ie) return 'IE'
  return 'UNKNOWN'
})()


Mouse.LEFT = 0
Mouse.MIDDLE = 1
Mouse.RIGHT = 2

if (Browser == 'IE') {
  Mouse.LEFT = 1
  Mouse.MIDDLE = 4
}

Mouse.state = {}
window.addEventListener('mousedown', function(ev) {
  Mouse.state[ev.button] = true
}, true)
window.addEventListener('mouseup', function(ev) {
  Mouse.state[ev.button] = false
}, true)


Event = {
  cancel : function(event) {
    if (event.preventDefault) event.preventDefault()
  },

  stop : function(event) {
    Event.cancel(event)
    if (event.stopPropagation) event.stopPropagation()
  }
}


Key = {
  matchCode : function(event, code) {
    if (typeof code == 'string')
      code = code.toUpperCase().charCodeAt(0);
    return (
      event.which == code ||
      event.keyCode == code ||
      event.charCode == code
    );
  },

  match : function(event, key) {
    for (var i=1; i<arguments.length; i++) {
      if (arguments[i].length != null && typeof arguments[i] != 'string') {
        for (var j=0; j<arguments[i].length; j++) {
          if (Key.matchCode(event, arguments[i][j])) return true;
        }
      } else {
        if (Key.matchCode(event, arguments[i])) return true;
      }
    }
    return false;
  },

  isNumber : function(event, key) {
    var k = event.which || event.keyCode || event.charCode;
    return k >= Key.N_0 && k <= Key.N_9;
  },

  number : function(event, key) {
    var k = event.which || event.keyCode || event.charCode;
    if (k < Key.N_0 || k > Key.N_9) return NaN;
    return k - Key.N_0;
  },

  getString : function(event) {
    var k = event.which || event.keyCode || event.charCode;
    return String.fromCharCode(k);
  },

  N_0: 48,
  N_1: 49,
  N_2: 50,
  N_3: 51,
  N_4: 52,
  N_5: 53,
  N_6: 54,
  N_7: 55,
  N_8: 56,
  N_9: 57,

  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  ESC: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  INSERT: 45,
  DELETE: 46
}


/**
  Klass is a function that returns a constructor function.

  The constructor function calls #initialize with its arguments.

  The parameters to Klass have their prototypes or themselves merged with the
  constructor function's prototype.

  Finally, the constructor function's prototype is merged with the constructor
  function. So you can write Shape.getArea.call(this) instead of
  Shape.prototype.getArea.call(this).

  Shape = Klass({
    getArea : function() {
      raise('No area defined!')
    }
  })

  Rectangle = Klass(Shape, {
    initialize : function(x, y) {
      this.x = x
      this.y = y
    },

    getArea : function() {
      return this.x * this.y
    }
  })

  Square = Klass(Rectangle, {
    initialize : function(s) {
      Rectangle.initialize.call(this, s, s)
    }
  })

  new Square(5).getArea()
  //=> 25

  @return Constructor object for the class
  */
Klass = function() {
  var c = function() {
    this.initialize.apply(this, arguments)
  }
  c.ancestors = $A(arguments)
  c.prototype = {}
  for(var i = 0; i<arguments.length; i++) {
    var a = arguments[i]
    if (a.prototype) {
      Object.extend(c.prototype, a.prototype)
    } else {
      Object.extend(c.prototype, a)
    }
  }
  Object.extend(c, c.prototype)
  return c
}


Query = {
  parse : function(params) {
    var obj = {}
    if (!params) return obj
    params.split("&").forEach(function(p){
      var kv = p.replace(/\+/g, " ").split("=").map(decodeURIComponent)
      obj[kv[0]] = kv[1]
    })
    return obj
  },

  build : function(query) {
    if (typeof query == 'string') return encodeURIComponent(query)
    if (query instanceof Array) {
      a = query
    } else {
      var a = []
      for (var i in query) {
        if (query[i] != null)
          a.push([i, query[i]])
      }
    }
    return a.map(function(p){ return p.map(encodeURIComponent).join("=") }).join("&")
  }
}

URL = {
  build : function(base, params, fragment) {
    return base + (params != null ? '?'+Query.build(params) : '') +
                  (fragment != null ? '#'+Query.build(fragment) : '')
  },

  parse : function(url) {
    var gf = url.split("#");
    var gp = gf[0].split("?");
    var base = gp[0];
    var pr = base.split("://");
    var protocol = pr[0];
    var path = pr[1] || pr[0];
    return {
      base: base,
      path: path,
      protocol: protocol,
      query: Query.parse(gp[1]),
      fragment: gf[1],
      build: URL.__build__
    };
  },

  __build__ : function() {
    return URL.build(this.base, this.query, this.fragment)
  }

}

Magi.checkError = function(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    Magi.log("Error " + e + " at " + msg);
  }
  return e;
}

Magi.throwError = function(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    throw(new Error("Error " + e + " at " + msg));
  }
}


Magi.Texture = Klass({
  target : 'TEXTURE_2D',
  generateMipmaps : true,
  width : null,
  height : null,
  data : null,
  changed : false,

  initialize : function(gl) {
    this.gl = gl;
  },

  defaultTexCache : {},
  getDefaultTexture : function(gl) {
    if (!this.defaultTexCache[gl]) {
      var tex = new this(gl);
      tex.image = E.canvas(1,1);
      tex.generateMipmaps = false;
      this.defaultTexCache[gl] = tex;
    }
    return this.defaultTexCache[gl];
  },

  upload : function() {
    var gl = this.gl;
    var target = gl[this.target];
    if (this.image)
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    else
      gl.texImage2D(target, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, this.data);
    Magi.checkError(gl, "Texture.upload");
  },
  
  regenerateMipmap : function() {
    var gl = this.gl;
    var target = gl[this.target];
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (this.generateMipmaps) {
      gl.generateMipmap(target);
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
  },
  
  compile: function(){
    var gl = this.gl;
    var target = gl[this.target];
    this.textureObject = gl.createTexture();
    Magi.Stats.textureCreationCount++;
    gl.bindTexture(target, this.textureObject);
    this.upload();
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.regenerateMipmap();
  },
  
  use : function() {
    if (this.textureObject == null)
      this.compile();
    this.gl.bindTexture(this.gl[this.target], this.textureObject);
    if (this.changed) {
      this.upload();
      this.regenerateMipmap();
      this.changed = false;
    }
  }
});


Magi.Shader = Klass({
  id : null,
  gl : null,
  compiled : false,
  shader : null,
  shaders : [],

  initialize : function(gl){
    this.gl = gl;
    this.shaders = [];
    this.uniformLocations = {};
    this.attribLocations = {};
    for (var i=1; i<arguments.length; i++) {
      this.shaders.push(arguments[i]);
    }
  },

  destroy : function() {
    if (this.shader != null) 
      Magi.Shader.deleteShader(this.gl, this.shader);
  },

  compile : function() {
    this.shader = Magi.Shader.getProgramByMixedArray(this.gl, this.shaders);
  },

  use : function() {
    if (this.shader == null)
      this.compile();
    this.gl.useProgram(this.shader.program);
  },
  
  getInfoLog : function() {
    if (this.shader == null) 
      this.compile();
    var gl = this.gl;
    var plog = gl.getProgramInfoLog(this.shader.program);
    var slog = this.shader.shaders.map(function(s){ return gl.getShaderInfoLog(s); }).join("\n\n");
    return plog + "\n\n" + slog;
  },

  uniform1fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform1fv(loc, value);
  },

  uniform2fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform2fv(loc, value);
  },

  uniform3fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform3fv(loc, value);
  },

  uniform4fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform4fv(loc, value);
  },
  
  uniform1f : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform1f(loc, value);
  },

  uniform2f : function(name, v1,v2) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform2f(loc, v1,v2);
  },

  uniform3f : function(name, v1,v2,v3) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform3f(loc, v1,v2,v3);
  },

  uniform4f : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform4f(loc, v1, v2, v3, v4);
  },
  
  uniform1iv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform1iv(loc, value);
  },

  uniform2iv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform2iv(loc, value);
  },

  uniform3iv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform3iv(loc, value);
  },

  uniform4iv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform4iv(loc, value);
  },

  uniform1i : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform1i(loc, value);
  },

  uniform2i : function(name, v1,v2) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform2i(loc, v1,v2);
  },

  uniform3i : function(name, v1,v2,v3) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform3i(loc, v1,v2,v3);
  },

  uniform4i : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniform4i(loc, v1, v2, v3, v4);
  },

  uniformMatrix4fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniformMatrix4fv(loc, false, value);
  },

  uniformMatrix3fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniformMatrix3fv(loc, false, value);
  },

  uniformMatrix2fv : function(name, value) {
    var loc = this.uniform(name);
    if (loc != null) this.gl.uniformMatrix2fv(loc, false, value);
  },

  attrib : function(name) {
    if (this.attribLocations[name] == null) {
      var loc = this.gl.getAttribLocation(this.shader.program, name);
      this.attribLocations[name] = loc;
    }
    return this.attribLocations[name];
  },

  uniform : function(name) {
    if (this.uniformLocations[name] == null) {
      var loc = this.gl.getUniformLocation(this.shader.program, name);
      this.uniformLocations[name] = loc;
    }
    return this.uniformLocations[name];
  }
});

Magi.Shader.createShader = function(gl, type, source) {
  if (typeof type == 'string') type = gl[type];
  var shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) != 1) {
    var ilog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw(new Error("Failed to compile shader. Shader info log: " + ilog));
  }
  return shader;
}

Magi.Shader.getShaderById = function(gl, id) {
  var el = document.getElementById(id);
  if (!el) throw(new Error("getShaderById: No element has id "+id));
  var type, stype = el.getAttribute("type");
  if (stype == "text/x-glsl-fs")
    type = gl.FRAGMENT_SHADER;
  else if (stype == "text/x-glsl-vs")
    type = gl.VERTEX_SHADER;
  else
    throw(new Error("getShaderById: Unknown shader type "+stype));
  return this.createShader(gl, type, el.textContent);
}

Magi.Shader.loadShader = function(gl, src, callback, onerror, type) {
  if (!type) {
    var a = src.split(".");
    var ext = a[a.length-1].toLowerCase();
    if (ext == 'frag') type = gl.FRAGMENT_SHADER;
    else if (ext == 'vert') type = gl.VERTEX_SHADER;
    else throw(new Error("loadShader: Unknown shader extension "+ext));
  }
  var self = this;
  var xhr = new XMLHttpRequest;
  xhr.onsuccess = function(res) {
    var shader = self.createShader(gl, type, res.responseText);
    callback(shader, res);
  };
  xhr.onerror = function(res) {
    if (onerror)
      onerror(res);
    else
      throw(new Error("loadShader: Failed to load shader "+res.status));
  };
  xhr.open("GET", src, true);
  xhr.send(null);
  return xhr;
}

Magi.Shader.createProgram = function(gl, shaders) {
  var id = gl.createProgram();
  var shaderObjs = [];
  for (var i=0; i<shaders.length; ++i) {
    try {
      var sh = shaders[i];
      shaderObjs.push(sh);
      gl.attachShader(id, sh);
    } catch (e) {
      var pr = {program: id, shaders: shaderObjs};
      this.deleteShader(gl, pr);
      throw (e);
    }
  }
  var prog = {program: id, shaders: shaderObjs};
  gl.linkProgram(id);
  gl.validateProgram(id);
  if (gl.getProgramParameter(id, gl.LINK_STATUS) != 1) {
    this.deleteShader(gl,prog);
    throw(new Error("Failed to link shader: "+gl.getProgramInfoLog(id)));
  }
  if (gl.getProgramParameter(id, gl.VALIDATE_STATUS) != 1) {
    this.deleteShader(gl,prog);
    throw(new Error("Failed to validate shader"));
  }
  return prog;
}
Magi.Shader.loadProgramArray = function(gl, sources, callback, onerror) {
  var self = this;
  var sourcesCopy = sources.slice(0);
  var shaders = [];
  var iterate;
  iterate = function(sh) {
    shaders.push(sh);
    if (sourcesCopy.length == 0) {
      try {
        var p = self.createProgram(gl, shaders);
        callback(p);
      } catch (e) { onerror(e); }
    } else {
      var src = sourcesCopy.shift();
      self.loadShader(gl, src, iterate, onerror);
    }
  }
  var src = sourcesCopy.shift();
  self.loadShader(gl, src, iterate, onerror);
}
Magi.Shader.loadProgram = function(gl, callback) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  return this.loadProgramArray(gl, sh, callback);
}
Magi.Shader.getProgramBySourceArray = function(gl,shaders) {
  var self = this;
  var arr = shaders.map(function(sh) { return self.createShader(gl, sh.type, sh.text); });
  return this.createProgram(gl, arr);
}
Magi.Shader.getProgramByIdArray = function(gl,shaders) {
  var self = this;
  var arr = shaders.map(function(sh) { return self.getShaderById(gl, sh); });
  return this.createProgram(gl, arr);
}
Magi.Shader.getProgramByMixedArray = function(gl,shaders) {
  var self = this;
  var arr = shaders.map(function(sh) {
    if (sh.type)
      return self.createShader(gl, sh.type, sh.text);
    else
      return self.getShaderById(gl, sh);
  });
  return this.createProgram(gl, arr);
}
Magi.Shader.getProgramByIds = function(gl) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  return this.getProgramByIdArray(gl, sh);
}

Magi.Shader.deleteShader = function(gl, sh) {
  gl.useProgram(null);
  sh.shaders.forEach(function(s){
    gl.detachShader(sh.program, s);
    gl.deleteShader(s);
  });
  gl.deleteProgram(sh.program);
}
Magi.Shader.load = function(gl, callback) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  var s = new Shader(gl);
  Magi.Shader.loadProgramArray(gl, sh, function(p) {
    s.shader = p;
    s.compile = function(){};
    callback(s);
  });
}

Magi.Filter = Klass(Magi.Shader, {
  initialize : function(gl, shader) {
    Magi.Shader.initialize.apply(this, arguments);
  },

  apply : function(init) {
    this.use();
    var va = this.attrib("Vertex");
    var ta = this.attrib("TexCoord");
    var vbo = Magi.Geometry.Quad.getCachedVBO(this.gl);
    if (init) init(this);
    vbo.draw(va, null, ta);
  }
});

Magi.VBO = Klass({
    initialized : false,
    length : 0,
    vbos : null,
    type : 'TRIANGLES',
    elementsVBO : null,
    elements : null,

    initialize : function(gl) {
      this.gl = gl;
      this.data = [];
      this.elementsVBO = null;
      for (var i=1; i<arguments.length; i++) {
        if (arguments[i].elements)
          this.elements = arguments[i];
        else
          this.data.push(arguments[i]);
      }
    },

  setData : function() {
    this.destroy();
    this.data = [];
    for (var i=0; i<arguments.length; i++) {
      if (arguments[i].elements)
        this.elements = arguments[i];
      else
        this.data.push(arguments[i]);
    }
  },

  destroy : function() {
    if (this.vbos != null)
      for (var i=0; i<this.vbos.length; i++)
        this.gl.deleteBuffer(this.vbos[i]);
    if (this.elementsVBO != null)
      this.gl.deleteBuffer(this.elementsVBO);
    this.length = this.elementsLength = 0;
    this.vbos = this.elementsVBO = null;
    this.initialized = false;
  },

  init : function() {
    this.destroy();
    var gl = this.gl;
   
    gl.getError();
    var vbos = [];
    var length = 0;
    for (var i=0; i<this.data.length; i++)
      vbos.push(gl.createBuffer());
    if (this.elements != null)
      this.elementsVBO = gl.createBuffer();
    try {
      Magi.throwError(gl, "genBuffers");
      for (var i = 0; i<this.data.length; i++) {
        var d = this.data[i];
        var dlen = Math.floor(d.data.length / d.size);
        if (i == 0 || dlen < length)
            length = dlen;
        if (!d.floatArray)
          d.floatArray = new Float32Array(d.data);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
        Magi.throwError(gl, "bindBuffer");
        gl.bufferData(gl.ARRAY_BUFFER, d.floatArray, gl.STATIC_DRAW);
        Magi.throwError(gl, "bufferData");
      }
      if (this.elementsVBO != null) {
        var d = this.elements;
        this.elementsLength = d.data.length;
        this.elementsType = d.type == gl.UNSIGNED_BYTE ? d.type : gl.UNSIGNED_SHORT;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsVBO);
        Magi.throwError(gl, "bindBuffer ELEMENT_ARRAY_BUFFER");
        if (this.elementsType == gl.UNSIGNED_SHORT && !d.ushortArray) {
          d.ushortArray = new Uint16Array(d.data);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.ushortArray, gl.STATIC_DRAW);
        } else if (this.elementsType == gl.UNSIGNED_BYTE && !d.ubyteArray) {
          d.ubyteArray = new Uint8Array(d.data);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.ubyteArray, gl.STATIC_DRAW);
        }
        Magi.throwError(gl, "bufferData ELEMENT_ARRAY_BUFFER");
      }
    } catch(e) {
      for (var i=0; i<vbos.length; i++)
        gl.deleteBuffer(vbos[i]);
      throw(e);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.length = length;
    this.vbos = vbos;
  
    this.initialized = true;
  },

  use : function() {
    if (!this.initialized) this.init();
    var gl = this.gl;
    for (var i=0; i<arguments.length; i++) {
      var arg = arguments[i];
      if (arg == null || arg == -1) continue;
      if (!this.vbos[i]) {
        gl.disableVertexAttribArray(arg);
        continue;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbos[i]);
      gl.vertexAttribPointer(arg, this.data[i].size, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(arg);
    }
    if (this.elementsVBO != null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsVBO);
    }
  },

  draw : function() {
    var args = [];
    this.use.apply(this, arguments);
    var gl = this.gl;
    if (this.elementsVBO != null) {
      gl.drawElements(gl[this.type], this.elementsLength, this.elementsType, 0);
    } else {
      gl.drawArrays(gl[this.type], 0, this.length);
    }
  }
});

Magi.FBO = Klass({
  initialized : false,
  useDepth : true,
  fbo : null,
  rbo : null,
  texture : null,

  initialize : function(gl, width, height, use_depth) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    if (use_depth != null)
      this.useDepth = use_depth;
  },

  destroy : function() {
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo);
    if (this.rbo) this.gl.deleteRenderbuffer(this.rbo);
    if (this.texture) this.gl.deleteTexture(this.texture);
  },

  init : function() {
    var gl = this.gl;
    var w = this.width, h = this.height;
    var fbo = this.fbo != null ? this.fbo : gl.createFramebuffer();
    var rb;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    Magi.checkError(gl, "FBO.init bindFramebuffer");
    if (this.useDepth) {
      rb = this.rbo != null ? this.rbo : gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      Magi.checkError(gl, "FBO.init bindRenderbuffer");
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      Magi.checkError(gl, "FBO.init renderbufferStorage");
    }

    var tex = this.texture != null ? this.texture : gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } catch (e) { // argh, no null texture support
      var tmp = this.getTempCanvas(w,h);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    Magi.checkError(gl, "FBO.init tex");

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    Magi.checkError(gl, "FBO.init bind tex");

    if (this.useDepth) {
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      Magi.checkError(gl, "FBO.init bind depth buffer");
    }

    var fbstat = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbstat != gl.FRAMEBUFFER_COMPLETE) {
      var glv;
      for (var v in gl) {
        try { glv = gl[v]; } catch (e) { glv = null; }
        if (glv == fbstat) { fbstat = v; break; }}
    }
    Magi.checkError(gl, "FBO.init check fbo");

    this.fbo = fbo;
    this.rbo = rb;
    this.texture = tex;
    this.initialized = true;
  },

  getTempCanvas : function(w, h) {
    if (!Magi.FBO.tempCanvas) {
      Magi.FBO.tempCanvas = document.createElement('canvas');
    }
    Magi.FBO.tempCanvas.width = w;
    Magi.FBO.tempCanvas.height = h;
    return Magi.FBO.tempCanvas;
  },

  use : function() {
    if (!this.initialized) this.init();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
  }
});

Magi.makeGLErrorWrapper = function(gl, fname) {
    return (function() {
        var rv;
        try {
            rv = gl[fname].apply(gl, arguments);
        } catch (e) {
            throw(new Error("GL error " + e.name + " in "+fname+ "\n"+ e.message+"\n" +arguments.callee.caller));
        }
        var e = gl.getError();
        if (e != 0) {
            throw(new Error("GL error "+e+" in "+fname));
        }
        return rv;
    });
}

Magi.wrapGLContext = function(gl) {
    var wrap = {};
    for (var i in gl) {
      try {
        if (typeof gl[i] == 'function') {
            wrap[i] = Magi.makeGLErrorWrapper(gl, i);
        } else {
            wrap[i] = gl[i];
        }
      } catch (e) {
        // log("wrapGLContext: Error accessing " + i);
      }
    }
    wrap.getError = function(){ return gl.getError(); };
    return wrap;
}

Magi.Geometry = {};

Magi.Geometry.Quad = {
  vertices : new Float32Array([
    -1,-1,0,
    1,-1,0,
    -1,1,0,
    1,-1,0,
    1,1,0,
    -1,1,0
  ]),
  normals : new Float32Array([
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1
  ]),
  texcoords : new Float32Array([
    0,0,
    1,0,
    0,1,
    1,0,
    1,1,
    0,1
  ]),
  indices : new Float32Array([0,1,2,1,5,2]),
  makeVBO : function(gl) {
    return new Magi.VBO(gl,
        {size:3, data: this.vertices},
        {size:3, data: this.normals},
        {size:2, data: this.texcoords}
    )
  },
  cache: {},
  getCachedVBO : function(gl) {
    if (!this.cache[gl])
      this.cache[gl] = this.makeVBO(gl);
    return this.cache[gl];
  }
}

Magi.Geometry.QuadMesh = {
  makeVBO : function(gl) {
    var vertices = [], normals = [], texcoords = [];
    var xCount = 100;
    var yCount = 100;
    for (var x=0; x<xCount; x++) {
      for (var y=0; y<yCount; y++) {
        vertices.push((x-(xCount/2)) / (xCount/2), (y-(yCount/2)) / (yCount/2), 0);
        vertices.push(((x+1)-(xCount/2)) / (xCount/2), (y-(yCount/2)) / (yCount/2), 0);
        vertices.push((x-(xCount/2)) / (xCount/2), ((y+1)-(yCount/2)) / (yCount/2), 0);
        vertices.push(((x+1)-(xCount/2)) / (xCount/2), (y-(yCount/2)) / (yCount/2), 0);
        vertices.push(((x+1)-(xCount/2)) / (xCount/2), ((y+1)-(yCount/2)) / (yCount/2), 0);
        vertices.push((x-(xCount/2)) / (xCount/2), ((y+1)-(yCount/2)) / (yCount/2), 0);
        normals.push(0,0,-1);
        normals.push(0,0,-1);
        normals.push(0,0,-1);
        normals.push(0,0,-1);
        normals.push(0,0,-1);
        normals.push(0,0,-1);
        texcoords.push(x/xCount, y/yCount);
        texcoords.push((x+1)/xCount, y/yCount);
        texcoords.push(x/xCount, (y+1)/yCount);
        texcoords.push((x+1)/xCount, y/yCount);
        texcoords.push((x+1)/xCount, (y+1)/yCount);
        texcoords.push(x/xCount, (y+1)/yCount);
      }
    }
    return new Magi.VBO(gl,
        {size:3, data: new Float32Array(vertices)},
        {size:3, data: new Float32Array(normals)},
        {size:2, data: new Float32Array(texcoords)}
    )
  },
  cache: {},
  getCachedVBO : function(gl) {
    if (!this.cache[gl])
      this.cache[gl] = this.makeVBO(gl);
    return this.cache[gl];
  }
}

Magi.Geometry.Cube = {
  vertices : new Float32Array([  0.5, -0.5,  0.5, // +X
                0.5, -0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5,  0.5,  0.5,

                0.5,  0.5,  0.5, // +Y
                0.5,  0.5, -0.5,
                -0.5,  0.5, -0.5,
                -0.5,  0.5,  0.5,

                0.5,  0.5,  0.5, // +Z
                -0.5,  0.5,  0.5,
                -0.5, -0.5,  0.5,
                0.5, -0.5,  0.5,

                -0.5, -0.5,  0.5, // -X
                -0.5,  0.5,  0.5,
                -0.5,  0.5, -0.5,
                -0.5, -0.5, -0.5,

                -0.5, -0.5,  0.5, // -Y
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5,  0.5,

                -0.5, -0.5, -0.5, // -Z
                -0.5,  0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5, -0.5, -0.5,
      ]),

  normals : new Float32Array([ 1, 0, 0,
              1, 0, 0,
              1, 0, 0,
              1, 0, 0,

              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,

              0, 0, 1,
              0, 0, 1,
              0, 0, 1,
              0, 0, 1,

              -1, 0, 0,
              -1, 0, 0,
              -1, 0, 0,
              -1, 0, 0,

              0,-1, 0,
              0,-1, 0,
              0,-1, 0,
              0,-1, 0,

              0, 0,-1,
              0, 0,-1,
              0, 0,-1,
              0, 0,-1
      ]),

  texcoords :  new Float32Array([
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0
  ]),
      
  indices : [],
  create : function(){
    for (var i = 0; i < 6; i++) {
      this.indices.push(i*4 + 0);
      this.indices.push(i*4 + 1);
      this.indices.push(i*4 + 3);
      this.indices.push(i*4 + 1);
      this.indices.push(i*4 + 2);
      this.indices.push(i*4 + 3);
    }
    this.indices = new Float32Array(this.indices);
  },

  makeVBO : function(gl) {
    return new Magi.VBO(gl,
        {size:3, data: this.vertices},
        {size:3, data: this.normals},
        {size:2, data: this.texcoords},
        {elements: true, data: this.indices}
    )
  },
  cache : {},
  getCachedVBO : function(gl) {
    if (!this.cache[gl])
      this.cache[gl] = this.makeVBO(gl);
    return this.cache[gl];
  }
}
Magi.Geometry.Cube.create();

Magi.Geometry.Sphere = {
  vertices : [],
  normals : [],
  indices : [],
  create : function(){
    var r = 0.75;
    var self = this;
    function vert(theta, phi)
    {
      var r = 0.75;
      var x, y, z, nx, ny, nz;

      nx = Math.sin(theta) * Math.cos(phi);
      ny = Math.sin(phi);
      nz = Math.cos(theta) * Math.cos(phi);
      self.normals.push(nx);
      self.normals.push(ny);
      self.normals.push(nz);

      x = r * Math.sin(theta) * Math.cos(phi);
      y = r * Math.sin(phi);
      z = r * Math.cos(theta) * Math.cos(phi);
      self.vertices.push(x);
      self.vertices.push(y);
      self.vertices.push(z);
    }
    for (var phi = -Math.PI/2; phi < Math.PI/2; phi += Math.PI/20) {
      var phi2 = phi + Math.PI/20;
      for (var theta = -Math.PI/2; theta <= Math.PI/2; theta += Math.PI/20) {
        vert(theta, phi);
        vert(theta, phi2);
      }
    }
  }
}

Magi.Geometry.Sphere.create();


Magi.log=function(msg) {
  if (window.console)
    console.log(msg);
  if (this.logCanvas) {
    var c = this.logCanvas;
    var ctx = c.getContext('2d');
    ctx.font = '14px Sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c24';
    ctx.fillText(msg,c.width/2,c.height/2,c.width-20);
  }
  if (this.logElement) {
    this.logElement.appendChild(P(T(msg)));
  }
}
Magi.GL_CONTEXT_ID = null;
Magi.getGLContext = function(c, args){
  var find=function(a,f){for(var i=0,j;j=a[i],i++<a.length;)if(f(j))return j};
  if (!this.GL_CONTEXT_ID)
    this.GL_CONTEXT_ID = find(['webgl','experimental-webgl'],function(n){try{return c.getContext(n)}catch(e){}});
  if (!this.GL_CONTEXT_ID) {
    this.logCanvas = c;
    this.log("No WebGL context found. Click here for more details.");
    var a = document.createElement('a');
    a.href = "http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation";
    c.parentNode.insertBefore(a, c);
    a.appendChild(c);
  }
  else return c.getContext(this.GL_CONTEXT_ID, args); 
}

Magi.Stats = {
  shaderBindCount : 0,
  materialUpdateCount : 0,
  uniformSetCount : 0,
  textureSetCount : 0,
  textureCreationCount : 0,
  reset : function(){
    this.shaderBindCount = 0;
    this.materialUpdateCount = 0;
    this.uniformSetCount = 0;
    this.textureSetCount = 0;
    this.textureCreationCount = 0;
  },
  print : function(elem) {
    elem.textContent = 'Shader bind count: ' + this.shaderBindCount + '\n' +
                       'Material update count: ' + this.materialUpdateCount + '\n' +
                       'Uniform set count: ' + this.uniformSetCount + '\n' +
                       'Texture creation count: ' + this.textureCreationCount + '\n' +
                       'Texture set count: ' + this.textureSetCount + '\n' +
                       '';
  }
}
