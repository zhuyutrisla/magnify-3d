import * as THREE from 'three';
import * as dat from 'dat.gui';
import Magnify3d from '../src/Magnify3d';
import { TeapotGeometry } from './TeapotGeometry';

// FPS monitor
javascript:(function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='//mrdoob.github.io/stats.js/build/stats.min.js';document.head.appendChild(script);})()

let camera, scene, renderer, defaultTarget, boxMesh1, boxMesh2;
let magnify3d, params, gui;
let shiftDown, ctrlDown;

const MIN_ZOOM = 1;
const MAX_ZOOM = 15;
const MIN_EXP = 1;
const MAX_EXP = 100;
const MIN_RADIUS = 10;
const MAX_RADIUS = 500;
const MIN_OUTLINE_THICKNESS = 0;
const MAX_OUTLINE_THICKNESS = 50;

function initScene() {
    scene = new THREE.Scene();

    const texture = new THREE.TextureLoader().load( 'res/checkerboard.png');

    const checkerMaterial = new THREE.MeshBasicMaterial( { map: texture } );
    const normalMaterial = new THREE.MeshNormalMaterial();

    const boxGeometry = new THREE.BoxGeometry(20, 20, 20);
    boxMesh1 = new THREE.Mesh(boxGeometry, checkerMaterial);
    boxMesh1.position.x = 50;
    scene.add(boxMesh1);

    boxMesh2 = new THREE.Mesh(boxGeometry, checkerMaterial);
    boxMesh2.position.x = -50;
    scene.add(boxMesh2);

    const boxMesh3 = new THREE.Mesh(boxGeometry, normalMaterial);
    boxMesh3.position.x = 100;
    scene.add(boxMesh3);

    const boxMesh4 = new THREE.Mesh(boxGeometry, normalMaterial);
    boxMesh4.position.x = -100;
    scene.add(boxMesh4);

    const sphereGeometry = new THREE.SphereGeometry(10, 64, 64);

    const sphereMesh = new THREE.Mesh(sphereGeometry, normalMaterial);
    scene.add(sphereMesh);

    const teapotGeometry = new TeapotGeometry(10, 32);
    const teapotMesh1 = new THREE.Mesh(teapotGeometry, normalMaterial);
    teapotMesh1.position.y = 50;
    scene.add(teapotMesh1);

    const teapotMesh2 = new THREE.Mesh(teapotGeometry, normalMaterial);
    teapotMesh2.position.y = -50;
    scene.add(teapotMesh2);
}

function initCamera() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0.0, 40.0, 250.0);
    camera.lookAt(0.0, 0.0, 0.0);
}

function initRenderer() {
    const pixelRatio = window.devicePixelRatio;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

    renderer.setPixelRatio( pixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight);

    const container = document.createElement('div');
    container.appendChild(renderer.domElement);
    document.body.appendChild(container);

    defaultTarget = new THREE.WebGLRenderTarget(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio); 
}

function initEventListeners() {
    document.addEventListener('mousemove', (e) => {
        params.mouse = new THREE.Vector2(e.clientX, window.innerHeight - e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        params.mouse = new THREE.Vector2(e.pageX, window.innerHeight - e.pageY);
        e.preventDefault();
        e.stopPropagation();
    });

    window.addEventListener('resize', (e) => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.clientWidth = window.innerWidth;
        camera.clientHeight = window.innerHeight;
        camera.updateProjectionMatrix();
    });

    function onMouseWheel(e) {
        e.preventDefault();
        const delta = (e.wheelDelta && e.wheelDelta / 40) || -e.detail;

        if (shiftDown) {
            params.zoom = Math.min(Math.max(MIN_ZOOM, params.zoom + (delta / 10)), MAX_ZOOM);
        } else if (ctrlDown) {
            params.exp = Math.min(Math.max(MIN_EXP, params.exp + delta), MAX_EXP);
        } else {
            params.radius = Math.min(Math.max(MIN_RADIUS, params.radius + delta), MAX_RADIUS);
        }

        gui.updateDisplay();
    }

    window.addEventListener( 'mousewheel',     onMouseWheel );
    window.addEventListener( 'DOMMouseScroll', onMouseWheel ); // firefox

    document.addEventListener('keydown', (e) => {
        const key = e.keyCode;
        switch (key) {
            case 16:
                shiftDown = true;
                break;
            case 17:
                ctrlDown = true;
                break;    
            default:
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.keyCode;
        switch (key) {
            case 16:
                shiftDown = false;
                break;
            case 17:
                ctrlDown = false;
                break;    
            default:
                break;
        }
    });
}

function initGUI() {
    params = {
        zoom: 2.0,
        exp: 30.0,
        radius: 110.0,
        outlineThickness: 4.0,
        outlineColor: 0x555555
    }

    gui = new dat.GUI();
    gui.add(params, 'radius', MIN_RADIUS, MAX_RADIUS);
    gui.add(params, 'zoom', MIN_ZOOM, MAX_ZOOM);
    gui.add(params, 'exp', MIN_EXP, MAX_EXP);
    gui.add(params, 'outlineThickness', MIN_OUTLINE_THICKNESS, MAX_OUTLINE_THICKNESS);
    gui.addColor(params, 'outlineColor');
}

function init() {
    initScene();
    initCamera();
    initRenderer();
    initEventListeners();
    initGUI();

    magnify3d = new Magnify3d();
}

function renderSceneToTarget(tgt) {
    if (tgt) {
        renderer.setRenderTarget(tgt);
    } else {
        renderer.setRenderTarget(null);
    }
    renderer.render(scene, camera);
}

function render() {
    renderSceneToTarget(defaultTarget); // Render original scene to target / screen (depends on defaultTarget).
    
    magnify3d.render({
        renderer,
        renderSceneCB: renderSceneToTarget,
        pos: params.mouse,
        zoom: params.zoom,
        exp: params.exp,
        radius: params.radius,
        outlineThickness: params.outlineThickness,
        outlineColor: params.outlineColor,
        antialias: true,
        inputBuffer: defaultTarget,
        outputBuffer: undefined
    });
}

function animate() {
    requestAnimationFrame(animate);

    boxMesh1.rotation.y += 0.01;
    boxMesh2.rotation.y -= 0.01;

    render();
}

init();
animate();
