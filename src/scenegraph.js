Node = function(model) {
  this.model = model;
  this.initialize();
}
Node.prototype = {
  model : null,
  position : null,
  rotation : null,
  scaling : null,
  polygonOffset : null,
  scaleAfterRotate : false,
  depthMask : true,
  display : true,
  
  initialize : function() {
    this.matrix = Matrix.newIdentity();
    this.material = new Material();
    this.normalMatrix = Matrix.newIdentity3x3();
    this.rotation = {angle : 0, axis : [0,1,0]};
    this.position = [0, 0, 0];
    this.scaling = [1, 1, 1];
    this.frameListeners = [];
    this.childNodes = [];
  },
  
  draw : function(gl, state, perspectiveMatrix) {
    if (!this.model || !this.display) return;
    if (this.material)
      this.material.apply(gl, state, perspectiveMatrix, this.matrix, this.normalMatrix);
    if (this.model.gl == null) this.model.gl = gl;
    if (this.polygonOffset)
      gl.polygonOffset(this.polygonOffset.factor, this.polygonOffset.units);
    if (this.depthMask == false)
      gl.depthMask(false);
    this.model.draw(
      state.currentShader.attrib('Vertex'),
      state.currentShader.attrib('Normal'),
      state.currentShader.attrib('TexCoord')
    );
    if (this.depthMask == false)
      gl.depthMask(true);
    if (this.polygonOffset)
      gl.polygonOffset(0.0, 0.0);
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
    Matrix.copyMatrix(matrix, this.matrix);
    var p = this.position;
    var s = this.scaling;
    var doScaling = (s[0] != 1) || (s[1] != 1) || (s[2] != 1);
    if (p[0] || p[1] || p[2])
      Matrix.translateInPlace(p, this.matrix);
    if (this.scaleAfterRotate && doScaling)
      Matrix.scaleInPlace(s, this.matrix);
    if (this.rotation.angle != 0)
      Matrix.rotateInPlace(this.rotation.angle, this.rotation.axis, this.matrix);
    if (!this.scaleAfterRotate && this.scaling)
      Matrix.scaleInPlace(s, this.matrix);
    if (this.isBillboard)
      Matrix.billboardInPlace(this.matrix);
    Matrix.inverseTo3x3InPlace(this.matrix, this.normalMatrix);
    Matrix.transpose3x3InPlace(this.normalMatrix);
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].updateTransform(this.matrix);
  },
  
  collectDrawList : function(arr) {
    if (!arr) arr = [];
    arr.push(this);
    for (var i=0; i<this.childNodes.length; i++)
      this.childNodes[i].collectDrawList(arr);
    return arr;
  }
};

// image quad with canvas as texture
// draw text string to canvas, upload with texImage2D
// material has 
GLText = function(string, font) {
}
GLText.prototype = {
}

Material = function(shader) {
  this.shader = shader;
  this.textures = {};
  for (var i in this.textures) delete this.textures[i];
  this.floats = {};
  for (var i in this.floats) delete this.floats[i];
  this.ints = {};
  for (var i in this.ints) delete this.ints[i];
};
Material.prototype = {
  copyValue : function(v){
    if (typeof v == 'number') return v;
    var a = [];
    for (var i=0; i<v.length; i++) a[i] = v[i];
    return a;
  },
  
  copy : function(){
    var m = new Material();
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
      Stats.uniformSetCount++;
      state.currentShader = this.shader;
      Stats.shaderBindCount++;
    }
    state.currentShader.uniformMatrix4fv("MVMatrix", matrix);
    state.currentShader.uniformMatrix3fv("NMatrix", normalMatrix);
    Stats.uniformSetCount += 2;
    if (state.currentMaterial == this) return;
    state.currentMaterial = this;
    Stats.materialUpdateCount++;
    this.applyTextures(gl, state);
    this.applyFloats();
    this.applyInts();
  },
  
  applyTextures : function(gl, state) {
    var texUnit = 0;
    for (var name in this.textures) {
      var tex = this.textures[name];
      if (tex && tex.gl == null) tex.gl = gl;
      if (state.textures[texUnit] != tex) {
        state.textures[texUnit] = tex;
        gl.activeTexture(gl.TEXTURE0+texUnit);
        tex.use();
        Stats.textureSetCount++;
      }
      this.shader.uniform1i(name, texUnit);
      Stats.uniformSetCount++;
      ++texUnit;
    }
  },
  
  applyFloats : function() {
    var shader = this.shader;
    for (var name in this.floats) {
      var uf = this.floats[name];
      Stats.uniformSetCount++;
      if (uf.length == null) {
        shader.uniform1f(name, uf);
      } else {
        switch (uf.length) {
          case 4:
            shader.uniform4f(name, uf[0], uf[1], uf[2], uf[3]);
            break;
          case 3:
            shader.uniform3f(name, uf[0], uf[1], uf[2]);
            break;
          case 16:
            shader.uniformMatrix4fv(name, uf);
            break;
          case 9:
            shader.uniformMatrix3fv(name, uf);
            break;
          case 2:
            shader.uniform2f(name, uf[0], uf[1]);
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
      Stats.uniformSetCount++;
      if (uf.length == null) {
        shader.uniform1i(name, uf);
      } else {
        switch (uf.length) {
          case 4:
            shader.uniform4i(name, uf[0], uf[1], uf[2], uf[3]);
            break;
          case 3:
            shader.uniform3i(name, uf[0], uf[1], uf[2]);
            break;
          case 2:
            shader.uniform2i(name, uf[0], uf[1]);
            break;
          default:
            shader.uniform1iv(name, uf);
        }
      }
    }
  }
  
};

GLDrawState = function(){
  this.textures = [];
};
GLDrawState.prototype = {
  textures : null,
  currentMaterial : null,
  currentShader : null
};

Camera = function() {
  this.initialize();
};
Camera.prototype = {
  fov : 30,
  targetFov : 30,
  zNear : 1,
  zFar : 100,
  useLookAt : true,
  ortho : false,
  stereo : false,
  stereoSeparation : 0.025,

  initialize : function() {
    this.position = [5,5,5];
    this.lookAt = [0,0,0]
    this.up = [0,1,0];
    this.frameListeners = [];
  },
  addFrameListener : Node.prototype.addFrameListener,
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
      return Matrix.lookAt(this.position, this.lookAt, this.up);
    else
      return Matrix.newIdentity();
  },
  drawViewport : function(gl, x, y, width, height, scene) {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(x,y,width,height);
    gl.scissor(x,y,width,height);
    var perspective = this.ortho ?
      Matrix.ortho(x, width, -height, -y, this.zNear, this.zFar) :
      Matrix.perspective(this.fov, width/height, this.zNear, this.zFar);
    scene.updateTransform(this.getLookMatrix());
    var drawList = scene.collectDrawList();
    var state = new GLDrawState();
    for (var i=0; i<drawList.length; i++) {
      var d = drawList[i];
      d.draw(gl, state, perspective);
    }
    gl.disable(gl.SCISSOR_TEST);
  },
  
  draw : function(gl, width, height, scene) {
    if (this.stereo) {
      var p = this.position;
      var rightV = Vec3.cross(this.up, Vec3.sub(this.lookAt, this.position));
      var sep = Vec3.scale(this.stereoSeparation/2, rightV);

      this.position = Vec3.sub(p, sep);
      this.drawViewport(gl, 0, 0, width/2, height, scene);
      
      this.position = Vec3.add(p, sep);
      this.drawViewport(gl, width/2, 0, width/2, height, scene);

      this.position = p;
    } else {
      this.drawViewport(gl, 0, 0, width, height, scene);
    }
  }
};

