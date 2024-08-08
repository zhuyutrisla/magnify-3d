import * as THREE from 'three';
import MagnifyingShaderFrag from './shaders/MagnifyingShaderFrag.glsl';
import MagnifyingShaderVert from './shaders/MagnifyingShaderVert.glsl';
import FXAAShaderFrag from './shaders/FXAAShaderFrag.glsl';
import FXAAShaderVert from './shaders/FXAAShaderVert.glsl';

export default class Magnify3d {
    constructor() {
        this.magnifyMaterial = new THREE.ShaderMaterial({
            vertexShader: MagnifyingShaderVert,
            fragmentShader: MagnifyingShaderFrag,
            uniforms: {
                "zoomedTexture": { type: "t" },
                "originalTexture": { type: "t" },
                'pos': { type: 'v2' },
                'outlineColor': { type: 'v3' },
                'mag_resolution': { type: 'v2' },
                'resolution': { type: 'v2' },
                'zoom': { type: 'f' },
                'radius': { type: 'f' },
                'outlineThickness': { type: 'f' },
                'exp': { type: 'f' }
            }
        });

        this.magnifyMaterial.transparent = true; // Needed if inputBuffer is undefined.

        this.magnifyScene = this.createScene(this.magnifyMaterial);

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Size is not really matter here. It gets updated inside `render`.
        this.zoomTarget = new THREE.WebGLRenderTarget(0, 0);
        
        // Antialiasing shader
        this.fxaaMaterial = new THREE.ShaderMaterial({
            vertexShader: FXAAShaderVert,
            fragmentShader: FXAAShaderFrag,
            uniforms: {
                'tDiffuse':   { type: 't' },
                'resolution': { type: 'v2' }
            }
        });

        this.fxaaMaterial.transparent = true; // Needed if inputBuffer is undefined.
        this.fxaaScene = this.createScene(this.fxaaMaterial);

        this.fxaaTarget = new THREE.WebGLRenderTarget(0, 0);

        this.outlineColor = new THREE.Color();
    }

    createScene(material) {
        const quad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), material );

        const scene = new THREE.Scene();
        scene.add(quad);

        return scene;
    }

    render({    
                renderer,
                renderSceneCB,
                pos = null,
                zoom = 2.0,
                exp = 35.0,
                radius = 100.0,
                outlineColor = 0xCCCCCC,
                outlineThickness = 8.0,
                antialias = true,
                inputBuffer = undefined,
                outputBuffer = undefined
            }) {

        if (!renderer) {
            console.warn('Magnify-3d: No renderer attached!');
            return;
        }
        
        if (!pos) {
             // No pos - Just render original scene.
             renderSceneCB(outputBuffer);
            return;
        }

        const pixelRatio = renderer.getPixelRatio();
        pos = { x: pos.x * pixelRatio, y: pos.y * pixelRatio };

        let { width, height } = renderer.getSize(new THREE.Vector2());

        width *= pixelRatio;
        height *= pixelRatio;

        const maxViewportWidth = renderer.getContext().getParameter(renderer.getContext().MAX_VIEWPORT_DIMS)[0];
        const maxViewportHeight = renderer.getContext().getParameter(renderer.getContext().MAX_VIEWPORT_DIMS)[1];

        let resWidth = width;
        let resHeight = height;
        if (width * zoom > maxViewportWidth) {
            resWidth = width * (width * zoom / maxViewportWidth);
            resHeight = height * (width * zoom / maxViewportWidth);
        }

        // Set shader uniforms.
        this.magnifyMaterial.uniforms['zoomedTexture'].value = this.zoomTarget.texture;
        this.magnifyMaterial.uniforms['originalTexture'].value = (inputBuffer && inputBuffer.texture) || inputBuffer;
        this.magnifyMaterial.uniforms['pos'].value = pos;
        this.magnifyMaterial.uniforms['outlineColor'].value = this.outlineColor.set(outlineColor);
        this.magnifyMaterial.uniforms['mag_resolution'].value = { x: resWidth, y: resHeight };
        this.magnifyMaterial.uniforms['resolution'].value = { x: width, y: height };
        this.magnifyMaterial.uniforms['zoom'].value = zoom;
        this.magnifyMaterial.uniforms['radius'].value = radius * pixelRatio;
        this.magnifyMaterial.uniforms['outlineThickness'].value = outlineThickness * pixelRatio;
        this.magnifyMaterial.uniforms['exp'].value = exp;

        // Make viewport centered according to pos.
        const zoomedViewport = [
            -pos.x * (zoom - 1) * width / resWidth,
            -pos.y * (zoom - 1) * height / resHeight,
            width * width / resWidth * zoom,
            height * height / resHeight * zoom
        ];

        this.zoomTarget.width = width;
        this.zoomTarget.height = height;
        this.zoomTarget.viewport.set(...zoomedViewport);
        
        const autoClearBackup = renderer.autoClear;
        renderer.autoClear = true; // Make sure autoClear is set.

        renderSceneCB(this.zoomTarget);

        if (antialias) {
            this.fxaaMaterial.uniforms['tDiffuse'].value = this.fxaaTarget.texture;
            this.fxaaMaterial.uniforms['resolution'].value = { x: 1 / width, y: 1 / height };

            this.fxaaTarget.setSize(width, height);
            renderer.setRenderTarget(this.fxaaTarget);
            renderer.render(this.magnifyScene, this.camera); // Render magnify pass to fxaaTarget.
            renderer.setRenderTarget(null);
            renderer.render(this.fxaaScene, this.camera); // Render final pass to output buffer.
        } else {
            renderer.setRenderTarget(null);
            renderer.render(this.magnifyScene, this.camera); // Render magnify pass to outputBuffer.
        }

        renderer.autoClear = autoClearBackup;
    }
};
