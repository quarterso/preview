(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,82738,e=>{e.v({canvas:"GradientCanvas-module__GR17Kq__canvas",wrap:"GradientCanvas-module__GR17Kq__wrap"})},55339,e=>{"use strict";var t=e.i(15014),r=e.i(37244),a=e.i(82738);let i=`
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`,n=`
precision mediump float;
uniform float u_time;
uniform vec2 u_res;
uniform vec3 u_colors[5];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.06;

  p += 0.22 * vec2(noise(p * 1.4 + t), noise(p * 1.4 - t + 9.1)) - 0.11;
  p.y += 0.06 * sin(p.x * 2.2 + t * 3.0);

  vec3 color = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 center = vec2(
      (0.1 + 0.22 * fi) * aspect + 0.28 * aspect * sin(t * (0.9 + fi * 0.23) + fi * 1.7),
      0.5 + 0.42 * cos(t * (0.7 + fi * 0.19) + fi * 2.3)
    );
    float d = distance(p, center);
    float w = 1.0 / (pow(d, 2.4) + 0.015);
    color += u_colors[i] * w;
    total += w;
  }
  color /= total;
  color += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
`,o=["#1F3BFF","#6050DC","#C9B8FF","#38BDF8","#E340FF"];function c(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(255&t)/255]}function s(e,t,r){let a=e.createShader(t);return a?(e.shaderSource(a,r),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:null):null}e.s(["GradientCanvas",0,function({className:e}){let l=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=l.current;if(!e)return;let t=e.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!t)return;let r=s(t,t.VERTEX_SHADER,i),a=s(t,t.FRAGMENT_SHADER,n),u=t.createProgram();if(!r||!a||!u||(t.attachShader(u,r),t.attachShader(u,a),t.linkProgram(u),!t.getProgramParameter(u,t.LINK_STATUS)))return;t.useProgram(u);let f=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,f),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);let d=t.getAttribLocation(u,"a_pos");t.enableVertexAttribArray(d),t.vertexAttribPointer(d,2,t.FLOAT,!1,0,0);let v=t.getUniformLocation(u,"u_time"),m=t.getUniformLocation(u,"u_res");t.uniform3fv(t.getUniformLocation(u,"u_colors"),new Float32Array(o.flatMap(c)));let h=()=>{let{width:r,height:a}=e.getBoundingClientRect();e.width=Math.max(1,Math.round(.5*r)),e.height=Math.max(1,Math.round(.5*a)),t.viewport(0,0,e.width,e.height),t.uniform2f(m,e.width,e.height)};h();let p=window.matchMedia("(prefers-reduced-motion: reduce)").matches,_=performance.now()-4e4,g=0,A=!0,w=e=>{t.uniform1f(v,(e-_)/1e3),t.drawArrays(t.TRIANGLES,0,3)},b=e=>{w(e),g=A&&!document.hidden?requestAnimationFrame(b):0},F=()=>{p||!A||document.hidden||g||(g=requestAnimationFrame(b))};w(performance.now()),e.dataset.ready="true",F();let x=new ResizeObserver(()=>{h(),w(performance.now())});x.observe(e);let R=new IntersectionObserver(([e])=>{A=e?.isIntersecting??!0,F()});return R.observe(e),document.addEventListener("visibilitychange",F),()=>{cancelAnimationFrame(g),x.disconnect(),R.disconnect(),document.removeEventListener("visibilitychange",F)}},[]),(0,t.jsx)("div",{className:`${a.default.wrap} ${e??""}`,"aria-hidden":"true",children:(0,t.jsx)("canvas",{ref:l,className:a.default.canvas})})}])},73195,e=>{"use strict";var t=e.i(15014),r=e.i(37244);e.s(["Reveal",0,function({children:e,as:a="div",delay:i=0,className:n,id:o}){let c=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let e=c.current;if(!e)return;let t=new IntersectionObserver(e=>{for(let r of e)r.isIntersecting&&(r.target.setAttribute("data-visible","true"),t.unobserve(r.target))},{rootMargin:"0px 0px -10% 0px",threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(a,{ref:c,id:o,"data-reveal":"",className:n,style:i?{"--reveal-delay":`${i}ms`}:void 0,children:e})}])}]);