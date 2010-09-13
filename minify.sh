#!/bin/bash

cd src &&
cat {matrix,gl_util,scenegraph,scene_util}.js | yui-compressor --type js > magi.base.min.js &&
echo "Created magi.base.min.js";

cat {tar,obj_loader,bin_loader}.js | yui-compressor --type js > magi.loaders.min.js &&
echo "Created magi.loaders.min.js";

cat {matrix,gl_util,scenegraph,scene_util,tar,obj_loader,bin_loader}.js | yui-compressor --type js > magi.js &&
echo "Created magi.js";
