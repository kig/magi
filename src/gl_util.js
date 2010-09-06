Texture = function(gl) {
  this.gl = gl;
};
Texture.prototype = {
  target : 'TEXTURE_2D',
  generateMipmaps : true,
  width : null,
  height : null,
  data : null,
  changed : false,

  upload : function() {
    var gl = this.gl;
    var target = gl[this.target];
    if (this.image)
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    else
      gl.texImage2D(target, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, this.data);
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
    Stats.textureCreationCount++;
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
};


function checkError(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    log("Error " + e + " at " + msg);
  }
  return e;
}

function throwError(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    throw(new Error("Error " + e + " at " + msg));
  }
}


Shader = function(gl){
  this.gl = gl;
  this.shaders = [];
  this.uniformLocations = {};
  this.attribLocations = {};
  for (var i=1; i<arguments.length; i++) {
    this.shaders.push(arguments[i]);
  }
}
Shader.createShader = function(gl, type, source) {
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

Shader.getShaderById = function(gl, id) {
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

Shader.loadShader = function(gl, src, callback, onerror, type) {
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

Shader.createProgram = function(gl, shaders) {
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
Shader.loadProgramArray = function(gl, sources, callback, onerror) {
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
Shader.loadProgram = function(gl, callback) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  return this.loadProgramArray(gl, sh, callback);
}
Shader.getProgramBySourceArray = function(gl,shaders) {
  var self = this;
  var arr = shaders.map(function(sh) { return self.createShader(gl, sh.type, sh.text); });
  return this.createProgram(gl, arr);
}
Shader.getProgramByIdArray = function(gl,shaders) {
  var self = this;
  var arr = shaders.map(function(sh) { return self.getShaderById(gl, sh); });
  return this.createProgram(gl, arr);
}
Shader.getProgramByIds = function(gl) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  return this.getProgramByIdArray(gl, sh);
}

Shader.deleteShader = function(gl, sh) {
  gl.useProgram(null);
  sh.shaders.forEach(function(s){
    gl.detachShader(sh.program, s);
    gl.deleteShader(s);
  });
  gl.deleteProgram(sh.program);
}
Shader.load = function(gl, callback) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  var s = new Shader(gl);
  Shader.loadProgramArray(gl, sh, function(p) {
    s.shader = p;
    s.compile = function(){};
    callback(s);
  });
}
Shader.prototype = {
  id : null,
  gl : null,
  compiled : false,
  shader : null,
  shaders : [],

  destroy : function() {
    if (this.shader != null) 
      Shader.deleteShader(this.gl, this.shader);
  },

  compile : function() {
    if (this.shaders[0].text)
      this.shader = Shader.getProgramBySourceArray(this.gl, this.shaders);
    else
      this.shader = Shader.getProgramByIdArray(this.gl, this.shaders);
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
    this.gl.uniform1fv(loc, value);
  },

  uniform2fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform2fv(loc, value);
  },

  uniform3fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform3fv(loc, value);
  },

  uniform4fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform4fv(loc, value);
  },
  
  uniform1f : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform1f(loc, value);
  },

  uniform2f : function(name, v1,v2) {
    var loc = this.uniform(name);
    this.gl.uniform2f(loc, v1,v2);
  },

  uniform3f : function(name, v1,v2,v3) {
    var loc = this.uniform(name);
    this.gl.uniform3f(loc, v1,v2,v3);
  },

  uniform4f : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name);
    this.gl.uniform4f(loc, v1, v2, v3, v4);
  },
  
  uniform1iv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform1iv(loc, value);
  },

  uniform2iv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform2iv(loc, value);
  },

  uniform3iv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform3iv(loc, value);
  },

  uniform4iv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform4iv(loc, value);
  },

  uniform1i : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniform1i(loc, value);
  },

  uniform2i : function(name, v1,v2) {
    var loc = this.uniform(name);
    this.gl.uniform2i(loc, v1,v2);
  },

  uniform3i : function(name, v1,v2,v3) {
    var loc = this.uniform(name);
    this.gl.uniform3i(loc, v1,v2,v3);
  },

  uniform4i : function(name, v1,v2,v3,v4) {
    var loc = this.uniform(name);
    this.gl.uniform4i(loc, v1, v2, v3, v4);
  },

  uniformMatrix4fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniformMatrix4fv(loc, false, value);
  },

  uniformMatrix3fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniformMatrix3fv(loc, false, value);
  },

  uniformMatrix2fv : function(name, value) {
    var loc = this.uniform(name);
    this.gl.uniformMatrix2fv(loc, false, value);
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
}

Filter = function(gl, shader) {
  Shader.apply(this, arguments);
}
Filter.prototype = new Shader();
Filter.prototype.apply = function(init) {
  this.use();
  var va = this.attrib("Vertex");
  var ta = this.attrib("TexCoord");
  var vbo = Quad.getCachedVBO(this.gl);
  if (init) init(this);
  vbo.draw(va, null, ta);
}

VBO = function(gl) {
  this.gl = gl;
  this.data = [];
  this.elementsVBO = null;
  for (var i=1; i<arguments.length; i++) {
    if (arguments[i].elements)
      this.elements = arguments[i];
    else
      this.data.push(arguments[i]);
  }
}

VBO.prototype = {
  initialized : false,
  length : 0,
  vbos : null,
  type : 'TRIANGLES',
  elementsVBO : null,
  elements : null,

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
      throwError(gl, "genBuffers");
      for (var i = 0; i<this.data.length; i++) {
        var d = this.data[i];
        var dlen = Math.floor(d.data.length / d.size);
        if (i == 0 || dlen < length)
            length = dlen;
        if (!d.floatArray)
          d.floatArray = new Float32Array(d.data);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbos[i]);
        throwError(gl, "bindBuffer");
        gl.bufferData(gl.ARRAY_BUFFER, d.floatArray, gl.STATIC_DRAW);
        throwError(gl, "bufferData");
      }
      if (this.elementsVBO != null) {
        var d = this.elements;
        this.elementsLength = d.data.length;
        this.elementsType = d.type == gl.UNSIGNED_BYTE ? d.type : gl.UNSIGNED_SHORT;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementsVBO);
        throwError(gl, "bindBuffer ELEMENT_ARRAY_BUFFER");
        if (this.elementsType == gl.UNSIGNED_SHORT && !d.ushortArray) {
          d.ushortArray = new Uint16Array(d.data);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.ushortArray, gl.STATIC_DRAW);
        } else if (this.elementsType == gl.UNSIGNED_BYTE && !d.ubyteArray) {
          d.ubyteArray = new Uint8Array(d.data);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.ubyteArray, gl.STATIC_DRAW);
        }
        throwError(gl, "bufferData ELEMENT_ARRAY_BUFFER");
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
      if (arg == null || arg == -1 || !this.vbos[i]) continue;
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
}

FBO = function(gl, width, height, use_depth) {
  this.gl = gl;
  this.width = width;
  this.height = height;
  if (use_depth != null)
    this.useDepth = use_depth;
}
FBO.prototype = {
  initialized : false,
  useDepth : true,
  fbo : null,
  rbo : null,
  texture : null,

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
    checkError(gl, "FBO.init bindFramebuffer");
    if (this.useDepth) {
      rb = this.rbo != null ? this.rbo : gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      checkError(gl, "FBO.init bindRenderbuffer");
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      checkError(gl, "FBO.init renderbufferStorage");
    }

    var tex = this.texture != null ? this.texture : gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } catch (e) { // argh, no null texture support
      var tmp = this.getTempCanvas(w,h);
      gl.texImage2D(gl.TEXTURE_2D, 0, tmp);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    checkError(gl, "FBO.init tex");

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    checkError(gl, "FBO.init bind tex");

    if (this.useDepth) {
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      checkError(gl, "FBO.init bind depth buffer");
    }

    var fbstat = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbstat != gl.FRAMEBUFFER_COMPLETE) {
      var glv;
      for (var v in gl) {
        try { glv = gl[v]; } catch (e) { glv = null; }
        if (glv == fbstat) { fbstat = v; break; }}
        log("Framebuffer status: " + fbstat);
    }
    checkError(gl, "FBO.init check fbo");

    this.fbo = fbo;
    this.rbo = rb;
    this.texture = tex;
    this.initialized = true;
  },

  getTempCanvas : function(w, h) {
    if (!FBO.tempCanvas) {
      FBO.tempCanvas = document.createElement('canvas');
    }
    FBO.tempCanvas.width = w;
    FBO.tempCanvas.height = h;
    return FBO.tempCanvas;
  },

  use : function() {
    if (!this.initialized) this.init();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
  }
}

function makeGLErrorWrapper(gl, fname) {
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

function wrapGLContext(gl) {
    var wrap = {};
    for (var i in gl) {
      try {
        if (typeof gl[i] == 'function') {
            wrap[i] = makeGLErrorWrapper(gl, i);
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


Quad = {
  vertices : [
    -1,-1,0,
    1,-1,0,
    -1,1,0,
    1,-1,0,
    1,1,0,
    -1,1,0
  ],
  normals : [
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1
  ],
  texcoords : [
    0,0,
    1,0,
    0,1,
    1,0,
    1,1,
    0,1
  ],
  indices : [0,1,2,1,5,2],
  makeVBO : function(gl) {
    return new VBO(gl,
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
Cube = {
  vertices : [  0.5, -0.5,  0.5, // +X
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
      ],

  normals : [ 1, 0, 0,
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
      ],

  texcoords :  [
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0,
    0,0,  0,1,  1,1, 1,0
  ],
      
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
  },

  makeVBO : function(gl) {
    return new VBO(gl,
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
Cube.create();

Sphere = {
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

Sphere.create();

Geometry = {
  Cube : Cube,
  Quad : Quad,
  Sphere : Sphere
};

log=function(msg) {
  var c = document.getElementById('c');
  var ctx = c.getContext('2d');
  ctx.font = '14px Sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c24';
  ctx.fillText(msg,c.width/2,c.height/2,c.width-20);
}
GL_CONTEXT_ID = null;
getGLContext = function(c, args){
  var find=function(a,f){for(var i=0,j;j=a[i],i++<a.length;)if(f(j))return j};
  if (!GL_CONTEXT_ID)
    GL_CONTEXT_ID = find(['experimental-webgl','webgl'],function(n){try{return c.getContext(n)}catch(e){}});
  if (!GL_CONTEXT_ID) {
    log("No WebGL context found. Click here for more details.");
    var a = document.createElement('a');
    a.href = "http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation";
    c.parentNode.insertBefore(a, c);
    a.appendChild(c);
  }
  else return c.getContext(GL_CONTEXT_ID, args); 
}

Stats = {
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
