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
Magi.findGLContextId = function(c, args) {
  var find=function(a,f){for(var i=0,j;j=a[i],i++<a.length;)if(f(j))return j};
  var id = find(['webgl','experimental-webgl'],function(n){try{return c.getContext(n, args)}catch(e){}});
  return id;
}
Magi.getGLContext = function(c, args){
  if (!this.GL_CONTEXT_ID)
    this.GL_CONTEXT_ID = Magi.findGLContextId(c, args);
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

/**
  Returns the error name for the WebGL error code.
  Finds the name from the gl object you give it.

  @param gl {WebGLContext} A WebGL context to search error code from.
  @param errorCode {int} Error code you wish to find a name for.
  @return {string} Name of the errors matching errorCode, joined by |.
*/
Magi.errorName = function(gl, errorCode) {
  var names = [];
  for (var i in gl) {
    if (gl[i] == errorCode)
      names.push(i);
  }
  var name = names.join("|");
  return name;
}

/**
  Logs GL errors.
  
  GetErrors the given WebGL context and logs the error
  alongside the given message using Magi.log().

  @param gl {WebGLContext} WebGL context to query.
  @param msg {string} Additional message for the error.
  @return {int} The error code returned by gl.getError().
*/
Magi.checkError = function(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    Magi.log("Error " + e + ":" + Magi.errorName(gl, e) + " at " + msg);
  }
  return e;
}

/**
  Turns a GL error into an exception.
  
  If the given WebGL context returns non-zero to getError,
  throws an exception with the name of the error and the
  given additional message.

  @param gl {WebGLContext} WebGL context to query.
  @param msg {string} Additional message for the error.
  @return {null}
*/
Magi.throwError = function(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    throw(new Error("Error " + e + ":" + Magi.errorName(gl, e) + " at " + msg));
  }
}


/**
  Resource manager for tracking allocated WebGL resources and
  destroying them on window unload.
*/
Magi.AllocatedResources = {
  textures : [],
  vbos : [],
  shaders : [],
  fbos : [],

  /**
    Destroys all allocated resources.
  */
  deleteAll : function() {
    while (this.textures.length > 0) {
      this.textures[0].permanent = false;
      this.textures[0].destroy();
    }
    while (this.vbos.length > 0)
      this.vbos[0].destroy();
    while (this.fbos.length > 0)
      this.fbos[0].destroy();
    while (this.shaders.length > 0)
      this.shaders[0].destroy();
  },

  /**
    Add a texture to track. If the texture is already tracked, does nothing.
    
    @param tex Magi.Texture to track.
  */
  addTexture : function(tex) {
    if (this.textures.indexOf(tex) == -1)
      this.textures.push(tex);
  },

  /**
    Add a shader to track. If the shader is already tracked, does nothing.
    
    @param tex Magi.Shader to track.
  */
  addShader : function(tex) {
    if (this.shaders.indexOf(tex) == -1)
      this.shaders.push(tex);
  },

  /**
    Add a VBO to track. If the VBO is already tracked, does nothing.
    
    @param tex Magi.VBO to track.
  */
  addVBO : function(tex) {
    if (this.vbos.indexOf(tex) == -1)
      this.vbos.push(tex);
  },

  /**
    Add a FBO to track. If the FBO is already tracked, does nothing.
    
    @param tex Magi.FBO to track.
  */
  addFBO : function(tex) {
    if (this.fbos.indexOf(tex) == -1)
      this.fbos.push(tex);
  },

  /**
    Deletes given texture from tracking list.

    @param tex Magi.Texture to remove.
  */
  deleteTexture : function(tex) {
    var i = this.textures.indexOf(tex);
    if (i >= 0)
      this.textures.splice(i,1);
  },

  /**
    Deletes given shader from tracking list.

    @param tex Magi.Shader to remove.
  */
  deleteShader : function(tex) {
    var i = this.shaders.indexOf(tex);
    if (i >= 0)
      this.shaders.splice(i,1);
  },

  /**
    Deletes given VBO from tracking list.

    @param tex Magi.VBO to remove.
  */
  deleteVBO : function(tex) {
    var i = this.vbos.indexOf(tex);
    if (i >= 0)
      this.vbos.splice(i,1);
  },

  /**
    Deletes given FBO from tracking list.

    @param tex Magi.FBO to remove.
  */
  deleteFBO : function(tex) {
    var i = this.fbos.indexOf(tex);
    if (i >= 0)
      this.fbos.splice(i,1);
  }
};

window.addEventListener('unload', function(){
  Magi.AllocatedResources.deleteAll();
}, false);

/**
  Texture utility class. Creates a texture object for the texture, sets up
  texture parameters and uploads the texture on changes.

  If generateMipmaps is set to true, generates mipmaps for the texture after
  upload.

  Magi.Texture can take either an image or a pixel array as the texture source.

  var tex = new Magi.Texture(gl);
    tex.image = new Image();
    tex.image.src = 'foo.jpg';
    ...
    tex.use();

  For pixel array textures,
    tex.width = w;
    tex.height = h;
    tex.data = pixelArray;

  For null textures,
    tex.width = w;
    tex.height = h;
    tex.data = null;

  To tell the texture that the image has changed,
    tex.changed = true;

  To free the texture resources, use
    tex.clear()
*/
Magi.Texture = Klass({
  target : 'TEXTURE_2D',
  generateMipmaps : true,
  width : null,
  height : null,
  data : null,
  changed : false,

  initialize : function(gl) {
    this.gl = gl;
    Magi.AllocatedResources.addTexture(this);
  },
  
  load : function(src, callback) {
    var img = new Image();
    var tex = new Magi.Texture();
    img.onload = function() {
      tex.changed = true;
      if (callback)
        callback(tex);
    };
    img.src = src;
    tex.image = img;
    return tex;
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
    if (this.image) {
      var img = this.image;
      if (!Object.isImageLoaded(img)) {
        this.changed = true;
        return;
      }
      if ((this.image.tagName == 'IMG' && (/\.svgz?$/i).test(this.image.src)) ||
          (this.image.tagName == 'VIDEO' &&
          (/WebKit\/\d+/).test(window.navigator.userAgent)))
      {
        if (!this.image.tmpCanvas ||
            this.image.tmpCanvas.width != this.image.width ||
            this.image.tmpCanvas.height != this.image.height)
        {
          this.image.tmpCanvas = E.canvas(this.image.width, this.image.height);
        }
        this.image.tmpCanvas.getContext('2d')
            .drawImage(this.image, 0, 0, this.image.width, this.image.height);
        img = this.image.tmpCanvas;
      }
      this.width = img.width;
      this.height = img.height;
      if (this.previousWidth == this.width && this.previousHeight == this.height)
      {
        gl.texSubImage2D(target, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
      } else {
        gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      }
    } else {
      if (this.previousWidth == this.width && this.previousHeight == this.height)
      {
        gl.texSubImage2D(target, 0, 0, 0, this.width, this.height,
                      gl.RGBA, gl.UNSIGNED_BYTE, this.data);
      } else {
        gl.texImage2D(target, 0, gl.RGBA, this.width, this.height, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, this.data);
      }
    }
    this.previousWidth = this.width;
    this.previousHeight = this.height;
    Magi.throwError(gl, "Texture.upload");
  },
  
  regenerateMipmap : function() {
    var gl = this.gl;
    var target = gl[this.target];
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    if (this.generateMipmaps) {
      if (this.width == this.height && Math.isPowerOfTwo(this.width)) {
        gl.generateMipmap(target);
        Magi.throwError(gl, "Texture.regenerateMipmap: generateMipmap");
      } else if (this.image) {
        var wb = this.width, hb = this.height;
        var levels = Math.floor(Math.log2(Math.max(wb, hb))+0.1) + 1;
        var image = this.image;
        for (var i=1; i<levels; i++) {
          var w = Math.max(1, Math.floor(wb/Math.pow(2,i)+0.1));
          var h = Math.max(1, Math.floor(hb/Math.pow(2,i)+0.1));
          var tmpCanvas = E.canvas(w, h);
          var ctx = tmpCanvas.getContext('2d');
          ctx.globalCompositeOperation = 'copy';
          ctx.drawImage(image, 0, 0, w, h);
          gl.texImage2D(target, i, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmpCanvas);
          Magi.throwError(gl, "Texture.regenerateMipmap loop: "+[i,w,h].join(","));
          image = tmpCanvas;
        }
      }
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
  },
  
  compile: function(){
    var gl = this.gl;
    var target = gl[this.target];
    this.textureObject = gl.createTexture();
    Magi.Stats.textureCreationCount++;
    gl.bindTexture(target, this.textureObject);
    Magi.throwError(gl, "Texture.compile");
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
      this.changed = false;
      this.upload();
      this.regenerateMipmap();
    }
  },

  clear : function() {
    if (this.permanent == true) return;
    if (this.textureObject)
      this.gl.deleteTexture(this.textureObject);
    this.previousWidth = this.previousHeight = null;
    this.textureObject = null;
  },

  destroy : function() {
    if (this.permanent == true) return;
    this.clear();
    Magi.AllocatedResources.deleteTexture(this);
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
    Magi.AllocatedResources.addShader(this);
  },

  destroy : function() {
    if (this.shader != null) 
      Magi.Shader.deleteShader(this.gl, this.shader);
    Magi.AllocatedResources.deleteShader(this);
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
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform1fv(loc, value);
  },

  uniform2fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform2fv(loc, value);
  },

  uniform3fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform3fv(loc, value);
  },

  uniform4fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform4fv(loc, value);
  },
  
  uniform1f : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform1f(loc, value);
  },

  uniform2f : function(name, v1,v2) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform2f(loc, v1,v2);
  },

  uniform3f : function(name, v1,v2,v3) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform3f(loc, v1,v2,v3);
  },

  uniform4f : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform4f(loc, v1, v2, v3, v4);
  },
  
  uniform1iv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform1iv(loc, value);
  },

  uniform2iv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform2iv(loc, value);
  },

  uniform3iv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform3iv(loc, value);
  },

  uniform4iv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform4iv(loc, value);
  },

  uniform1i : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform1i(loc, value);
  },

  uniform2i : function(name, v1,v2) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform2i(loc, v1,v2);
  },

  uniform3i : function(name, v1,v2,v3) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform3i(loc, v1,v2,v3);
  },

  uniform4i : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniform4i(loc, v1, v2, v3, v4);
  },

  uniformMatrix4fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniformMatrix4fv(loc, false, value);
  },

  uniformMatrix3fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniformMatrix3fv(loc, false, value);
  },

  uniformMatrix2fv : function(name, value) {
    var loc = this.uniform(name).index;
    if (loc != null) this.gl.uniformMatrix2fv(loc, false, value);
  },

  attrib : function(name) {
    if (this.attribLocations[name] == null) {
      var loc = this.gl.getAttribLocation(this.shader.program, name);
      this.attribLocations[name] = {index: loc, current: null};
    }
    return this.attribLocations[name];
  },

  uniform : function(name) {
    if (this.uniformLocations[name] == null) {
      var loc = this.gl.getUniformLocation(this.shader.program, name);
      this.uniformLocations[name] = {index: loc, current: null};
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
    throw(new Error("Failed to compile shader. Shader info log: " + ilog + " Shader source: "+source));
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
      Magi.AllocatedResources.addVBO(this);
    },

  setData : function() {
    this.clear();
    this.data = [];
    for (var i=0; i<arguments.length; i++) {
      if (arguments[i].elements)
        this.elements = arguments[i];
      else
        this.data.push(arguments[i]);
    }
  },

  clear : function() {
    if (this.vbos != null)
      for (var i=0; i<this.vbos.length; i++)
        this.gl.deleteBuffer(this.vbos[i]);
    if (this.elementsVBO != null)
      this.gl.deleteBuffer(this.elementsVBO);
    this.length = this.elementsLength = 0;
    this.vbos = this.elementsVBO = null;
    this.initialized = false;
  },

  destroy : function() {
    this.clear();
    Magi.AllocatedResources.deleteVBO(this);
  },

  init : function() {
    this.clear();
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
        Magi.Stats.bindBufferCount++;
        Magi.throwError(gl, "bindBuffer");
        gl.bufferData(gl.ARRAY_BUFFER, d.floatArray, gl.STATIC_DRAW);
        Magi.throwError(gl, "bufferData");
      }
      if (this.elementsVBO != null) {
        var d = this.elements;
        this.elementsLength = d.data.length;
        this.elementsType = d.type == gl.UNSIGNED_BYTE ? d.type : gl.UNSIGNED_SHORT;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsVBO);
        Magi.Stats.bindBufferCount++;
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
    Magi.Stats.bindBufferCount++;
    Magi.Stats.bindBufferCount++;

    this.length = length;
    this.vbos = vbos;
  
    this.initialized = true;
  },

  use : function() {
    if (!this.initialized) this.init();
    var gl = this.gl;
    for (var i=0; i<arguments.length; i++) {
      var arg = arguments[i];
      var vbo = this.vbos[i];
      if (arg == null || arg.index == null || arg.index == -1) continue;
      if (!vbo) {
        gl.disableVertexAttribArray(arg.index);
        continue;
      }
      if (Magi.VBO[arg.index] !== vbo) {
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.vertexAttribPointer(arg.index, this.data[i].size, gl.FLOAT, false, 0, 0);
        Magi.Stats.bindBufferCount++;
        Magi.Stats.vertexAttribPointerCount++;
      }
      gl.enableVertexAttribArray(arg.index);
      Magi.VBO[arg.index] = vbo;
    }
    if (this.elementsVBO != null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsVBO);
      Magi.Stats.bindBufferCount++;
    }
  },

  draw : function() {
    var args = [];
    this.use.apply(this, arguments);
    var gl = this.gl;
    if (this.elementsVBO != null) {
      gl.drawElements(gl[this.type], this.elementsLength, this.elementsType, 0);
      Magi.Stats.drawElementsCount++;
    } else {
      gl.drawArrays(gl[this.type], 0, this.length);
      Magi.Stats.drawArraysCount++;
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
    Magi.AllocatedResources.addFBO(this);
  },

  destroy : function() {
    if (this.fbo) this.gl.deleteFramebuffer(this.fbo);
    if (this.rbo) this.gl.deleteRenderbuffer(this.rbo);
    if (this.texture) {
      this.texture.permanent = false;
      this.texture.destroy();
    }
    Magi.AllocatedResources.deleteFBO(this);
  },

  setSize : function(w, h) {
    if (w == this.width && h == this.height)
      return;
    var gl = this.gl;
    this.width = w;
    this.height = h;
    this.texture.width = this.width;
    this.texture.height = this.height;
    this.texture.changed = true;
    this.texture.use();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbo);
    Magi.throwError(gl, "FBO.resize bindRenderbuffer");
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
    Magi.throwError(gl, "FBO.resize renderbufferStorage");
  },

  init : function() {
    var gl = this.gl;
    var w = this.width, h = this.height;
    var fbo = this.fbo != null ? this.fbo : gl.createFramebuffer();
    var rb;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    Magi.throwError(gl, "FBO.init bindFramebuffer");

    var tex = this.texture != null ? this.texture : new Magi.Texture(gl);
    tex.width = w;
    tex.height = h;
    tex.data = null;
    tex.generateMipmaps = false;
    tex.permanent = true;
    tex.use();
    Magi.throwError(gl, "FBO.init tex");

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.textureObject, 0);
    Magi.throwError(gl, "FBO.init bind tex");

    if (this.useDepth) {
      rb = this.rbo != null ? this.rbo : gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      Magi.throwError(gl, "FBO.init bindRenderbuffer");
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      Magi.throwError(gl, "FBO.init renderbufferStorage");
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      Magi.throwError(gl, "FBO.init bind depth buffer");
    }

    var fbstat = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbstat != gl.FRAMEBUFFER_COMPLETE) {
      var glv;
      for (var v in gl) {
        try { glv = gl[v]; } catch (e) { glv = null; }
        if (glv == fbstat) { fbstat = v; break; }}
    }
    Magi.throwError(gl, "FBO.init check fbo");

    this.fbo = fbo;
    this.rbo = rb;
    this.texture = tex;
    this.initialized = true;
  },

  use : function() {
    if (!this.initialized) this.init();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    Magi.throwError(this.gl, "FBO.use");
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
};

Magi.Geometry.QuadMesh = {
  makeVBO : function(gl, xCount, yCount) {
    var vertices = [], normals = [], texcoords = [];
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
  getCachedVBO : function(gl, xCount, yCount) {
    xCount = xCount || 50;
    yCount = yCount || 50;
    var k = xCount +":"+ yCount;
    if (!this.cache[gl]) {
      this.cache[gl] = {};
    }
    if (!this.cache[gl][k]) {
      this.cache[gl][k] = this.makeVBO(gl, xCount, yCount);
    }
    return this.cache[gl][k];
  }
};

Magi.Geometry.Cube = {
  vertices : new Float32Array([
    0.5, -0.5,  0.5, // +X
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
    0.5, -0.5, -0.5
  ]),

  normals : new Float32Array([
    1, 0, 0,
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
    );
  },
  cache : {},
  getCachedVBO : function(gl) {
    if (!this.cache[gl])
      this.cache[gl] = this.makeVBO(gl);
    return this.cache[gl];
  }
};
Magi.Geometry.Cube.create();

Magi.Geometry.CubeArray = {
  pushNormals : function(normals, idx) {
    normals.push(Magi.Geometry.Cube.normals[idx*3 + 0]);
    normals.push(Magi.Geometry.Cube.normals[idx*3 + 1]);
    normals.push(Magi.Geometry.Cube.normals[idx*3 + 2]);
  },

  pushCubeNormals : function(cubeNormals) {
    for (var i = 0; i < 6; i++) {
      this.pushNormals(cubeNormals, i*4 + 0);
      this.pushNormals(cubeNormals, i*4 + 1);
      this.pushNormals(cubeNormals, i*4 + 3);
      this.pushNormals(cubeNormals, i*4 + 1);
      this.pushNormals(cubeNormals, i*4 + 2);
      this.pushNormals(cubeNormals, i*4 + 3);
    }
  },

  pushCubeVerts : function(verts, x,y,w,h, idx) {
    verts.push((2*Magi.Geometry.Cube.vertices[idx*3 + 0]+1+2*x)/w-1);
    verts.push((2*Magi.Geometry.Cube.vertices[idx*3 + 1]+1+2*y)/h-1);
    verts.push(Magi.Geometry.Cube.vertices[idx*3 + 2]);
  },

  pushCube : function(verts, x,y,w,h) {
    for (var i = 0; i < 6; i++) {
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 0);
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 1);
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 3);
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 1);
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 2);
      this.pushCubeVerts(verts, x, y, w, h, i*4 + 3);
    }
  },

  makeVBO : function(gl, xCount, yCount) {
    var vertices = [], normals = [], texcoords = [];
    for (var x=0; x<xCount; x++) {
      for (var y=0; y<yCount; y++) {
        this.pushCube(vertices, x,y,xCount,yCount);
        this.pushCubeNormals(normals);
        for (var i=0; i<6*6; i++)
          texcoords.push(x/xCount, y/yCount);
      }
    }
    return new Magi.VBO(gl,
        {size:3, data: new Float32Array(vertices)},
        {size:3, data: new Float32Array(normals)},
        {size:2, data: new Float32Array(texcoords)}
    )
  },
  cache: {},
  getCachedVBO : function(gl, xCount, yCount) {
    xCount = xCount || 50;
    yCount = yCount || 50;
    var k = xCount +":"+ yCount;
    if (!this.cache[gl]) {
      this.cache[gl] = {};
    }
    if (!this.cache[gl][k]) {
      this.cache[gl][k] = this.makeVBO(gl, xCount, yCount);
    }
    return this.cache[gl][k];
  }
};


Magi.Geometry.Sphere = {
  vert : function(theta, phi, vertices, normals, texcoords)
  {
    var x, y, z, nx, ny, nz;

    nx = Math.sin(theta) * Math.cos(phi);
    nz = Math.sin(phi);
    ny = Math.cos(theta) * Math.cos(phi);
    normals.push(nx, ny, nz);

    x = Math.sin(theta) * Math.cos(phi);
    z = Math.sin(phi);
    y = Math.cos(theta) * Math.cos(phi);
    vertices.push(x, y, z);

    texcoords.push(1-(theta / (2*Math.PI)), 0.5 + 0.5 * Math.sin(phi));
  },

  makeVBO : function(gl, xCount, yCount) {
    var vertices = [], normals = [], texcoords = [];
    var self = this;
    for (var y=0; y<yCount; y++) {
      var phi = -Math.PI/2 + Math.PI*y/yCount;
      var phi2 = phi + Math.PI/yCount;
      for (var x=0; x<xCount; x++) {
        var theta = 2*Math.PI*x/xCount;
        var theta2 = theta + 2*Math.PI/xCount;
        this.vert(theta, phi, vertices, normals, texcoords);
        this.vert(theta, phi2, vertices, normals, texcoords);
        this.vert(theta2, phi2, vertices, normals, texcoords);
        this.vert(theta, phi, vertices, normals, texcoords);
        this.vert(theta2, phi2, vertices, normals, texcoords);
        this.vert(theta2, phi, vertices, normals, texcoords);
      }
    }
    return new Magi.VBO(gl,
        {size:3, data: new Float32Array(vertices)},
        {size:3, data: new Float32Array(normals)},
        {size:2, data: new Float32Array(texcoords)}
    );
  },
  cache: {},
  getCachedVBO : function(gl, xCount, yCount) {
    xCount = xCount || 10;
    yCount = yCount || 10;
    var k = xCount +":"+ yCount;
    if (!this.cache[gl]) {
      this.cache[gl] = {};
    }
    if (!this.cache[gl][k]) {
      this.cache[gl][k] = this.makeVBO(gl, xCount, yCount);
    }
    return this.cache[gl][k];
  }
};

Magi.Geometry.Disk = {
  OUT : 1,
  IN : 2,
  UP : 3,
  DOWN : 4,
  vert : function(theta, z, r, vertices, normals, texcoords, dir, height, ty)
  {
    var ux = Math.sin(theta);
    var uy = Math.cos(theta);
    var x = ux*r;
    var y = uy*r;
    vertices.push(x, y, z);

    var tx = theta / (2*Math.PI);

    switch (dir) {
      case this.OUT:
        normals.push(ux, uy, 0);
        texcoords.push(tx, z/height);
        break;
      case this.IN:
        normals.push(-ux, -uy, 0);
        texcoords.push(tx, z/height);
        break;
      case this.UP:
        normals.push(0, 0, 1);
        texcoords.push(tx, ty);
        break;
      case this.DOWN:
        normals.push(0, 0, -1);
        texcoords.push(tx, ty);
        break;
    }

  },

  makeVBO : function(gl, r1, r2, height, xCount, yCount) {
    var vertices = [], normals = [], texcoords = [];
    var self = this;
    for (var yi = 0; yi < yCount; yi++) {
      var y = yi * height/yCount;
      var y2 = y + height/yCount;
      for (var x = 0; x < xCount; x++) {
        var theta = x * 2*Math.PI/xCount;
        var theta2 = theta + 2*Math.PI/xCount;
        // outer ring
        this.vert(theta, y, r2, vertices, normals, texcoords, this.OUT, height, 0);
        this.vert(theta, y2, r2, vertices, normals, texcoords, this.OUT, height, 0);
        this.vert(theta2, y2, r2, vertices, normals, texcoords, this.OUT, height, 0);
        this.vert(theta, y, r2, vertices, normals, texcoords, this.OUT, height, 0);
        this.vert(theta2, y2, r2, vertices, normals, texcoords, this.OUT, height, 0);
        this.vert(theta2, y, r2, vertices, normals, texcoords, this.OUT, height, 0);
        // inner ring
        this.vert(theta2, y2, r1, vertices, normals, texcoords, this.IN, height, 0);
        this.vert(theta, y2, r1, vertices, normals, texcoords, this.IN, height, 0);
        this.vert(theta, y, r1, vertices, normals, texcoords, this.IN, height, 0);
        this.vert(theta2, y, r1, vertices, normals, texcoords, this.IN, height, 0);
        this.vert(theta2, y2, r1, vertices, normals, texcoords, this.IN, height, 0);
        this.vert(theta, y, r1, vertices, normals, texcoords, this.IN, height, 0);
        // top cap
        this.vert(theta, y2, r2, vertices, normals, texcoords, this.UP, height, 0);
        this.vert(theta, y2, r1, vertices, normals, texcoords, this.UP, height, 1);
        this.vert(theta2, y2, r1, vertices, normals, texcoords, this.UP, height, 1);
        this.vert(theta, y2, r2, vertices, normals, texcoords, this.UP, height, 0);
        this.vert(theta2, y2, r1, vertices, normals, texcoords, this.UP, height, 1);
        this.vert(theta2, y2, r2, vertices, normals, texcoords, this.UP, height, 0);
        // bottom cap
        this.vert(theta2, y, r1, vertices, normals, texcoords, this.DOWN, height, 1);
        this.vert(theta, y, r1, vertices, normals, texcoords, this.DOWN, height, 1);
        this.vert(theta, y, r2, vertices, normals, texcoords, this.DOWN, height, 0);
        this.vert(theta2, y, r2, vertices, normals, texcoords, this.DOWN, height, 0);
        this.vert(theta2, y, r1, vertices, normals, texcoords, this.DOWN, height, 1);
        this.vert(theta, y, r2, vertices, normals, texcoords, this.DOWN, height, 0);
      }
    }
    return new Magi.VBO(gl,
        {size:3, data: new Float32Array(vertices)},
        {size:3, data: new Float32Array(normals)},
        {size:2, data: new Float32Array(texcoords)}
    );
  },
  cache: {},
  getCachedVBO : function(gl, r1, r2, height, xCount, yCount) {
    r1 = r1 || 0.5;
    r2 = r2 || 1.0;
    height = height || 0.01;
    xCount = xCount || 50;
    yCount = yCount || 2;
    var k = [r1,r2,height,xCount,yCount].join(":");
    if (!this.cache[gl]) {
      this.cache[gl] = {};
    }
    if (!this.cache[gl][k]) {
      this.cache[gl][k] = this.makeVBO(gl, r1, r2, height, xCount, yCount);
    }
    return this.cache[gl][k];
  }
};


Magi.Geometry.Ring = {
  makeXZQuad : function(x,y,z,x2,y2,z2,vertices) {
    vertices.push(x, y, z);
    vertices.push(x2, y, z2);
    vertices.push(x, y2, z);
    vertices.push(x2, y, z2);
    vertices.push(x2, y2, z2);
    vertices.push(x, y2, z);
  },
  makeVBO : function(gl, height, segments, yCount, angle) {
    var vertices = [], normals = [], texcoords = [];
    for (var s=0; s<segments; s++) {
      var ra1 = s/segments;
      var ra2 = (s+1)/segments;
      var a1 = ra1 * angle;
      var a2 = ra2 * angle;
      var x1 = Math.cos(a1);
      var x2 = Math.cos(a2);
      var z1 = Math.sin(a1);
      var z2 = Math.sin(a2);
      for (var y=0; y<yCount; y++) {
        var y1 = 2 * height * (-0.5 + y/yCount);
        var y2 = 2 * height * (-0.5 + (y+1)/yCount);
        this.makeXZQuad(x1,y1,z1,x2,y2,z2,vertices);
        normals.push(z1, 0, -x1);
        normals.push(z2, 0, -x2);
        normals.push(z1, 0, -x1);
        normals.push(z2, 0, -x2);
        normals.push(z2, 0, -x2);
        normals.push(z1, 0, -x1);
        texcoords.push(ra1, y1);
        texcoords.push(ra2, y1);
        texcoords.push(ra1, y2);
        texcoords.push(ra2, y1);
        texcoords.push(ra2, y2);
        texcoords.push(ra1, y2);
      }
    }
    return new Magi.VBO(gl,
        {size:3, data: new Float32Array(vertices)},
        {size:3, data: new Float32Array(normals)},
        {size:2, data: new Float32Array(texcoords)}
    )
  },
  cache: {},
  getCachedVBO : function(gl, height, segments, yCount, angle) {
    height = height || 0.1;
    segments = segments || 256;
    yCount = yCount || 10;
    angle = angle || Math.PI*2;
    var k = segments +":"+ yCount + ":" + angle + ":" + height;
    if (!this.cache[gl]) {
      this.cache[gl] = {};
    }
    if (!this.cache[gl][k]) {
      this.cache[gl][k] = this.makeVBO(gl, height, segments, yCount, angle);
    }
    return this.cache[gl][k];
  }
}
