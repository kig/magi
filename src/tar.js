Tar = function(){};

// Load and parse archive, calls onload after loading all files.
Tar.load = function(url, onload, onstream, onerror) {
  var o = new Tar();
  o.onload = onload;
  o.onerror = onerror;
  o.onstream = onstream;
  o.load(url);
  return o;
}

Tar.loadGZip = function(url, onload, onstream, onerror) {
  var o = new Tar();
  o.onload = onload;
  o.onerror = onerror;
  o.onstream = onstream;
  o.loadGZip(url);
  return o;
}

// Streams an archive from the given url, calling onstream after loading each file in archive.
// Calls onload after loading all files.
Tar.stream = function(url, onstream, onload, onerror) {
  var o = new Tar();
  o.onload = onload;
  o.onerror = onerror;
  o.onstream = onstream;
  o.load(url);
  return o;
}

Tar.streamGZip = function(url, onstream, onload, onerror) {
  var o = new Tar();
  o.onload = onload;
  o.onerror = onerror;
  o.onstream = onstream;
  o.loadGZip(url);
  return o;
}

Tar.prototype = {
  onerror : null,
  onload : null,
  onstream : null,
  ondata : null,

  cleanupAfterLoad : true,

  initLoad : function() {
    this.byteOffset = 0;
    this.parseTime = 0;
    this.files = {};
    this.fileArray = [];
  },

  onloadHandler : function(h) {
    this.byteOffset = this.processTarChunks(h.data, this.byteOffset, h.outputSize);
    if (this.cleanUpAfterLoad)
      h.cleanup();
    if (this.onload)
      this.onload(this.files);
  },
  onprogressHandler : function(h) {
    this.gzip = h;
    if (this.ondata) this.ondata(h);
    this.byteOffset = this.processTarChunks(h.data, this.byteOffset, h.outputSize);
  },
  onerrorHandler : function(xhr, e, h) {
    if (this.onerror)
      this.onerror(xhr, e, h);
  },


  loadGZip : function(url) {
    this.initLoad();
    var self = this;
    GZip.load(url,
      function(h){self.onloadHandler(h)},
      function(h){self.onprogressHandler(h)},
      function(xhr,e,h){self.onerrorHandler(xhr,e,h)}
    );
  },

  load : function(url) {
    var xhr = new XMLHttpRequest();
    this.initLoad();
    var self = this;
    var h = { data: [], inputSize: 0, outputSize: 0, offset: 0, xhr: xhr, cleanup : function(){
      delete this.data;
      delete this.xhr;
    } };
    xhr.onload = function(){
      h.data[0] = this.responseText;
      h.inputSize = h.outputSize = h.offset = h.data[0].length;
      try { self.onloadHandler(h); } catch(e) {
        if (self.onerror)
          self.onerror(this, e, h);
        else
          throw(e);
      }
    };
    xhr.onprogress = function(){
      h.data[0] = this.responseText;
      h.inputSize = h.outputSize = h.offset = h.data[0].length;
      self.onprogressHandler(h);
    };
    xhr.open("GET", url, true);
    xhr.overrideMimeType("text/plain; charset=x-user-defined");
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.send(null);
  },
 
  cleanHighByte : function(s) {
    return s.replace(/./g, function(m) { 
      return String.fromCharCode(m.charCodeAt(0) & 0xff);
    });
  },
  
  parseTar : function(text) {
    this.initLoad();
    this.processTarChunks([text], 0, text.length);
  },
  processTarChunks : function (chunks, offset, totalSize) {
    var t = new Date();
    while (totalSize >= offset + 512) {
      var header = this.fileArray.length == 0 ? null : this.fileArray[this.fileArray.length-1];
      if (header && header.data == null) {
        if (offset + header.length <= totalSize) {
          header.data = this.chunkSubstring(chunks, offset, offset+header.length);
          header.toDataURL = this.__toDataURL;
          offset += 512 * Math.ceil(header.length / 512);
          if (this.onstream) 
            this.onstream(header, this.gzip);
        } else { // not loaded yet
          break;
        }
      } else {
        var s = this.chunkSubstring(chunks, offset, offset+512);
        var header = this.parseTarHeader(s, 0);
        if (header.length > 0 || header.filename != '') {
          this.fileArray.push(header);
          this.files[header.filename] = header;
          offset += 512;
          header.offset = offset;
        } else { // empty header, stop processing
          offset = totalSize;
        }
      }
    }
    this.parseTime += new Date() - t;
    return offset;
  },
  
  parseTarHeader : function(text, offset) {
    var i = offset || 0;
    var h = {};
    h.filename = this.parseTarField(text, i, i+=100);
    h.mode = this.parseTarNumber(text, i, i+=8);
    h.uid = this.parseTarNumber(text, i, i+=8);
    h.gid = this.parseTarNumber(text, i, i+=8);
    h.length = this.parseTarNumber(text, i, i+=12);
    h.lastModified = this.parseTarNumber(text, i, i+=12);
    h.checkSum = this.parseTarField(text, i, i+=8);
    h.fileType = this.parseTarField(text, i, i+=1);
    h.linkName = this.parseTarField(text, i, i+=100);
    h.ustar = this.parseTarField(text, i, i+=6);
    h.ustarVersion = this.parseTarField(text, i, i+=2);
    h.userName = this.parseTarField(text, i, i+=32);
    h.groupName = this.parseTarField(text, i, i+=32);
    h.deviceMajor = this.parseTarField(text, i, i+=8);
    h.deviceMinor = this.parseTarField(text, i, i+=8);
    h.filenamePrefix = this.parseTarField(text, i, i+=155);
    return h;
  },

  parseTarField : function(text, start, end) {
    return text.substring(start, end).split("\0", 1)[0];
  },

  parseTarNumber : function(text, start, end) {
    var s = text.substring(start, end);
    // if (s.charCodeAt(0) & 0x80 == 1) {
    // GNU tar 8-byte binary big-endian number
    // } else {
      return parseInt('0'+s.replace(/[^\d]+/g, ''));
    // }
  },

  // extract substring from an array of strings
  chunkSubstring : function (chunks, start, end) {
    var soff=0, eoff=0, i=0, j=0;
    for (i=0; i<chunks.length; i++) {
      if (soff + chunks[i].length > start)
        break;
      soff += chunks[i].length;
    }
    var strs = [];
    eoff = soff;
    for (j=i; j<chunks.length; j++) {
      strs.push(chunks[j]);
      if (eoff + chunks[j].length > end)
        break;
      eoff += chunks[j].length;
    }
    var s = strs.join('');
    return s.substring(start-soff, start-soff+(end-start));
  },

  __toDataURL : function() {
    if (this.data.substring(0,40).match(/^data:[^\/]+\/[^,]+,/)) {
      return this.data;
    } else if (Tar.prototype.cleanHighByte(this.data.substring(0,10)).match(/\377\330\377\340..JFIF/)) {
      return 'data:image/jpeg;base64,'+btoa(Tar.prototype.cleanHighByte(this.data));
    } else if (Tar.prototype.cleanHighByte(this.data.substring(0,6)) == "\211PNG\r\n") {
      return 'data:image/png;base64,'+btoa(Tar.prototype.cleanHighByte(this.data));
    } else if (Tar.prototype.cleanHighByte(this.data.substring(0,6)).match(/GIF8[79]a/)) {
      return 'data:image/gif;base64,'+btoa(Tar.prototype.cleanHighByte(this.data));
    } else {
      throw("toDataURL: I don't know how to handle " + this.filename);
    }
  }
}


