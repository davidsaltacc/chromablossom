
@group(0) @binding(0) var srcTexture: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
	var positions: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
		vec2<f32>(1.0, -1.0),
		vec2<f32>(1.0, 1.0),
		vec2<f32>(-1.0, -1.0),
		vec2<f32>(-1.0, 1.0),
	);
    return vec4f(positions[vertexIndex], 0.0, 1.0);
}

@fragment
fn fragment(@builtin(position) position : vec4f) -> @location(0) vec4f {

    var outSize = vec2f(textureDimensions(srcTexture)) * 0.5;

    var uv = position.xy / outSize;

    return textureSample(srcTexture, srcSampler, uv); // TODO actual lanczos implementation

}