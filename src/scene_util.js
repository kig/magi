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
  depthTest : true,
  depthMask : true,
  blend : true,
  blendFuncSrc : 'ONE',
  blendFuncDst : 'ONE_MINUS_SRC_ALPHA',
  
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
    var newTime = new Date;
    var real_dt = newTime - this.previousTime;
    var dt = this.timeDir * this.timeSpeed * real_dt;
    this.time += dt;
    this.previousTime = newTime;
    
    this.camera.update(this.time, dt);
    this.scene.update(this.time, dt);

    if (this.drawOnlyWhenChanged && !this.changed) return;

    if (this.clear) {
      this.gl.clearColor(this.bg[0], this.bg[1], this.bg[2], this.bg[3]);
      this.gl.clear(this.clearBits);
    }

    this.gl.depthFunc(this.gl.LESS);
    this.gl.disable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.frontFace(this.gl.CCW);
    if (this.depthTest) {
      this.gl.enable(this.gl.DEPTH_TEST);
    } else {
      this.gl.disable(this.gl.DEPTH_TEST);
    }
    if (this.depthMask) {
      this.gl.depthMask(true);
    } else {
      this.gl.depthMask(false);
    }
    if (this.blend) {
      this.gl.enable(this.gl.BLEND);
    } else {
      this.gl.disable(this.gl.BLEND);
    }

    if (this.blendFuncSrc && this.blendFuncDst) {
      this.gl.blendFunc(this.gl[this.blendFuncSrc], this.gl[this.blendFuncDst]);
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

Magi.Cube = Klass(Magi.Node, {
  initialize : function() {
    Magi.Node.initialize.call(this, Magi.Geometry.Cube.getCachedVBO());
    this.position = [0,0,0];
    this.material = Magi.DefaultMaterial.get();
  },

  makeBounce : function(twirl) {
    this.addFrameListener(function(t, dt) {
      var y = 2*Math.abs(Math.sin(t / 500));
      this.position[1] = y;
      if (twirl)
        this.rotation.angle = 6*Math.cos(t / 7200);
    });
    return this;
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
    this.imageNode.depthMask = false;
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
    ctx.fillStyle = this.color;
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

Magi.Curves = {

  angularDistance : function(a, b) {
    var pi2 = Math.PI*2;
    var d = (b - a) % pi2;
    if (d > Math.PI) d -= pi2;
    if (d < -Math.PI) d += pi2;
    return d;
  },

  linePoint : function(a, b, t, dest) {
    if (!dest) dest = vec3.create();
    dest[0] = a[0]+(b[0]-a[0])*t
    dest[1] = a[1]+(b[1]-a[1])*t;
    dest[2] = a[2]+(b[2]-a[2])*t;
    return dest;
  },

  quadraticPoint : function(a, b, c, t, dest) {
    if (!dest) dest = vec3.create();
    // var d = this.linePoint(a,b,t)
    // var e = this.linePoint(b,c,t)
    // return this.linePoint(d,e,t)
    var dx = a[0]+(b[0]-a[0])*t;
    var ex = b[0]+(c[0]-b[0])*t;
    var x = dx+(ex-dx)*t;
    var dy = a[1]+(b[1]-a[1])*t;
    var ey = b[1]+(c[1]-b[1])*t;
    var y = dy+(ey-dy)*t;
    var dz = a[2]+(b[2]-a[2])*t;
    var ez = b[2]+(c[2]-b[2])*t;
    var z = dz+(ez-dz)*t;
    dest[0] = x; dest[1] = y; dest[2] = z;
    return dest;
  },

  cubicPoint : function(a, b, c, d, t, dest) {
    if (!dest) dest = vec3.create();
    var ax3 = a[0]*3;
    var bx3 = b[0]*3;
    var cx3 = c[0]*3;
    var ay3 = a[1]*3;
    var by3 = b[1]*3;
    var cy3 = c[1]*3;
    var az3 = a[2]*3;
    var bz3 = b[2]*3;
    var cz3 = c[2]*3;
    var x = a[0] + t*(bx3 - ax3 + t*(ax3-2*bx3+cx3 + t*(bx3-a[0]-cx3+d[0])));
    var y = a[1] + t*(by3 - ay3 + t*(ay3-2*by3+cy3 + t*(by3-a[1]-cy3+d[1])));
    var z = a[2] + t*(bz3 - az3 + t*(az3-2*bz3+cz3 + t*(bz3-a[2]-cz3+d[2])));
    dest[0] = x; dest[1] = y; dest[2] = z;
    return dest;
  },

  linearValue : function(a,b,t) {
    return a + (b-a)*t;
  },

  quadraticValue : function(a,b,c,t) {
    var d = a + (b-a)*t;
    var e = b + (c-b)*t;
    return d + (e-d)*t;
  },

  cubicValue : function(a,b,c,d,t) {
    var a3 = a*3, b3 = b*3, c3 = c*3;
    return a + t*(b3 - a3 + t*(a3-2*b3+c3 + t*(b3-a-c3+d)));
  },

  catmullRomPoint : function (a,b,c,d, t, dest) {
    if (!dest) dest = vec3.create();
    var af = ((-t+2)*t-1)*t*0.5;
    var bf = (((3*t-5)*t)*t+2)*0.5;
    var cf = ((-3*t+4)*t+1)*t*0.5;
    var df = ((t-1)*t*t)*0.5;
    var x = a[0]*af + b[0]*bf + c[0]*cf + d[0]*df;
    var y = a[1]*af + b[1]*bf + c[1]*cf + d[1]*df;
    var z = a[2]*af + b[2]*bf + c[2]*cf + d[2]*df;
    dest[0] = x; dest[1] = y; dest[2] = z;
    return dest;
  },

/*
  catmullRomAngle : function (a,b,c,d, t) {
    var dx = 0.5 * (c[0] - a[0] + 2*t*(2*a[0] - 5*b[0] + 4*c[0] - d[0]) +
             3*t*t*(3*b[0] + d[0] - a[0] - 3*c[0]))
    var dy = 0.5 * (c[1] - a[1] + 2*t*(2*a[1] - 5*b[1] + 4*c[1] - d[1]) +
             3*t*t*(3*b[1] + d[1] - a[1] - 3*c[1]))
    return Math.atan2(dy, dx)
  },

  catmullRomPointAngle : function (a,b,c,d, t) {
    var p = this.catmullRomPoint(a,b,c,d,t)
    var a = this.catmullRomAngle(a,b,c,d,t)
    return {point:p, angle:a}
  },

  lineAngle : function(a,b) {
    return Math.atan2(b[1]-a[1], b[0]-a[0])
  },

  quadraticAngle : function(a,b,c,t) {
    var d = this.linePoint(a,b,t)
    var e = this.linePoint(b,c,t)
    return this.lineAngle(d,e)
  },

  cubicAngle : function(a, b, c, d, t) {
    var e = this.quadraticPoint(a,b,c,t)
    var f = this.quadraticPoint(b,c,d,t)
    return this.lineAngle(e,f)
  },
*/

  lineLength : function(a,b) {
    var x = (b[0]-a[0]);
    var y = (b[1]-a[1]);
    var z = (b[2]-a[2]);
    return Math.sqrt(x*x + y*y + z*z);
  },

  squareLineLength : function(a,b) {
    var x = (b[0]-a[0]);
    var y = (b[1]-a[1]);
    var z = (b[2]-a[2]);
    return x*x + y*y + z*z;
  },

  quadraticLength : function(a,b,c, error) {
    var p1 = this.linePoint(a,b,2/3)
    var p2 = this.linePoint(b,c,1/3)
    return this.cubicLength(a,p1,p2,c, error)
  },

  cubicLength : (function() {
    var bezsplit = function(v) {
      var vtemp = [v.slice(0)];

      for (var i=1; i < 4; i++) {
        vtemp[i] = [[],[],[],[]];
        for (var j=0; j < 4-i; j++) {
          vtemp[i][j][0] = 0.5 * (vtemp[i-1][j][0] + vtemp[i-1][j+1][0]);
          vtemp[i][j][1] = 0.5 * (vtemp[i-1][j][1] + vtemp[i-1][j+1][1]);
        }
      }
      var left = [];
      var right = [];
      for (var j=0; j<4; j++) {
        left[j] = vtemp[j][0];
        right[j] = vtemp[3-j][j];
      }
      return [left, right];
    };

    var addifclose = function(v, error) {
      var len = 0;
      for (var i=0; i < 3; i++) {
        len += Curves.lineLength(v[i], v[i+1]);
      }
      var chord = Curves.lineLength(v[0], v[3]);
      if ((len - chord) > error) {
        var lr = bezsplit(v);
        len = addifclose(lr[0], error) + addifclose(lr[1], error);
      }
      return len;
    };

    return function(a,b,c,d, error) {
      if (!error) error = 1;
      return addifclose([a,b,c,d], error);
    };
  })()

/*
  quadraticLengthPointAngle : function(a,b,c,lt,error) {
    var p1 = this.linePoint(a,b,2/3);
    var p2 = this.linePoint(b,c,1/3);
    return this.cubicLengthPointAngle(a,p1,p2,c, error);
  },

  cubicLengthPointAngle : function(a,b,c,d,lt,error) {
    // how about not creating a billion arrays, hmm?
    var len = this.cubicLength(a,b,c,d,error)
    var point = a
    var prevpoint = a
    var lengths = []
    var prevlensum = 0
    var lensum = 0
    var tl = lt*len
    var segs = 20
    var fac = 1/segs
    for (var i=1; i<=segs; i++) { // FIXME get smarter
      prevpoint = point
      point = this.cubicPoint(a,b,c,d, fac*i)
      prevlensum = lensum
      lensum += this.lineLength(prevpoint, point)
      if (lensum >= tl) {
        if (lensum == prevlensum)
          return {point: point, angle: this.lineAngle(a,b)}
        var dl = lensum - tl
        var dt = dl / (lensum-prevlensum)
        return {point: this.linePoint(prevpoint, point, 1-dt),
                angle: this.cubicAngle(a,b,c,d, fac*(i-dt)) }
      }
    }
    return {point: d.slice(0), angle: this.lineAngle(c,d)}
  }
*/
}



/**
  Color helper functions.
  */
Magi.Colors = {

  /**
    Converts an HSL color to its corresponding RGB color.

    @param h Hue in degrees (0 .. 359)
    @param s Saturation (0.0 .. 1.0)
    @param l Lightness (0 .. 255)
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsl2rgb : function(h,s,l) {
    var r,g,b;
    if (s == 0) {
      r=g=b=v;
    } else {
      var q = (l < 0.5 ? l * (1+s) : l+s-(l*s));
      var p = 2 * l - q;
      var hk = (h % 360) / 360;
      var tr = hk + 1/3;
      var tg = hk;
      var tb = hk - 1/3;
      if (tr < 0) tr++;
      if (tr > 1) tr--;
      if (tg < 0) tg++;
      if (tg > 1) tg--;
      if (tb < 0) tb++;
      if (tb > 1) tb--;
      if (tr < 1/6)
        r = p + ((q-p)*6*tr);
      else if (tr < 1/2)
        r = q;
      else if (tr < 2/3)
        r = p + ((q-p)*6*(2/3 - tr));
      else
        r = p;

      if (tg < 1/6)
        g = p + ((q-p)*6*tg);
      else if (tg < 1/2)
        g = q;
      else if (tg < 2/3)
        g = p + ((q-p)*6*(2/3 - tg));
      else
        g = p;

      if (tb < 1/6)
        b = p + ((q-p)*6*tb);
      else if (tb < 1/2)
        b = q;
      else if (tb < 2/3)
        b = p + ((q-p)*6*(2/3 - tb));
      else
        b = p;
    }

    return [r,g,b];
  },

  /**
    Converts an HSV color to its corresponding RGB color.

    @param h Hue in degrees (0 .. 359)
    @param s Saturation (0.0 .. 1.0)
    @param v Value (0 .. 255)
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsv2rgb : function(h,s,v) {
    var r,g,b;
    if (s == 0) {
      r=g=b=v;
    } else {
      h = (h % 360)/60.0;
      var i = Math.floor(h);
      var f = h-i;
      var p = v * (1-s);
      var q = v * (1-s*f);
      var t = v * (1-s*(1-f));
      switch (i) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        case 5:
          r = v;
          g = p;
          b = q;
          break;
      }
    }
    return [r,g,b];
  },

  /**
    Parses a color style object into one that can be used with the given
    canvas context.

    Accepted formats:
      'white'
      '#fff'
      '#ffffff'
      'rgba(255,255,255, 1.0)'
      [255, 255, 255]
      [255, 255, 255, 1.0]
      new Gradient(...)
      new Pattern(...)

    @param style The color style to parse
    @param ctx Canvas 2D context on which the style is to be used
    @return A parsed style, ready to be used as ctx.fillStyle / strokeStyle
    */
  parseColorStyle : function(style, ctx) {
    if (typeof style == 'string') {
      return style;
    } else if (style.compiled) {
      return style.compiled;
    } else if (style.isPattern) {
      return style.compile(ctx);
    } else if (style.length == 3) {
      return 'rgba('+style.map(Math.round).join(",")+', 1)';
    } else if (style.length == 4) {
      return 'rgba('+
              Math.round(style[0])+','+
              Math.round(style[1])+','+
              Math.round(style[2])+','+
              style[3]+
             ')';
    } else {
      throw( "Bad style: " + style );
    }
  }
}

