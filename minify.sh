#!/bin/bash

cd src &&
#cat {matrix,gl_util,scenegraph,scene_util}.js | yui-compressor --type js > magi.base.min.js &&
#echo "Created magi.base.min.js";

#cat {tar,obj_loader,bin_loader}.js | yui-compressor --type js > magi.loaders.min.js &&
#echo "Created magi.loaders.min.js";

cat {matrix,util,gl_util,scenegraph,scene_util,tar,obj_loader,bin_loader}.js | yui-compressor --type js > magi.js &&
echo "Created src/magi.js";

cat ../slides/slides.js | yui-compressor --type js > ../slides/slides.base.min.js &&
echo "Created slides/slides.base.min.js";

