Math.cot = function(z) { return 1.0 / Math.tan(z); }

/*
  Matrix utilities, using the OpenGL element order where
  the last 4 elements are the translation column.

  Uses flat arrays as matrices for performance.

  Most operations have in-place variants to avoid allocating temporary matrices.

  Naming logic:
    Matrix.method operates on a 4x4 Matrix and returns a new Matrix.
    Matrix.method3x3 operates on a 3x3 Matrix and returns a new Matrix. Not all operations have a 3x3 version (as 3x3 is usually only used for the normal matrix: Matrix.transpose3x3(Matrix.inverseTo3x3(mat4x4)))
    Matrix.method[3x3]InPlace(args, target) stores its result in the target matrix.

    Matrix.scale([sx, sy, sz]) -- non-uniform scale by vector
    Matrix.scale1(s)           -- uniform scale by scalar
    Matrix.scale3(sx, sy, sz)  -- non-uniform scale by scalars
    
    Ditto for translate.
*/
Matrix = {
  identity : [
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  ],

  newIdentity : function() {
    return [
      1.0, 0.0, 0.0, 0.0,
      0.0, 1.0, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 1.0
    ];
  },

  newIdentity3x3 : function() {
    return [
      1.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 0.0, 1.0
    ];
  },

  copyMatrix : function(src, dst) {
    for (var i=0; i<16; i++) dst[i] = src[i];
    return dst;
  },

  to3x3 : function(m) {
    return [
      m[0], m[1], m[2],
      m[4], m[5], m[6],
      m[8], m[9], m[10]
    ];
  },

  // orthonormal matrix inverse
  inverseON : function(m) {
    var n = this.transpose4x4(m);
    var t = [m[12], m[13], m[14]];
    n[3] = n[7] = n[11] = 0;
    n[12] = -Vec3.dot([n[0], n[4], n[8]], t);
    n[13] = -Vec3.dot([n[1], n[5], n[9]], t);
    n[14] = -Vec3.dot([n[2], n[6], n[10]], t);
    return n;
  },

  inverseTo3x3 : function(m) {
    return this.inverseTo3x3InPlace(m, this.newIdentity3x3());
  },

  inverseTo3x3InPlace : function(m,n) {
    var a11 = m[10]*m[5]-m[6]*m[9],
        a21 = -m[10]*m[1]+m[2]*m[9],
        a31 = m[6]*m[1]-m[2]*m[5],
        a12 = -m[10]*m[4]+m[6]*m[8],
        a22 = m[10]*m[0]-m[2]*m[8],
        a32 = -m[6]*m[0]+m[2]*m[4],
        a13 = m[9]*m[4]-m[5]*m[8],
        a23 = -m[9]*m[0]+m[1]*m[8],
        a33 = m[5]*m[0]-m[1]*m[4];
    var det = m[0]*(a11) + m[1]*(a12) + m[2]*(a13);
    if (det == 0) // no inverse
      return n;
    var idet = 1 / det;
    n[0] = idet*a11;
    n[1] = idet*a21;
    n[2] = idet*a31;
    n[3] = idet*a12;
    n[4] = idet*a22;
    n[5] = idet*a32;
    n[6] = idet*a13;
    n[7] = idet*a23;
    n[8] = idet*a33;
    return n;
  },

  inverse3x3 : function(m) {
    return this.inverse3x3InPlace(m, this.newIdentity3x3());
  },
  
  inverse3x3InPlace : function(m,n) {
    var a11 = m[8]*m[4]-m[5]*m[7],
        a21 = -m[8]*m[1]+m[2]*m[7],
        a31 = m[5]*m[1]-m[2]*m[4],
        a12 = -m[8]*m[3]+m[5]*m[6],
        a22 = m[8]*m[0]-m[2]*m[6],
        a32 = -m[5]*m[0]+m[2]*m[3],
        a13 = m[7]*m[4]-m[4]*m[8],
        a23 = -m[7]*m[0]+m[1]*m[6],
        a33 = m[4]*m[0]-m[1]*m[3];
    var det = m[0]*(a11) + m[1]*(a12) + m[2]*(a13);
    if (det == 0) // no inverse
      return [1,0,0,0,1,0,0,0,1];
    var idet = 1 / det;
    n[0] = idet*a11;
    n[1] = idet*a21;
    n[2] = idet*a31;
    n[3] = idet*a12;
    n[4] = idet*a22;
    n[5] = idet*a32;
    n[6] = idet*a13;
    n[7] = idet*a23;
    n[8] = idet*a33;
    return n;
  },

  frustum : function (left, right, bottom, top, znear, zfar) {
    var X = 2*znear/(right-left);
    var Y = 2*znear/(top-bottom);
    var A = (right+left)/(right-left);
    var B = (top+bottom)/(top-bottom);
    var C = -(zfar+znear)/(zfar-znear);
    var D = -2*zfar*znear/(zfar-znear);

    return [
      X, 0, 0, 0,
      0, Y, 0, 0,
      A, B, C, -1,
      0, 0, D, 0
    ];
 },

  perspective : function (fovy, aspect, znear, zfar) {
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return this.frustum(xmin, xmax, ymin, ymax, znear, zfar);
  },

  ortho : function (left, right, bottom, top, znear, zfar) {
    var tX = -(right+left)/(right-left);
    var tY = -(top+bottom)/(top-bottom);
    var tZ = -(zfar+znear)/(zfar-znear);
    var X = 2 / (right-left);
    var Y = 2 / (top-bottom);
    var Z = -2 / (zfar-znear)

    return [
      X, 0, 0, 0,
      0, Y, 0, 0,
      0, 0, Z, 0,
      tX, tY, tZ, 1
    ];
  },

  ortho2D : function(left, right, bottom, top) {
    return this.ortho(left, right, bottom, top, -1, 1);
  },

  mul4x4 : function (a,b) {
    return this.mul4x4InPlace(a,b,this.newIdentity());
  },

  mul4x4InPlace : function (a, b, c) {
        c[0] =   b[0] * a[0] +
                 b[0+1] * a[4] +
                 b[0+2] * a[8] +
                 b[0+3] * a[12];
        c[0+1] = b[0] * a[1] +
                 b[0+1] * a[5] +
                 b[0+2] * a[9] +
                 b[0+3] * a[13];
        c[0+2] = b[0] * a[2] +
                 b[0+1] * a[6] +
                 b[0+2] * a[10] +
                 b[0+3] * a[14];
        c[0+3] = b[0] * a[3] +
                 b[0+1] * a[7] +
                 b[0+2] * a[11] +
                 b[0+3] * a[15];
        c[4] =   b[4] * a[0] +
                 b[4+1] * a[4] +
                 b[4+2] * a[8] +
                 b[4+3] * a[12];
        c[4+1] = b[4] * a[1] +
                 b[4+1] * a[5] +
                 b[4+2] * a[9] +
                 b[4+3] * a[13];
        c[4+2] = b[4] * a[2] +
                 b[4+1] * a[6] +
                 b[4+2] * a[10] +
                 b[4+3] * a[14];
        c[4+3] = b[4] * a[3] +
                 b[4+1] * a[7] +
                 b[4+2] * a[11] +
                 b[4+3] * a[15];
        c[8] =   b[8] * a[0] +
                 b[8+1] * a[4] +
                 b[8+2] * a[8] +
                 b[8+3] * a[12];
        c[8+1] = b[8] * a[1] +
                 b[8+1] * a[5] +
                 b[8+2] * a[9] +
                 b[8+3] * a[13];
        c[8+2] = b[8] * a[2] +
                 b[8+1] * a[6] +
                 b[8+2] * a[10] +
                 b[8+3] * a[14];
        c[8+3] = b[8] * a[3] +
                 b[8+1] * a[7] +
                 b[8+2] * a[11] +
                 b[8+3] * a[15];
        c[12] =   b[12] * a[0] +
                 b[12+1] * a[4] +
                 b[12+2] * a[8] +
                 b[12+3] * a[12];
        c[12+1] = b[12] * a[1] +
                 b[12+1] * a[5] +
                 b[12+2] * a[9] +
                 b[12+3] * a[13];
        c[12+2] = b[12] * a[2] +
                 b[12+1] * a[6] +
                 b[12+2] * a[10] +
                 b[12+3] * a[14];
        c[12+3] = b[12] * a[3] +
                 b[12+1] * a[7] +
                 b[12+2] * a[11] +
                 b[12+3] * a[15];
    return c;
  },

  mulv4 : function (a, v) {
    c = new Array(4);
    for (var i=0; i<4; ++i) {
      var x = 0;
      for (var k=0; k<4; ++k)
        x += v[k] * a[k*4+i];
      c[i] = x;
    }
    return c;
  },

  rotate : function (angle, axis) {
    axis = Vec3.normalize(axis);
    var x=axis[0], y=axis[1], z=axis[2];
    var c = Math.cos(angle);
    var c1 = 1-c;
    var s = Math.sin(angle);
    return [
      x*x*c1+c, y*x*c1+z*s, z*x*c1-y*s, 0,
      x*y*c1-z*s, y*y*c1+c, y*z*c1+x*s, 0,
      x*z*c1+y*s, y*z*c1-x*s, z*z*c1+c, 0,
      0,0,0,1
    ];
  },
  rotateInPlace : function(angle, axis, m) {
    axis = Vec3.normalize(axis);
    var x=axis[0], y=axis[1], z=axis[2];
    var c = Math.cos(angle);
    var c1 = 1-c;
    var s = Math.sin(angle);
    var tmpMatrix = this.tmpMatrix;
    var tmpMatrix2 = this.tmpMatrix2;
    tmpMatrix[0] = x*x*c1+c; tmpMatrix[1] = y*x*c1+z*s; tmpMatrix[2] = z*x*c1-y*s; tmpMatrix[3] = 0;
    tmpMatrix[4] = x*y*c1-z*s; tmpMatrix[5] = y*y*c1+c; tmpMatrix[6] = y*z*c1+x*s; tmpMatrix[7] = 0;
    tmpMatrix[8] = x*z*c1+y*s; tmpMatrix[9] = y*z*c1-x*s; tmpMatrix[10] = z*z*c1+c; tmpMatrix[11] = 0;
    tmpMatrix[12] = 0; tmpMatrix[13] = 0; tmpMatrix[14] = 0; tmpMatrix[15] = 1;
    this.copyMatrix(m, tmpMatrix2);
    return this.mul4x4InPlace(tmpMatrix2, tmpMatrix, m);
  },

  scale : function(v) {
    return [
      v[0], 0, 0, 0,
      0, v[1], 0, 0,
      0, 0, v[2], 0,
      0, 0, 0, 1
    ];
  },
  scale3 : function(x,y,z) {
    return [
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ];
  },
  scale1 : function(s) {
    return [
      s, 0, 0, 0,
      0, s, 0, 0,
      0, 0, s, 0,
      0, 0, 0, 1
    ];
  },
  scale3InPlace : function(x, y, z, m) {
    var tmpMatrix = this.tmpMatrix;
    var tmpMatrix2 = this.tmpMatrix2;
    tmpMatrix[0] = x; tmpMatrix[1] = 0; tmpMatrix[2] = 0; tmpMatrix[3] = 0;
    tmpMatrix[4] = 0; tmpMatrix[5] = y; tmpMatrix[6] = 0; tmpMatrix[7] = 0;
    tmpMatrix[8] = 0; tmpMatrix[9] = 0; tmpMatrix[10] = z; tmpMatrix[11] = 0;
    tmpMatrix[12] = 0; tmpMatrix[13] = 0; tmpMatrix[14] = 0; tmpMatrix[15] = 1;
    this.copyMatrix(m, tmpMatrix2);
    return this.mul4x4InPlace(tmpMatrix2, tmpMatrix, m);
  },
  scale1InPlace : function(s, m) { return this.scale3InPlace(s, s, s, m); },
  scaleInPlace : function(s, m) { return this.scale3InPlace(s[0],s[1],s[2],m); },

  translate3 : function(x,y,z) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ];
  },

  translate : function(v) {
    return this.translate3(v[0], v[1], v[2]);
  },
  tmpMatrix : [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  tmpMatrix2 : [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  translate3InPlace : function(x,y,z,m) {
    var tmpMatrix = this.tmpMatrix;
    var tmpMatrix2 = this.tmpMatrix2;
    tmpMatrix[0] = 1; tmpMatrix[1] = 0; tmpMatrix[2] = 0; tmpMatrix[3] = 0;
    tmpMatrix[4] = 0; tmpMatrix[5] = 1; tmpMatrix[6] = 0; tmpMatrix[7] = 0;
    tmpMatrix[8] = 0; tmpMatrix[9] = 0; tmpMatrix[10] = 1; tmpMatrix[11] = 0;
    tmpMatrix[12] = x; tmpMatrix[13] = y; tmpMatrix[14] = z; tmpMatrix[15] = 1;
    this.copyMatrix(m, tmpMatrix2);
    return this.mul4x4InPlace(tmpMatrix2, tmpMatrix, m);
  },
  translateInPlace : function(v,m){ return this.translate3InPlace(v[0], v[1], v[2], m); },

  lookAt : function (eye, center, up) {
    var z = Vec3.direction(eye, center);
    var x = Vec3.normalizeInPlace(Vec3.cross(up, z));
    var y = Vec3.normalizeInPlace(Vec3.cross(z, x));

    var m = [
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      0, 0, 0, 1
    ];

    var t = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -eye[0], -eye[1], -eye[2], 1
    ];

    return this.mul4x4(m,t);
  },

  transpose4x4 : function(m) {
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    ];
  },

  transpose4x4InPlace : function(m) {
    var tmp = 0.0;
    tmp = m[1]; m[1] = m[4]; m[4] = tmp;
    tmp = m[2]; m[2] = m[8]; m[8] = tmp;
    tmp = m[3]; m[3] = m[12]; m[12] = tmp;
    tmp = m[6]; m[6] = m[9]; m[9] = tmp;
    tmp = m[7]; m[7] = m[13]; m[13] = tmp;
    tmp = m[11]; m[11] = m[14]; m[14] = tmp;
    return m;
  },

  transpose3x3 : function(m) {
    return [
      m[0], m[3], m[6],
      m[1], m[4], m[7],
      m[2], m[5], m[8]
    ];
  },

  transpose3x3InPlace : function(m) {
    var tmp = 0.0;
    tmp = m[1]; m[1] = m[3]; m[3] = tmp;
    tmp = m[2]; m[2] = m[6]; m[6] = tmp;
    tmp = m[5]; m[5] = m[7]; m[7] = tmp;
    return m;
  },
  
  billboard : function(m) {
    this.billboardInPlace(this.copyMatrix(m));
  },
  
  billboardInPlace : function(m) {
    m[0] = 1.0; m[1] = 0.0; m[2] = 0.0;
    m[4] = 0.0; m[5] = 1.0; m[6] = 0.0;
    m[8] = 0.0; m[9] = 0.0; m[10] = 1.0;
    return m;
  }
}

Vec3 = {
  make : function() { return [0,0,0]; },
  copy : function(v) { return [v[0],v[1],v[2]]; },

  add : function (u,v) {
    return [u[0]+v[0], u[1]+v[1], u[2]+v[2]];
  },

  sub : function (u,v) {
    return [u[0]-v[0], u[1]-v[1], u[2]-v[2]];
  },

  negate : function (u) {
    return [-u[0], -u[1], -u[2]];
  },

  direction : function (u,v) {
    return this.normalizeInPlace(this.sub(u,v));
  },

  length : function(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  },

  lengthSquare : function(v) {
    return v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
  },

  normalizeInPlace : function(v) {
    var imag = 1.0 / this.length(v);
    v[0] *= imag; v[1] *= imag; v[2] *= imag;
    return v;
  },

  normalize : function(v) {
    return this.normalizeInPlace(this.copy(v));
  },

  scale : function(f, v) {
    return [f*v[0], f*v[1], f*v[2]];
  },

  dot : function(u,v) {
    return u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
  },

  inner : function(u,v) {
    return [u[0]*v[0], u[1]*v[1], u[2]*v[2]];
  },

  cross : function(u,v) {
    return [
      u[1]*v[2] - u[2]*v[1],
      u[2]*v[0] - u[0]*v[2],
      u[0]*v[1] - u[1]*v[0]
    ];
  }
}
