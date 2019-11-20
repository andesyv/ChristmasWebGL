const glm = require('./gl-matrix-min.js');
const geometry = require('./geometry');

const vsSource = `#version 300 es

layout(location = 0) in vec3 inPos;
layout(location = 1) in vec3 inNormal;
layout(location = 2) in vec2 inTexCoords;

uniform mat4 mModel;
uniform mat4 mView;
uniform mat4 mProjection;

out vec2 texCoords;
out vec3 normal;

void main() {
    normal = inNormal;
    texCoords = inTexCoords;
    gl_Position = mProjection * mView * mModel * vec4(inPos, 1.0);
}
`;
//
// // Fragment shader
// let fsSource = fs.readFileSync('../shaders/plain.fs', 'utf8');
const fsSource = `#version 300 es
precision lowp float;

in vec2 texCoords;
in vec3 normal;

out vec4 fragColor;

void main() {
    fragColor = vec4(texCoords.x, texCoords.y, 0.0, 1.0);
    vec3 norm = normalize(normal);
    fragColor = vec4(norm, 1.0);
}
`;

if (window.File && window.FileReader && window.FileList && window.Blob)
{

}
else
{
    alert("Browser doesn't support html5 file reading. :s");
}

function visualObject(gl, vertices)
{
    var visObj = {};
    visObj.VAO = gl.createVertexArray();
    gl.bindVertexArray(visObj.VAO);

    visObj.VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, visObj.VBO);

    if (vertices instanceof Float32Array)
    {
        visObj.vertices = vertices;
        visObj.vertexCount = vertices.length / 8;
    }
    else if (Array.isArray(vertices))
    {
        visObj.vertices = new Float32Array(vertices);
        visObj.vertexCount = vertices.length / 8;
    }
    else
    {
        visObj.vertices = (typeof vertices.vertices !== "undefined") ? vertices.vertices : new Float32Array(0);
        visObj.vertexCount = (typeof vertices.vertexCount === "number") ? vertices.vertexCount : 0;
    }

    gl.bufferData(gl.ARRAY_BUFFER, visObj.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    // Location, component count, datatype, normalized, stride, offset
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 4 * 8, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 4 * 8, 4 * 3)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 4 * 8, 4 * 6);

    return visObj;
}


var sceneObjects;

// Script part:
function main()
{
    const canvas = document.querySelector("#glCanvas");
    // Init gl context
    const gl = canvas.getContext("webgl2");

    if (gl === null)
    {
        alert("Unable to initialize WebGL. You browser or machine may not support it. :(");
        return;
    }

    // canvas.width = document.body.clientWidth; //document.width is obsolete
    // canvas.height = document.body.clientHeight; //document.height is obsolete
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    console.log("Canvas width: " + canvas.width + ", canvas height: " + canvas.height);

    function initShaderProgram(gl, vsSource, fsSource)
    {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        // Check for error
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        {
            alert("Shader program failed to compile: " + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    }

    function loadShader(gl, type, source)
    {
        const shader = gl.createShader(type);

        // send source to shader object
        gl.shaderSource(shader, source);

        // Compile the shader program
        gl.compileShader(shader);

        // check for error
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            alert((type == gl.VERTEX_SHADER) ? "VERTEX: " : "FRAGMENT: " + "Shader failed to compile: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const shader = initShaderProgram(gl, vsSource, fsSource);
    const shaderInfo = {
        program: shader,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shader, 'inPos')
        },
        uniformLocations: {
            modelMatrix: gl.getUniformLocation(shader, 'mModel'),
            viewMatrix: gl.getUniformLocation(shader, 'mView'),
            projectionMatrix: gl.getUniformLocation(shader, 'mProjection')
        }
    };

    let cone = visualObject(gl, geometry.genCone(8));

    sceneObjects = [cone];

    // VAO = gl.createVertexArray();
    // gl.bindVertexArray(VAO);
    //
    // var VBO = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    //
    // let cone = geometry.genCone(8);
    //
    // gl.bufferData(gl.ARRAY_BUFFER, cone.vertices, gl.STATIC_DRAW);
    // gl.enableVertexAttribArray(0);
    // // Location, component count, datatype, normalized, stride, offset
    // gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 4 * 8, 0);
    // gl.enableVertexAttribArray(1);
    // gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 4 * 8, 4 * 3)
    // gl.enableVertexAttribArray(2);
    // gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 4 * 8, 4 * 6);

    // Matrises:
    let mProjMat = glm.mat4.create();
    glm.mat4.perspective(mProjMat, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100.0);
    let mModelMat = glm.mat4.create();
    glm.mat4.translate(mModelMat, mModelMat, [0.0, 0.0, -6.0]);



    render();

    var incNumber = 0.0;

    function render()
    {
        incNumber += 0.01;
        window.requestAnimationFrame(render);

        gl.clearColor(Math.sin(incNumber), 0.0, 0.0, 1.0);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        let radius = -10;
        let circlePoint = glm.vec3.create();
        glm.vec3.set(circlePoint, Math.cos(incNumber) * radius, 0, Math.sin(incNumber) * radius);

        var viewMatrix = glm.mat4.create();
        glm.mat4.lookAt(viewMatrix, circlePoint, [0, 0, 0], [0, 1, 0]);


        sceneObjects.forEach((visObj, index) => {
            gl.useProgram(shader);
            gl.bindVertexArray(visObj.VAO);

            let rot = glm.quat.create();
            // glm.quat.rotateX(rot, rot, incNumber);
            // glm.quat.rotateY(rot, rot, incNumber / 2);
            let pos = glm.vec3.create();
            glm.vec3.set(pos, 0.0, 0.0, 0.0);
            gl.uniformMatrix4fv(shaderInfo.uniformLocations.modelMatrix, false, calcModelMat(pos, rot));
            gl.uniformMatrix4fv(shaderInfo.uniformLocations.viewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(shaderInfo.uniformLocations.projectionMatrix, false, mProjMat);

            gl.drawArrays(gl.TRIANGLES, 0, visObj.vertexCount);
        });

    }

    function calcModelMat(pos, rot, scale)
    {
        let mat = glm.mat4.create();
        glm.mat4.fromRotationTranslation(mat, rot, pos);
        return mat;
    }
}



window.onload = main;
