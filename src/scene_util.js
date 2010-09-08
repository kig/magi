Scene = function(canvas, scene, cam, args) {
  if (!scene) scene = new Node();
  if (!cam) cam = Scene.getDefaultCamera();
  this.canvas = canvas;
  this.gl = getGLContext(canvas, args);
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
};
Scene.getDefaultCamera = function() {
  var cam = new Camera();
  cam.lookAt = [0, 1.0, 0];
  cam.position = [Math.cos(1)*6, 3, Math.sin(1)*6];
  cam.fov = 45;
  cam.angle = 1;
  return cam;
};
Scene.prototype = {
  frameDuration : 15,
  time : 0,
  timeDir : 1,
  timeSpeed : 1,
  previousTime : 0,
  frameTimes : [],

  bg : [1,1,1,1],
  clear : true,
  depthTest : true,
  depthMask : true,
  blend : true,
  blendFuncSrc : 'SRC_ALPHA',
  blendFuncDst : 'ONE_MINUS_SRC_ALPHA',
  
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
    var newTime = new Date;
    var real_dt = newTime - this.previousTime;
    var dt = this.timeDir * this.timeSpeed * real_dt;
    this.time += dt;
    this.previousTime = newTime;
    
    this.camera.update(this.time, dt);
    this.scene.update(this.time, dt);

    if (this.drawOnlyWhenChanged && !this.changed) return;

    this.gl.clearColor(this.bg[0], this.bg[1], this.bg[2], this.bg[3]);
    if (this.clear)
      this.gl.clear(this.clearBits);
    if (this.depthTest)
      this.gl.enable(this.gl.DEPTH_TEST);
    else
      this.gl.disable(this.gl.DEPTH_TEST);
    if (this.depthMask)
      this.gl.depthMask(this.gl.TRUE);
    else
      this.gl.depthMask(this.gl.FALSE);
    if (this.blend)
      this.gl.enable(this.gl.BLEND);
    else
      this.gl.disable(this.gl.BLEND);

    if (this.blendFuncSrc && this.blendFuncDst) {
      this.gl.blendFunc(this.gl[this.blendFuncSrc], this.gl[this.blendFuncDst]);
    }
    
    this.camera.draw(this.gl, this.canvas.width, this.canvas.height, this.scene);
    
    this.updateFps(this.frameTimes, real_dt);
    if (!this.firstFrameDoneTime) this.firstFrameDoneTime = new Date();
    this.changed = false;
    throwError(this.gl, "Scene draw loop");
  },

  updateFps : function(frames,real_dt) {
    var fps = document.getElementById('fps');
    if (!fps) return;
    var ctx = fps.getContext('2d');
    ctx.clearRect(0,0,fps.width,fps.height);
    frames.push(1000 / (1+real_dt));
    if (frames.length > 200) 
      frames.shift();
    for (var i=0; i<frames.length; i++) {
      ctx.fillRect(i,fps.height,1,-frames[i]/3);
    }
  }
};

Cube = function() {
  Node.call(this, Geometry.Cube.getCachedVBO());
  this.position = [0,0,0];
  this.material = DefaultMaterial.get();
};
Cube.prototype = new Node;
Cube.prototype.makeBounce = function(twirl) {
  this.addFrameListener(function(t, dt) {
    var y = 2*Math.abs(Math.sin(t / 400));
    this.position[1] = y;
    if (twirl)
      this.rotation.angle = 6*Math.cos(t / 2400);
  });
  return this;
};

Text = Klass(Node, {
  fontSize : 24,
  font : 'Arial',

  initialize : function(content, fontSize, font) {
    Node.initialize.call(this);
    this.canvas = E.canvas(1, 1);
    if (fontSize) this.fontSize = fontSize;
    if (font) this.font = font;
    var tex = new Texture();
    tex.generateMipmaps = false;
    tex.image = this.canvas;
    this.textNode = new Node(Geometry.Quad.getCachedVBO());
    this.textNode.material = FilterMaterial.make();
    this.textNode.material.textures.Texture0 = tex;
    this.textNode.depthMask = false;
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
    this.canvas = E.canvas(dims.width, Math.ceil(this.fontSize*1.2));
    var ctx = this.canvas.getContext('2d');
    ctx.font = sf;
    ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    ctx.fillText(this.text, 0, this.fontSize);
    this.textNode.scaling[0] = this.canvas.width / 2;
    this.textNode.scaling[1] = this.canvas.height / 2;
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
  }
});

FilterMaterial = {
  vert : (
    "precision mediump float;"+
    "attribute vec3 Vertex;"+
    "attribute vec3 Normal;"+
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
  ),

  frag : (
    "precision mediump float;"+
    "uniform sampler2D Texture0;"+
    "varying vec2 texCoord0;"+
    "void main()"+
    "{"+
    "  gl_FragColor = texture2D(Texture0, texCoord0);"+
    "}"
  ),

  make : function(gl, fragmentShader) {
    var shader = new Shader(null,
      {type:'VERTEX_SHADER', text:this.vert},
      {type:'FRAGMENT_SHADER', text:fragmentShader||this.frag}
    );
    return this.setupMaterial(shader);
  },

  setupMaterial : function(shader) {
    var m = new Material(shader);
    m.textures.Texture0 = null;
    return m;
  }
};

DefaultMaterial = {
  vert : (
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
  ),

  frag : (
    "precision mediump float;"+
    "uniform vec4 LightDiffuse;"+
    "uniform vec4 LightSpecular;"+
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
    "  vec4 color = GlobalAmbient * MaterialAmbient;"+
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
    "  color.a = matDiff.a;"+
    "  gl_FragColor = color;"+
    "}"
  ),

  get : function(gl) {
    if (!this.cached) {
      var shader = new Shader(null,
        {type:'VERTEX_SHADER', text:this.vert},
        {type:'FRAGMENT_SHADER', text:this.frag}
      );
      this.cached = this.setupMaterial(shader);
    }
    return this.cached.copy();
  },

  setupMaterial : function(shader) {
    var m = new Material(shader);
    m.textures.DiffTex = m.textures.SpecTex = m.textures.EmitTex = null;
    m.floats.MaterialSpecular = [0.95, 0.9, 0.9, 0];
    m.floats.MaterialDiffuse = [0.60, 0.6, 0.65, 1];
    m.floats.MaterialAmbient = [1, 1, 1, 1];
    m.floats.MaterialShininess = 1.5;

    m.floats.LightPos = [7, 7, 7, 1.0];
    m.floats.GlobalAmbient = [0.1, 0.1, 0.2, 1];
    m.floats.LightSpecular = [0.9, 1.0, 1.0, 1];
    m.floats.LightDiffuse = [0.8, 0.9, 0.95, 1];
    m.floats.LightAmbient = [0.1, 0.1, 0.1, 1];
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
