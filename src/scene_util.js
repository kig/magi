Magi.Scene = Klass({
  frameDuration : 13,
  time : 0,
  timeDir : 1,
  timeSpeed : 1,
  previousTime : 0,
  frameTimes : [],

  fpsCanvas : null,

  bg : [1,1,1,1],
  clear : true,

  paused : false,
  showStats : false,
  
  initialize : function(canvas, scene, cam, args) {
    if (!scene) scene = new Magi.Node();
    if (!cam) cam = Magi.Scene.getDefaultCamera();
    if (canvas.tagName == "CANVAS") {
      this.canvas = canvas;
      var defaultArgs = {
        alpha: true, depth: true, stencil: true, antialias: true,
        premultipliedAlpha: true
      };
      if (args)
        Object.extend(defaultArgs, args);
      this.gl = Magi.getGLContext(canvas, defaultArgs);
      this.fbo = new Magi.FBO(this.gl, canvas.width*2, canvas.height*2, true);
    } else {
      this.fbo = canvas;
      this.gl = this.fbo.gl;
    }
    this.idFilter = new Magi.IdFilter();
    this.postFBO1 = new Magi.FBO(this.gl, 1, 1, false);
    this.postFBO2 = new Magi.FBO(this.gl, 1, 1, false);
    this.preEffects = [];
    this.postEffects = [];
    this.clearBits = this.gl.COLOR_BUFFER_BIT |
                     this.gl.DEPTH_BUFFER_BIT |
                     this.gl.STENCIL_BUFFER_BIT;
    this.scene = scene;
    this.root = scene;
    this.camera = cam;
    this.mouse = {
      x : 0,
      y : 0,
      pressure : 1.0,
      tiltX : 0.0,
      tiltY : 0.0,
      deviceType : 0,
      left: false,
      middle: false,
      right: false
    };
    this.setupEventListeners();
    if (this.canvas) {
      this.startFrameLoop();
    }
  },

  getDefaultCamera : function() {
    var cam = new Magi.Camera();
    vec3.set([0, 1.0, 0], cam.lookAt);
    vec3.set([Math.cos(1)*7, 3, Math.sin(1)*7], cam.position);
    cam.fov = 45;
    cam.angle = 1;
    return cam;
  },
  
  startFrameLoop : function() {
    this.previousTime = new Date;
    clearInterval(this.drawInterval);
    var t = this;
    this.drawInterval = setInterval(function(){ t.draw(); }, this.frameDuration);
  },

  updateMouse : function(ev) {
    this.mouse.deviceType = ev.mozDeviceType || 0;
    this.mouse.tiltX = ev.mozTiltX || 0;
    this.mouse.tiltY = ev.mozTiltY || 0;
    this.mouse.pressure = ev.mozPressure || 0;
    this.mouse.x = ev.clientX;
    this.mouse.y = ev.clientY;
  },
  
  setupEventListeners : function() {
    var t = this;
    window.addEventListener('mousedown',  function(ev){
      switch (ev.button) {
      case Mouse.LEFT:
        t.mouse.left = true; break;
      case Mouse.RIGHT:
        t.mouse.right = true; break;
      case Mouse.MIDDLE:
        t.mouse.middle = true; break;
      }
      t.updateMouse(ev);
    }, false);
    window.addEventListener('mouseup', function(ev) {
      switch (ev.button) {
      case Mouse.LEFT:
        t.mouse.left = false; break;
      case Mouse.RIGHT:
        t.mouse.right = false; break;
      case Mouse.MIDDLE:
        t.mouse.middle = false; break;
      }
      t.updateMouse(ev);
    }, false);
    window.addEventListener('mousemove', function(ev) {
      t.updateMouse(ev);
    }, false);
  },

  draw : function(newTime, real_dt) {
    if (this.paused) return;
    newTime = newTime == null ? new Date() : newTime;
    real_dt = real_dt == null ? newTime - this.previousTime : real_dt;
    var dt = this.timeDir * this.timeSpeed * real_dt;
    this.time += dt;
    this.previousTime = newTime;
    this.frameTime = real_dt;
    
    this.camera.update(this.time, dt);
    this.scene.update(this.time, dt);

    var t = new Date();
    this.updateTime = t - newTime;

    if (this.drawOnlyWhenChanged && !this.changed) return;

    this.fbo.use();

    if (this.canvas) {
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      this.fbo.resize(this.width*2, this.height*2);
    } else {
      this.width = this.fbo.width;
      this.height = this.fbo.height;
    }

    if (this.clear) {
      this.gl.depthMask(true);
      this.gl.clearColor(this.bg[0], this.bg[1], this.bg[2], this.bg[3]);
      this.gl.clear(this.clearBits);
      Magi.throwError(this.gl, "clear");
    }

    if (this.preEffects.length > 0)
      this.drawEffects(this.fbo, this.preEffects, this.fbo.texture);

    var f = this.canvas ? 2 : 1;
    this.camera.draw(this.gl, this.width*f, this.height*f, this.root);

    if (this.canvas) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.depthMask(true);
      this.gl.clearColor(0,0,0,0);
      this.gl.clear(this.clearBits);
      Magi.throwError(this.gl, "clear");
    }

    this.drawEffects(this.canvas||this.fbo, this.postEffects, this.fbo.texture);

    this.drawTime = new Date() - t;

    this.updateFps(this.frameTimes, real_dt);
    if (!this.firstFrameDoneTime) this.firstFrameDoneTime = new Date();
    this.changed = false;
    Magi.throwError(this.gl, "Scene draw loop");
    if (this.showStats) {
      var stats = E.byId('stats');
      if (stats) {
        Magi.Stats.print(stats);
        Magi.Stats.reset();
      }
    }
  },
  
  // applies effects (magi nodes) to tex and draws the result to target (fbo or canvas)
  // does not modify tex (unless it's the texture of target fbo)
  drawEffects : function(target, effects, tex) {
    var fbo = this.postFBO1;
    var postFBO = this.postFBO2;
    fbo.resize(target.width, target.height);
    postFBO.resize(target.width, target.height);
    for (var i=0; i<effects.length; i++) {
      // draw effect applied to tex onto postFBO
      postFBO.use();
      var fx = effects[i];
      fx.material.textures.Texture0 = tex;
      tex = postFBO.texture;
      this.camera.draw(this.gl, postFBO.width, postFBO.height, fx);
      // swap fbos for next effect
      var tmp = fbo;
      fbo = postFBO;
      postFBO = tmp;
    }
    // draw result fbo texture to target
    if (target.tagName)
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    else
      target.use();
    this.idFilter.material.textures.Texture0 = tex;
    this.camera.draw(this.gl, target.width, target.height, this.idFilter);
  },

  updateFps : function(frames,real_dt) {
    var fps = this.fpsCanvas || document.getElementById('fps');
    if (!fps) return;
    var ctx = fps.getContext('2d');
    ctx.clearRect(0,0,fps.width,fps.height);
    var h = fps.height;
    frames.push(1000 / (1+real_dt));
    if (frames.length > 1000)
      frames.splice(200);
    var start = Math.max(0,frames.length-200);
    for (var i=start; i<frames.length; i++) {
      ctx.fillRect(i-start,h,1,-frames[i]/3);
    }
  },

  useDefaultCameraControls : function(cv) {
    var s = this;
    cv = cv || this.canvas;

    var yRot = new Magi.Node();
    vec3.set([1,0,0], yRot.rotation.axis);

    var xRot = new Magi.Node();
    vec3.set([0,1,0], xRot.rotation.axis);
    
    yRot.appendChild(xRot);
    xRot.appendChild(this.scene);
    this.root = yRot;
    //this.root = this.scene;

    var wheelHandler = function(ev) {
      var ds = (ev.detail < 0 || ev.wheelDelta > 0) ? 1.25 : (1 / 1.25);
      if (ev.shiftKey) {
        yRot.scaling[0] *= ds;
        yRot.scaling[1] *= ds;
        yRot.scaling[2] *= ds;
      } else {
        s.camera.targetFov /= ds;
      }
      s.changed = true;
      ev.preventDefault();
    };
    s.camera.addFrameListener(function() {
      if (Math.abs(this.targetFov - this.fov) > 0.01) {
        s.changed = true;
      }
    });
    cv.addEventListener('DOMMouseScroll', wheelHandler, false);
    cv.addEventListener('mousewheel', wheelHandler, false);

    cv.addEventListener('mousedown', function(ev){
      s.dragging = true;
      s.sx = ev.clientX;
      s.sy = ev.clientY;
      ev.preventDefault();
    }, false);
    window.addEventListener('mousemove', function(ev) {
      if (s.dragging) {
        var dx = ev.clientX - s.sx, dy = ev.clientY - s.sy;
        s.sx = ev.clientX, s.sy = ev.clientY;
        if (s.mouse.left) {
          xRot.rotation.angle += dx / 200;
          yRot.rotation.angle += dy / 200;
        } else if (s.mouse.middle) {
          yRot.position[0] += dx * 0.01 * (s.camera.fov / 45);
          yRot.position[1] -= dy * 0.01 * (s.camera.fov / 45);
        }
        /*
        var xa = xRot.rotation.angle;
        var ya = yRot.rotation.angle;
        var r = vec3.distance(s.camera.lookAt, s.camera.position);
        var v = vec3.scale(vec3.normalize(vec3.create(Math.cos(xa), Math.sin(ya), Math.sin(xa))), r);
        vec3.add(v, s.camera.lookAt, s.camera.position);
        */
        ev.preventDefault();
        s.changed = true;
      }
    }, false);
    window.addEventListener('mouseup', function(ev) {
      if (s.dragging) {
        s.dragging = false;
        ev.preventDefault();
      }
    }, false);
    s.changed = true;
  }
});



Magi.UberShader = Klass({
  initialize : function(verts, frags) {
    this.verts = verts;
    this.frags = frags;
    this.shaderCache = [];
  },

  build : function(keys, defines) {
    var defs = [];
    for (var i in defines) {
      defs.push("#define " + i + " " + defines[i]);
    }
    defs.sort();
    var sk = keys.join("¤")+"¤"+defs.join("¤");
    if (!this.shaderCache[sk]) {
      var vertVals = [];
      var fragVals = [];
      for (var i=0; i<keys.length; i++) {
        var v = this.verts[keys[i]];
        if (v) vertVals.push(v);
        var f = this.frags[keys[i]];
        if (f) fragVals.push(f);
      }
      var defStr = defs.join("\n") + "\n";
      var vertSrc = defStr + vertVals.join("\n");
      var fragSrc = defStr + fragVals.join("\n");
      var s = new Magi.Shader(null,
        {type:"VERTEX_SHADER",text:vertSrc},
        {type:"FRAGMENT_SHADER", text:fragSrc}
      );
      this.shaderCache[sk] = s;
    }
    return this.shaderCache[sk];
  }
});



Magi.Cube = Klass(Magi.Node, {
  initialize : function() {
    Magi.Node.initialize.call(this, Magi.Geometry.Cube.getCachedVBO());
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.CubeArray = Klass(Magi.Node, {
  initialize : function() {
    Magi.Node.initialize.call(this, Magi.Geometry.CubeArray.getCachedVBO());
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.Ring = Klass(Magi.Node, {
  initialize : function(height, angle, segments, yCount) {
    Magi.Node.initialize.call(this,
      Magi.Geometry.Ring.getCachedVBO(null, height, segments, yCount, angle)
    );
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.Sphere = Klass(Magi.Node, {
  initialize : function(xCount, yCount) {
    Magi.Node.initialize.call(this, Magi.Geometry.Sphere.getCachedVBO(null, xCount, yCount));
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.Disk = Klass(Magi.Node, {
  initialize : function(r1, r2, height, xCount, yCount) {
    Magi.Node.initialize.call(this, Magi.Geometry.Disk.getCachedVBO(null, r1,r2,height,xCount, yCount));
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.FilterQuad = Klass(Magi.Node, {
  identityTransform : true,
  depthMask : false,

  initialize : function(frag) {
    Magi.Node.initialize.call(this, Magi.Geometry.Quad.getCachedVBO());
    this.material = Magi.FilterQuadMaterial.make(null, frag);
  }
});

Magi.FlipFilterQuad = Klass(Magi.Node, {
  identityTransform : true,
  depthMask : false,

  initialize : function(frag) {
    Magi.Node.initialize.call(this, Magi.Geometry.Quad.getCachedVBO());
    this.material = Magi.FlipFilterQuadMaterial.make(null, frag);
  }
});

Magi.ColorQuad = Klass(Magi.Node, {
  initialize : function(r,g,b,a) {
    Magi.Node.initialize.call(this, Magi.Geometry.Quad.getCachedVBO());
    this.material = Magi.ColorQuadMaterial.get(null);
    this.transparent = this.a < 1;
    this.material.floats.Color = vec4.create([r,g,b,a]);
  }
});

Magi.RadialGlowFilter = Klass(Magi.FilterQuad, {
  initialize : function() {
    Magi.FilterQuad.initialize.call(this);
    this.material = Magi.RadialGlowMaterial.get();
  }
});

Magi.IdFilter = Klass(Magi.FilterQuad, {
  initialize : function() {
    Magi.FilterQuad.initialize.call(this);
    this.material = Magi.IdFilterMaterial.get();
  }
});

Magi.Alignable = {
  leftAlign : 1,
  rightAlign : -1,
  topAlign : -1,
  bottomAlign : 1,
  centerAlign : 0,

  align: 0,
  valign: 0,

  alignQuad : function(node, w, h) {
    node.position[0] = this.align * w/2;
    node.position[1] = this.valign * h/2;
  },

  updateAlign : function() {
    this.alignQuad(this.alignedNode, this.width, this.height);
  },

  setAlign : function(h, v) {
    this.align = h;
    if (v != null)
      this.valign = v;
    this.updateAlign();
    return this;
  },

  setVAlign : function(v) {
    this.valign = v;
    this.updateAlign();
    return this;
  }

};

Magi.Image = Klass(Magi.Node, Magi.Alignable, {
  initialize : function(src, flip) {
    Magi.Node.initialize.call(this);
    this.alignedNode = new Magi.Node(Magi.Geometry.Quad.getCachedVBO());
    this.alignedNode.material = flip
                              ? Magi.FlipFilterMaterial.get()
                              : Magi.FilterMaterial.get();
    this.alignedNode.transparent = true;
    this.appendChild(this.alignedNode);
    this.setTexture(new Magi.Texture());
    this.texture.generateMipmaps = false;
    this.setImage(src);
  },

  setTexture : function(tex) {
    if (tex != this.texture) {
      if (this.texture)
        this.texture.destroy();
      this.texture = tex;
      this.alignedNode.material.textures.Texture0 = this.texture;
    }
    return this;
  },
  
  setSize : function(sz) {
    this.size = sz;
    if (this.image && this.image.tagName && Object.isImageLoaded(this.image))
      this.setImage(this.image);
    return this;
  },

  setImage : function(src) {
    var image = src;
    if (typeof src == 'string') {
      image = new Image();
      image.src = src;
    }
    this.image = image;
    if (image.tagName && !Object.isImageLoaded(image)) {
      var self = this;
      image.addEventListener('load', function() {
        if (self.image == this) {
          self.setImage(this);
        }
      }, false);
    }
    this.image.width; // workaround for strange chrome bug
    var w = this.image.width, h = this.image.height;
    if (this.size != null) {
      var f = Math.min(this.size/w, this.size/h);
      w = (w*f);
      h = (h*f);
    }
    this.width = w;
    this.height = h;
    this.alignedNode.scaling[0] = w / 2;
    this.alignedNode.scaling[1] = h / 2;
    this.updateAlign();
    if (this.image instanceof Magi.Texture) {
      this.setTexture(this.image);
    } else {
      this.texture.image = this.image;
      this.texture.changed = true;
    }
    return this;
  }
});

Magi.Text = Klass(Magi.Image, Magi.Alignable, {
  fontSize : 24,
  font : 'Arial',
  color : 'black',

  initialize : function(content, fontSize, color, font) {
    this.canvas = E.canvas(1, 1);
    Magi.Image.initialize.call(this, this.canvas);
    if (fontSize) this.fontSize = fontSize;
    if (font) this.font = font;
    if (color) this.color = color;
    this.setText(content);
  },

  setText : function(text) {
    this.text = text;
    var ctx = this.canvas.getContext('2d');
    var sf = this.fontSize + 'px ' + this.font;
    ctx.font = sf;
    var dims = ctx.measureText(text);
    this.canvas.width = Math.max(1, Math.min(2048, dims.width));
    this.canvas.height = Math.max(1, Math.min(2048, Math.ceil(this.fontSize*1.2)));
    var ctx = this.canvas.getContext('2d');
    ctx.font = sf;
    ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, this.fontSize);
    this.setImage(this.canvas);
    return this;
  },

  setFontSize : function(fontSize) {
    this.fontSize = fontSize;
    this.setText(this.text);
    return this;
  },
  
  setFont : function(font) {
    this.font = font;
    this.setText(this.text);
    return this;
  },

  setColor : function(color) {
    this.color = color;
    this.setText(this.text);
    return this;
  },
});

Magi.MeshText = Klass(Magi.Text, {
  initialize : function(content, fontSize, color, font) {
    Magi.Text.initialize.apply(this, arguments);
    this.alignedNode.model = Magi.Geometry.QuadMesh.getCachedVBO(null,20,100);
  }
});

Magi.MeshImage = Klass(Magi.Image, {
  initialize : function(image) {
    Magi.Image.initialize.apply(this, arguments);
    this.alignedNode.model = Magi.Geometry.QuadMesh.getCachedVBO();
  }
});

Magi.CubeText = Klass(Magi.Text, {
  initialize : function(content, fontSize, color, font) {
    Magi.Text.initialize.apply(this, arguments);
    this.alignedNode.model = Magi.Geometry.CubeArray.getCachedVBO(null,200,24);
    this.alignedNode.material = Magi.CubeArrayMaterial.get();
    this.alignedNode.material.textures.Texture0 = this.texture;
  },

  setText : function(txt) {
    Magi.Text.setText.apply(this,arguments);
    this.alignedNode.material.floats.width = this.width;
    this.alignedNode.material.floats.height = this.height;
    return this;
  }
});

Magi.ShaderLib = {
  defaultTransform: (
    "precision highp float;"+
    "attribute vec3 Vertex;"+
    "attribute vec2 TexCoord;"+
    "uniform mat4 PMatrix;"+
    "uniform mat4 MVMatrix;"+
    "uniform mat3 NMatrix;"+
    "varying vec2 texCoord0;"+
    "vec4 transform()"+
    "{"+
    "  vec4 v = vec4(Vertex, 1.0);"+
    "  vec4 worldPos = MVMatrix * v;"+
    "  return PMatrix * worldPos;"+
    "}"+
    "vec2 texCoord()"+
    "{ return TexCoord.st; }"+
    "vec2 flipTexCoord()"+
    "{ return vec2(TexCoord.s, 1.0-TexCoord.t); }"+
    "void defaultTransform()"+
    "{"+
    "  gl_Position = transform();"+
    "  texCoord0 = texCoord();"+
    "}"+
    "void defaultImageTransform()"+
    "{"+
    "  gl_Position = transform();"+
    "  texCoord0 = flipTexCoord();"+
    "}"
  )
}

Magi.FilterMaterial = {
  vert : {type: 'VERTEX_SHADER', text: (
    Magi.ShaderLib.defaultTransform+
    "void main()"+
    "{"+
    "  defaultImageTransform();"+
    "}"
  )},

  frag : {type: 'FRAGMENT_SHADER', text: (
    "precision highp float;"+
    "uniform sampler2D Texture0;"+
    "varying vec2 texCoord0;"+
    "void main()"+
    "{"+
    "  vec4 c = texture2D(Texture0, texCoord0);"+
    "  gl_FragColor = c*c.a;"+
    "}"
  )},

  make : function(gl, fragmentShader) {
    var shader = new Magi.Filter(null, this.vert, fragmentShader||this.frag);
    return this.setupMaterial(shader);
  },

  get : function(gl) {
    if (!this.cached)
      this.cached = this.make(gl);
    return this.cached.copy();
  },

  setupMaterial : function(shader) {
    var m = new Magi.Material(shader);
    m.textures.Texture0 = null;
    return m;
  }
};

Magi.FlipFilterMaterial = Object.clone(Magi.FilterMaterial);
Magi.FlipFilterMaterial.vert = {type: 'VERTEX_SHADER', text: (
  Magi.ShaderLib.defaultTransform+
  "void main()"+
  "{"+
  "  defaultTransform();"+
  "}"
)};

Magi.FilterQuadMaterial = Object.clone(Magi.FilterMaterial);
Magi.FilterQuadMaterial.vert = {type: 'VERTEX_SHADER', text: (
  Magi.ShaderLib.defaultTransform+
  "void main()"+
  "{"+
  "  vec4 v = vec4(Vertex, 1.0);"+
  "  texCoord0 = texCoord();"+
  "  gl_Position = v;"+
  "}"
)};

Magi.FlipFilterQuadMaterial = Object.clone(Magi.FilterMaterial);
Magi.FlipFilterQuadMaterial.vert = {type: 'VERTEX_SHADER', text: (
  Magi.ShaderLib.defaultTransform+
  "void main()"+
  "{"+
  "  vec4 v = vec4(Vertex, 1.0);"+
  "  texCoord0 = flipTexCoord();"+
  "  gl_Position = v;"+
  "}"
)};

Magi.IdFilterMaterial = Object.clone(Magi.FilterQuadMaterial);
Magi.IdFilterMaterial.frag = {type: 'FRAGMENT_SHADER', text: (
  "precision highp float;"+
  "uniform sampler2D Texture0;"+
  "varying vec2 texCoord0;"+
  "void main()"+
  "{"+
  "  vec4 c = texture2D(Texture0, texCoord0);"+
  "  gl_FragColor = c;"+
  "}"
)};

Magi.RadialGlowMaterial = Object.clone(Magi.FilterQuadMaterial);
Magi.RadialGlowMaterial.frag = {type:'FRAGMENT_SHADER', text: (
  "precision highp float;"+
  "uniform sampler2D Texture0;"+
  "varying vec2 texCoord0;"+
  "uniform vec2 center;"+
  "uniform float radius;"+
  "void main()"+
  "{"+
  "  float samples = 30.0;"+
  "  vec2 dir = (radius/samples) * normalize(center - texCoord0);"+
  "  vec4 c = texture2D(Texture0, texCoord0);"+
  "  float d = 1e-1;"+
  "  for (float r=1.0; r <= samples; r++) {"+
  "    vec4 pc = texture2D(Texture0, texCoord0 + (r*dir));"+
  "    c += pc*d;"+
  "    d *= 9e-1;"+
  "  }"+
  "  gl_FragColor = c*c.a;"+
  "}"
)};
Magi.RadialGlowMaterial.setupMaterial = function(shader) {
  var m = new Magi.Material(shader);
  m.textures.Texture0 = null;
  m.floats.center = vec2.create(0.5, 0.5);
  m.floats.radius = 0.05;
  return m;
}

Magi.CubeArrayMaterial = Object.clone(Magi.FilterMaterial);
Magi.CubeArrayMaterial.vert = {type: 'VERTEX_SHADER', text: (
  Magi.ShaderLib.defaultTransform+
  "uniform float width;"+
  "uniform float height;"+
  "varying vec2 texCoord0;"+
  "float grid(float c, float sz)"+
  "{"+
  "  return (0.5+floor(c*sz))/sz;"+
  "}"+
  "void main()"+
  "{"+
  "  texCoord0 = vec2(grid(TexCoord.s, width), grid(1.0-TexCoord.t, height));"+
  "  if (texture2D(Texture0, texCoord0).a == 0.0) {"+
  "    gl_Position = vec4(-3.0, -3.0, -3.0, 1.0);"+
  "  } else {"+
  "    gl_Position = transform();"+
  "  }"+
  "}"
)};

Magi.ColorQuadMaterial = Object.clone(Magi.FilterMaterial);
Magi.ColorQuadMaterial.vert = {type: 'VERTEX_SHADER', text: (
  Magi.ShaderLib.defaultTransform+
  "void main()"+
  "{"+
  "  vec4 v = vec4(Vertex, 1.0);"+
  "  gl_Position = v;"+
  "}"
)};
Magi.ColorQuadMaterial.frag = {type: 'FRAGMENT_SHADER', text: (
  "precision highp float;"+
  "uniform vec4 Color;"+
  "void main()"+
  "{"+
  "  gl_FragColor = Color;"+
  "}"
)};

Magi.DefaultMaterial = {
  vert : {type: 'VERTEX_SHADER', text: (
    "precision highp float;"+
    "attribute vec3 Vertex;"+
    "attribute vec3 Normal;"+
    "attribute vec2 TexCoord;"+
    "uniform mat4 PMatrix;"+
    "uniform mat4 MVMatrix;"+
    "uniform mat4 LightMatrix;"+
    "uniform mat3 NMatrix;"+
    "uniform float LightConstantAtt;"+
    "uniform float LightLinearAtt;"+
    "uniform float LightQuadraticAtt;"+
    "uniform vec4 LightPos;"+
    "varying vec3 normal, lightDir, eyeVec;"+
    "varying vec2 texCoord0;"+
    "varying float attenuation;"+
    "void main()"+
    "{"+
    "  vec3 lightVector;"+
    "  vec4 v = vec4(Vertex, 1.0);"+
    "  texCoord0 = vec2(TexCoord.s, 1.0-TexCoord.t);"+
    "  normal = normalize(NMatrix * Normal);"+
    "  vec4 worldPos = MVMatrix * v;"+
    "  vec4 lightWorldPos = LightMatrix * LightPos;"+
    "  lightVector = vec3(lightWorldPos - worldPos);"+
    "  lightDir = normalize(lightVector);"+
    "  float dist = length(lightVector);"+
    "  eyeVec = -vec3(worldPos);"+
    "  attenuation = 1.0 / (1.0 + LightConstantAtt + LightLinearAtt*dist + LightQuadraticAtt * dist*dist);"+
    "  gl_Position = PMatrix * worldPos;"+
    "}"
  )},

  frag : {type: 'FRAGMENT_SHADER', text: (
    "precision highp float;"+
    "uniform vec4 LightDiffuse;"+
    "uniform vec4 LightSpecular;"+
    "uniform vec4 LightAmbient;"+
    "uniform vec4 MaterialSpecular;"+
    "uniform vec4 MaterialDiffuse;"+
    "uniform vec4 MaterialAmbient;"+
    "uniform vec4 MaterialEmit;"+
    "uniform vec4 GlobalAmbient;"+
    "uniform float MaterialShininess;"+
    "uniform sampler2D DiffTex, SpecTex, EmitTex;"+
    "varying vec3 normal, lightDir, eyeVec;"+
    "varying vec2 texCoord0;"+
    "varying float attenuation;"+
    "void main()"+
    "{"+
    "  vec4 color = GlobalAmbient * LightAmbient * MaterialAmbient;"+
    "  vec4 matDiff = MaterialDiffuse + texture2D(DiffTex, texCoord0);"+
    "  matDiff.a = 1.0 - (1.0-MaterialDiffuse.a) * (1.0-texture2D(DiffTex, texCoord0).a);"+
    "  vec4 matSpec = MaterialSpecular + texture2D(SpecTex, texCoord0);"+
    "  matSpec.a = 1.0 - (1.0-MaterialSpecular.a) * (1.0-texture2D(SpecTex, texCoord0).a);"+
    "  vec4 diffuse = LightDiffuse * matDiff;"+
    "  float lambertTerm = dot(normal, lightDir);"+
    "  vec4 lcolor = diffuse * lambertTerm * attenuation;"+
    "  vec3 E = normalize(eyeVec);"+
    "  vec3 R = reflect(-lightDir, normal);"+
    "  float specular = pow( max(dot(R, E), 0.0), MaterialShininess );"+
    "  lcolor += matSpec * LightSpecular * specular * attenuation;"+
    "  if (lambertTerm > 0.0) color += lcolor * lambertTerm;"+
    "  else color += diffuse * attenuation * MaterialAmbient.a * -lambertTerm;"+
    "  color += MaterialEmit + texture2D(EmitTex, texCoord0);" +
    "  color *= matDiff.a;"+
    "  color.a = matDiff.a;"+
    "  gl_FragColor = color;"+
    "}"
  )},

  get : function(gl) {
    if (!this.cached) {
      var shader = new Magi.Shader(null, this.vert, this.frag);
      this.cached = this.setupMaterial(shader);
    }
    var c = this.cached.copy();
    c.floats.LightMatrix = this.lightMatrix;
    return c;
  },

  lightMatrix : mat4.identity(),

  setupMaterial : function(shader) {
    var m = new Magi.Material(shader);
    m.textures.DiffTex = m.textures.SpecTex = m.textures.EmitTex = null;
    m.floats.MaterialSpecular = vec4.create([1, 1, 1, 0]);
    m.floats.MaterialDiffuse = vec4.create([0.5, 0.5, 0.5, 1]);
    m.floats.MaterialAmbient = vec4.create([1, 1, 1, 0.3]);
    m.floats.MaterialEmit = vec4.create([0, 0, 0, 0]);
    m.floats.MaterialShininess = 1.5;
    m.floats.LightMatrix = this.lightMatrix;

    m.floats.LightPos = vec4.create([1, 1, 1, 1.0]);
    m.floats.GlobalAmbient = vec4.create([1, 1, 1, 1]);
    m.floats.LightSpecular = vec4.create([0.8, 0.8, 0.95, 1]);
    m.floats.LightDiffuse = vec4.create([0.7, 0.6, 0.9, 1]);
    m.floats.LightAmbient = vec4.create([0.1, 0.10, 0.2, 1]);
    m.floats.LightConstantAtt = 0.0;
    m.floats.LightLinearAtt = 0.0;
    m.floats.LightQuadraticAtt = 0.0;
    return m;
  }

}
