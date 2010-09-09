Magi.Obj = function(){};
Magi.Obj.load = function(url) {
  var o = new Magi.Obj();
  o.load(url);
  return o;
}
Magi.Obj.prototype = {
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

  parse : function(data) {
    var t = new Date;
    var geo_faces = [],
        nor_faces = [],
        tex_faces = [],
        raw_vertices = [],
        raw_normals = [],
        raw_texcoords = [];
    var lines = data.split("\n");
    var hashChar = '#'.charCodeAt(0);
    for (var i=0; i<lines.length; i++) {
      var l = lines[i];
      var vals = l.replace(/^\s+|\s+$/g, '').split(" ");
      if (vals.length == 0) continue;
      if (vals[0].charCodeAt(0) == hashChar) continue;
      switch (vals[0]) {
        case "g": // named object mesh [group]?
          break;
        case "v":
          raw_vertices.push(parseFloat(vals[1]));
          raw_vertices.push(parseFloat(vals[2]));
          raw_vertices.push(parseFloat(vals[3]));
          break;
        case "vn":
          raw_normals.push(parseFloat(vals[1]));
          raw_normals.push(parseFloat(vals[2]));
          raw_normals.push(parseFloat(vals[3]));
          break;
        case "vt":
          raw_texcoords.push(parseFloat(vals[1]));
          raw_texcoords.push(parseFloat(vals[2]));
          break;
        case "f":
          // triangulate the face as triangle fan
          var faces = [];
          for (var j=1, v; j<vals.length; j++) {
            if (j > 3) {
              faces.push(faces[0]);
              faces.push(v);
            }
            v = vals[j];
            faces.push(v);
          }
          for (var j=0; j<faces.length; j++) {
            var f = faces[j];
            var a = f.split("/");
            geo_faces.push(parseInt(a[0]) - 1);
            if (a.length > 1)
              tex_faces.push(parseInt(a[1]) - 1);
            if (a.length > 2)
              nor_faces.push(parseInt(a[2]) - 1);
          }
          break;
      }
    }
    this.vertices = this.lookup_faces(raw_vertices, geo_faces, 3);
    if (tex_faces.length > 0)
      this.texcoords = this.lookup_faces(raw_texcoords, tex_faces, 2);
    if (nor_faces.length > 0 && !this.overrideNormals)
      this.normals = this.lookup_faces(raw_normals, nor_faces, 3);
    else
      this.normals = this.calculate_normals(this.vertices);
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
    this.boundingBox = bbox;
    this.parseTime = new Date() - t;
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

  calculate_normals : function(verts) {
    var norms = [];
    for (var i=0; i<verts.length; i+=9) {
      var normal = this.find_normal(
        verts[i  ], verts[i+1], verts[i+2],
        verts[i+3], verts[i+4], verts[i+5],
        verts[i+6], verts[i+7], verts[i+8]);
      for (var j=0; j<3; j++) {
        norms.push(normal[0]);
        norms.push(normal[1]);
        norms.push(normal[2]);
      }
    }
    return norms;
  },

  find_normal : function(x0,y0,z0, x1,y1,z1, x2,y2,z2) {
    var u = [x0-x1, y0-y1, z0-z1];
    var v = [x1-x2, y1-y2, z1-z2];
    var w = [x2-x0, y2-y0, z2-z0];
    var n = Vec3.cross(u,v);
    if (Vec3.lengthSquare(n) == 0)
      n = Vec3.cross(v,w);
    if (Vec3.lengthSquare(n) == 0)
      n = Vec3.cross(w,u);
    if (Vec3.lengthSquare(n) == 0)
      n = [0,0,1];
    return Vec3.normalize(n);
  }

}
