/* Indexed link meshes in DH frames. Rendering only, no collision inference. */
import {mul, rigid} from './kinematics.js';

export function validateVisual(visual, robotHash) {
  if (visual.schema !== 'six-r-visual-v1' || visual.units !== 'mm' ||
      visual.robot_sha256 !== robotHash) throw Error('外形模型与机械臂参数身份不匹配');
  if (!Array.isArray(visual.parts) || !visual.parts.length || visual.parts.length > 100) {
    throw Error('外形模型需要 1 到 100 个连杆网格');
  }
  let triangles = 0;
  for (const part of visual.parts) {
    if (!Number.isInteger(part.link_index) || part.link_index < 0 || part.link_index > 6) {
      throw Error('外形 link_index 必须为 0 到 6');
    }
    rigid(part.link_T_mesh);
    if (!Array.isArray(part.vertices_mm) || !part.vertices_mm.length ||
        part.vertices_mm.some(p => p.length !== 3 || !p.every(Number.isFinite))) {
      throw Error('外形顶点格式错误');
    }
    if (!Array.isArray(part.triangles) || !part.triangles.length ||
        part.triangles.some(f => f.length !== 3 || !f.every(i => Number.isInteger(i) && i >= 0 && i < part.vertices_mm.length))) {
      throw Error('外形三角面索引错误');
    }
    const colors = part.colors_rgb || [part.color_rgb || [177, 195, 205]];
    if (part.colors_rgb && colors.length !== part.triangles.length) throw Error('外形颜色数量错误');
    if (colors.some(c => c.length !== 3 || !c.every(v => Number.isFinite(v) && v >= 0 && v <= 255))) throw Error('外形颜色错误');
    triangles += part.triangles.length;
  }
  if (triangles > 500000) throw Error('请将显示网格简化到 500,000 个三角面以内');
  return triangles;
}

function columnMajor(matrix) {
  return new Float32Array(matrix[0].flatMap((_, j) => matrix.map(row => row[j])));
}

export class MeshRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {alpha: true, antialias: true});
    if (!gl) throw Error('浏览器未提供 WebGL，请启用硬件加速后重试');
    this.gl = gl;
    const shader = (type, source) => {
      const result = gl.createShader(type);
      gl.shaderSource(result, source);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(result));
      return result;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec3 position;
      attribute vec3 normal;
      attribute vec3 color;
      uniform mat4 model;
      uniform mat4 projection;
      varying vec3 shade;
      void main() {
        vec3 n = normalize(mat3(model) * normal);
        float light = .36 + .64 * abs(dot(n, normalize(vec3(-.3, -.5, .9))));
        shade = color * light;
        gl_Position = projection * model * vec4(position, 1.0);
      }`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 shade;
      void main() { gl_FragColor = vec4(shade, 1.0); }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    this.program = program;
    this.attributes = ['position', 'normal', 'color'].map(name => gl.getAttribLocation(program, name));
    this.model = gl.getUniformLocation(program, 'model');
    this.projection = gl.getUniformLocation(program, 'projection');
    this.parts = [];
  }

  setVisual(visual) {
    const gl = this.gl;
    for (const part of this.parts) gl.deleteBuffer(part.buffer);
    this.parts = [];
    if (!visual) return;
    for (const part of visual.parts) {
      const data = new Float32Array(part.triangles.length * 27);
      let offset = 0;
      part.triangles.forEach((face, i) => {
        const [a, b, c] = face.map(index => part.vertices_mm[index]);
        const u = b.map((v, j) => v - a[j]), v = c.map((value, j) => value - a[j]);
        const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
        const length = Math.hypot(...n) || 1;
        const color = part.colors_rgb?.[i] || part.color_rgb || [177, 195, 205];
        for (const point of [a, b, c]) {
          data.set([...point, ...n.map(x => x/length), ...color.map(x => x/255)], offset);
          offset += 9;
        }
      });
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      this.parts.push({buffer, count: part.triangles.length*3, link: part.link_index, transform: part.link_T_mesh});
    }
  }

  draw(chain, projection, width, height) {
    const gl = this.gl;
    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.projection, false, columnMajor(projection));
    for (const part of this.parts) {
      gl.bindBuffer(gl.ARRAY_BUFFER, part.buffer);
      this.attributes.forEach((location, i) => {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, i*12);
      });
      gl.uniformMatrix4fv(this.model, false, columnMajor(mul(chain[part.link], part.transform)));
      gl.drawArrays(gl.TRIANGLES, 0, part.count);
    }
  }
}
