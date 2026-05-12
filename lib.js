
async function setupCB(canvas) {

    if (!navigator.gpu) {
        alert("WebGPU is not supported in your browser.");
        return;
    }

    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("canvas must be a HTMLCanvasElement");
    }

    let values = {};

    function setDefaultValues() {
        values = {
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
    }

    setDefaultValues();

    const context = canvas.getContext("webgpu");
        
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    device.lost.then(() => {
        alert("Lost contact to your GPU. Please reload this page, and if neccessary, restart your browser. In rare cases, if your screen keeps flickering or other issues occur, you may need to reboot fully.");
    });

    const format = "rgba8unorm";

    const shaderText = await (await fetch("main.wgsl")).text();
    const shaderModule = device.createShaderModule({ code: shaderText });
    
    const lanczosShaderText = await (await fetch("lanczos.wgsl")).text();
    const lanczosShaderModule = device.createShaderModule({ code: lanczosShaderText });

    const pipeline = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({ bindGroupLayouts: [
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: {}
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

    const pipelineFloat16 = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({ bindGroupLayouts: [
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: {}
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
            targets: [{ 
                format: "rgba16float" 
            }]
        },
        primitive: {
            topology: "triangle-strip",
        }
    });

    const lanczosPipelineH = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({ bindGroupLayouts: [
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: {}
                    }
                ]
            })
        ]}),
        vertex: {
            module: lanczosShaderModule,
            entryPoint: "vertex"
        },
        fragment: {
            module: lanczosShaderModule,
            entryPoint: "fragment",
            targets: [{
                format: "rgba16float"
            }]
        },
        primitive: {
            topology: "triangle-strip",
        }
    });

    const lanczosPipelineV = await device.createRenderPipelineAsync({ // stay in rgba16float for the H pass, for the V pass (final) convert to uint 
        layout: device.createPipelineLayout({ bindGroupLayouts: [
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                        buffer: {}
                    }
                ]
            })
        ]}),
        vertex: {
            module: lanczosShaderModule,
            entryPoint: "vertex"
        },
        fragment: {
            module: lanczosShaderModule,
            entryPoint: "fragment",
            targets: [{
                format
            }]
        },
        primitive: {
            topology: "triangle-strip",
        }
    });

    const lanczosSampler = device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest"
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
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const lanczosUniformBuffer = device.createBuffer({
        size: Math.ceil((
            Uint32Array.BYTES_PER_ELEMENT // isHPass: u32
        ) / 8) * 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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

    const getUniformBuffer = size => {

        const arrayBuffer = new ArrayBuffer(uniformBuffer.size);

        new Float32Array(arrayBuffer, 0).set([
            size[0],
            size[1],
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

        return arrayBuffer;

    }

    const drawToCanvas = () => {

        device.queue.writeBuffer(uniformBuffer, 0, getUniformBuffer([ canvas.clientWidth, canvas.clientHeight ]));

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

    const renderHighQualityExport = async (size, ssaa, chunked, chunkSize) => {

        function drawToTexture(texture, size, center, zoom, useFloat16Pipeline) { 

            const arrayBuffer = getUniformBuffer(size);

            new Float32Array(arrayBuffer).set([ 
                center[0],
                center[1],
                zoom
            ], 2);

            device.queue.writeBuffer(uniformBuffer, 0, arrayBuffer);

            const encoder = device.createCommandEncoder();
            const renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: texture.createView(),
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 0],
                    storeOp: "store"
                }]
            });

            renderPass.setPipeline(useFloat16Pipeline ? pipelineFloat16 : pipeline);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.draw(4);
            renderPass.end();

            device.queue.submit([ encoder.finish() ]);

        }

        function downscaleLanczos2x(texture) {

            const lanczosIntermediateTexture = device.createTexture({
                size: [ Math.floor(texture.width / 2), texture.height ],
                format: "rgba16float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            });

            const lanczosFinalTexture = device.createTexture({
                size: [ Math.floor(texture.width / 2), Math.floor(texture.height / 2) ],
                format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            });

            // --- h pass ---

            let arrayBuffer = new ArrayBuffer(lanczosUniformBuffer.size);
            new Uint32Array(arrayBuffer, 0 * Uint32Array.BYTES_PER_ELEMENT).set([
                1 // isHPass
            ]);
        
            let lanczosBindGroup = device.createBindGroup({ // re-doing this each time definitely isn't the best solution, but like, what if the input texture size changes
                layout: lanczosPipelineH.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: texture.createView()
                    },
                    {
                        binding: 1,
                        resource: lanczosSampler
                    },
                    {
                        binding: 2,
                        resource: lanczosUniformBuffer
                    }
                ]
            });

            device.queue.writeBuffer(lanczosUniformBuffer, 0, arrayBuffer);

            let encoder = device.createCommandEncoder();
            let renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: lanczosIntermediateTexture.createView(),
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });

            renderPass.setPipeline(lanczosPipelineH);
            renderPass.setBindGroup(0, lanczosBindGroup);
            renderPass.draw(4);
            renderPass.end();

            device.queue.submit([ encoder.finish() ]);

            // --- v pass ---
            
            arrayBuffer = new ArrayBuffer(lanczosUniformBuffer.size);
            new Uint32Array(arrayBuffer, 0 * Uint32Array.BYTES_PER_ELEMENT).set([
                0 // isHPass
            ]);
        
            lanczosBindGroup = device.createBindGroup({ // re-doing this each time definitely isn't the best solution, but like, what if the input texture size changes
                layout: lanczosPipelineV.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: lanczosIntermediateTexture.createView()
                    },
                    {
                        binding: 1,
                        resource: lanczosSampler
                    },
                    {
                        binding: 2,
                        resource: lanczosUniformBuffer
                    }
                ]
            });

            device.queue.writeBuffer(lanczosUniformBuffer, 0, arrayBuffer);

            encoder = device.createCommandEncoder();
            renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: lanczosFinalTexture.createView(),
                    loadOp: "clear",
                    storeOp: "store"
                }]
            });

            renderPass.setPipeline(lanczosPipelineV);
            renderPass.setBindGroup(0, lanczosBindGroup);
            renderPass.draw(4);
            renderPass.end();

            device.queue.submit([ encoder.finish() ]);

            return lanczosFinalTexture;

        }

        function draw2xSSAA(size, center, zoom) {

            const bigTexture = device.createTexture({
                size: [ size[0] * 2, size[1] * 2 ],
                format: "rgba16float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
            });

            drawToTexture(bigTexture, [ size[0] * 2, size[1] * 2 ], center, zoom, true);
            return downscaleLanczos2x(bigTexture);

        }

        async function gpuTextureToUint8Array(texture, size) { // TODO note in ui that if width is multiple of 64 (if chunked, then chunk width!) things may be a bit faster

            const unpaddedBytesPerRow = size[0] * 4;
            const paddedBytesPerRow = Math.ceil(unpaddedBytesPerRow / 256) * 256;

            const buffer = device.createBuffer({
                size: paddedBytesPerRow * size[1] * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            const encoder = device.createCommandEncoder();

            encoder.copyTextureToBuffer(
                {
                    texture
                },
                {
                    buffer,
                    bytesPerRow: paddedBytesPerRow,
                    rowsPerImage: size[1]
                },
                {
                    width: size[0],
                    height: size[1],
                    depthOrArrayLayers: 1
                }
            );
   
            device.queue.submit([ encoder.finish() ]);

            await buffer.mapAsync(GPUMapMode.READ);

            const uint8 = new Uint8Array(buffer.getMappedRange());

            const withoutPadding = new Uint8Array(size[0] * size[1] * 4);

            for (let y = 0; y < size[1]; y++) {
                const srcOffset = y * paddedBytesPerRow;
                const dstOffset = y * size[0] * 4;

                withoutPadding.set(
                    uint8.subarray(
                        srcOffset,
                        srcOffset + size[0] * 4
                    ),
                    dstOffset
                );
            }

            buffer.unmap();

            return withoutPadding;

        }

        // --- render and export ---

        if (!chunked) {
            let texture;
            if (ssaa) {
                texture = draw2xSSAA(size, values.center, values.zoom);
            } else {
                texture = device.createTexture({
                    size,
                    format,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
                });
                drawToTexture(texture, size, values.center, values.zoom);
            }
            
            const uint8 = await gpuTextureToUint8Array(texture, size);
            return new ImageData(
                new Uint8ClampedArray(uint8),
                size[0],
                size[1]
            );
        } else {
            // TODO chunked rendering
        }

    };

    return {

        drawToCanvas,
        setDefaultValues,
        renderExport: renderHighQualityExport,

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
        setSkeleton: skeleton => { if (typeof skeleton !== "boolean") { throw new Error("skeleton must be a boolean"); } values.skeleton = skeleton; },
        setSkeletonClampFix: skeletonClampFix => { if (typeof skeletonClampFix !== "boolean") { throw new Error("skeletonClampFix must be a boolean"); } values.skeletonClampFix = skeletonClampFix; },
        
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