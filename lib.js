
async function setupCB(canvas) {

    if (!navigator.gpu) {
        alert("WebGPU is not supported in your browser.");
        return;
    }

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
            2 * Float32Array.BYTES_PER_ELEMENT // canvasDimensions: vec2<f32>
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

    const draw = () => {

        const arrayBuffer = new ArrayBuffer(uniformBuffer.size);

        new Float32Array(arrayBuffer, 0).set([
            canvas.clientWidth, 
            canvas.clientHeight
        ]);

        new Uint32Array(arrayBuffer, 2 * Float32Array.BYTES_PER_ELEMENT).set([

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
        draw
    };

}