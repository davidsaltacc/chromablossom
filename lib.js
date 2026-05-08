
async function setupCB(canvas) {

    if (!navigator.gpu) {
        alert("WebGPU is not supported in your browser.");
        return;
    }

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("canvas must be a HTMLCanvasElement");
    }

    const values = {
        a: 0.5,
        b: 0.5,
        c: 8,
        d: 4,
        e: 1,
        f: 1,
        g: 1,
        h: 0,
        i: 0,
        j: 0,
        maxIterations: 20,
        sampleCount: 20,
        radius: 1000,
        center: [ 0, 0 ],
        zoom: 1 / 2.5,
        skeleton: false,
        skeletonClampFix: true
    };

    const context = canvas.getContext("webgpu");
        
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    device.lost.then(() => {
        alert("Lost contact to your GPU. Please reload this page, and if neccessary, restart your browser. In rare cases, if your screen keeps flickering or other issues occur, you may need to reboot fully.");
    });

    const format = navigator.gpu.getPreferredCanvasFormat();

    const shaderText = await (await fetch("shader.wgsl")).text();
    const shaderModule = device.createShaderModule({ code: shaderText });

    const pipeline = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({ bindGroupLayouts: [
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: {},
                    }
                ]
            })
        ]}),
        vertex: {
            module: shaderModule,
            entryPoint: "vertex",
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment",
            targets: [{ format }],
        },
        primitive: {
            topology: "triangle-strip",
        }
    });

    const uniformBuffer = device.createBuffer({
        size: Math.ceil((
            2 * Float32Array.BYTES_PER_ELEMENT + // canvasDimensions: vec2<f32>
            2 * Float32Array.BYTES_PER_ELEMENT + // center: vec2<f32>
            Float32Array.BYTES_PER_ELEMENT     + // a: f32
            Float32Array.BYTES_PER_ELEMENT     + // b: f32
            Float32Array.BYTES_PER_ELEMENT     + // c: f32
            Float32Array.BYTES_PER_ELEMENT     + // d: f32
            Float32Array.BYTES_PER_ELEMENT     + // e: f32
            Float32Array.BYTES_PER_ELEMENT     + // f: f32
            Float32Array.BYTES_PER_ELEMENT     + // g: f32
            Float32Array.BYTES_PER_ELEMENT     + // h: f32
            Float32Array.BYTES_PER_ELEMENT     + // i: f32
            Float32Array.BYTES_PER_ELEMENT     + // j: f32
            Float32Array.BYTES_PER_ELEMENT     + // k: f32
            Uint32Array.BYTES_PER_ELEMENT      + // maxIterations: u32
            Uint32Array.BYTES_PER_ELEMENT      + // radius: u32
            Uint32Array.BYTES_PER_ELEMENT      + // sampleCount: u32
            Uint32Array.BYTES_PER_ELEMENT        // flags: u32
        ) / 8) * 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer
                }
            }
        ]
    });

    context.configure({
        device,
        format,
        alphaMode: "opaque",
    });

    const drawToCanvas = () => {

        const arrayBuffer = new ArrayBuffer(uniformBuffer.size);

        new Float32Array(arrayBuffer, 0).set([
            canvas.clientWidth, 
            canvas.clientHeight,
            values.center[0],
            values.center[1],
            values.zoom,
            values.a, 
            values.b, 
            values.c, 
            values.d,
            values.e,
            values.f, 
            values.g, 
            values.h,
            values.i, 
            values.j
        ]);

        new Uint32Array(arrayBuffer, 15 * Float32Array.BYTES_PER_ELEMENT).set([
            values.maxIterations,
            values.radius,
            values.sampleCount,
            (
                ((values.skeleton ? 1 : 0) << 1) | 
                (values.skeletonClampFix ? 1 : 0)
            )
        ]);

        device.queue.writeBuffer(uniformBuffer, 0, arrayBuffer);

        const encoder = device.createCommandEncoder();
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: [0, 0, 0, 0],
                storeOp: "store"
            }]
        });

        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(4);
        renderPass.end();

        device.queue.submit([ encoder.finish() ]);

    }

    return {

        drawToCanvas,

        setCenter: center => { if (!(center instanceof Array) || center.length !== 2 || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) { throw new Error("center must be an array of two finite values"); } values.center = center; },
        setZoom: zoom => { if (!Number.isFinite(zoom)) { throw new Error("zoom must be a finite number"); } values.zoom = zoom; },
        setA: a => { if (!Number.isFinite(a)) { throw new Error("a must be a finite number"); } values.a = a; },
        setB: b => { if (!Number.isFinite(b)) { throw new Error("b must be a finite number"); } values.b = b; },
        setC: c => { if (!Number.isFinite(c)) { throw new Error("c must be a finite number"); } values.c = c; },
        setD: d => { if (!Number.isFinite(d)) { throw new Error("d must be a finite number"); } values.d = d; },
        setE: e => { if (!Number.isFinite(e)) { throw new Error("e must be a finite number"); } values.e = e; },
        setF: f => { if (!Number.isFinite(f)) { throw new Error("f must be a finite number"); } values.f = f; },
        setG: g => { if (!Number.isFinite(g)) { throw new Error("g must be a finite number"); } values.g = g; },
        setH: h => { if (!Number.isFinite(h)) { throw new Error("h must be a finite number"); } values.h = h; },
        setI: i => { if (!Number.isFinite(i)) { throw new Error("i must be a finite number"); } values.i = i; },
        setJ: j => { if (!Number.isFinite(j)) { throw new Error("j must be a finite number"); } values.j = j; },
        setMaxIterations: maxIterations => { if (!Number.isFinite(maxIterations) || (Math.floor(maxIterations) !== maxIterations) || (maxIterations < 0)) { throw new Error("maxIterations must be a non-negative whole finite number"); } values.maxIterations = maxIterations; },
        setSampleCount: sampleCount => { if (!Number.isFinite(sampleCount) || (Math.floor(sampleCount) !== sampleCount) || (sampleCount < 1)) { throw new Error("sampleCount must be a positive whole finite number"); } values.sampleCount = sampleCount; },
        setRadius: radius => { if (!Number.isFinite(radius) || (Math.floor(radius) !== radius)) { throw new Error("radius must be a whole finite number"); } values.radius = radius; },
        setSkeleton: skeleton => { if (!(skeleton instanceof Boolean)) { throw new Error("skeleton must be a boolean"); } values.skeleton = skeleton; },
        setSkeletonClampFix: skeletonClampFix => { if (!(skeletonClampFix instanceof Boolean)) { throw new Error("skeletonClampFix must be a boolean"); } values.skeletonClampFix = skeletonClampFix; },
        
        getCenter: () => { return values.center; },
        getZoom: () => { return values.zoom; },
        getA: () => { return values.a; },
        getB: () => { return values.b; },
        getC: () => { return values.c; },
        getD: () => { return values.d; },
        getE: () => { return values.e; },
        getF: () => { return values.f; },
        getG: () => { return values.g; },
        getH: () => { return values.h; },
        getI: () => { return values.i; },
        getJ: () => { return values.j; },
        getMaxIterations: () => { return values.maxIterations; },
        getSampleCount: () => { return values.sampleCount; },
        getRadius: () => { return values.radius; },
        getSkeleton: () => { return values.skeleton; },
        getSkeletonClampFix: () => { return values.skeletonClampFix; }

    };

}