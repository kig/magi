lines = File.readlines(ARGV[0]).map{|l|l.strip}
verts = lines.grep(/^v /).map{|v| v[2..-1].strip.split(/\s+/).map{|i| i.to_f}}
normals = lines.grep(/^vn /).map{|v| v[3..-1].strip.split(/\s+/).map{|i| i.to_f}}
texcoords = lines.grep(/^vt /).map{|v| v[3..-1].strip.split(/\s+/).map{|i| i.to_f}}
faces = lines.grep(/^f /).map{|f| f[2..-1].strip.split(/\s+/).map{|v| v.split("/").map{|i|i.strip.to_i-1}}}

larges = faces.find_all{|f| f.length > 4}
quads = faces.find_all{|f| f.length == 4}
tris = faces.find_all{|f| f.length == 3}

larges.each{|l|
  (2..l.size-1).each{|i|
    tris.push([l[0], l[i-1], l[i]])
  }
}

flat_verts = verts.flatten
xmax = verts.map{|v| v[0]}.max
xmin = verts.map{|v| v[0]}.min
ymax = verts.map{|v| v[1]}.max
ymin = verts.map{|v| v[1]}.min
zmax = verts.map{|v| v[2]}.max
zmin = verts.map{|v| v[2]}.min
xscale = xmax - xmin
yscale = ymax - ymin
zscale = zmax - zmin

normalized_verts = verts.map{|x,y,z|
  [(x - xmin) / xscale, (y - ymin) / yscale, (z - zmin) / zscale]
}.flatten
fixed_verts = normalized_verts.map{|v| (v * 65535).to_i }
fixed_texcoords = texcoords.flatten.map{|v| ([1,[0,v].max].min * 65535).to_i }
fixed_normals = normals.flatten.map{|v| (0.5 * ([1,[-1,v].max].min + 1.0) * 65535).to_i }

File.open(ARGV[0]+".bin", "w"){|s|
  # write vert counts
  s << [verts.size, texcoords.size, normals.size, quads.size, tris.size].pack("N*")

  # write scale factors and translate vector
  if [1].pack("N") == [1].pack("I") # big-endian machine
    s << [xscale, yscale, zscale, xmin, ymin, zmin].pack("f*")
  else # little-endian machine
    s << [xscale, yscale, zscale, xmin, ymin, zmin].map{|f| [f].pack("f").reverse }.join
  end

  # write verts
  s << fixed_verts.pack("n*")
  s << quads.map{|q| q.map{|v| v[0] } }.flatten.pack("n*")
  s << tris.map{|q| q.map{|v| v[0] } }.flatten.pack("n*")

  if texcoords.size > 0
    # write texcoords
    s << fixed_texcoords.pack("n*")
    s << quads.map{|q| q.map{|v| v[1] } }.flatten.pack("n*")
    s << tris.map{|q| q.map{|v| v[1] } }.flatten.pack("n*")
    if normals.size > 0
      # write normals
      s << fixed_normals.pack("n*")
      s << quads.map{|q| q.map{|v| v[2] } }.flatten.pack("n*")
      s << tris.map{|q| q.map{|v| v[2] } }.flatten.pack("n*")
    end
  end
}