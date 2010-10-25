#!/bin/bash

cat src/{matrix,util,gl_util,scenegraph,scene_util,tar,obj_loader,bin_loader}.js | yui-compressor --type js > src/magi.js &&
echo "Created src/magi.js";

cat slides/slides.js | yui-compressor --type js > slides/slides.base.min.js &&
echo "Created slides/slides.base.min.js";

