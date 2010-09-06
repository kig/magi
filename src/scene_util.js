Mouse = {
  LEFT : 0,
  MIDDLE : 1,
  RIGHT : 2
}

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
  useDepth : true,
  
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
    if (this.useDepth)
      this.gl.enable(this.gl.DEPTH_TEST);
    else
      this.gl.disable(this.gl.DEPTH_TEST);
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

var $ = function(id){ return document.getElementById(id); };

Cube = function() {
  Node.call(this, Geometry.Cube.getCachedVBO());
  this.position = [0,0,0];
  this.material = DefaultMaterial.get();
};
Cube.prototype = new Node;
Cube.prototype.makeBounce = function() {
  this.addFrameListener(function(t, dt) {
    var y = 2*Math.abs(Math.sin(t / 400));
    this.position[1] = y;
  });
  return this;
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
    "  texCoord0 = TexCoord;"+
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
    "uniform sampler2D DiffTex, SpecTex;"+
    "varying vec3 normal, lightDir, eyeVec;"+
    "varying vec2 texCoord0;"+
    "varying float attenuation;"+
    "void main()"+
    "{"+
    "  vec4 color = GlobalAmbient * MaterialAmbient;"+
    "  vec4 diffuse = LightDiffuse * MaterialDiffuse;"+
    "  float lambertTerm = dot(normal, lightDir);"+
    "  if (lambertTerm > 0.0) {"+
    "    color += diffuse * lambertTerm * attenuation;"+
    "    vec3 E = normalize(eyeVec);"+
    "    vec3 R = reflect(-lightDir, normal);"+
    "    float specular = pow( max(dot(R, E), 0.0), MaterialShininess );"+
    "    color += MaterialSpecular * LightSpecular * specular * attenuation;"+
    "  }"+
    "  color.a = MaterialDiffuse.a;"+
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
    m.floats.MaterialSpecular = [0.95, 0.9, 0.9, 1];
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
