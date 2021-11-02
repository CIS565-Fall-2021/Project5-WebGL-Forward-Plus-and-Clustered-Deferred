WebGL Forward+ and Clustered Deferred Shading
======================

**University of Pennsylvania, CIS 565: GPU Programming and Architecture, Project 5**

* Yuxuan Zhu
  * [LinkedIn](https://www.linkedin.com/in/andrewyxzhu/)
* Tested on: Windows 10, i7-7700HQ @ 2.80GHz 16GB, GTX 1050 4096MB (Personal Laptop)

### Live Online

[![](img/thumb.png)](http://TODO.github.io/Project5-WebGL-Forward-Plus-and-Clustered-Deferred)

### Demo Video/GIF

[![](img/video.png)](TODO)

### Introduction

I implemented forward plus rendering and deferred rendering with clustered lights. By creating sub-frustums from the orginigal viewing frustum, we can cluster lights based on their location and region of effect. This reducing the amount of computation required to computing lighting.

### Performance Analysis

## Reducing G-Buffers

## Forward Plus vs Deferred 

*DO NOT* leave the README to the last minute! It is a crucial part of the
project, and we will not be able to grade you without a good README.

This assignment has a considerable amount of performance analysis compared
to implementation work. Complete the implementation early to leave time!

I used threejs for frustum
optimize the way to extract light index from texture
I encounted a bug with frustum

No idea why these two are different
    int clusterLights = int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, clusterInd, 0));
    //clusterLights = int(texture2D(u_clusterbuffer, vec2(float(clusterInd + 1) / float(textureWidth + 1), 0)).r);
    I ran into so many issues when it is changing in places 

increase the radius and it's fine!

I iterate through light to make it faster.

### Credits

* [Three.js](https://github.com/mrdoob/three.js) by [@mrdoob](https://github.com/mrdoob) and contributors
* [stats.js](https://github.com/mrdoob/stats.js) by [@mrdoob](https://github.com/mrdoob) and contributors
* [webgl-debug](https://github.com/KhronosGroup/WebGLDeveloperTools) by Khronos Group Inc.
* [glMatrix](https://github.com/toji/gl-matrix) by [@toji](https://github.com/toji) and contributors
* [minimal-gltf-loader](https://github.com/shrekshao/minimal-gltf-loader) by [@shrekshao](https://github.com/shrekshao)
