Slides = Klass({
  currentSlide : 0,

  h1FontSize : 100,
  h2FontSize : 72,
  h3FontSize : 60,
  listFontSize : 48,
  pFontSize : 48,

  h1Color : 'white',
  h2Color : 'white',
  h3Color : 'white',
  listColor : 'white',
  pColor : 'white',

  h1Font : 'Century Gothic,URW Gothic L,Tahoma,Arial',
  h2Font : 'Arial',
  h3Font : 'Arial',
  listFont : 'Arial',
  pFont : 'Arial',

  listBullet : "\u2605", // filled star

  pulse : 0,

  wavyText : true,
  cycleColors : false,

  initialize : function(elem) {
    if (document.location.hash) {
      this.currentSlide = parseInt(document.location.hash.slice(1));
    } else {
      this.currentSlide = 0;
    }
    var self = this;
    window.addEventListener('hashchange', function() {
      var idx = parseInt(document.location.hash.slice(1));
      if (!isNaN(idx) && idx != this.currentSlide)
        self.setSlide(idx);
    }, false);
    if (this.isWebGLSupported()) { // render using WebGL
      this.initializeWebGL(elem);
    } else if (this.isSVGSupported()) { // SVG fallback
    } else { // JS + CSS fallback
      window.onkeydown = this.makeKeydownHandler();
      this.rendererGoTo = this.htmlGoTo;
    }
    this.setSlideElement(elem);
  },

  htmlGoTo : function() {
    var divs = this.slideElement.getElementsByTagName('div');
    window.scrollTo(0, divs[this.currentSlide].offsetTop-40);
  },

  isWebGLSupported : function() {
    return (Magi.findGLContextId(E.canvas(1,1)) != null);
  },

  isSVGSupported : function() {
    return false;
  },
  
  makeKeydownHandler : function() {
    var self = this;
    return function(ev) {
      if (Key.match(ev, Key.SPACE)) {
        if (ev.shiftKey)
          self.previousSlide();
        else
          self.nextSlide();
        ev.preventDefault();
      } else if (Key.match(ev, Key.BACKSPACE)) {
        if (ev.shiftKey)
          self.nextSlide();
        else
          self.previousSlide();
        ev.preventDefault();
      }
    };
  },

  initializeWebGL : function(elem) {
    this.canvas = E.canvas(window.innerWidth, window.innerHeight);
    this.canvas.setAttribute('tabindex', '-1');
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = this.canvas.style.top = '0px';
    document.body.appendChild(this.canvas);

    this.realDisplay = new Magi.Scene(this.canvas);
    this.previousFrameFBO = new Magi.FBO(this.realDisplay.gl, this.canvas.width, this.canvas.height);
    this.previousFrameFBO.use();
    this.fbo = new Magi.FBO(this.realDisplay.gl, this.canvas.width, this.canvas.height);
    this.fbo.use();
    var showFBO = new Magi.FilterQuad();
    var self = this;
    showFBO.addFrameListener(function(t,dt){
      this.material.textures.Texture0 = self.fbo.texture;
      self.display.fbo = self.fbo;
      self.fbo.setSize(self.canvas.width, self.canvas.height);
      self.display.draw(t,dt);
      var f = self.previousFrameFBO;
      self.previousFrameFBO = self.fbo;
      self.fbo = f;
    });
    this.realDisplay.scene.appendChild(showFBO);

    this.display = new Magi.Scene(this.fbo);
    this.scene = this.display.scene;
    var s = this.display;
    s.camera.targetFov = 40;
    s.useDefaultCameraControls(this.canvas);
    s.root.setX(0.02).setY(1.0).setAngle(-0.1);
    s.root.childNodes[0].setAngle(-0.05);
    vec3.set([0,0,8], s.camera.position);
    vec3.set([0,0,0], s.camera.lookAt);
    s.bg = [0.3, 0.7, 0.9, 1];
    s.root.childNodes[0].setScale(1/200);

    var grad = new Magi.FilterQuad(this.shaders.bgFrag);
    grad.material.floats.aspect = 4/3;
    s.scene.appendChild(grad);

    byId('slides').style.display = 'none';


    s.scene.addFrameListener(function(t,dt) {
      if (self.cycleColors) {
        var rgb = Magi.Colors.hsv2rgb((t/100)%360, 0.9, 0.7);
        vec3.set(rgb, s.bg);
      }
    });

    window.addEventListener('resize', function() {
      self.canvas.width = window.innerWidth;
      self.canvas.height = window.innerHeight;
      self.display.changed = true;
    }, false);

    var downX=0, downY=0, cancelled=true;
    this.canvas.onmousedown = function(ev) {
      downX = ev.clientX;
      downY = ev.clientY;
      this.focus();
      cancelled = false;
    };
    this.canvas.onmousemove = function(ev) {
      if (!cancelled) {
        var x = ev.clientX;
        var y = ev.clientY;
        var dx = x - downX;
        var dy = y - downY;
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d > 5) cancelled = true;
      }
    };
    this.canvas.onclick = function(ev) {
      if (!cancelled) {
        if (ev.shiftKey)
          self.previousSlide();
        else
          self.nextSlide();
        s.changed = true;
      }
      cancelled = true;
      ev.preventDefault();
    };
    this.canvas.onkeydown = this.makeKeydownHandler();
    this.canvas.focus();

    this.targetPos = vec3.create();
    this.cube = this.makeCube();
    this.scene.appendChild(this.cube);
    this.rendererGoTo = this.webGLGoTo;
    var d = vec3.create();
    this.scene.addFrameListener(function(t,dt) {
      vec3.sub(self.targetPos, self.scene.position, d);
      if (vec3.lengthSquare(d) > 1) {
        var f = 1-Math.pow(0.75, dt/33);
        vec3.scale(d, f);
        vec3.add(self.scene.position, d);
      } else {
        self.visibleSlides(self.currentSlide, self.currentSlide);
      }
      vec3.negate(self.targetPos, d);
      vec3.sub(d, self.cube.position);
      var dist = vec3.length(d);
      if (dist > 1) {
        var f = 1-Math.pow(0.85, dt/33);
        vec3.scale(d, f);
        vec3.add(self.cube.position, d);
        self.cube.outerCube.setScale(Math.max(0.3, Math.min(1.0, 100.0/dist)));
        self.cube.outerCube.rotationSpeed = Math.min(50, 1+dist/10);
        if (dist < 80 && dist > 50 && self.pulse <= 0) {
          self.pulse = 330;
        }
      } else {
        self.cube.outerCube.setScale(1.0);
        self.cube.outerCube.rotationSpeed = 1;
      }
      if (self.pulse>0) {
        self.cube.innerCube.setScale(0.8-(self.pulse/33)*0.02);
        self.pulse-=dt;
      } else {
        self.cube.innerCube.setScale(0.8);
      }
    });
  },

  webGLGoTo : function(before, current) {
    vec3.negate(this.slides.childNodes[current].position, this.targetPos);
    this.visibleSlides(before, current);
  },

  toggleAllSlidesVisible : function() {
    this.allSlidesVisible = !this.allSlidesVisible;
    this.visibleSlides(this.currentSlide, this.currentSlide);
  },

  visibleSlides : function(first, last) {
    var min = Math.min(first, last);
    var max = Math.max(first, last);
    var cc = this.slides.childNodes;
    if (min == 0 && max == cc.length-1) {
      min = cc.length-1;
      max = 0;
    }
    for (var i=0; i<cc.length; i++) {
      if (!this.allSlidesVisible && i != min && i != max && (i < min || i > max)) {
        cc[i].display = false;
        this.deleteTextures(cc[i]);
      } else {
        cc[i].display = true;
      }
    }
  },

  deleteTextures : function(node) {
    node.forEach(function(c) {
      if (c.material) {
        for (var i in c.material.textures) {
          if (c.material.textures[i])
            c.material.textures[i].clear();
        }
      }
    });
  },

  toggleApp : function() {
    if (this.disabled) {
      this.canvas.style.display = 'block';
      this.slideElement.style.display = 'none';
      this.disabled = false;
      this.display.paused = false;
    } else {
      this.canvas.style.display = 'none';
      this.slideElement.style.display = 'block';
      this.disabled = true;
      this.display.paused = true;
    }
  },

  setSlideElement : function(elem) {
    if (this.slides && this.scene) {
      this.scene.removeChild(this.slides);
      this.slideElement.style.display = 'block';
    }
    this.slideElement = elem;
    this.slideCount = this.slideElement.getElementsByTagName('div').length;
    if (this.scene) {
      this.slideElement.style.display = 'none';
      this.slides = this.parseSlides(elem);
      this.scene.appendChild(this.slides);
    }
    this.setSlide(this.currentSlide);
  },

  setSlide : function(index) {
    if (index < 0) index = this.slideCount+index;
    var before = this.currentSlide
    this.currentSlide = index % this.slideCount;
    this.rendererGoTo(before, this.currentSlide);
    if (this.editor && this.editor.parentNode) this.editSlide();
    document.location.replace("#"+this.currentSlide);
  },

  getCurrentTitle : function() {
    return this.slides.childNodes[this.currentSlide].title;
  },

  nextSlide : function() {
    this.setSlide(this.currentSlide+1);
  },

  previousSlide : function() {
    this.setSlide(this.currentSlide-1);
  },

  updateText : function(node, text) {
    if (node.text != text) {
      node.setText(text);
      node.alignedNode.material.floats.xScale = node.width;
      node.alignedNode.material.floats.yScale = node.height;
    }
  },

  editSlide : function() {
    var tc = this.slides.childNodes[this.currentSlide];
    var texts = tc.getNodesByMethod('setText');
    if (!this.editor)
      this.editor = DIV({className: "editor"});
    this.editor.innerHTML = "";
    var self = this;
    texts.forEach(function(txt) {
      self.editor.appendChild(
        TEXT(txt.text, {
          onchange: function() {
            self.updateText(txt, this.value);
          },
          onkeyup: function() {
            self.updateText(txt, this.value);
          }
        })
      );
      self.editor.appendChild(BR());
    });
    this.editor.appendChild(BUTTON("Sulje", {
      onclick : function(){
        self.closeEditor();
        self.canvas.focus();
      }
    }));
    document.body.appendChild(this.editor);
  },

  closeEditor : function() {
    if (this.editor) {
      this.editor.innerHTML = "";
      document.body.removeChild(this.editor);
    }
  },

  parseSlides : function(elem) {
    var cn = toArray(elem.childNodes).filter(function(s){ return s.tagName; });
    var top = new Magi.Node();
    var self = this;
    var x = 0;
    var cf = cn.length*400;
    var r = cf / 2*Math.PI;
    cn.forEach(function(s) {
      var d = x/cn.length;
      var slide = self.parseSlide(s, null, x);
      slide.element = s;
      slide.position[1] = Math.sin(2*Math.PI*x/10)*2500;
      slide.position[0] = -x*10000;
      slide.position[2] = Math.cos(2*Math.PI*x/10)*2500;
      x++;
      top.appendChild(slide);
    });
    return top;
  },

  parseSlide : function(elem, acc, idx) {
    var cn = toArray(elem.childNodes);
    acc = acc || {top: new Magi.Node(), left: 0, xOffset: 0, offset: 0, counter: 0};
    var self = this;
    var origOffset = acc.offset;
    cn.forEach(function(e) {
      var node;
      var xOffset = acc.xOffset;
      var yOffset = acc.offset;
      var left = acc.left;
      switch (e.tagName) {
        case "H1":
          sz = self.h1FontSize;
          if (!acc.top.title)
            acc.top.title = e.textContent;
          node = self.makeH1(e.textContent);
          acc.offset += sz*2;
          break;
        case "H2":
          sz = self.h2FontSize;
          node = self.makeH2(e.textContent);
          if (acc.left < 0) {
            node.setAlign(node.leftAlign);
            left -= 100;
          }
          acc.offset += sz*1.5;
          break;
        case "H3":
          sz = self.h3FontSize;
          node = self.makeH3(e.textContent);
          acc.offset += sz*1.3;
          break;
        case "P":
          sz = self.pFontSize;
          node = new Magi.Text(e.textContent, self.pFontSize, self.pColor, self.pFont);
          node.setVAlign(node.topAlign);
          acc.offset += sz*1.3;
          break;
        case "UL":
        case "OL":
          var lt = acc.listType;
          acc.listType = e.tagName;
          acc.counter = 1;
          acc.xOffset += 32;
          var l = acc.left;
          acc.left = -300;
          self.parseSlide(e, acc, idx);
          acc.left = l;
          acc.xOffset -= 32;
          acc.listType = lt;
          break;
        case "LI":
          var prefix = acc.listType == "OL" ? (acc.counter++)+"." : self.listBullet;
          node = new Magi.Text(prefix + " " + e.textContent, self.listFontSize, self.listColor, self.listFont);
          node.setAlign(node.leftAlign, node.topAlign);
          acc.offset += self.listFontSize*1.25;
          break;
        case "IMG":
          node = new Magi.MeshImage(e);
          self.addWaveShader(node, 1.0);
          node.setVAlign(node.topAlign);
          if (!Object.isImageLoaded(e)) {
            e.addEventListener('load', (function(node,top,h) {
              return function() {
                var idx = top.childNodes.indexOf(node);
                for (var i=idx+1; i<top.childNodes.length; i++) {
                  top.childNodes[i].position[1] -= this.height-h;
                }
                self.addWaveShader(node, 1.0);
              }
            })(node, acc.top, e.height), false);
          }
          acc.offset += node.height + 8;
          break;
        case "CANVAS":
          node = new Magi.Image(e);
          node.setVAlign(node.topAlign);
          if (e.getAttribute('animated')) {
            node.addFrameListener(function() {
              if (self.currentSlide == this.slideIndex) {
                this.texture.changed = true;
              }
            });
          }
          acc.offset += node.height + 8;
          break;
        case "VIDEO":
          node = new Magi.MeshImage(e);
          node.alignedNode.transparent = false;
          self.addWaveShader(node);
          node.setVAlign(node.topAlign);
          node.elapsed = 100;
          node.addFrameListener(function(t,dt) {
            if (self.currentSlide == this.slideIndex) {
              if (e.paused) e.play();
              if (e.currentTime != this.currentTime) {
                this.texture.changed = true;
                this.currentTime = e.currentTime;
              }
              if (e.getAttribute('oncube')) {
                self.cube.outerCube.material.textures.EmitTex = this.texture;
              }
            } else {
              if (!e.paused) e.pause();
              if (e.getAttribute('oncube') && self.cube.outerCube.material.textures.EmitTex === this.texture)
                self.cube.outerCube.material.textures.EmitTex = null;
            }
          });
          acc.offset += node.height + 8;
          break;
        case "SELF":
          node = new Magi.Image(self.previousFrameFBO.texture, true);
          node.addFrameListener(function() {
            this.setImage(self.previousFrameFBO.texture);
          });
          node.setVAlign(node.topAlign);
          acc.offset += node.height + 8;
          break;
        case "MODEL":
          node = new Magi.Node();
          var w = Magi.Bin.load(e.getAttribute('src'), (function(node){
            return function(model) {
              var sc = 1000.0 / (model.boundingBox.diameter);
              var n = new Magi.Node();
              n.setScale(sc);
              n.setY(-150);
              n.model = model.makeVBO();
              n.rotation.axis = [1,0,0];
              n.rotation.angle = -Math.PI/2;
              n.material = Magi.DefaultMaterial.get();
              n.material.floats.LightDiffuse = [1,1,1,1];
              n.material.floats.MaterialShininess = 6.0;
              n.material.floats.MaterialDiffuse = [1,1,1,1];
              node.appendChild(n);
            }
          })(node));
          w.flatNormals = false;
          acc.offset += 150;
          break;
      }
      if (node) {
        node.id = e.id;
        node.position[0] = left + xOffset;
        node.position[1] = -yOffset;
        node.slideIndex = idx;
        acc.top.appendChild(node);
      }
    });
    acc.top.slideIndex = idx;
    acc.top.height = acc.offset - origOffset;
    return acc.top;
  },

  makeH1 : function(txt) {
    var h1 = new Magi.MeshText(txt, this.h1FontSize/3.0, this.h1Color, this.h1Font);
    h1.setAlign(h1.leftAlign);
    h1.rotation.axis[0] = 0.4;
    h1.setAngle(1.2);
    vec3.set3(600/32, h1.scaling);
    h1.position[2] = -800;
    h1.position[0] = -700;
    h1.setY(120.0);
    this.addDotShader(h1);
    var t = new Magi.Node();
    t.appendChild(h1);
    return t;
  },

  makeH2 : function(txt) {
    var h2 = new Magi.MeshText(txt, this.h2FontSize, this.h2Color, this.h2Font);
    h2.setVAlign(h2.topAlign);
    this.addWaveShader(h2);
    return h2;
  },

  makeH3 : function(txt) {
    var h3 = new Magi.MeshText(txt, this.h3FontSize, this.h3Color, this.h3Font);
    h3.setVAlign(h3.topAlign);
    this.addWaveShader(h3);
    return h3;
  },

  addDotShader : function(node) {
    node.alignedNode.material.shader = this.getDotShader();
    node.alignedNode.material.floats.pitch = 1.0;
    node.alignedNode.material.floats.magnitude = 3.0;
    node.alignedNode.material.floats.opacity = 0.2;
    node.alignedNode.material.floats.xScale = node.width;
    node.alignedNode.material.floats.yScale = node.height;
  },

  addWaveShader : function(node, mag) {
    mag = mag || 5.0;
    node.alignedNode.material.shader = this.getWaveShader();
    node.alignedNode.material.floats.magnitude = mag;
    node.alignedNode.material.floats.xScale = node.width;
    node.alignedNode.material.floats.yScale = node.height;
    var self = this;
    node.addFrameListener(function(t,dt) {
      node.alignedNode.material.floats.time = t / 500;
      if (self.wavyText) {
        node.alignedNode.material.floats.magnitude = mag;
      } else {
        node.alignedNode.material.floats.magnitude = 0.0;
      }
    });
  },

  getDotShader : function() {
    if (!this.dotShader) {
      var sh = new Magi.Shader(null, this.shaders.bendVert, this.shaders.dotFrag);
      this.dotShader = sh;
    }
    return this.dotShader;
  },

  getWaveShader : function() {
    return new Magi.Shader(null, this.shaders.waveVert, Magi.FilterMaterial.frag);
  },

  makeCube : function() {
    var cb = new Magi.Cube();
    cb.setAxis(0.4, 0.6, -1);
    cb.rotationSpeed = 1;
    cb.addFrameListener(function(t,dt) {
      this.rotation.angle += (this.rotationSpeed*dt/4000);
      this.rotation.angle %= (Math.PI*2);
    });
    cb.material = cb.material.copy();
    var fs = cb.material.floats;
    vec4.setLeft(fs.MaterialDiffuse, [0.8,0.9, 1.0, 0.8]);
    vec4.setLeft(fs.LightDiffuse, [1,1,0.5,1]);
    vec4.setLeft(fs.LightSpecular, [0.5,1,1,1]);
    vec4.setLeft(fs.LightAmbient, [0.3,0,0.2,1]);
    cb.transparent = true;

    var ncb = new Magi.Cube();
    ncb.transparent = true;
    ncb.material = cb.material.copy();
    vec4.setLeft(ncb.material.floats.MaterialDiffuse, [1,0.95,0.8,0.7]);
    var fs = ncb.material.floats;
    vec4.setLeft(fs.LightDiffuse, [1,1,0.8,1]);
    vec4.setLeft(fs.LightSpecular, [1,0.95,0.8,1]);
    vec4.setLeft(fs.LightAmbient, [0.2,0.1,0.0,1]);
    vec3.set3(0.75, ncb.scaling);
    ncb.blendFuncSrc = 'SRC_ALPHA';
    ncb.blendFuncDst = 'ONE';
    cb.appendChild(ncb);

    var cube = new Magi.Node();
    var pos = new Magi.Node().setScale(250).setPosition(-800,60,-470);
    pos.appendChild(cb);
    cube.appendChild(pos);
    cube.outerCube = cb;
    cube.innerCube = ncb;
    return cube;
  },



  shaders : {
    waveVert : {type: "VERTEX_SHADER", text: (
      "precision mediump float;"+
      "attribute vec3 Vertex;"+
      "attribute vec3 Normal;"+
      "attribute vec2 TexCoord;"+
      "uniform mat4 PMatrix;"+
      "uniform mat4 MVMatrix;"+
      "uniform mat3 NMatrix;"+
      "uniform float time;"+
      "uniform float xScale;"+
      "uniform float yScale;"+
      "uniform float magnitude;"+
      "varying vec2 texCoord0;"+
      "void main()"+
      "{"+
      "  vec4 v = vec4(Vertex, 1.0);"+
      "  float dx = xScale*0.03*(TexCoord.s);"+
      "  float dy = yScale*0.03*(TexCoord.t-0.5);"+
      "  float d = sqrt(dx*dx + dy*dy);"+
      "  v.z += magnitude * (2.0*cos(time+3.14*0.1*TexCoord.s*xScale*0.03))*yScale*0.03;"+
      "  texCoord0 = vec2(TexCoord.s, 1.0-TexCoord.t);"+
      "  vec4 worldPos = MVMatrix * v;"+
      "  gl_Position = PMatrix * worldPos;"+
      "}"
    )},

    bendVert : {type: "VERTEX_SHADER", text: (
      "precision mediump float;"+
      "attribute vec3 Vertex;"+
      "attribute vec3 Normal;"+
      "attribute vec2 TexCoord;"+
      "uniform mat4 PMatrix;"+
      "uniform mat4 MVMatrix;"+
      "uniform mat3 NMatrix;"+
      "uniform float time;"+
      "uniform float xScale;"+
      "uniform float yScale;"+
      "uniform float magnitude;"+
      "varying vec2 texCoord0;"+
      "varying float z;"+
      "void main()"+
      "{"+
      "  vec4 v = vec4(Vertex, 1.0);"+
      "  float dx = xScale*0.06*(TexCoord.s);"+
      "  float dy = yScale*0.06*(TexCoord.t);"+
      "  float d = sqrt(dx*dx + dy*dy);"+
      "  v.z += magnitude * pow(1.2,d);"+
      "  texCoord0 = vec2(TexCoord.s, 1.0-TexCoord.t);"+
      "  vec4 worldPos = MVMatrix * v;"+
      "  gl_Position = PMatrix * worldPos;"+
      "  z = gl_Position.z;"+
      "}"
    )},
    
    dotFrag : {type: "FRAGMENT_SHADER", text: (
      "precision mediump float;"+
      "uniform float xScale;"+
      "uniform float yScale;"+
      "uniform float opacity;"+
      "uniform float pitch;"+
      "uniform sampler2D Texture0;"+
      "varying vec2 texCoord0;"+
      "varying float z;"+
      "void main()"+
      "{"+
      "  vec2 scale = vec2(xScale/pitch, yScale/pitch);"+
      "  vec2 gridVec = texCoord0 * scale;"+
      "  float gridX = floor(gridVec.s);"+
      "  float gridY = floor(gridVec.t);"+
      "  vec2 gridCenter = vec2((gridX + 0.5), (gridY + 0.5));"+
      "  float d = length(gridVec - gridCenter);"+
      "  vec4 sample = texture2D(Texture0, gridCenter / scale);"+
      "  float a = sample.a;"+
      "  float f = smoothstep(0.01*z+0.3*a, 0.3*a, d);"+
      "  sample.a *= opacity;"+
      "  sample *= f;"+
      "  gl_FragColor = sample * sample.a;"+
      "}"
    )},
    
    bgFrag : {type: "FRAGMENT_SHADER", text: (
      "precision mediump float;"+
      "uniform sampler2D Texture0;"+
      "uniform float aspect;"+
      "varying vec2 texCoord0;"+
      "void main()"+
      "{"+
      "  float dx = (-0.5+texCoord0.s)*1.5 * aspect;"+
      "  float dy = texCoord0.t / aspect;"+
      "  float d = sqrt(dx*dx + dy*dy);"+
      "  vec4 c = vec4(0.76,0.72,0.78, -0.5*d);"+
      "  gl_FragColor = c*c.a;"+
      "}"
    )}
  }

});

