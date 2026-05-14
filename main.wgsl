
struct VertexOutput {
	@builtin(position) position: vec4<f32>,
	@location(0) fragmentPosition: vec2<f32>
}

struct Uniforms {
	canvasDimensions: vec2<f32>,
	center: vec2<f32>,
	zoom: f32,
	a: f32,
	b: f32,
	c: f32,
	d: f32,
	e: f32,
	f: f32,
	g: f32,
	h: f32,
	i: f32,
	j: f32,
	maxIterations: u32,
    radius: u32,
	sampleCount: u32,
	chunkerPos: vec2<u32>,
	chunkSize: vec2<u32>,
	finalSize: vec2<u32>,
	flags: u32
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

const pi: f32 = 3.1415926535897932;

@vertex
fn vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var output: VertexOutput;
	var positions: array<vec2<f32>, 4> = array<vec2<f32>, 4>(
		vec2<f32>(1.0, -1.0),
		vec2<f32>(1.0, 1.0),
		vec2<f32>(-1.0, -1.0),
		vec2<f32>(-1.0, 1.0),
	);
	let position2d: vec2<f32> = positions[vertexIndex];
	output.position = 0.5 * vec4<f32>(position2d, 0.0, 1.0);
	output.fragmentPosition = position2d;
	return output;
}

fn rand(c: vec2<f32>) -> f32 {
	return fract(sin(dot(c, vec2<f32>(12.9898, 78.233))) * 43758.547);
}

@fragment
fn fragment(input: VertexOutput) -> @location(0) vec4<f32> { 

    var a: f32 = uniforms.a;
	var b: f32 = uniforms.b;
	var c: f32 = uniforms.c;
	var d: f32 = uniforms.d;
	var e: f32 = uniforms.e;
	var f: f32 = uniforms.f;
	var g: f32 = uniforms.g;
	var h: f32 = uniforms.h;
	var i: f32 = uniforms.i;
	var j: f32 = uniforms.j;

	var zoom: f32 = uniforms.zoom;
	var center: vec2<f32> = uniforms.center;
	var iterations: u32 = uniforms.maxIterations;
	var radius: u32 = uniforms.radius;

	var chunked: u32 = (uniforms.flags >> 2) & 1u;
	var skeleton: u32 = (uniforms.flags >> 1) & 1u;
	var skeletonClampFix: u32 = uniforms.flags & 1u;

	var sampleCount: u32 = uniforms.sampleCount;

	var rc: vec2<f32> = input.fragmentPosition;
	var ratio: f32;
	var finalRatio: f32;
	
	if (chunked == 1) {
	 	ratio = f32(uniforms.chunkSize.x) / f32(uniforms.chunkSize.y);
	 	finalRatio = f32(uniforms.finalSize.x) / f32(uniforms.finalSize.y);
	} else {
	 	ratio = f32(uniforms.canvasDimensions.x) / f32(uniforms.canvasDimensions.y);
	}

	var chunkAmountX: f32;
	var chunkAmountY: f32;
	if (chunked == 1) {
		chunkAmountX = f32(uniforms.finalSize.x) / f32(uniforms.chunkSize.x);
		chunkAmountY = f32(uniforms.finalSize.y) / f32(uniforms.chunkSize.y);
		zoom /= f32(max(uniforms.chunkSize.x, uniforms.chunkSize.y)) / f32(min(uniforms.finalSize.x, uniforms.finalSize.y));
	}
	
	if ((ratio > 1 && chunked != 1) || (ratio <= 1 && chunked == 1)) {
		rc.x = rc.x / zoom * ratio;
		rc.y = rc.y / zoom;
	} else {
		rc.x = rc.x / zoom;
		rc.y = rc.y / zoom / ratio;
	}
	
	rc += center;
	
	if (chunked == 1) {
		var offset: vec2<f32> = vec2<f32>(
			 (((f32(uniforms.chunkerPos.x) + f32(uniforms.chunkSize.x) / 2.) / f32(uniforms.finalSize.x)) * 2. - 1.) / uniforms.zoom,
			-(((f32(uniforms.chunkerPos.y) + f32(uniforms.chunkSize.y) / 2.) / f32(uniforms.finalSize.y)) * 2. - 1.) / uniforms.zoom
		);
		if (finalRatio > 1) {
			offset.x *= finalRatio;
		} else {
			offset.y /= finalRatio;
		}
		rc += offset;
	}
    
	var color: vec3<f32> = vec3<f32>(0., 0., 0.);  
	var rr: f32 = 0.; 

	for (var sample: u32 = 0; sample < sampleCount; sample += 1) {
		var pos: vec2<f32> = vec2<f32>(
			rand(rc + f32(sample)),
			rand(1. + rc + f32(sample))
		);
		if (chunked == 1) {
			if (ratio <= 1) {
				pos.x = pos.x / zoom / f32(uniforms.chunkSize.x) * ratio;
				pos.y = pos.y / zoom / f32(uniforms.chunkSize.y);
			} else {
				pos.x = pos.x / zoom / f32(uniforms.chunkSize.x);
				pos.y = pos.y / zoom / f32(uniforms.chunkSize.y) / ratio;
			}
		} else {
			pos = pos / zoom / uniforms.canvasDimensions;
		}
		pos += rc;
		var cx: f32 = pos.x;
		var cy: f32 = -pos.y;
		var cz: f32 = a;
		var cr: f32 = b;
		for (var it: u32 = 0; it < iterations; it++) {
			var fi: f32 = f32(it);
			var r2: f32 = cx * cx + cy * cy + cz * cz;
			if (r2 > f32(radius)) {
				break;
			} 
			var th: f32 = atan2(sqrt(cx * cx + cy * cy + h * (cz * cz)), cz * f);
			var ph: f32 = atan2(cy, cx) * g + cz * i;
			var div: f32 = 1.;
			if (j != 0) {
				div = th * j;
			}
			var r: f32 = cr * pow(r2, e / c) / div;
			cx = r * sin(th * c + fi / d) * cos(ph * c + fi / d) + cx;
			cy = r * sin(th * c + fi / d) * sin(ph * c + fi / d) + cy;
			cz = r * cos(th * c + fi / d) + cz;
			rr = r * r * r * r;
		}
		if (skeletonClampFix == 1) {
			rr = clamp(rr, 0., 1.);
		}
		cx = clamp(cx, 0., 1.);
		cy = clamp(cy, 0., 1.);
		cz = clamp(cz, 0., 1.);
		if (skeleton == 1) {
			color += vec3(rr, rr, rr);
		} else {
			color += vec3(cx, cy, cz);
		}
	}
	
    return vec4<f32>(
		color / f32(sampleCount),
		1.0
	);
}