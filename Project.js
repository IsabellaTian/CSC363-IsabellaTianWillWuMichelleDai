"use strict";

var canvas;
var webgl;

// variables to enable CPU manipulation of GPU uniform "theta" and "distance(orbit distance)" as well as the
// "deltaeyedistance(distance from the eye)"
var theta = 0;
var thetaLoc;
var deltatheta = 0.01;
var deltaeyedistance = 0.0;
var distance = 0.0;
var deltadistance = 0.0;
var distanceLoc;

var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var numTimesToSubdivide = 4;

var index = 0;

// variables underneath are the ones to change the location of the specular light
var dspecularXLoc;
var dspecularYLoc;
var dspecularZLoc;

var deltaSpecularX = 0.0;
var deltaSpecularY = 0.0;
var deltaSpecularZ = 0.0;

var positionsArray = [];
var normalsArray = [];
var colorsArray = [];

// frustum information
var near = 3.0;
var far = 10.0;
var fovy = 40.0;  // Field-of-view in Y direction angle (in degrees)
var aspect; // Viewport aspect ratio (setup once canvas is known)


// uniform matrices for modelview and projection
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// eye information
var eye = vec3(0.0, 0.0, 3.0);  // eye position
const at = vec3(0.0, 0.0, 0.0);  //  direction of view
const up = vec3(0.0, 1.0, 0.0);  // up direction

// define and register callback function to start things off once the html data loads
window.onload = function init()
{
    document.getElementById("deltaeyedistance").onchange = function(event){
        deltaeyedistance = parseFloat(event.target.value);
        eye = vec3(0.0, 0.0, deltaeyedistance);
    }
    document.getElementById("deltatheta").onchange = function(event){
        deltatheta = parseFloat(event.target.value);
    }
    document.getElementById("deltadistance").onchange = function(event){
        deltadistance = parseFloat(event.target.value);
    }

    document.getElementById("deltaSpecularX").onchange = function(event){
        deltaSpecularX = parseFloat(event.target.value);
    }

    document.getElementById("deltaSpecularY").onchange = function(event){
        deltaSpecularY = parseFloat(event.target.value);
    }

    document.getElementById("deltaSpecularZ").onchange = function(event){
        deltaSpecularZ = parseFloat(event.target.value);
    }

    canvas = document.getElementById( "gl-canvas" );

    webgl = WebGLUtils.setupWebGL( canvas );
    if ( !webgl ) { alert( "WebGL isn't available" ); }

    // set up aspect ratio for frustum
    aspect = canvas.width / canvas.height;

    webgl.viewport( 0, 0, canvas.width, canvas.height );
    webgl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    // enable hidden surface removal (by default uses LESS)
    webgl.enable(webgl.DEPTH_TEST);

    // creating triangles
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    //
    //  Load shaders and initialize attribute buffers
    //  Set webgl context to "program"
    //
    var program = initShaders( webgl, "vertex-shader", "fragment-shader" );
    webgl.useProgram( program );

    // get GPU location of uniforms in <program>
    thetaLoc = webgl.getUniformLocation(program,"theta");
    distanceLoc = webgl.getUniformLocation(program, "distance");
    projectionMatrixLoc = webgl.getUniformLocation(program,"projectionMatrix");
    modelViewMatrixLoc = webgl.getUniformLocation(program,"modelViewMatrix");
    dspecularXLoc = webgl.getUniformLocation(program, "deltaSpecularX");
    dspecularYLoc = webgl.getUniformLocation(program, "deltaSpecularY");
    dspecularZLoc = webgl.getUniformLocation(program, "deltaSpecularZ");

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
    //webgl.bufferData( webgl.ARRAY_BUFFER, flatten(vertexPositions), webgl.STATIC_DRAW );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(normalsArray), webgl.STATIC_DRAW );

    var vNormalLOC = webgl.getAttribLocation( program, "vNormal" );
    webgl.vertexAttribPointer( vNormalLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vNormalLOC );

    alert("line 127");

    render();
};

// **************

// recursive render function -- recursive call is synchronized
// with the screen refresh
function render()
{
    // clear the color buffer and the depth buffer
    webgl.clear( webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

    // compute angle of rotation and pass along to vertex shader
    // compute the distance from the orbiting axis to the object and pass along to vertex shader
    theta = IncrementClamp(theta,deltatheta, 2.0*Math.PI);
    webgl.uniform1f(thetaLoc,theta);
    webgl.uniform1f(distanceLoc,distance+deltadistance);
    webgl.uniform1f(dspecularXLoc, deltaSpecularX);
    webgl.uniform1f(dspecularYLoc, deltaSpecularY);
    webgl.uniform1f(dspecularZLoc, deltaSpecularZ);

    // compute modelView and projection matrices
    // and them pass along to vertex shader
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

function triangle(a, b, c) {
    positionsArray.push(a);
    positionsArray.push(b);
    positionsArray.push(c);

    // normals are vectors

    normalsArray.push(a[0],a[1], a[2], 0.0);
    normalsArray.push(b[0],b[1], b[2], 0.0);
    normalsArray.push(c[0],c[1], c[2], 0.0);

    colorsArray.push(vec4( 1.0, 0.5, 0.0, 1.0 ));
    colorsArray.push(vec4( 1.0, 0.5, 0.0, 1.0 ));
    colorsArray.push(vec4( 1.0, 0.5, 0.0, 1.0 ));


    index += 3;

}


function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}


function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

// Utility function to increment a variable and clamp
function IncrementClamp(x, dx, upper){
    var newX = x+dx;
    if (newX > upper){
        return newX-upper;
    }
    return newX;
}