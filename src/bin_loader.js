Magi.Bin = function(){};
Magi.Bin.load = function(url) {
  var o = new Magi.Bin();
  o.load(url);
  return o;
}
Magi.Bin.prototype = {
  load: function(url) {
    var xhr = new XMLHttpRequest();
    var self = this;
    self.loadStartTime = new Date();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          self.downloadTime = new Date() - self.loadStartTime;
          self.parse(xhr.responseText);
          if (self.onload)
            self.onload(xhr);
        } else {
          if (self.onerror)
            self.onerror(xhr);
        }
      }
    }
    xhr.open("GET", url, true);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.send(null);
  },

  onerror : function(xhr) {
    alert("Error: "+xhr.status);
  },

  makeVBO : function(gl) {
    if (this.texcoords) {
      return new Magi.VBO(gl,
          {size:3, data: this.vertices},
          {size:3, data: this.normals},
          {size:2, data: this.texcoords}
      )
    } else {
      return new Magi.VBO(gl,
          {size:3, data: this.vertices},
          {size:3, data: this.normals}
      )
    }
  },

  cache : {},
  getCachedVBO : function(gl) {
    if (!this.cache[gl])
      this.cache[gl] = this.makeVBO(gl);
    return this.cache[gl];
  },

  // read big-endian float
  readFloat32 : function(data, offset) {
    var b1 = data.charCodeAt(offset) & 0xFF,
        b2 = data.charCodeAt(offset+1) & 0xFF,
        b3 = data.charCodeAt(offset+2) & 0xFF,
        b4 = data.charCodeAt(offset+3) & 0xFF;
    var sign = 1 - (2*(b1 >> 7));
    var exp = (((b1 << 1) & 0xff) | (b2 >> 7)) - 127;
    var sig = ((b2 & 0x7f) << 16) | (b3 << 8) | b4;
    if (sig == 0 && exp == -127)
      return 0.0;
    return sign * (1 + sig * Math.pow(2, -23)) * Math.pow(2, exp);
  },
  readUInt32 : function(data, offset) {
    return ((data.charCodeAt(offset) & 0xFF) << 24) +
           ((data.charCodeAt(offset+1) & 0xFF) << 16) +
           ((data.charCodeAt(offset+2) & 0xFF) << 8) +
           (data.charCodeAt(offset+3) & 0xFF);
  },
  readUInt16 : function(data, offset) {
    return ((data.charCodeAt(offset) & 0xFF) << 8) +
           (data.charCodeAt(offset+1) & 0xFF);
  },
  readNormalizedFixedPoint16 : function(data, offset) {
    return 2.0 * (this.readUInt16(data, offset) / 65535.0 - 0.5);
  },
  readNormalizedUFixedPoint16 : function(data, offset) {
    return this.readUInt16(data, offset) / 65535.0;
  },

  readVerts : function(data, i, raw_vertices, vertCount) {
    for (var l=i+vertCount*3*2; i<l; i+=2)
      raw_vertices.push(this.readNormalizedFixedPoint16(data, i));
    return i;
  },
  
  readTexVerts : function(data, i, raw_vertices, vertCount) {
    for (var l=i+vertCount*2*2; i<l; i+=2)
      raw_vertices.push(this.readNormalizedUFixedPoint16(data, i));
    return i;
  },

  readTris : function(data, i, tris, quadCount, triCount) {
    var quads = [];
    for (var l=i+quadCount*4*2; i<l; i+=2)
      quads.push(this.readUInt16(data, i));
    for (var l=i+triCount*3*2; i<l; i+=2)
      tris.push(this.readUInt16(data, i));
    for (var j=0; j<quads.length; j+=4) {
      tris.push(quads[j]);
      tris.push(quads[j+1]);
      tris.push(quads[j+2]);
      tris.push(quads[j]);
      tris.push(quads[j+2]);
      tris.push(quads[j+3]);
    }
    return i;
  },

  translateAndScaleVertices : function(v, xs, ys, zs, xt, yt, zt) {
    // readVerts scaled the 0..1 verts to -1..1, so we need to undo that
    xs *= 0.5; ys *= 0.5; zs *= 0.5;
    for (var i=0; i<v.length; i+=3) {
      v[i  ] = xt + xs * (v[i  ] + 1.0);
      v[i+1] = yt + ys * (v[i+1] + 1.0);
      v[i+2] = zt + zs * (v[i+2] + 1.0);
    }
  },

  parse : function(data) {
    var t = new Date();
    var geo_tris = [],
        tex_tris = [],
        nor_tris = [],
        raw_vertices = [],
        raw_normals = [],
        raw_texcoords = [];
    var i = 0;
    var vertCount = this.readUInt32(data, i); i+=4;
    var texCount = this.readUInt32(data, i); i+=4;
    var normalCount = this.readUInt32(data, i); i+=4;
    var quadCount = this.readUInt32(data, i); i+=4;
    var triCount = this.readUInt32(data, i); i+=4;
    var xscale = this.readFloat32(data, i); i+=4;
    var yscale = this.readFloat32(data, i); i+=4;
    var zscale = this.readFloat32(data, i); i+=4;
    var xtrans = this.readFloat32(data, i); i+=4;
    var ytrans = this.readFloat32(data, i); i+=4;
    var ztrans = this.readFloat32(data, i); i+=4;
    
    i = this.readVerts(data, i, raw_vertices, vertCount);
    this.translateAndScaleVertices(raw_vertices, xscale, yscale, zscale, xtrans, ytrans, ztrans);
    i = this.readTris(data, i, geo_tris, quadCount, triCount);
    if (texCount > 0) {
      i = this.readTexVerts(data, i, raw_texcoords, texCount);
      i = this.readTris(data, i, tex_tris, quadCount, triCount);
    }
    if (normalCount > 0) {
      i = this.readVerts(data, i, raw_normals, normalCount);
      i = this.readTris(data, i, nor_tris, quadCount, triCount);
    }

    this.vertices = this.lookup_faces(raw_vertices, geo_tris, 3);
    if (tex_tris.length > 0 && !this.noTexCoords)
      this.texcoords = this.lookup_faces(raw_texcoords, tex_tris, 2);
    if (nor_tris.length > 0 && !this.overrideNormals)
      this.normals = this.lookup_faces(raw_normals, nor_tris, 3);
    else
      this.normals = this.calculate_normals(this.vertices, geo_tris, this.flatNormals);

    this.boundingBox = this.calculateBoundingBox(raw_vertices);
    this.parseTime = new Date() - t;
  },

  calculateBoundingBox : function(raw_vertices) {
    var bbox = {min:[0,0,0], max:[0,0,0]};
    for (var i=0; i<raw_vertices.length; i+=3) {
      var x = raw_vertices[i],
          y = raw_vertices[i+1],
          z = raw_vertices[i+2];
      if (x < bbox.min[0]) bbox.min[0] = x;
      else if (x > bbox.max[0]) bbox.max[0] = x;
      if (y < bbox.min[1]) bbox.min[1] = y;
      else if (y > bbox.max[1]) bbox.max[1] = y;
      if (z < bbox.min[2]) bbox.min[2] = z;
      else if (z > bbox.max[2]) bbox.max[2] = z;
    }
    bbox.width = bbox.max[0] - bbox.min[0];
    bbox.height = bbox.max[1] - bbox.min[1];
    bbox.depth = bbox.max[2] - bbox.min[2];
    bbox.diameter = Math.max(bbox.width, bbox.height, bbox.depth);
    return bbox;
  },

  lookup_faces : function(verts, faces, sz) {
    var v = [];
    for (var i=0; i<faces.length; i++) {
      var offset = faces[i] * sz;
      for (var j=0; j<sz; j++)
        v.push(verts[offset+j]);
    }
    return v;
  },

  calculate_normals : function(verts, faces, no_interpolation) {
    var norms = [];
    var vert_norms = {
      normals : [],
      addNormal : function(idx,n) {
        var za = (this.normals[idx] || (this.normals[idx] = [0,0,0]));
        za[0] += n[0]; za[1] += n[1]; za[2] += n[2];
      },
      getNormal : function(idx) {
        return this.normals[idx];
      },
      normalize : function() {
      	for (var i=0; i<this.normals.length; i++) {
      	  var n = this.normals[i];
      	  if (n) {
      	    var d = 1 / Math.sqrt(n[0]*n[0] + n[1]*n[1] + n[2]*n[2]);
      	    n[0] *= d;
      	    n[1] *= d;
      	    n[2] *= d;
      	  }
      	}
      }
    };
    for (var i=0,fi=0; i<verts.length; i+=9,fi+=3) {
      var normal = this.find_normal(
        verts[i  ], verts[i+1], verts[i+2],
        verts[i+3], verts[i+4], verts[i+5],
        verts[i+6], verts[i+7], verts[i+8]);
      if (no_interpolation) {
        for (var j=0; j<3; j++) {
          norms.push(normal[0]);
          norms.push(normal[1]);
          norms.push(normal[2]);
        }
      } else {
        vert_norms.addNormal(faces[fi], normal);
        vert_norms.addNormal(faces[fi+1], normal);
        vert_norms.addNormal(faces[fi+2], normal);
      }
    }
    
    if (!no_interpolation) {
      vert_norms.normalize();
      for (var i=0; i<faces.length; i++) {
        var normal = vert_norms.getNormal(faces[i]);
        norms.push(normal[0]);
        norms.push(normal[1]);
        norms.push(normal[2]);
      }
    }
    return norms;
  },

  find_normal : function(x0,y0,z0, x1,y1,z1, x2,y2,z2) {
    var u = vec3.create([x0-x1, y0-y1, z0-z1]);
    var v = vec3.create([x1-x2, y1-y2, z1-z2]);
    var w = vec3.create([x2-x0, y2-y0, z2-z0]);
    var n = vec3.cross(u,v,vec3.create());
    if (vec3.lengthSquare(n) == 0)
      vec3.cross(v,w,n);
    if (vec3.lengthSquare(n) == 0)
      vec3.cross(w,u,n);
    if (vec3.lengthSquare(n) == 0)
      vec3.set([0,0,1], n);
    return vec3.normalize(n);
  }

}
