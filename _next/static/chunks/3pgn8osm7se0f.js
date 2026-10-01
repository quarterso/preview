(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,82738,e=>{e.v({canvas:"GradientCanvas-module__GR17Kq__canvas",wrap:"GradientCanvas-module__GR17Kq__wrap"})},55339,e=>{"use strict";var t=e.i(15014),i=e.i(37244),a=e.i(82738);let r=`
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
`,o=["#1F3BFF","#6050DC","#C9B8FF","#38BDF8","#E340FF"];function s(e){let t=parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(255&t)/255]}function c(e,t,i){let a=e.createShader(t);return a?(e.shaderSource(a,i),e.compileShader(a),e.getShaderParameter(a,e.COMPILE_STATUS)?a:null):null}e.s(["GradientCanvas",0,function({className:e}){let l=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let e=l.current;if(!e)return;let t=e.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!t)return;let i=c(t,t.VERTEX_SHADER,r),a=c(t,t.FRAGMENT_SHADER,n),d=t.createProgram();if(!i||!a||!d||(t.attachShader(d,i),t.attachShader(d,a),t.linkProgram(d),!t.getProgramParameter(d,t.LINK_STATUS)))return;t.useProgram(d);let u=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,u),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);let m=t.getAttribLocation(d,"a_pos");t.enableVertexAttribArray(m),t.vertexAttribPointer(m,2,t.FLOAT,!1,0,0);let f=t.getUniformLocation(d,"u_time"),_=t.getUniformLocation(d,"u_res");t.uniform3fv(t.getUniformLocation(d,"u_colors"),new Float32Array(o.flatMap(s)));let v=()=>{let{width:i,height:a}=e.getBoundingClientRect();e.width=Math.max(1,Math.round(.5*i)),e.height=Math.max(1,Math.round(.5*a)),t.viewport(0,0,e.width,e.height),t.uniform2f(_,e.width,e.height)};v();let h=window.matchMedia("(prefers-reduced-motion: reduce)").matches,p=performance.now()-4e4,g=0,w=!0,R=e=>{t.uniform1f(f,(e-p)/1e3),t.drawArrays(t.TRIANGLES,0,3)},x=e=>{R(e),g=w&&!document.hidden?requestAnimationFrame(x):0},b=()=>{h||!w||document.hidden||g||(g=requestAnimationFrame(x))};R(performance.now()),e.dataset.ready="true",b();let F=new ResizeObserver(()=>{v(),R(performance.now())});F.observe(e);let N=new IntersectionObserver(([e])=>{w=e?.isIntersecting??!0,b()});return N.observe(e),document.addEventListener("visibilitychange",b),()=>{cancelAnimationFrame(g),F.disconnect(),N.disconnect(),document.removeEventListener("visibilitychange",b)}},[]),(0,t.jsx)("div",{className:`${a.default.wrap} ${e??""}`,"aria-hidden":"true",children:(0,t.jsx)("canvas",{ref:l,className:a.default.canvas})})}])},83819,e=>{e.v({budget:"ReconciliationFlow-module__6KsTKW__budget",caption:"ReconciliationFlow-module__6KsTKW__caption",card:"ReconciliationFlow-module__6KsTKW__card",evidence:"ReconciliationFlow-module__6KsTKW__evidence",head:"ReconciliationFlow-module__6KsTKW__head",index:"ReconciliationFlow-module__6KsTKW__index",meter:"ReconciliationFlow-module__6KsTKW__meter",probe:"ReconciliationFlow-module__6KsTKW__probe",probeBody:"ReconciliationFlow-module__6KsTKW__probeBody",probes:"ReconciliationFlow-module__6KsTKW__probes",result:"ReconciliationFlow-module__6KsTKW__result",strategy:"ReconciliationFlow-module__6KsTKW__strategy",verdict:"ReconciliationFlow-module__6KsTKW__verdict",verdictLabel:"ReconciliationFlow-module__6KsTKW__verdictLabel",verdictNote:"ReconciliationFlow-module__6KsTKW__verdictNote",verdictValue:"ReconciliationFlow-module__6KsTKW__verdictValue"})},93360,e=>{"use strict";var t=e.i(15014),i=e.i(37244),a=e.i(11849),r=e.i(83819);let n=[{strategy:"Replay the idempotency key",result:"Stripe answered 503. No evidence either way",calls:1,outcome:"skip"},{strategy:"Look up by business key",result:"Refund re_3Qx…7Lk found by its action metadata",evidence:"provider_object_exists",calls:2,outcome:"hit"}],o=n.length+1;e.s(["ReconciliationFlow",0,function(){let[e,s]=(0,a.useInView)(),c=(0,a.usePrefersReducedMotion)(),[l,d]=(0,i.useState)(o);(0,i.useEffect)(()=>{let e;if(!s||c)return;let t=0,i=()=>{d(t),t=t>=o+2?0:t+1,e=setTimeout(i,1300)};return e=setTimeout(i,300),()=>clearTimeout(e)},[s,c]);let u=Math.min(l,n.length),m=u>0?n[u-1]?.calls??0:0,f=l>=o;return(0,t.jsxs)("div",{ref:e,className:r.default.card,role:"img","aria-label":"Illustration of reconciliation: an OUTCOME_UNKNOWN refund is checked by lookup strategies within a budget of five provider calls, and confirmed with deterministic evidence.",children:[(0,t.jsxs)("div",{className:r.default.head,children:[(0,t.jsx)("span",{className:"state","data-tone":f?"ok":0===l?"warn":"active",children:f?"CONFIRMED":0===l?"OUTCOME_UNKNOWN":"RECONCILING"}),(0,t.jsxs)("div",{className:r.default.budget,children:[(0,t.jsxs)("span",{children:["Budget ",m," of ",5," calls"]}),(0,t.jsx)("span",{className:r.default.meter,children:Array.from({length:5},(e,i)=>(0,t.jsx)("i",{"data-used":i<m},i))})]})]}),(0,t.jsx)("ol",{className:r.default.probes,children:n.map((e,i)=>(0,t.jsxs)("li",{className:r.default.probe,"data-shown":i<u,"data-outcome":e.outcome,children:[(0,t.jsx)("span",{className:r.default.index,children:i+1}),(0,t.jsxs)("span",{className:r.default.probeBody,children:[(0,t.jsx)("span",{className:r.default.strategy,children:e.strategy}),(0,t.jsx)("span",{className:r.default.result,children:e.result})]}),e.evidence&&(0,t.jsx)("code",{className:r.default.evidence,children:e.evidence})]},e.strategy))}),(0,t.jsxs)("div",{className:r.default.verdict,"data-shown":f,children:[(0,t.jsx)("span",{className:r.default.verdictLabel,children:"Outcome Proof"}),(0,t.jsx)("span",{className:r.default.verdictValue,children:"CONFIRMED · DETERMINISTIC_RECONCILIATION"}),(0,t.jsx)("span",{className:r.default.verdictNote,children:"Retry suppressed. No second refund."})]}),(0,t.jsx)("p",{className:r.default.caption,children:"Illustrative example"})]})}])},73195,e=>{"use strict";var t=e.i(15014),i=e.i(37244);e.s(["Reveal",0,function({children:e,as:a="div",delay:r=0,className:n,id:o}){let s=(0,i.useRef)(null);return(0,i.useEffect)(()=>{let e=s.current;if(!e)return;let t=new IntersectionObserver(e=>{for(let i of e)i.isIntersecting&&(i.target.setAttribute("data-visible","true"),t.unobserve(i.target))},{rootMargin:"0px 0px -10% 0px",threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,t.jsx)(a,{ref:s,id:o,"data-reveal":"",className:n,style:r?{"--reveal-delay":`${r}ms`}:void 0,children:e})}])},11849,e=>{"use strict";var t=e.i(37244);let i="(prefers-reduced-motion: reduce)";function a(e){let t=window.matchMedia(i);return t.addEventListener("change",e),()=>t.removeEventListener("change",e)}e.s(["useInView",0,function(e={}){let{once:i=!1,threshold:a=.25}=e,r=(0,t.useRef)(null),[n,o]=(0,t.useState)(!1);return(0,t.useEffect)(()=>{let e=r.current;if(!e)return;let t=new IntersectionObserver(([e])=>{e&&(o(e.isIntersecting),e.isIntersecting&&i&&t.disconnect())},{threshold:a});return t.observe(e),()=>t.disconnect()},[i,a]),[r,n]},"usePrefersReducedMotion",0,function(){return(0,t.useSyncExternalStore)(a,()=>window.matchMedia(i).matches,()=>!1)}])}]);