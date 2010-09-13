Magi.Node = Klass({
  model : null,
  position : null,
  rotation : null,
  scaling : null,
  polygonOffset : null,
  scaleAfterRotate : false,
  depthMask : null,
  depthTest : null,
  display : true,
  transparent : false,
  id : null,

  initialize : function(model) {
    this.model = model;
    this.renderPasses = {normal: true};
    this.material = new Magi.Material();
    this.matrix = mat4.newIdentity();
    this.normalMatrix = mat3.newIdentity();
    this.rotation = {angle : 0, axis : vec3.create([0,1,0])};
    this.position = vec3.create([0, 0, 0]);
    this.scaling = vec3.create([1, 1, 1]);
    this.frameListeners = [];
    this.childNodes = [];
  },

  getNodeById : function(name) {
    var found = null;
    try {
      this.filterNodes(function(n){ if (n.id == name) { found=n; throw(null); } });
    } catch(e) {
      return found;
    }
  },

  getNodesById : function(name) {
    return this.filterNodes(function(n){ return (n.id == name); });
  },

  getNodesByKlass : function(klass) {
    return this.filterNodes(function(n){ return (n instanceof klass); });
  },

  getNodesByMethod : function(name) {
    return this.filterNodes(function(n){ return n[name]; });
  },

  getNodesByKeyValue : function(key, value) {
    return this.filterNodes(function(n){ return n[key] == value; });
  },

  filterNodes : function(f) {
    var nodes = [];
    this.forEach(function(n) {
      if (f(n)) nodes.push(n);
    });
    return nodes;
  },

  forEach : function(f) {
    f.call(this,this);
    this.childNodes.forEach(function(cn){
      cn.forEach(f);
    });
  },

  setX : function(x) {
    this.position[0] = x;
    return this;
  },

  setY : function(x) {
    this.position[1] = x;
    return this;
  },
  
  setZ : function(x) {
    this.position[2] = x;
    return this;
  },

  setPosition : function(x,y,z) {
    if (x.length != null) {
      vec3.set(x, this.position);
    } else {
      if (y == null) {
        vec3.set3(x, this.position)
      } else {
        this.position[0] = x;
        this.position[1] = y;
        if (z != null)
          this.position[2] = z;
      }
    }
    return this;
  },

  setScale : function(x,y,z) {
    if (x.length != null) {
      vec3.set(x, this.scaling);
    } else {
      if (y == null) {
        vec3.set3(x, this.scaling)
      } else {
        this.scaling[0] = x;
        this.scaling[1] = y;
        if (z != null)
          this.scaling[2] = z;
      }
    }
    return this;
  },

  setAngle : function(a) {
    this.rotation.angle = a;
    return this;
  },

  setAxis : function(x,y,z) {
    if (x.length != null) {
      vec3.set(x, this.rotation.axis);
    } else {
      if (y == null) {
        vec3.set3(x, this.rotation.axis)
      } else {
        this.rotation.axis[0] = x;
        this.rotation.axis[1] = y;
        if (z != null)
          this.rotation.axis[2] = z;
      }
    }
    return this;
  },

  draw : function(gl, state, perspectiveMatrix) {
    if (!this.model || !this.display) return;
    if (this.material) {
      this.material.apply(gl, state, perspectiveMatrix, this.matrix, this.normalMatrix);
    }
    if (this.model.gl == null) this.model.gl = gl;
    var psrc = state.blendFuncSrc;
    var pdst = state.blendFuncDst;
    var dm = state.depthMask;
    var dt = state.depthTest;
    var poly = state.polygonOffset;
    var bl = state.blend;
    if (this.polygonOffset) {
      gl.polygonOffset(this.polygonOffset.factor, this.polygonOffset.units);
    }
    if (this.depthMask != null && this.depthMask != state.depthMask) {
      gl.depthMask(this.depthMask);
    }
    if (this.depthTest != null && this.depthTest != state.depthTest) {
      if (this.depthTest)
        gl.enable(gl.DEPTH_TEST);
      else
        gl.disable(gl.DEPTH_TEST);
    }
    if (this.blendFuncSrc && this.blendFuncDst) {
      gl.blendFunc(gl[this.blendFuncSrc], gl[this.blendFuncDst]);
    }
    if (this.blend != null && this.blend != state.blend) {
      if (this.blend) gl.enable(gl.BLEND);
      else gl.disable(gl.BLEND);
    }

    this.model.draw(
      state.currentShader.attrib('Vertex'),
      state.currentShader.attrib('Normal'),
      state.currentShader.attrib('TexCoord')
    );

    if (this.blend != null && this.blend != state.blend) {
      if (bl) gl.enable(gl.BLEND);
      else gl.disable(gl.BLEND);
    }
    if (this.blendFuncSrc && this.blendFuncDst) {
      gl.blendFunc(gl[psrc], gl[pdst]);
    }
    if (this.depthTest != null && this.depthTest != state.depthTest) {
      if (dt)
        gl.enable(gl.DEPTH_TEST);
      else
        gl.disable(gl.DEPTH_TEST);
    }
    if (this.depthMask != null && this.depthMask != state.depthMask) {
      gl.depthMask(dm);
    }
    if (this.polygonOffset) {
      gl.polygonOffset(poly.factor, poly.units);
    }
  },
  
  addFrameListener : function(f) {
    this.frameListeners.push(f);
  },
  
  update : function(t, dt) {
    var a = [];
    for (var i=0; i<this.frameListeners.length; i++) {
      a.push(this.frameListeners[i]);
    }
    for (var i=0; i<a.length; i++) {
      if (this.frameListeners.indexOf(a[i]) != -1)
        a[i].call(this, t, dt, this);
    }
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].update(t, dt);
  },
  
  appendChild : function(c) {
    this.childNodes.push(c);
  },
  
  updateTransform : function(matrix) {
    var m = this.matrix;
    mat4.set(matrix, m);
    var p = this.position;
    var s = this.scaling;
    var doScaling = (s[0] != 1) || (s[1] != 1) || (s[2] != 1);
    if (p[0] || p[1] || p[2])
      mat4.translate(m, p);
    if (this.scaleAfterRotate && doScaling)
      mat4.scale(m, s);
    if (this.rotation.angle != 0)
      mat4.rotate(m, this.rotation.angle, this.rotation.axis);
    if (!this.scaleAfterRotate && doScaling)
      mat4.scale(m, s);
    if (this.isBillboard)
      mat4.billboard(m);
    mat4.toInverseMat3(m, this.normalMatrix);
    mat3.transpose(this.normalMatrix);
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].updateTransform(m);
  },
  
  collectDrawList : function(arr) {
    if (!arr) arr = [];
    if (this.display) {
      arr.push(this);
      for (var i=0; i<this.childNodes.length; i++)
        this.childNodes[i].collectDrawList(arr);
    }
    return arr;
  }
});

Magi.Material = Klass({
  initialize : function(shader) {
    this.shader = shader;
    this.textures = {};
    for (var i in this.textures) delete this.textures[i];
    this.floats = {};
    for (var i in this.floats) delete this.floats[i];
    this.ints = {};
    for (var i in this.ints) delete this.ints[i];
  },

  copyValue : function(v){
    if (typeof v == 'number') return v;
    var a = [];
    for (var i=0; i<v.length; i++) a[i] = v[i];
    return a;
  },
  
  copy : function(){
    var m = new Magi.Material();
    for (var i in this.floats) m.floats[i] = this.copyValue(this.floats[i]);
    for (var i in this.ints) m.ints[i] = this.copyValue(this.ints[i]);
    for (var i in this.textures) m.textures[i] = this.textures[i];
    m.shader = this.shader;
    return m;
  },
  
  apply : function(gl, state, perspectiveMatrix, matrix, normalMatrix) {
    var shader = this.shader;
    if (shader && shader.gl == null) shader.gl = gl;
    if (state.currentShader != shader) {
      shader.use()
      shader.uniformMatrix4fv("PMatrix", perspectiveMatrix);
      Magi.Stats.uniformSetCount++;
      state.currentShader = this.shader;
      Magi.Stats.shaderBindCount++;
    }
    state.currentShader.uniformMatrix4fv("MVMatrix", matrix);
    state.currentShader.uniformMatrix3fv("NMatrix", normalMatrix);
    Magi.Stats.uniformSetCount += 2;
    if (state.currentMaterial == this) return;
    state.currentMaterial = this;
    Magi.Stats.materialUpdateCount++;
    this.applyTextures(gl, state);
    this.applyFloats();
    this.applyInts();
  },
  
  applyTextures : function(gl, state) {
    var texUnit = 0;
    for (var name in this.textures) {
      var tex = this.textures[name];
      if (!tex) tex = Magi.Texture.getDefaultTexture(gl);
      if (tex.gl == null) tex.gl = gl;
      if (state.textures[texUnit] != tex) {
        state.textures[texUnit] = tex;
        gl.activeTexture(gl.TEXTURE0+texUnit);
        tex.use();
        Magi.Stats.textureSetCount++;
      }
      this.shader.uniform1i(name, texUnit);
      Magi.Stats.uniformSetCount++;
      ++texUnit;
    }
  },

  cmp : function(a, b) {
    var rv = false;
    if (a && b && a.length && b.length && a.length === b.length) {
      rv = true;
      for (var i=0; i<a.length; i++)
        rv = rv && (a[i] === b[i]);
    }
    return rv;
  },
  
  applyFloats : function() {
    var shader = this.shader;
    for (var name in this.floats) {
      var uf = this.floats[name];
      var s = shader.uniform(name);
      if (s.current === uf || this.cmp(s.current,uf))
        continue;
      s.current = uf;
      Magi.Stats.uniformSetCount++;
      if (uf.length == null) {
        shader.uniform1f(name, uf);
      } else {
        switch (uf.length) {
          case 4:
            shader.uniform4fv(name, uf);
            break;
          case 3:
            shader.uniform3fv(name, uf);
            break;
          case 16:
            shader.uniformMatrix4fv(name, uf);
            break;
          case 9:
            shader.uniformMatrix3fv(name, uf);
            break;
          case 2:
            shader.uniform2fv(name, uf);
            break;
          default:
            shader.uniform1fv(name, uf);
        }
      }
    }
  },
  
  applyInts : function() {
    var shader = this.shader;
    for (var name in this.ints) {
      var uf = this.ints[name];
      var s = shader.uniform(name);
      if (s.current === uf || this.cmp(s.current,uf))
        continue;
      s.current = uf;
      Magi.Stats.uniformSetCount++;
      if (uf.length == null) {
        shader.uniform1i(name, uf);
      } else {
        switch (uf.length) {
          case 4:
            shader.uniform4iv(name, uf);
            break;
          case 3:
            shader.uniform3iv(name, uf);
            break;
          case 2:
            shader.uniform2iv(name, uf);
            break;
          default:
            shader.uniform1iv(name, uf);
        }
      }
    }
  }
  
});

Magi.GLDrawState = Klass({
  textures : null,
  currentMaterial : null,
  currentShader : null,
  polygonOffset : null,
  blendFuncSrc : 'ONE',
  blendFuncDst : 'ONE_MINUS_SRC_ALPHA',
  depthMask : true,
  depthTest : true,
  blend : true,
  
  initialize: function(){
    this.polygonOffset = {factor: 0, units: 0},
    this.textures = [];
  }
});

Magi.Camera = Klass({
  fov : 30,
  targetFov : 30,
  zNear : 1,
  zFar : 10000,
  useLookAt : true,
  ortho : false,
  stereo : false,
  stereoSeparation : 0.025,
  renderPass : 'normal',
  blend : true,
  blendFuncSrc : 'ONE',
  blendFuncDst : 'ONE_MINUS_SRC_ALPHA',

  initialize : function() {
    this.position = vec3.create([5,5,5]);
    this.lookAt = vec3.create([0,0,0]);
    this.up = vec3.create([0,1,0]);
    this.matrix = mat4.create();
    this.perspectiveMatrix = mat4.create();
    this.frameListeners = [];
  },
  
  addFrameListener : Magi.Node.prototype.addFrameListener,

  update : function(t, dt) {
    var a = [];
    for (var i=0; i<this.frameListeners.length; i++) {
      a.push(this.frameListeners[i]);
    }
    for (var i=0; i<a.length; i++) {
      if (this.frameListeners.indexOf(a[i]) != -1)
        a[i].call(this, t, dt, this);
    }
    if (this.targetFov && this.fov != this.targetFov)
      this.fov += (this.targetFov - this.fov) * (1-Math.pow(0.7, (dt/30)));
  },

  getLookMatrix : function() {
    if (this.useLookAt)
      mat4.lookAt(this.position, this.lookAt, this.up, this.matrix);
    else
      mat4.identity(this.matrix);
    return this.matrix;
  },

  drawViewport : function(gl, x, y, width, height, scene) {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(x,y,width,height);
    gl.scissor(x,y,width,height);
    if (this.ortho) {
      mat4.ortho(x, width, -height, -y, this.zNear, this.zFar, this.perspectiveMatrix);
    } else {
      mat4.perspective(this.fov, width/height, this.zNear, this.zFar, this.perspectiveMatrix);
    }
    scene.updateTransform(this.getLookMatrix());
    var st = new Magi.GLDrawState();
    this.resetState(gl, st);

    var t = new Date();
    var drawList = scene.collectDrawList();
    var transparents = [];
    for (var i=0; i<drawList.length; i++) {
      var d = drawList[i];
      if (!d.renderPasses[this.renderPass])
        continue;
      if (d.transparent) {
        transparents.push(d);
      } else {
        d.draw(gl, st, this.perspectiveMatrix);
      }
    }
    
    this.normalDrawTime = new Date() - t;
    transparents.stableSort(function(a,b) {
      return a.matrix[14] - b.matrix[14];
    });

    var st = new Magi.GLDrawState();
    this.resetState(gl, st);

    gl.depthMask(false);
    st.depthMask = false;
    
    for (var i=0; i<transparents.length; i++) {
      var d = transparents[i];
      d.draw(gl, st, this.perspectiveMatrix);
    }
    gl.depthMask(true);
    this.transparentDrawTime = new Date() - t - this.normalDrawTime;
    gl.disable(gl.SCISSOR_TEST);
    this.drawTime = new Date() - t;

  },

  resetState : function(gl, st) {
    gl.depthFunc(gl.LESS);
    gl.disable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.enable(gl.DEPTH_TEST);
    st.depthTest = true;
    if (this.blendFuncSrc && this.blendFuncDst) {
      st.blendFuncSrc = this.blendFuncSrc;
      st.blendFuncDst = this.blendFuncDst;
      gl.blendFunc(gl[this.blendFuncSrc], gl[this.blendFuncDst]);
    }
    if (this.blend) {
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }
    st.blend = this.blend;
    gl.depthMask(true);
    st.depthMask = true;
  },
  
  draw : function(gl, width, height, scene) {
    if (this.stereo) {
      var p = vec3.create(this.position);
      var sep = vec3.create();
      vec3.subtract(this.lookAt, p, sep)
      vec3.cross(this.up, sep, sep);
      vec3.scale(sep, this.stereoSeparation/2, sep);

      vec3.subtract(p, sep, this.position);
      this.drawViewport(gl, 0, 0, width/2, height, scene);
      
      vec3.add(p, sep, this.position);
      this.drawViewport(gl, width/2, 0, width/2, height, scene);

      vec3.set(p, this.position);
    } else {
      this.drawViewport(gl, 0, 0, width, height, scene);
    }
  }
});

