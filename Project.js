"use strict";

var canvas;
var webgl;

// variables to enable CPU manipulation of GPU uniform "theta" and "distance(orbit distance)" as well as the
// "deltaeyedistance(distance from the eye)"
var theta = 0;
var thetaLoc;
var phi = 0;
var phiLoc;
var deltatheta = 0.01;
var deltaphi = 0.01;
var deltaeyedistance = 0.0;

var dspecularXLoc;
var dspecularYLoc;
var dspecularZLoc;

var deltaSpecularX = 0.0;
var deltaSpecularY = 0.0;
var deltaSpecularZ = 0.0;

// control the new addin planet
var randomDistance;
var randomSize;
var randomColor1;
var randomColor2;
var randomColor3;
var randomSizeLoc;
var randomDistanceLoc;
var randomColor1Loc;
var randomColor2Loc;
var randomColor3Loc;

var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var numTimesToSubdivide = 4;

var positionsArray = [];
var normalsArray = [];
var colorsArray = [];
var typesArray = [];

var index=0;
var indexLoc;

// frustum information
var near = 4.0;
var far = 40.0;
var fovy = 60.0;  // Field-of-view in Y direction angle (in degrees)
var aspect; // Viewport aspect ratio (setup once canvas is known)


// uniform matrices for modelview and projection
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var cBuffer, vColorLOC, vBuffer, vPositionLOC, tBuffer, vType, nBuffer, vNormalLOC;

// eye information
var eye = vec3(0.0, 6.0, 6.0);  // eye position
const at = vec3(0.0, 0.0, 0.0);  //  direction of view
const up = vec3(0.0, 1.0, 0.0);  // up direction

var colorPalette = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4(1.0, 99.0/255, 71.0/255, 1.0), // tomato
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4(1,239.0/255,213.0/255,1.0), // papaya whip
    vec4( 0.0, 1.0, 1.0, 1.0)   // cyan
];

// define and register callback function to start things off once the html data loads
window.onload = function init()
{

    canvas = document.getElementById( "gl-canvas" );

    webgl = WebGLUtils.setupWebGL( canvas );
    if ( !webgl ) { alert( "WebGL isn't available" ); }

    // set up aspect ratio for frustum
    aspect = canvas.width / canvas.height;

    webgl.viewport( 0, 0, canvas.width, canvas.height );
    webgl.clearColor(0.0, 0.0, 0.0, 0.0);

    webgl.enable(webgl.DEPTH_TEST);

    document.getElementById("deltaeyedistance").onchange = function(event){
        deltaeyedistance = parseFloat(event.target.value);
        eye = vec3(0.0, 6.0, deltaeyedistance);
    }
    document.getElementById("deltatheta").onchange = function(event){
        deltatheta = parseFloat(event.target.value);
    }

    document.getElementById("deltaphi").onchange = function(event){
        deltaphi = parseFloat(event.target.value);
    }

    // onclick event trigger
    // Michelle: FIXME
    document.getElementById("Button1").onclick = function(event){createNew()};

    //earth
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide, vec4(0.0, 0.0, 1.0, 1.0), vec4( 0.0, 0.0, 1.0, 1.0 ), vec4( 0.0, 1.0, 0.0, 1.0 ), 2.0);
    //sun
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide, vec4( 1.0, 0.5, 0.0, 1.0 ), vec4( 1.0, 0.5, 0.0, 1.0 ),  vec4( 1.0, 0.5, 0.0, 1.0 ), 1.0);

    var program = initShaders( webgl, "vertex-shader", "fragment-shader" );
    webgl.useProgram( program );

    // get GPU location of uniforms in <program>
    thetaLoc = webgl.getUniformLocation(program,"theta");
    phiLoc = webgl.getUniformLocation(program, "phi");
    projectionMatrixLoc = webgl.getUniformLocation(program,"projectionMatrix");
    modelViewMatrixLoc = webgl.getUniformLocation(program,"modelViewMatrix");

    randomDistanceLoc = webgl.getUniformLocation(program, "randomDistance");
    randomSizeLoc = webgl.getUniformLocation(program, "randomSize");
    randomColor1Loc = webgl.getUniformLocation(program, "randomColor1");
    randomColor2Loc = webgl.getUniformLocation(program, "randomColor2");
    randomColor3Loc = webgl.getUniformLocation(program, "randomColor3");

    cBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, cBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(colorsArray), webgl.STATIC_DRAW );

    vColorLOC = webgl.getAttribLocation( program, "vColor" );
    webgl.vertexAttribPointer( vColorLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vColorLOC );

    vBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, vBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(positionsArray), webgl.STATIC_DRAW );

    vPositionLOC = webgl.getAttribLocation( program, "vPosition" );
    webgl.vertexAttribPointer( vPositionLOC, 4, webgl.FLOAT, false, 0, 0 );
    webgl.enableVertexAttribArray( vPositionLOC );

    tBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, tBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, flatten(typesArray), webgl.STATIC_DRAW);

    vType = webgl.getAttribLocation( program, "vType");
    webgl.vertexAttribPointer(vType, 1, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(vType);

    nBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, nBuffer );
    //webgl.bufferData( webgl.ARRAY_BUFFER, flatten(vertexPositions), webgl.STATIC_DRAW );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(normalsArray), webgl.STATIC_DRAW );

    vNormalLOC = webgl.getAttribLocation( program, "vNormal" );
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
    updateBuffer();
    // clear the color buffer and the depth buffer
    webgl.clear( webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

    // compute angle of rotation and pass along to vertex shader
    // compute the distance from the orbiting axis to the object and pass along to vertex shader
    theta = IncrementClamp(theta,deltatheta, 2.0*Math.PI);
    webgl.uniform1f(thetaLoc,theta);

    phi = IncrementClamp(phi, deltaphi, 2.0*Math.PI);
    webgl.uniform1f(phiLoc, phi);

    webgl.uniform1f(dspecularXLoc, deltaSpecularX);
    webgl.uniform1f(dspecularYLoc, deltaSpecularY);
    webgl.uniform1f(dspecularZLoc, deltaSpecularZ);

    webgl.uniform1f(randomSizeLoc, randomSize);
    webgl.uniform1f(randomDistanceLoc, randomDistance);
    webgl.uniform1f(randomColor1Loc, randomColor1);
    webgl.uniform1f(randomColor2Loc, randomColor2);
    webgl.uniform1f(randomColor3Loc, randomColor3);

    // compute modelView and projection matrices
    // and them pass along to vertex shader
    modelViewMatrix =  lookAt(eye,at,up);
    projectionMatrix = perspective(fovy, aspect, near, far);
    webgl.uniformMatrix4fv( modelViewMatrixLoc, false,
        flatten(modelViewMatrix) );
    webgl.uniformMatrix4fv( projectionMatrixLoc, false,
        flatten(projectionMatrix) );

    webgl.drawArrays(webgl.TRIANGLES, 0, positionsArray.length);

    requestAnimFrame( render );
}

function triangle(a, b, c, color1, color2, color3, type) {
    positionsArray.push(a);
    positionsArray.push(b);
    positionsArray.push(c);

    // normals are vectors

    var t1 = subtract(b,a);
    var t2 = subtract(c,a);
    var normal = vec4(normalize(cross(t1,t2)));

    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);

    colorsArray.push(color1);
    colorsArray.push(color2);
    colorsArray.push(color3);

    typesArray.push(type);
    typesArray.push(type);
    typesArray.push(type);


}

function divideTriangle(a, b, c, count, color1, color2, color3, type) {
    if ( count > 0 ) {

        // take midpoint
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        // normalize
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1, color1, color2, color3, type);
        divideTriangle( ab, b, bc, count - 1, color1, color2, color3, type);
        divideTriangle( bc, c, ac, count - 1, color1, color2, color3, type);
        divideTriangle( ab, bc, ac, count - 1, color1, color2, color3, type);
    }
    else {
        triangle( a, b, c , color1, color2, color3, type);
    }
}


function tetrahedron(a, b, c, d, n, color1, color2, color3, type) {
    divideTriangle(a, b, c, n, color1, color2, color3, type);
    divideTriangle(d, c, b, n, color1, color2, color3, type);
    divideTriangle(a, d, b, n, color1, color2, color3, type);
    divideTriangle(a, c, d, n, color1, color2, color3, type);
}

// Utility function to increment a variable and clamp
function IncrementClamp(x, dx, upper){
    var newX = x+dx;
    if (newX > upper){
        return newX-upper;
    }
    return newX;
}

// when new planet is added, push in new buffers
// Michelle: FIXME maybe we can update our positionsArray, typesArray, colorsArray, and TypesArray when new planet is added.
function updateBuffer()
{
    cBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, cBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(colorsArray), webgl.STATIC_DRAW );
    webgl.vertexAttribPointer( vColorLOC, 4, webgl.FLOAT, false, 0, 0 );

    vBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, vBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(positionsArray), webgl.STATIC_DRAW );
    webgl.vertexAttribPointer( vPositionLOC, 4, webgl.FLOAT, false, 0, 0 );

    tBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, tBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, flatten(typesArray), webgl.STATIC_DRAW);
    webgl.vertexAttribPointer(vType, 1, webgl.FLOAT, false, 0, 0);

    nBuffer = webgl.createBuffer();
    webgl.bindBuffer( webgl.ARRAY_BUFFER, nBuffer );
    webgl.bufferData( webgl.ARRAY_BUFFER, flatten(normalsArray), webgl.STATIC_DRAW );
    webgl.vertexAttribPointer( vNormalLOC, 4, webgl.FLOAT, false, 0, 0 );
}

// create new planet if onclick is triggered
// Michelle: FIXME pass in array, problem: data overwrite
function createNew()
{
    randomDistance = getRandomIntInclusive(2.0, 5.0);

    randomSize = (getRandomIntInclusive(1.0, 10.0)/10.0);

    randomColor1 = colorPalette[getRandomIntInclusive(0.0, 8.0)];

    randomColor2 = colorPalette[getRandomIntInclusive(0.0, 8.0)];

    randomColor3 = colorPalette[getRandomIntInclusive(0.0, 8.0)];

    return tetrahedron(va, vb, vc, vd, numTimesToSubdivide, randomColor1, randomColor2, randomColor3, 3.0);

}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}