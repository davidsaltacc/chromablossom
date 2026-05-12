
@group(0) @binding(0) var srcTexture: texture_2d<f32>;
@group(0) @binding(1) var srcSampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

struct Uniforms {
	isHPass: u32
}

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

fn lanczos(s1: f32, s2: f32, s3: f32, s4: f32, s5: f32, s6: f32, s7: f32, s8: f32, s9: f32, s10: f32, s11: f32, s12: f32) -> f32 { // TODO maybe add a toggle for lanczos-3 and lanczos-2? difference may be minor but why not have the option to choose
	return // yes, i learned how to compile these values myself. i'm proud of myself
		(s1 + s12) * 0.02817796919561158 + 
		(s2 + s11) * 0.03922444625319011 + 
		(s3 + s10) * -0.05567972334493269 + 
		(s4 + s9) * -0.08374012663530724 +
		(s5 + s8) * 0.14622567853181295 + 
		(s6 + s7) * 0.4488737026066986;
}

fn lanczos_4(s1: vec4<f32>, s2: vec4<f32>, s3: vec4<f32>, s4: vec4<f32>, s5: vec4<f32>, s6: vec4<f32>, s7: vec4<f32>, s8: vec4<f32>, s9: vec4<f32>, s10: vec4<f32>, s11: vec4<f32>, s12: vec4<f32>) -> vec4<f32> {
	return vec4<f32>(
		lanczos(s1.x, s2.x, s3.x, s4.x, s5.x, s6.x, s7.x, s8.x, s9.x, s10.x, s11.x, s12.x),
		lanczos(s1.y, s2.y, s3.y, s4.y, s5.y, s6.y, s7.y, s8.y, s9.y, s10.y, s11.y, s12.y),
		lanczos(s1.z, s2.z, s3.z, s4.z, s5.z, s6.z, s7.z, s8.z, s9.z, s10.z, s11.z, s12.z),
		lanczos(s1.w, s2.w, s3.w, s4.w, s5.w, s6.w, s7.w, s8.w, s9.w, s10.w, s11.w, s12.w)
	);
}

fn lanczos_h(texture: texture_2d<f32>, textureSampler: sampler, uv: vec2<f32>, step: f32) -> vec4<f32> {
	return lanczos_4(
		textureSample(texture, textureSampler, uv + vec2<f32>(step * -5.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * -4.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * -3.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * -2.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * -1.0, 0.0)),
		textureSample(texture, textureSampler, uv),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 1.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 2.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 3.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 4.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 5.0, 0.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(step * 6.0, 0.0))
	);
}

fn lanczos_v(texture: texture_2d<f32>, textureSampler: sampler, uv: vec2<f32>, step: f32) -> vec4<f32> {
	return lanczos_4(
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * -5.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * -4.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * -3.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * -2.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * -1.0)),
		textureSample(texture, textureSampler, uv),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 1.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 2.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 3.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 4.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 5.0)),
		textureSample(texture, textureSampler, uv + vec2<f32>(0.0, step * 6.0))
	);
}

@fragment
fn fragment(@builtin(position) position: vec4f) -> @location(0) vec4f {

    var outSize = vec2<f32>(textureDimensions(srcTexture));
	if (uniforms.isHPass == 1) {
		outSize.x = outSize.x * 0.5;
	} else {
		outSize.y = outSize.y * 0.5;
	}

    var uv = position.xy / outSize;

	if (uniforms.isHPass == 1) {
		return lanczos_h(srcTexture, srcSampler, uv, 1.0 / outSize.x * 0.5);
	} else {
		return lanczos_v(srcTexture, srcSampler, uv, 1.0 / outSize.y * 0.5);
	}

}