"use strict";
var canvas;
var webgl;

var positionsArray = [];
var normalsArray = [];
var colorsArray = [];
var indicesArray = [];

var near = 3.0;
var far = 10.0;
var fovy = 40.0;
var aspect;

var modelViewMatrix, projectionMatrix;

var eye = vec3(0.0, 0.0, 3.0);  // eye position
const at = vec3(0.0, 0.0, 0.0);  //  direction of view
const up = vec3(0.0, 1.0, 0.0);  // up direction

function sphere()
{
    var SPHERE_DIV = 12;
    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;

    // Vertices
    for (j = 0; j <= SPHERE_DIV; j++) {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);
        for (i = 0; i <= SPHERE_DIV; i++) {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            positionsArray.push(si * sj);  // X
            positionsArray.push(cj);       // Y
            positionsArray.push(ci * sj);  // Z
        }
    }
    for (j = 0; j < SPHERE_DIV; j++) {
        for (i = 0; i < SPHERE_DIV; i++) {
            p1 = j * (SPHERE_DIV+1) + i;
            p2 = p1 + (SPHERE_DIV+1);

            indicesArray.push(p1);
            indicesArray.push(p2);
            indicesArray.push(p1 + 1);

            indicesArray.push(p1 + 1);
            indicesArray.push(p2);
            indicesArray.push(p2 + 1);
        }
    }
    _this.indicesArray = new Uint8Array(indicesArray);


    _this.colorsArray = _this.colorsArray.map(function(n) { return n/255; });
    for (j = 0; j <= SPHERE_DIV; j++) {
        for (i = 0; i <= SPHERE_DIV; i++) {
            colorsArray.push(_this.colorsArray[0]);
            colorsArray.push(_this.colorsArray[1]);
            colorsArray.push(_this.colorsArray[2]);
            colorsArray.push(_this.colorsArray[3]);
        }
    }
}


window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    webgl = WebGLUtils.setupWebGL( canvas );
    if ( !webgl ) { alert( "WebGL isn't available" ); }

    // set up aspect ratio for frustum
    aspect = canvas.width / canvas.height;

    webgl.viewport( 0, 0, canvas.width, canvas.height );
    webgl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // enable hidden surface removal (by default uses LESS)
    webgl.enable(webgl.DEPTH_TEST);

    var program = initShaders( webgl, "vertex-shader", "fragment-shader" );
    webgl.useProgram( program );

    var cBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, cBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(colorsArray), webgl.STATIC_DRAW );

    var vColorLOC = webgl.getAttribLocation( program, "vColor" );
    webgl.vertexAttribPointer( vColorLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vColorLOC );

    // vertex array attribute buffer (indexed by iBuffer)
    //      4 floats corresponding to homogeneous vertex coordinates

    var vBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, vBuffer );
    //webgl.bufferData( webgl.ARRAY_BUFFER, flatten(vertexPositions), webgl.STATIC_DRAW );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(positionsArray), webgl.STATIC_DRAW );

    var vPositionLOC = webgl.getAttribLocation( program, "vPosition" );
    webgl.vertexAttribPointer( vPositionLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vPositionLOC );

    // normals buffer

    var nBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, nBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(normalsArray), webgl.STATIC_DRAW );

    var vNormalLOC = webgl.getAttribLocation( program, "vNormal" );
    webgl.vertexAttribPointer( vNormalLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vNormalLOC );

    alert("line 127");

    render();
};

function render()
{
    // clear the color buffer and the depth buffer
    webgl.clear( webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

    theta = IncrementClamp(theta,deltatheta, 2.0*Math.PI);
    webgl.uniform1f(thetaLoc,theta);

    modelViewMatrix =  lookAt(eye,at,up);
    projectionMatrix = perspective(fovy, aspect, near, far);
    webgl.uniformMatrix4fv( modelViewMatrixLoc, false,
        flatten(modelViewMatrix) );
    webgl.uniformMatrix4fv( projectionMatrixLoc, false,
        flatten(projectionMatrix) );

    // drawElements draws the "elements" (based on indices)
    //webgl.drawElements( webgl.TRIANGLES, attrIndices.length,
    //    webgl.UNSIGNED_BYTE, 0 );
    webgl.drawArrays(webgl.TRIANGLES, 0, positionsArray.length);

    requestAnimFrame( render );
}

function IncrementClamp(x, dx, upper){
    var newX = x+dx;
    if (newX > upper){
        return newX-upper;
    }
    return newX;
}