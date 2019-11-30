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
out vec3 fragPos;

void main() {
    normal = normalize(mat3(transpose(inverse(mModel))) * inNormal);
    texCoords = inTexCoords;
    fragPos = vec3(mModel * vec4(inPos, 1.0));
    gl_Position = mProjection * mView * vec4(fragPos, 1.0);
}
`;

const fsSource = `#version 300 es
precision lowp float;

in vec2 texCoords;
in vec3 normal;
in vec3 fragPos;

uniform vec3 viewPos;
uniform vec3 lightPos;
uniform vec3 lightColor;
uniform vec3 color;

out vec4 fragColor;

float maxFloat(float a, float b) {
    if (a < b)
        return b;
    else
        return a;
}

void main() {
    // fragColor = vec4(texCoords.x, texCoords.y, 0.0, 1.0);
    // vec3 norm = normalize(normal);
    // fragColor = vec4(norm, 1.0);


    // Ambient
    vec3 ambient = lightColor * 0.15;

    // Diffuse
    vec3 lightDir = normalize(lightPos - fragPos);
    vec3 diffuse = lightColor * maxFloat(dot(normal, lightDir), 0.0) * 0.8;

    // Specular
    vec3 viewDir = normalize(viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, normal);
    vec3 specular = lightColor * pow(maxFloat(dot(viewDir, reflectDir), 0.0), 16.0) * 0.4;

    fragColor = vec4((ambient + diffuse + specular) * color, 1);
}
`;

const vsStatic = `#version 300 es

layout(location = 0) in vec3 inPos;
layout(location = 2) in vec2 inTexCoords;

out vec2 texCoords;

void main() {
    texCoords = inTexCoords;
    gl_Position = vec4(inPos, 1.0);
}`;

const fsStatic = `#version 300 es
    precision mediump float;

    in vec2 texCoords;

    uniform float time;

    out vec4 fragColor;

    #define M_PI 3.1415926535897932384626433832795

    float rand(float c)
    {
        return fract(sin(c) * 43758.5453);
    }

    float rand(vec2 co)
    {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {

        float alpha = rand(vec2(texCoords.x, texCoords.y));
        alpha = (alpha > 0.99) ? 1.0 : 0.0;

        fragColor = vec4(vec3(alpha), 1.0);
    }`;

const fsHUD = `#version 300 es
    precision mediump float;

    in vec2 texCoords;

    uniform float time;
    uniform sampler2D tex;

    out vec4 fragColor;

    #define M_PI 3.1415926535897932384626433832795

    float rand(float c)
    {
        return fract(sin(c) * 43758.5453);
    }

    float rand(vec2 co)
    {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
        vec2 offset = vec2(sin(time) * 0.1 + texCoords.x, time * 0.1 + texCoords.y);
        float col = texture(tex, offset).r;
        if (col < 0.5)
            discard;
        fragColor = vec4(vec3(col), 1.0);
    }`;

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


var sceneObjects = [];
var timer;
const startTimer = Date.now();

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
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

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

    let shader = initShaderProgram(gl, vsSource, fsSource);
    const phongShader = {
        program: shader,
        uniformLocations: {
            modelMatrix: gl.getUniformLocation(shader, 'mModel'),
            viewMatrix: gl.getUniformLocation(shader, 'mView'),
            projectionMatrix: gl.getUniformLocation(shader, 'mProjection')
        },
        setUniforms: (params) => {
            if (typeof params !== "undefined") {
                gl.uniform3fv(gl.getUniformLocation(phongShader.program, 'lightColor'), [1.0, 0.96, 0.91]);
                gl.uniform3fv(gl.getUniformLocation(phongShader.program, 'lightPos'), [-5, 3, -5]);
                if (typeof params.camerapos !== "undefined")
                    gl.uniform3fv(gl.getUniformLocation(phongShader.program, 'viewPos'), params.camerapos);
                if (typeof params.material !== "undefined" && typeof params.material.color !== "undefined")
                    gl.uniform3fv(gl.getUniformLocation(phongShader.program, 'color'),  params.material.color);
                else
                    gl.uniform3fv(gl.getUniformLocation(phongShader.program, 'color'),  [0.3, 0.3, 0.3]);

                gl.uniformMatrix4fv(phongShader.uniformLocations.modelMatrix, false, (typeof params.mMatrix !== "undefined") ? params.mMatrix : glm.mat4.create());
                gl.uniformMatrix4fv(phongShader.uniformLocations.viewMatrix, false, params.viewMatrix);
                gl.uniformMatrix4fv(phongShader.uniformLocations.projectionMatrix, false, params.mProjMat);
            }
        }
    };


    shader = initShaderProgram(gl, vsStatic, fsStatic);
    const snowyShader = {
        program: shader,
        uniformLocations: {},
        setUniforms: (params) => {
            if (typeof params !== "undefined") {
                if (typeof params.time !== "undefined")
                    gl.uniform1f(gl.getUniformLocation(snowyShader.program, 'time'), params.time);
            }
        }
    };

    shader = initShaderProgram(gl, vsStatic, fsHUD);
    const HUDShader = {
        program: shader,
        uniformLocations: {},
        setUniforms: (params) => {
            if (typeof params !== "undefined") {
                if (typeof params.time !== "undefined")
                    gl.uniform1f(gl.getUniformLocation(HUDShader.program, 'time'), params.time);
                if (typeof params.texture !== "undefined")
                {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, params.texture);
                    gl.uniform1i(gl.getUniformLocation(HUDShader.program, 'tex'), 0);
                }
            }
        }
    }

    let cone = visualObject(gl, geometry.genCone(8));
    cone.mMatrix = glm.mat4.create();
    // glm.mat4.translate(cone.mMatrix, cone.mMatrix, [0, 1, 0]);
    let rot = glm.quat.create();
    glm.mat4.fromRotationTranslationScale(cone.mMatrix, rot, [0, 0.8, 0], [1.1, 1.1, 1.1]);
    cone.material = { "color": [0.0, 0.7, 0.0] };
    sceneObjects.push(cone);

    cone = visualObject(gl, geometry.genCone(8));
    cone.mMatrix = glm.mat4.create();
    glm.mat4.fromRotationTranslationScale(cone.mMatrix, rot, [0, -0.1, 0], [1.4, 1.4, 1.4]);
    cone.material = { "color": [0.0, 0.7, 0.0] };
    sceneObjects.push(cone);

    cone = visualObject(gl, geometry.genCone(8));
    cone.mMatrix = glm.mat4.create();
    glm.mat4.fromRotationTranslationScale(cone.mMatrix, rot, [0, -1, 0], [1.6, 1.6, 1.6]);
    cone.material = { "color": [0.0, 0.7, 0.0] };
    sceneObjects.push(cone);

    cone = visualObject(gl, geometry.genCone(8));
    cone.mMatrix = glm.mat4.create();
    glm.mat4.fromRotationTranslationScale(cone.mMatrix, rot, [0, -2, 0], [1.8, 1.8, 1.8]);
    cone.material = { "color": [0.0, 0.7, 0.0] };
    sceneObjects.push(cone);



    let cube = visualObject(gl, geometry.box);
    cube.mMatrix = glm.mat4.create();
    glm.quat.rotateY(rot, rot, 1);
    glm.mat4.fromRotationTranslationScale(cube.mMatrix, rot, [1, -2.5, 0], [0.9, 0.2, 0.3]);
    cube.material = { "color": [Math.random(), Math.random(), Math.random()] };
    sceneObjects.push(cube);

    cube = visualObject(gl, geometry.box);
    cube.mMatrix = glm.mat4.create();
    glm.quat.rotateY(rot, rot, -1.2);
    glm.mat4.fromRotationTranslationScale(cube.mMatrix, rot, [-1, -2.5, -1.4], [0.7, 0.4, 0.4]);
    cube.material = { "color": [Math.random(), Math.random(), Math.random()] };
    sceneObjects.push(cube);

    cube = visualObject(gl, geometry.box);
    cube.mMatrix = glm.mat4.create();
    glm.quat.rotateY(rot, rot, -0.7);
    glm.mat4.fromRotationTranslationScale(cube.mMatrix, rot, [1, -2.5, 1], [0.3, 0.45, 0.5]);
    cube.material = { "color": [Math.random(), Math.random(), Math.random()] };
    sceneObjects.push(cube);

    cube = visualObject(gl, geometry.box);
    cube.mMatrix = glm.mat4.create();
    glm.quat.rotateY(rot, rot, 2.4);
    glm.mat4.fromRotationTranslationScale(cube.mMatrix, rot, [-0.5, -2.5, 1], [0.6, 0.3, 0.8]);
    cube.material = { "color": [Math.random(), Math.random(), Math.random()] };
    sceneObjects.push(cube);

    let screenSquare = visualObject(gl, new Float32Array([
        // x, y, z          // normal           // u, v
        -1.0, -1.0, 1.0,    0.0, 0.0, 1.0,      0.0, 0.0,
        1.0, -1.0, 1.0,     0.0, 0.0, 1.0,      1.0, 0.0,
        1.0, 1.0, 1.0,      0.0, 0.0, 1.0,      1.0, 1.0,

        1.0, 1.0, 1.0,      0.0, 0.0, 1.0,      1.0, 1.0,
        -1.0, 1.0, 1.0,     0.0, 0.0, 1.0,      0.0, 1.0,
        -1.0, -1.0, 1.0,    0.0, 0.0, 1.0,      0.0, 0.0
    ]));

    // Matrises:
    let mProjMat = glm.mat4.create();
    glm.mat4.perspective(mProjMat, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100.0);

    // Create a framebuffer
    const snowyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, snowyTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, snowyTexture, 0);
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE)
        alert("Framebuffer not created successfully with error: " + status);

    timer = Date.now() - startTimer;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Draw a picture
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(snowyShader.program);
    gl.bindVertexArray(screenSquare.VAO);
    snowyShader.setUniforms({
        time: timer / 1000
    });
    gl.drawArrays(gl.TRIANGLES, 0, screenSquare.vertexCount);
    // gl.deleteFramebuffer(fb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    render();

    var incNumber = 0.0;

    function render()
    {
        const deltaTime = ((Date.now() - startTimer) - timer) / 1000;
        timer = Date.now() - startTimer;

        incNumber += 0.01;
        window.requestAnimationFrame(render);

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.7, 0.0, 0.0, 1.0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let radius = -10;
        let circlePoint = glm.vec3.create();
        let camerapos = [Math.cos(incNumber) * radius, 0, Math.sin(incNumber) * radius];
        glm.vec3.set(circlePoint, camerapos[0], camerapos[1], camerapos[2]);

        var viewMatrix = glm.mat4.create();
        glm.mat4.lookAt(viewMatrix, circlePoint, [0, 0, 0], [0, 1, 0]);


        sceneObjects.forEach((visObj, index) => {
            gl.useProgram(phongShader.program);
            gl.bindVertexArray(visObj.VAO);

            phongShader.setUniforms({
                camerapos: camerapos,
                material: {
                    color: visObj.material.color
                },
                mMatrix: visObj.mMatrix,
                viewMatrix: viewMatrix,
                mProjMat: mProjMat
            });

            gl.drawArrays(gl.TRIANGLES, 0, visObj.vertexCount);
        });

        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(HUDShader.program);
        gl.bindVertexArray(screenSquare.VAO)
        HUDShader.setUniforms({
            time: timer / 1000,
            texture: snowyTexture
        });
        gl.drawArrays(gl.TRIANGLES, 0, screenSquare.vertexCount);
    }
}



window.onload = main;
