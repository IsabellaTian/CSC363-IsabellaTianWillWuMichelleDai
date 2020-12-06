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


var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var vm = vec4(0.0, 0.0, -0.5, 1);
var vn = vec4(0.0, 0.942809/3, 0.333333/3, 1);
var vl = vec4(-0.816497/3, -0.471405/3, 0.333333/3, 1);
var vs = vec4(0.816497/3, -0.471405/3, 0.333333/3, 1);


var numTimesToSubdivide = 4;

var index = 0;

var positionsArray = [];
var normalsArray = [];
var colorsArray = [];
var typesArray = [];

// frustum information
var near = 4.0;
var far = 40.0;
var fovy = 60.0;  // Field-of-view in Y direction angle (in degrees)
var aspect; // Viewport aspect ratio (setup once canvas is known)


// uniform matrices for modelview and projection
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// eye information
var eye = vec3(0.0, 6.0, 6.0);  // eye position
const at = vec3(0.0, 0.0, 0.0);  //  direction of view
const up = vec3(0.0, 1.0, 0.0);  // up direction

var vertexColors = [
    vec4( 1.0, 1.0, 1.0, 1.0 ),
    vec4( 1.0, 1.0, 1.0, 1.0 ),
    vec4( 1.0, 1.0, 1.0, 1.0 )
];

var vertexPositions = [
    vec4(0.2, 0.7, 0.2, 1.0),  // cat face
    vec4(0.2, 0.8, 0.3, 1.0),
    vec4(0.1, 0.7, 0.5, 1.0)
];

var attrIndices = [
    0, 1, 2
];

// define and register callback function to start things off once the html data loads
window.onload = function init()
{
    document.getElementById("deltaeyedistance").onchange = function(event){
        deltaeyedistance = parseFloat(event.target.value);
        eye = vec3(0.0, 6.0, deltaeyedistance);
    }
    document.getElementById("deltatheta").onchange = function(event){
        deltatheta = parseFloat(event.target.value);
    }

    document.getElementById("deltaphi").onchange = function(event){
        deltatheta = parseFloat(event.target.value);
    }

    canvas = document.getElementById( "gl-canvas" );

    webgl = WebGLUtils.setupWebGL( canvas );
    if ( !webgl ) { alert( "WebGL isn't available" ); }

    // set up aspect ratio for frustum
    aspect = canvas.width / canvas.height;

    webgl.viewport( 0, 0, canvas.width, canvas.height );
    webgl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    // enable hidden surface removal (by default uses LESS)
    webgl.enable(webgl.DEPTH_TEST);

    // creating triangles
    //earth
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide, vec4(0.0, 0.0, 1.0, 1.0), 2.0);
    //sun
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide, vec4( 1.0, 0.5, 0.0, 1.0 ), 1.0);

  //  tetrahedron(va, vb, vc, vd, numTimesToSubdivide, vec4( 1.0, 0.5, 0.0, 1.0 ), 10.0);

 //   for(var i = 0; i < attrIndices.length; i = i + 3)
 //   {
 //       myTriangle(attrIndices[i], attrIndices[i+1], attrIndices[i+2], 10.0);
 //   }

    //
    //  Load shaders and initialize attribute buffers
    //  Set webgl context to "program"
    //
    var program = initShaders( webgl, "vertex-shader", "fragment-shader" );
    webgl.useProgram( program );

    // get GPU location of uniforms in <program>
    thetaLoc = webgl.getUniformLocation(program,"theta");
    phiLoc = webgl.getUniformLocation(program,"phi");
    projectionMatrixLoc = webgl.getUniformLocation(program,"projectionMatrix");
    modelViewMatrixLoc = webgl.getUniformLocation(program,"modelViewMatrix");

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

    var tBuffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, tBuffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, flatten(typesArray), webgl.STATIC_DRAW);

    // associate JavaScript vType with vertex shader attribute "vType"
    var vType = webgl.getAttribLocation( program, "vType");
    webgl.vertexAttribPointer(vType, 1, webgl.FLOAT, false, 0, 0);
    webgl.enableVertexAttribArray(vType);


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

    phi = IncrementClamp(phi, deltaphi, 2.0*Math.PI);
    webgl.uniform1f(phiLoc, phi);

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

function myTriangle(iA, iB, iC, type)
{
    var A = vertexPositions[iA];
    var B = vertexPositions[iB];
    var C = vertexPositions[iC];

    var Ac = vertexColors[iA];
    var Bc = vertexColors[iB];
    var Cc = vertexColors[iC];

    positionsArray.push(A);
    positionsArray.push(B);
    positionsArray.push(C);

    colorsArray.push(Ac);
    colorsArray.push(Bc);
    colorsArray.push(Cc);

    var t1 = subtract(B,A);
    var t2 = subtract(C,A);
    var normal = vec4(normalize(cross(t1,t2)));

    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);

    typesArray.push(type);
    typesArray.push(type);
    typesArray.push(type);
}

function triangle(a, b, c, color, type) {
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

    colorsArray.push(color);
    colorsArray.push(color);
    colorsArray.push(color);

    typesArray.push(type);
    typesArray.push(type);
    typesArray.push(type);


}


function divideTriangle(a, b, c, count, color, type) {
    if ( count > 0 ) {

        // take midpoint
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        // normalize
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1, color,  type);
        divideTriangle( ab, b, bc, count - 1, color,  type);
        divideTriangle( bc, c, ac, count - 1, color, type);
        divideTriangle( ab, bc, ac, count - 1, color, type);
    }
    else {
        triangle( a, b, c , color, type);
    }
}


function tetrahedron(a, b, c, d, n, color, type) {
    divideTriangle(a, b, c, n, color, type);
    divideTriangle(d, c, b, n, color, type);
    divideTriangle(a, d, b, n, color, type);
    divideTriangle(a, c, d, n, color, type);
}

// Utility function to increment a variable and clamp
function IncrementClamp(x, dx, upper){
    var newX = x+dx;
    if (newX > upper){
        return newX-upper;
    }
    return newX;
}