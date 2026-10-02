(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,82738,e=>{e.v({canvas:"GradientCanvas-module__GR17Kq__canvas",wrap:"GradientCanvas-module__GR17Kq__wrap"})},55339,e=>{"use strict";var t=e.i(15014),n=e.i(37244),a=e.i(82738);let r=`
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`,i=`
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
`,l=["#1F3BFF","#6050DC","#C9B8FF","#38BDF8","#E340FF"];function s(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(255&t)/255]}function o(e,t,n){let a=e.createShader(t);return a?(e.shaderSource(a,n),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:null):null}e.s(["GradientCanvas",0,function({className:e}){let d=(0,n.useRef)(null);return(0,n.useEffect)(()=>{let e=d.current;if(!e)return;let t=e.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!t)return;let n=o(t,t.VERTEX_SHADER,r),a=o(t,t.FRAGMENT_SHADER,i),u=t.createProgram();if(!n||!a||!u||(t.attachShader(u,n),t.attachShader(u,a),t.linkProgram(u),!t.getProgramParameter(u,t.LINK_STATUS)))return;t.useProgram(u);let c=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,c),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);let _=t.getAttribLocation(u,"a_pos");t.enableVertexAttribArray(_),t.vertexAttribPointer(_,2,t.FLOAT,!1,0,0);let m=t.getUniformLocation(u,"u_time"),f=t.getUniformLocation(u,"u_res");t.uniform3fv(t.getUniformLocation(u,"u_colors"),new Float32Array(l.flatMap(s)));let p=()=>{let{width:n,height:a}=e.getBoundingClientRect();e.width=Math.max(1,Math.round(.5*n)),e.height=Math.max(1,Math.round(.5*a)),t.viewport(0,0,e.width,e.height),t.uniform2f(f,e.width,e.height)};p();let h=window.matchMedia("(prefers-reduced-motion: reduce)").matches,P=performance.now()-4e4,v=0,g=!0,b=e=>{t.uniform1f(m,(e-P)/1e3),t.drawArrays(t.TRIANGLES,0,3)},x=e=>{b(e),v=g&&!document.hidden?requestAnimationFrame(x):0},w=()=>{h||!g||document.hidden||v||(v=requestAnimationFrame(x))};b(performance.now()),e.dataset.ready="true",w();let C=new ResizeObserver(()=>{p(),b(performance.now())});C.observe(e);let A=new IntersectionObserver(([e])=>{g=e?.isIntersecting??!0,w()});return A.observe(e),document.addEventListener("visibilitychange",w),()=>{cancelAnimationFrame(v),C.disconnect(),A.disconnect(),document.removeEventListener("visibilitychange",w)}},[]),(0,t.jsx)("div",{className:`${a.default.wrap} ${e??""}`,"aria-hidden":"true",children:(0,t.jsx)("canvas",{ref:d,className:a.default.canvas})})}])},10627,e=>{e.v({blink:"CodePanel-module__QtPePW__blink",caret:"CodePanel-module__QtPePW__caret",chrome:"CodePanel-module__QtPePW__chrome",comment:"CodePanel-module__QtPePW__comment",dots:"CodePanel-module__QtPePW__dots",filename:"CodePanel-module__QtPePW__filename",function:"CodePanel-module__QtPePW__function",gutter:"CodePanel-module__QtPePW__gutter",keyword:"CodePanel-module__QtPePW__keyword",line:"CodePanel-module__QtPePW__line",lineIn:"CodePanel-module__QtPePW__lineIn",number:"CodePanel-module__QtPePW__number",panel:"CodePanel-module__QtPePW__panel",plain:"CodePanel-module__QtPePW__plain",pre:"CodePanel-module__QtPePW__pre",property:"CodePanel-module__QtPePW__property",punct:"CodePanel-module__QtPePW__punct",string:"CodePanel-module__QtPePW__string",tab:"CodePanel-module__QtPePW__tab",tabs:"CodePanel-module__QtPePW__tabs",type:"CodePanel-module__QtPePW__type"})},91826,e=>{"use strict";var t=e.i(15014),n=e.i(37244),a=e.i(89941),r=e.i(10627);e.s(["CodePanel",0,function({files:e,label:i}){let[l,s]=(0,n.useState)(0),[o,d]=function(e={}){let{once:t=!1,threshold:a=.25}=e,r=(0,n.useRef)(null),[i,l]=(0,n.useState)(!1);return(0,n.useEffect)(()=>{let e=r.current;if(!e)return;let n=new IntersectionObserver(([e])=>{e&&(l(e.isIntersecting),e.isIntersecting&&t&&n.disconnect())},{threshold:a});return n.observe(e),()=>n.disconnect()},[t,a]),[r,i]}({once:!0,threshold:.2}),u=e[l]??e[0];if(!u)return null;let c=(0,a.highlight)(u.code,u.language);return(0,t.jsxs)("div",{ref:o,className:r.default.panel,"data-play":d,children:[(0,t.jsxs)("div",{className:r.default.chrome,children:[(0,t.jsxs)("span",{className:r.default.dots,"aria-hidden":"true",children:[(0,t.jsx)("i",{}),(0,t.jsx)("i",{}),(0,t.jsx)("i",{})]}),e.length>1?(0,t.jsx)("div",{className:r.default.tabs,role:"tablist","aria-label":i,children:e.map((e,n)=>(0,t.jsx)("button",{type:"button",role:"tab","aria-selected":n===l,className:r.default.tab,onClick:()=>s(n),children:e.name},e.name))}):(0,t.jsx)("span",{className:r.default.filename,children:u.name})]}),(0,t.jsx)("pre",{className:r.default.pre,"data-scroll":!0,"aria-label":`${i}: ${u.name}`,role:"tabpanel",tabIndex:0,children:(0,t.jsx)("code",{children:c.map((e,n)=>(0,t.jsxs)("span",{className:r.default.line,style:{"--i":n},children:[(0,t.jsx)("span",{className:r.default.gutter,"aria-hidden":"true",children:n+1}),(0,t.jsxs)("span",{children:[e.map((e,n)=>(0,t.jsx)("span",{className:r.default[e.kind],children:e.text},n)),n===c.length-1&&(0,t.jsx)("span",{className:r.default.caret,"aria-hidden":"true"})]})]},n))},u.name)})]})}],91826)},73195,e=>{"use strict";var t=e.i(15014),n=e.i(37244);e.s(["Reveal",0,function({children:e,as:a="div",delay:r=0,className:i,id:l}){let s=(0,n.useRef)(null);return(0,n.useEffect)(()=>{let e=s.current;if(!e)return;let t=new IntersectionObserver(e=>{for(let n of e)n.isIntersecting&&(n.target.setAttribute("data-visible","true"),t.unobserve(n.target))},{rootMargin:"0px 0px -10% 0px",threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(a,{ref:s,id:l,"data-reveal":"",className:i,style:r?{"--reveal-delay":`${r}ms`}:void 0,children:e})}])},89941,e=>{"use strict";let t=new Set(["import","from","const","let","new","await","async","return","switch","case","default","break","throw","if","else","true","false","null"]),n=/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"'`]+)|([\s\S])/g,a=/(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$-]*)|(\s+)|([^\sA-Za-z_$\d"'#]+)|([\s\S])/g,r=/(--[^\n]*)|('(?:[^']|'')*')|(\b\d[\d_.]*\b)|([A-Za-z_][\w]*)|(\s+)|([^\sA-Za-z_\d']+)|([\s\S])/g,i=new Set(["select","from","where","as","and","or","any","create","policy","on","for","using","to","true","false","null"]);e.s(["highlight",0,function(e,l){return e.split("\n").map(e=>(function(e,l){if("bash"===l){let t=[];for(let n of e.matchAll(a)){let[e,a,r,i,l,,s]=n;a?t.push({kind:"comment",text:e}):r?t.push({kind:"string",text:e}):i?t.push({kind:"number",text:e}):l?t.push({kind:t.every(e=>!e.text.trim())?"function":"plain",text:e}):s?t.push({kind:"punct",text:e}):t.push({kind:"plain",text:e})}return t}if("sql"===l){let t=[];for(let n of e.matchAll(r)){let[e,a,r,l,s,,o]=n;a?t.push({kind:"comment",text:e}):r?t.push({kind:"string",text:e}):l?t.push({kind:"number",text:e}):s?t.push({kind:i.has(s.toLowerCase())?"keyword":"plain",text:e}):o?t.push({kind:"punct",text:e}):t.push({kind:"plain",text:e})}return t}if("shell"===l)return e.startsWith("$")?[{kind:"punct",text:"$"},{kind:"function",text:e.slice(1)}]:[{kind:"plain",text:e}];let s=[];for(let a of e.matchAll(n)){let[n,r,i,o,d,,u]=a,c=e.slice((a.index??0)+n.length);r?s.push({kind:"comment",text:n}):i?s.push({kind:"json"===l&&/^\s*:/.test(c)?"property":"string",text:n}):o?s.push({kind:"number",text:n}):d?s.push({kind:t.has(d)?"keyword":/^\s*:/.test(c)&&!/^\s*::/.test(c)?"property":/^\s*\(/.test(c)?"function":/^[A-Z]/.test(d)?"type":"plain",text:n}):u?s.push({kind:"punct",text:n}):s.push({kind:"plain",text:n})}return s})(e,l))}])}]);