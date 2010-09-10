Magi.Scene = Klass({
  frameDuration : 15,
  time : 0,
  timeDir : 1,
  timeSpeed : 1,
  previousTime : 0,
  frameTimes : [],

  fpsCanvas : null,

  bg : [1,1,1,1],
  clear : true,

  paused : false,
  
  initialize : function(canvas, scene, cam, args) {
    if (!scene) scene = new Magi.Node();
    if (!cam) cam = Magi.Scene.getDefaultCamera();
    this.canvas = canvas;
    var defaultArgs = {
      alpha: true, depth: true, stencil: true, antialias: true,
      premultipliedAlpha: true
    };
    if (args)
      Object.extend(defaultArgs, args);
    this.gl = Magi.getGLContext(canvas, defaultArgs);
    this.clearBits = this.gl.COLOR_BUFFER_BIT |
                     this.gl.DEPTH_BUFFER_BIT |
                     this.gl.STENCIL_BUFFER_BIT;
    this.scene = scene;
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
    this.startFrameLoop();
  },

  getDefaultCamera : function() {
    var cam = new Magi.Camera();
    vec3.set([0, 1.0, 0], cam.lookAt);
    vec3.set([Math.cos(1)*6, 3, Math.sin(1)*6], cam.position);
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

  draw : function() {
    if (this.paused) return;
    var newTime = new Date;
    var real_dt = newTime - this.previousTime;
    var dt = this.timeDir * this.timeSpeed * real_dt;
    this.time += dt;
    this.previousTime = newTime;
    
    this.camera.update(this.time, dt);
    this.scene.update(this.time, dt);

    if (this.drawOnlyWhenChanged && !this.changed) return;

    if (this.clear) {
      this.gl.depthMask(true);
      this.gl.clearColor(this.bg[0], this.bg[1], this.bg[2], this.bg[3]);
      this.gl.clear(this.clearBits);
    }

    this.camera.draw(this.gl, this.canvas.width, this.canvas.height, this.scene);
    
    this.updateFps(this.frameTimes, real_dt);
    if (!this.firstFrameDoneTime) this.firstFrameDoneTime = new Date();
    this.changed = false;
    Magi.throwError(this.gl, "Scene draw loop");
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
  }
});

Magi.Motion = {
  makeBounce : function() {
    this.addFrameListener(function(t, dt) {
      var y = 2*Math.abs(Math.sin(t / 500));
      this.position[1] = y;
    });
    return this;
  },

  makeRotate : function(speed) {
    speed = speed || 0.2;
    this.addFrameListener(function(t,dt) {
      this.rotation.angle = (Math.PI*2*t / (1000/speed)) % (Math.PI*2);
    });
    return this;
  }
};

Magi.Cube = Klass(Magi.Node, Magi.Motion, {
  initialize : function() {
    Magi.Node.initialize.call(this, Magi.Geometry.Cube.getCachedVBO());
    this.material = Magi.DefaultMaterial.get();
  }
});

Magi.Ring = Klass(Magi.Node, Magi.Motion, {
  initialize : function(height, angle, segments, yCount) {
    Magi.Node.initialize.call(this,
      Magi.Geometry.Ring.getCachedVBO(null, height, segments, yCount, angle)
    );
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

Magi.Image = Klass(Magi.Node, {
  initialize : function(src) {
    Magi.Node.initialize.call(this);
    var tex = new Magi.Texture();
    tex.generateMipmaps = false;
    this.imageNode = new Magi.Node(Magi.Geometry.Quad.getCachedVBO());
    this.imageNode.material = Magi.FilterMaterial.get();
    this.imageNode.material.textures.Texture0 = tex;
    this.imageNode.transparent = true;
    this.texture = tex;
    this.appendChild(this.imageNode);
    this.setImage(src);
  },

  setImage : function(src) {
    var image = src;
    if (typeof src == 'string') {
      image = new Image();
      image.src = src;
    }
    this.image = image;
    this.imageNode.scaling[0] = this.image.width / 2;
    this.imageNode.scaling[1] = this.image.height / 2;
    this.texture.image = this.image;
    this.texture.changed = true;
  }
});

Magi.Text = Klass(Magi.Node, {
  fontSize : 24,
  font : 'Arial',
  color : 'black',

  initialize : function(content, fontSize, font) {
    Magi.Node.initialize.call(this);
    this.canvas = E.canvas(1, 1);
    if (fontSize) this.fontSize = fontSize;
    if (font) this.font = font;
    var tex = new Magi.Texture();
    tex.generateMipmaps = false;
    tex.image = this.canvas;
    this.textNode = new Magi.Node(Magi.Geometry.Quad.getCachedVBO());
    this.textNode.material = Magi.FilterMaterial.get();
    this.textNode.material.textures.Texture0 = tex;
    this.textNode.transparent = true;
    this.texture = tex;
    this.appendChild(this.textNode);
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
    this.textNode.scaling[0] = this.canvas.width / 2;
    this.textNode.scaling[1] = this.canvas.height / 2;
    this.textNode.position[0] = this.canvas.width/2;
    this.textNode.position[1] = this.canvas.height/2;
    this.texture.image = this.canvas;
    this.texture.changed = true;
  },

  setFontSize : function(fontSize) {
    this.fontSize = fontSize;
    this.setText(this.text);
  },
  
  setFont : function(font) {
    this.font = font;
    this.setText(this.text);
  },

  setColor : function(color) {
    this.color = color;
    this.setText(this.text);
  },
});

Magi.MeshText = Klass(Magi.Text, {
  initialize : function(content, fontSize, font) {
    Magi.Text.initialize.apply(this, arguments);
    this.textNode.model = Magi.Geometry.QuadMesh.getCachedVBO();
  }
});

Magi.MeshImage = Klass(Magi.Image, {
  initialize : function(image) {
    Magi.Image.initialize.apply(this, arguments);
    this.imageNode.model = Magi.Geometry.QuadMesh.getCachedVBO();
  }
});

Magi.FilterMaterial = {
  vert : {type: 'VERTEX_SHADER', text: (
    "precision mediump float;"+
    "attribute vec3 Vertex;"+
    "attribute vec2 TexCoord;"+
    "uniform mat4 PMatrix;"+
    "uniform mat4 MVMatrix;"+
    "uniform mat3 NMatrix;"+
    "varying vec2 texCoord0;"+
    "void main()"+
    "{"+
    "  vec4 v = vec4(Vertex, 1.0);"+
    "  texCoord0 = vec2(TexCoord.s, 1.0-TexCoord.t);"+
    "  vec4 worldPos = MVMatrix * v;"+
    "  gl_Position = PMatrix * worldPos;"+
    "}"
  )},

  frag : {type: 'FRAGMENT_SHADER', text: (
    "precision mediump float;"+
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

Magi.FilterQuadMaterial = Object.clone(Magi.FilterMaterial);
Magi.FilterQuadMaterial.vert = {type: 'VERTEX_SHADER', text: (
  "precision mediump float;"+
  "attribute vec3 Vertex;"+
  "attribute vec2 TexCoord;"+
  "uniform mat4 PMatrix;"+
  "uniform mat4 MVMatrix;"+
  "uniform mat3 NMatrix;"+
  "varying vec2 texCoord0;"+
  "void main()"+
  "{"+
  "  vec4 v = vec4(Vertex, 1.0);"+
  "  texCoord0 = vec2(TexCoord.s, TexCoord.t);"+
  "  gl_Position = v;"+
  "}"
)};

Magi.DefaultMaterial = {
  vert : {type: 'VERTEX_SHADER', text: (
    "precision mediump float;"+
    "attribute vec3 Vertex;"+
    "attribute vec3 Normal;"+
    "attribute vec2 TexCoord;"+
    "uniform mat4 PMatrix;"+
    "uniform mat4 MVMatrix;"+
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
    "  lightVector = vec3(LightPos - worldPos);"+
    "  lightDir = normalize(lightVector);"+
    "  float dist = length(lightVector);"+
    "  eyeVec = -vec3(worldPos);"+
    "  attenuation = 1.0 / (LightConstantAtt + LightLinearAtt*dist + LightQuadraticAtt * dist*dist);"+
    "  gl_Position = PMatrix * worldPos;"+
    "}"
  )},

  frag : {type: 'FRAGMENT_SHADER', text: (
    "precision mediump float;"+
    "uniform vec4 LightDiffuse;"+
    "uniform vec4 LightSpecular;"+
    "uniform vec4 LightAmbient;"+
    "uniform vec4 MaterialSpecular;"+
    "uniform vec4 MaterialDiffuse;"+
    "uniform vec4 MaterialAmbient;"+
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
    "  vec4 matSpec = MaterialSpecular + texture2D(SpecTex, texCoord0);"+
    "  vec4 diffuse = LightDiffuse * matDiff;"+
    "  float lambertTerm = dot(normal, lightDir);"+
    "  vec4 lcolor = diffuse * lambertTerm * attenuation;"+
    "  vec3 E = normalize(eyeVec);"+
    "  vec3 R = reflect(-lightDir, normal);"+
    "  float specular = pow( max(dot(R, E), 0.0), MaterialShininess );"+
    "  lcolor += matSpec * LightSpecular * specular * attenuation;"+
    "  color += lcolor * step(0.0, lambertTerm);"+
    "  color += texture2D(EmitTex, texCoord0);" +
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
    return this.cached.copy();
  },

  setupMaterial : function(shader) {
    var m = new Magi.Material(shader);
    m.textures.DiffTex = m.textures.SpecTex = m.textures.EmitTex = null;
    m.floats.MaterialSpecular = [1, 1, 1, 0];
    m.floats.MaterialDiffuse = [0.5, 0.5, 0.5, 1];
    m.floats.MaterialAmbient = [1, 1, 1, 1];
    m.floats.MaterialShininess = 1.5;

    m.floats.LightPos = [7, 7, 7, 1.0];
    m.floats.GlobalAmbient = [1, 1, 1, 1];
    m.floats.LightSpecular = [0.8, 0.8, 0.95, 1];
    m.floats.LightDiffuse = [0.7, 0.6, 0.9, 1];
    m.floats.LightAmbient = [0.1, 0.10, 0.2, 1];
    m.floats.LightConstantAtt = 0.0;
    m.floats.LightLinearAtt = 0.1;
    m.floats.LightQuadraticAtt = 0.0;
    return m;
  }

}

        // the goal here is to make simple things simple
        
        // Reasonable defaults:
        // - default shader [with multi-texturing (diffuse, specular, normal?)]
        // - camera position
        // - scene navigation controls
        
        // Simple things:
        // - drawing things with lighting
        // - making things move [like CSS transitions?]
        // - text 
        // - images
        // - painter's algorithm for draw list sort
        // - loading and displaying models
        // - picking

        // Easy fancy things:
        // - rendering to FBOs (scene.renderTarget = fbo)
        
        /*
        ren.scene.addFrameListener(function(t,dt) {
          var l = Matrix.mulv4(ren.camera.getLookMatrix(), [7, 7, 7, 1.0]);
          this.material.floats.LightPos = l
        });
        */

