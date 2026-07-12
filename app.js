const STORAGE="auto_collimator_v7_full";
const HISTORY="auto_collimator_v7_history";
const DEFAULT_N=40;
const state={N:DEFAULT_N,counts:[DEFAULT_N,DEFAULT_N,DEFAULT_N,DEFAULT_N],mode:1,row:1,buf:"",minusLock:false,rangeStart:1,rangeEnd:DEFAULT_N,rangeStarts:[1,1,1,1],rangeEnds:[DEFAULT_N,DEFAULT_N,DEFAULT_N,DEFAULT_N],tolerance:0,graphInvertY:false,graphInvertX:false,graphLineModes:["auto","auto","auto","auto"],manualLinePoints:[[],[],[],[]],vals:Array.from({length:DEFAULT_N},()=>[null,null,null,null]),meta:{}};
let result=null, undoStack=[], redoStack=[];
const $=id=>document.getElementById(id);
const THEME_KEY="auto_collimator_theme";
const MODE_SETTINGS_KEY="auto_collimator_v7_mode_settings";
function activeMode(){return Math.min(4,Math.max(1,Number(state.mode)||1))}
function mi(){return activeMode()-1}
function activeN(){return Number(state.counts&&state.counts[mi()])||0}
function maxCount(){return Math.max(0,...(state.counts||[state.N||DEFAULT_N]).map(n=>Number(n)||0))}
function countForMode(mode){return Math.max(0,Math.min(100,Math.round(Number((state.counts||[])[mode-1])||0)))}
function tableRowCount(){return Math.max(state.N||0,maxCount())}
function syncActiveSettings(){
 const i=mi();
 state.N=Math.max(0,Math.min(100,Math.round(Number(state.counts[i])||0)));
 state.rangeStart=Math.round(Number(state.rangeStarts[i])||0);
 state.rangeEnd=Math.round(Number(state.rangeEnds[i])||state.N);
}
function saveActiveSettings(){
 const i=mi();
 state.counts[i]=Math.max(0,Math.min(100,Math.round(Number(state.N)||0)));
 state.rangeStarts[i]=Math.round(Number(state.rangeStart)||0);
 state.rangeEnds[i]=Math.round(Number(state.rangeEnd)||0);
 localStorage.setItem(MODE_SETTINGS_KEY,JSON.stringify({counts:state.counts,rangeStarts:state.rangeStarts,rangeEnds:state.rangeEnds}));
}
function loadModeSettings(){
 try{
  const m=JSON.parse(localStorage.getItem(MODE_SETTINGS_KEY)||"null");
  if(m&&Array.isArray(m.counts)&&m.counts.length>=4){
   state.counts=m.counts.slice(0,4);
   state.rangeStarts=(m.rangeStarts||state.rangeStarts).slice(0,4);
   state.rangeEnds=(m.rangeEnds||state.rangeEnds).slice(0,4);
  }
 }catch(e){}
}
function applyTheme(theme){
 document.body.classList.toggle("dark", theme==="dark");
 localStorage.setItem(THEME_KEY, theme);
 if(result) drawGraph($("graph"),result.data,result.dev,state.N,{invertY:state.graphInvertY,invertX:state.graphInvertX});
 const pg=$("printGraph"); if(pg && result) drawGraph(pg,result.data,result.dev,state.N,{invertY:state.graphInvertY,invertX:state.graphInvertX});
}
function loadTheme(){applyTheme(localStorage.getItem(THEME_KEY)||"light")}
function cloneVals(){return state.vals.map(r=>r.slice())}
function cloneArr(a){return Array.isArray(a)?a.slice():[]}
function snapshot(){return {vals:cloneVals(),N:state.N,counts:cloneArr(state.counts),rangeStart:state.rangeStart,rangeEnd:state.rangeEnd,rangeStarts:cloneArr(state.rangeStarts),rangeEnds:cloneArr(state.rangeEnds),tolerance:state.tolerance,graphInvertY:state.graphInvertY,graphInvertX:state.graphInvertX,graphLineModes:cloneArr(state.graphLineModes),manualLinePoints:(state.manualLinePoints||[]).map(cloneArr),mode:state.mode,row:state.row}}
function pushUndo(){saveActiveSettings();undoStack.push(snapshot()); if(undoStack.length>50)undoStack.shift(); redoStack=[]}
function restore(s){
 state.vals=s.vals.map(r=>r.slice());state.mode=s.mode||state.mode;state.row=s.row||state.row;
 state.counts=s.counts||[s.N||DEFAULT_N,s.N||DEFAULT_N,s.N||DEFAULT_N,s.N||DEFAULT_N];
 state.rangeStarts=s.rangeStarts||[s.rangeStart||1,s.rangeStart||1,s.rangeStart||1,s.rangeStart||1];
 state.rangeEnds=s.rangeEnds||[s.rangeEnd||DEFAULT_N,s.rangeEnd||DEFAULT_N,s.rangeEnd||DEFAULT_N,s.rangeEnd||DEFAULT_N];
 state.tolerance=s.tolerance||0;state.graphInvertY=!!s.graphInvertY;state.graphInvertX=!!s.graphInvertX;state.graphLineModes=s.graphLineModes||["auto","auto","auto","auto"];state.manualLinePoints=(s.manualLinePoints||[[],[],[],[]]).map(cloneArr);
 normalize();buildTable();update(false)
}
function normalize(){
 state.mode=activeMode();
 const oldN=Number(state.N)||DEFAULT_N;
 if(!Array.isArray(state.counts)||state.counts.length<4)state.counts=[oldN,oldN,oldN,oldN];
 state.counts=state.counts.slice(0,4).map(n=>Math.max(0,Math.min(100,Math.round(Number(n)||0))));
 if(!Array.isArray(state.rangeStarts)||state.rangeStarts.length<4)state.rangeStarts=[state.rangeStart||1,state.rangeStart||1,state.rangeStart||1,state.rangeStart||1];
 if(!Array.isArray(state.rangeEnds)||state.rangeEnds.length<4)state.rangeEnds=[state.rangeEnd||oldN,state.rangeEnd||oldN,state.rangeEnd||oldN,state.rangeEnd||oldN];
 state.rangeStarts=state.rangeStarts.slice(0,4).map(n=>Math.round(Number(n)||1));
 state.rangeEnds=state.rangeEnds.slice(0,4).map(n=>Math.round(Number(n)||1));
 for(let i=0;i<4;i++){
  const n=state.counts[i];
  if(n===0){state.rangeStarts[i]=0;state.rangeEnds[i]=0;continue}
  let s=Math.max(1,Math.min(n,state.rangeStarts[i]||1));
  let e=Math.max(1,Math.min(n,state.rangeEnds[i]||n));
  if(e<s){const t=s;s=e;e=t}
  state.rangeStarts[i]=s;state.rangeEnds[i]=e;
 }
 syncActiveSettings();
 const need=maxCount();
 while(state.vals.length<need)state.vals.push([null,null,null,null]);
 state.vals=state.vals.slice(0,Math.max(need,state.vals.length));
 if(state.N===0)state.row=0;else state.row=Math.min(Math.max(1,state.row),state.N);
 state.tolerance=Math.max(0,Number(state.tolerance)||0);
 state.graphInvertY=!!state.graphInvertY;state.graphInvertX=!!state.graphInvertX;
 if(!Array.isArray(state.graphLineModes)||state.graphLineModes.length<4)state.graphLineModes=["auto","auto","auto","auto"];
 state.graphLineModes=state.graphLineModes.slice(0,4).map(v=>["auto","manual","off"].includes(v)?v:"auto");
 if(!Array.isArray(state.manualLinePoints)||state.manualLinePoints.length<4)state.manualLinePoints=[[],[],[],[]];
 state.manualLinePoints=state.manualLinePoints.slice(0,4).map(a=>Array.isArray(a)?a.map(Number).filter(Number.isFinite).slice(0,2):[]);
}
function metaIds(){return ["serial","model","name","date","outsideTemp","machineTemp","operator","note"]}
function save(){saveActiveSettings();metaIds().forEach(id=>state.meta[id]=$(id).value);state.tolerance=Number($("toleranceInput").value)||0;localStorage.setItem(STORAGE,JSON.stringify(state))}
function load(){try{const s=JSON.parse(localStorage.getItem(STORAGE)||"{}");Object.assign(state,s);if(!state.vals)state.vals=Array.from({length:state.N||DEFAULT_N},()=>[null,null,null,null]);}catch(e){}loadModeSettings();normalize()}
function scrollToEditPosition(){
 const target=$("controlCard")||$("inputView");
 if(!target)return;
 const header=document.querySelector("header");
 const offset=(header?header.offsetHeight:0)+8;
 const top=target.getBoundingClientRect().top+window.pageYOffset-offset;
 window.scrollTo({top:Math.max(0,top),behavior:"auto"});
}
function scrollToEditPositionStable(){
 // Mobile browsers can change viewport height while hiding the table, so repeat fixed-position scroll.
 requestAnimationFrame(()=>scrollToEditPosition());
 setTimeout(scrollToEditPosition,60);
 setTimeout(scrollToEditPosition,180);
 setTimeout(scrollToEditPosition,360);
}
function buildTable(){
 const tb=$("tbody");tb.innerHTML="";
 const rows=tableRowCount();
 for(let i=1;i<=rows;i++){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${i}</td>${[1,2,3,4].map(c=>{
    const enabled=i<=countForMode(c);
    return `<td><button ${enabled?`data-edit="${i},${c}"`:"disabled"} id="v${c}_${i}" class="${enabled?"":"disabledCell"}"></button></td>`;
  }).join("")}<td id="m_${i}"></td><td id="co_${i}"></td><td id="cu_${i}"></td>`;
  tb.appendChild(tr);
 }
 tb.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
  const [r,c]=b.dataset.edit.split(",").map(Number);
  saveActiveSettings();
  state.mode=c;
  normalize();
  state.row=Math.min(r,state.N||r);
  state.buf=currentValue();
  update(false);
  render();
  scrollToEditPositionStable();
 });
}
function currentValue(){if(state.N===0||state.row<1)return"";const row=state.vals[state.row-1]||[];const v=row[state.mode-1];return v===null||v===undefined||v===BLANK_VALUE?"":String(Math.abs(v))}
function inputNumber(){if(state.buf==="")return NaN;let x=Number(state.buf);if(state.minusLock&&x>0)x=-x;return x}
function moveNext(){if(state.N===0){state.row=0;return} if(state.row<state.N)state.row++; else if(state.mode<4){saveActiveSettings();state.mode++;normalize();state.row=1}else state.row=state.N}
function commit(){if(state.N===0)return;const x=inputNumber();if(Number.isFinite(x)){pushUndo();while(state.vals.length<state.row)state.vals.push([null,null,null,null]);state.vals[state.row-1][state.mode-1]=x;moveNext();state.buf=currentValue();update()}}
function commitBlank(){
 if(state.N===0)return;
 pushUndo();
 while(state.vals.length<state.row)state.vals.push([null,null,null,null]);
 state.vals[state.row-1][state.mode-1]=BLANK_VALUE;
 moveNext();
 state.buf=currentValue();
 update();
}
function ensureValueRows(){const need=Math.max(100,state.vals.length,tableRowCount(),maxCount());while(state.vals.length<need)state.vals.push([null,null,null,null])}
function clearAllMeasurements(){
 saveActiveSettings();
 ensureValueRows();
 const need=Math.max(state.vals.length,100,tableRowCount(),maxCount());
 while(state.vals.length<need)state.vals.push([null,null,null,null]);
 for(let i=0;i<state.vals.length;i++){
  state.vals[i]=[null,null,null,null];
 }
 state.row=state.N?1:0;
 state.buf="";
 buildTable();
 update(true);
}
function clearOneMeasurement(mode){
 const m=Math.min(4,Math.max(1,Number(mode)||state.mode));
 saveActiveSettings();
 ensureValueRows();
 const need=Math.max(state.vals.length,100,tableRowCount(),maxCount());
 while(state.vals.length<need)state.vals.push([null,null,null,null]);
 for(let i=0;i<state.vals.length;i++){
  if(!Array.isArray(state.vals[i]))state.vals[i]=[null,null,null,null];
  state.vals[i][m-1]=null;
 }
 if(state.mode===m){state.row=state.N?1:0;state.buf=currentValue()}
 buildTable();
 update(true);
}
function setCount(n){pushUndo();state.N=n;saveActiveSettings();normalize();buildTable();update()}
function setRangeFromInputs(){pushUndo();let s=Number($("rangeStartInput").value),e=Number($("rangeEndInput").value);if(!Number.isFinite(s))s=1;if(!Number.isFinite(e))e=state.N;s=Math.round(s);e=Math.round(e);if(state.N===0){state.rangeStart=0;state.rangeEnd=0}else{s=Math.max(1,Math.min(state.N,s));e=Math.max(1,Math.min(state.N,e));if(e<s){const t=s;s=e;e=t}state.rangeStart=s;state.rangeEnd=e}saveActiveSettings();update()}
function setCountFromInput(){let n=Number($("pointCountInput").value);if(!Number.isFinite(n))n=state.N;setCount(n)}
function render(){
 $("modeText").textContent=state.mode;$("rowText").textContent=state.N?state.row:"-";$("readout").textContent=state.buf===""?"0":fmt(inputNumber());
 const done=state.vals.slice(0,state.N).filter(v=>v[state.mode-1]!==null&&v[state.mode-1]!==undefined).length;$("doneText").textContent=done;$("totalText").textContent=state.N;$("progressBar").style.width=(state.N?done/state.N*100:0)+"%";
 $("minusLock").classList.toggle("minusOn",state.minusLock);$("minusLock").textContent=state.minusLock?"−固定中":"−固定";
 $("pointCountInput").value=state.N;$("rangeStartInput").value=state.rangeStart;$("rangeEndInput").value=state.rangeEnd;$("rangeLabel").textContent=state.rangeStart+"-"+state.rangeEnd;$("toleranceInput").value=state.tolerance||0;
 const yb=$("graphInvertYBtn"), xb=$("graphInvertXBtn");
 if(yb){yb.classList.toggle("active",state.graphInvertY);yb.textContent=state.graphInvertY?"＋−上下反転中":"＋−上下反転"}
 if(xb){xb.classList.toggle("active",state.graphInvertX);xb.textContent=state.graphInvertX?"左右反転中":"左右反転"}
 const lm=(state.graphLineModes||[])[mi()]||"auto";
 const pts=((state.manualLinePoints||[])[mi()]||[]);
 const ab=$("autoLineBtn"),mb=$("manualLineBtn"),ob=$("offLineBtn"),st=$("manualLineStatus"),cv=$("graph");
 if(ab)ab.classList.toggle("active",lm==="auto");
 if(mb)mb.classList.toggle("active",lm==="manual");
 if(ob)ob.classList.toggle("active",lm==="off");
 if(cv)cv.classList.toggle("manualPick",lm==="manual");
 if(st){
  if(lm==="auto")st.textContent="赤線：自動";
  else if(lm==="off")st.textContent="赤線：なし";
  else if(pts.length===0)st.textContent="任意2点：始点をタップ";
  else if(pts.length===1)st.textContent=`任意2点：始点 ${pts[0]} ／ 終点をタップ`;
  else st.textContent=`任意2点：${pts[0]} → ${pts[1]}（次のタップで選び直し）`;
 }
}
function update(doSave=true){
 normalize(); result=calcSeries(state);
 $("avgText").textContent=fmt(result.avg);$("lastText").textContent=fmt(result.last);$("devText").textContent=fmt(result.dev.maxDev);
 const ok=state.tolerance>0 ? result.dev.maxDev<=state.tolerance : null;
 $("judgeText").textContent=ok===null?"---":(ok?"PASS":"NG");$("judgeText").className=ok===null?"":(ok?"pass":"ng");
 $("devDetailText").textContent=`測定${state.mode}：左 ${fmt(result.dev.left.maxDev)} / 中央 ${fmt(result.dev.center.maxDev)} / 右 ${fmt(result.dev.right.maxDev)}`;
 const resultMap=new Map(result.rows.map(r=>[r.pos,r]));
 const rows=tableRowCount();
 for(let i=1;i<=rows;i++){
  const vals=state.vals[i-1]||[];
  for(let c=1;c<=4;c++){
   const el=$("v"+c+"_"+i);
   if(el){
    const enabled=i<=countForMode(c);
    el.disabled=!enabled;
    el.classList.toggle("disabledCell",!enabled);
    el.textContent=enabled?displayValue(vals[c-1]):"";
   }
  }
  const r=resultMap.get(i);
  const m=$("m_"+i),co=$("co_"+i),cu=$("cu_"+i);
  if(m)m.textContent=(i===1&&state.N>0)?fmt(result.avg):"";
  if(co)co.textContent=r?fmt(r.co):"";
  if(cu)cu.textContent=r?fmt(r.cu):"";
 }
 drawGraph($("graph"),result.data,result.dev,state.N,{invertY:state.graphInvertY,invertX:state.graphInvertX});render();if(doSave)save();
}

let printPreviewMode=1;

function printStateForMode(mode){
 const i=Math.min(4,Math.max(1,Number(mode)||1))-1;
 const n=countForMode(i+1);
 return Object.assign({},state,{
  mode:i+1,
  N:n,
  rangeStart:n?Math.max(1,Math.min(n,Number(state.rangeStarts[i])||1)):0,
  rangeEnd:n?Math.max(1,Math.min(n,Number(state.rangeEnds[i])||n)):0
 });
}
function formatPrintDate(v){
 if(!v)return"";
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m?`${m[1]}年 ${Number(m[2])}月 ${Number(m[3])}日`:v;
}
function printLineCondition(mode,dev){
 const lm=(state.graphLineModes||[])[mode-1]||"auto";
 if(lm==="off")return"赤線なし";
 if(lm==="manual"){
  const pts=(state.manualLinePoints||[])[mode-1]||[];
  return pts.length===2?`任意2点 ${pts[0]}→${pts[1]}`:"任意2点 未確定";
 }
 if(dev&&dev.line)return`自動 ${dev.line.s}→${dev.line.e}`;
 return"自動";
}
function buildFieldPrintPage(mode){
 const ps=printStateForMode(mode);
 const pr=calcSeries(ps);
 const rowCount=Math.max(53,ps.N||0);
 const numericRows=pr.rows.filter(r=>Number.isFinite(r.m));
 const avgRow=numericRows.length?numericRows[0].pos:1;
 const resultMap=new Map(pr.rows.map(r=>[r.pos,r]));
 const rows=[];
 for(let i=1;i<=rowCount;i++){
  const r=resultMap.get(i);
  const raw=((state.vals[i-1]||[])[mode-1]);
  const measured=i<=ps.N?displayValue(raw):"";
  rows.push(`<tr><td>${i}</td><td>${measured}</td><td></td><td>${i===avgRow?fmt(pr.avg):""}</td><td>${r?fmt(r.co):""}</td><td>${r?fmt(r.cu):""}</td></tr>`);
 }
 const judgement=state.tolerance>0?(pr.dev.maxDev<=state.tolerance?"合格":"不合格"):"---";
 const page=document.createElement("section");
 page.className="printSheet";page.dataset.mode=String(mode);
 page.innerHTML=`
  <div class="fieldPrintTitle">オートコリメーター測定記録用紙<span class="modeLabel">現場標準レイアウト1／測定${mode}</span></div>
  <table class="fieldMeta"><tbody>
   <tr><th>製番</th><td>${state.meta.serial||""}</td><th rowspan="3">名称</th><td rowspan="3" class="nameCell">${state.meta.name||""}</td><th>測定日時</th><td>${formatPrintDate(state.meta.date||"")}</td></tr>
   <tr><th>形格</th><td>${state.meta.model||""}</td><th rowspan="2">測定時温度</th><td rowspan="2">外気温：${state.meta.outsideTemp||""}${state.meta.outsideTemp?" ℃":""}<br>機体温度：${state.meta.machineTemp||""}${state.meta.machineTemp?" ℃":""}</td></tr>
   <tr><th>測定者</th><td>${state.meta.operator||""}</td></tr>
  </tbody></table>
  <div class="fieldBody">
   <div class="fieldTableWrap"><table class="fieldTable">
    <thead><tr><th rowspan="2" class="posCol">測定<br>位置</th><th colspan="3">測定値</th><th rowspan="2" class="corrCol">補正</th><th rowspan="2" class="cumCol">累計</th></tr>
    <tr><th class="measureCol">1</th><th class="measureCol">2</th><th class="avgCol">平均</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
   </table></div>
   <div class="fieldGraphWrap">
    <div class="fieldGraphHeading">
      <div class="fieldGraphTitle">図示（単位 0.001mm）</div>
      <div class="fieldScaleLabels"></div>
    </div>
    <canvas class="fieldPrintGraph" width="1000" height="1700"></canvas>
   </div>
  </div>
  <div class="fieldFooter">
   <div>判定<b>${judgement}</b></div><div>平均<b>${fmt(pr.avg)}</b></div><div>最大差<b>${fmt(pr.dev.maxDev)}</b></div>
   <div>赤線条件<b>${printLineCondition(mode,pr.dev)}</b></div><div class="notePrint">備考：${state.meta.note||""}</div>
  </div>`;
 requestAnimationFrame(()=>drawFieldPrintGraph(page.querySelector(".fieldPrintGraph"),pr.data,pr.dev,rowCount,{measureCount:ps.N}));
 return page;
}
function setPrintPreviewMode(mode){
 printPreviewMode=Math.min(4,Math.max(1,Number(mode)||1));
 document.querySelectorAll(".printSheet").forEach(p=>p.classList.toggle("active",Number(p.dataset.mode)===printPreviewMode));
 document.querySelectorAll("[data-print-mode]").forEach(b=>b.classList.toggle("active",Number(b.dataset.printMode)===printPreviewMode));
 scrollTo({top:0,behavior:"auto"});
}
function renderPrintPages(){
 const box=$("printPages");box.innerHTML="";
 for(let mode=1;mode<=4;mode++)box.appendChild(buildFieldPrintPage(mode));
 setPrintPreviewMode(printPreviewMode||state.mode);
}
function showShot(){
 save();printPreviewMode=state.mode;
 $("inputView").classList.add("hidden");$("shotView").classList.remove("hidden");
 renderPrintPages();scrollTo({top:0,behavior:"auto"});
}
function runPrint(allModes){
 document.body.classList.remove("printing-all","printing-selected");
 document.body.classList.add(allModes?"printing-all":"printing-selected");
 setTimeout(()=>window.print(),120);
 setTimeout(()=>document.body.classList.remove("printing-all","printing-selected"),1200);
}
function showInput(){$("shotView").classList.add("hidden");$("inputView").classList.remove("hidden");scrollToEditPositionStable()}
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}
function csvOut(){const rows=[["位置","測定1","測定2","測定3","測定4",`測定${state.mode}平均`,`測定${state.mode}補正`,`測定${state.mode}累計`]];result.rows.forEach(r=>rows.push([r.pos,...r.vals.map(displayValue),r.pos===1?fmt(result.avg):"",fmt(r.co),fmt(r.cu)]));download("autocollimator.csv","\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv")}
function jsonOut(){save();download("autocollimator_data.json",JSON.stringify(state,null,2),"application/json")}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY)||"[]")}catch(e){return[]}}
function saveHistory(){save();const h=history();h.unshift({time:new Date().toLocaleString(),title:`${state.meta.serial||""} ${state.meta.name||""}`.trim()||"測定データ",data:JSON.parse(JSON.stringify(state))});localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,50)));renderHistory();alert("履歴保存しました")}
function renderHistory(){const h=history(),box=$("historyList");box.innerHTML="";h.forEach((item,i)=>{const div=document.createElement("div");div.className="histItem";div.innerHTML=`<span>${item.time} / ${item.title}</span><span><button data-load="${i}">読込</button><button data-del="${i}">削除</button></span>`;box.appendChild(div)});box.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{Object.assign(state,h[Number(b.dataset.load)].data);normalize();buildTable();update()});box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const arr=history();arr.splice(Number(b.dataset.del),1);localStorage.setItem(HISTORY,JSON.stringify(arr));renderHistory()})}

function setGraphLineMode(mode){
 const i=mi();
 state.graphLineModes[i]=mode;
 if(mode==="manual"&&!Array.isArray(state.manualLinePoints[i]))state.manualLinePoints[i]=[];
 update();
}
function graphPointFromEvent(event){
 const canvas=$("graph");
 if(!canvas||!result)return null;
 const rect=canvas.getBoundingClientRect();
 const scaleX=canvas.width/rect.width;
 const x=(event.clientX-rect.left)*scaleX;
 const L=64,R=22,w=canvas.width;
 const usable=w-L-R;
 if(usable<=0)return null;
 let t=(x-L)/usable;
 t=Math.max(0,Math.min(1,t));
 if(state.graphInvertX)t=1-t;
 const guessed=Math.round(t*Math.max(1,state.N));
 const valid=(result.data||[]).filter(d=>Number.isFinite(d.y));
 if(!valid.length)return null;
 return valid.reduce((best,d)=>Math.abs(d.p-guessed)<Math.abs(best.p-guessed)?d:best).p;
}
function handleManualGraphTap(event){
 if(((state.graphLineModes||[])[mi()]||"auto")!=="manual")return;
 const p=graphPointFromEvent(event);
 if(p===null)return;
 const i=mi();
 let pts=Array.isArray(state.manualLinePoints[i])?state.manualLinePoints[i].slice(0,2):[];
 if(pts.length>=2)pts=[];
 if(!pts.includes(p))pts.push(p);
 state.manualLinePoints[i]=pts;
 update();
}

document.addEventListener("DOMContentLoaded",()=>{
 loadTheme();
 load();metaIds().forEach(id=>{$(id).value=state.meta[id]||"";$(id).oninput=()=>{state.meta[id]=$(id).value;save()}});
 buildTable();update(false);renderHistory();
 document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{saveActiveSettings();state.mode=Number(b.dataset.mode);normalize();state.row=state.N?1:0;state.buf=currentValue();buildTable();update(false);render();scrollToEditPositionStable()});
 document.querySelectorAll("[data-count]").forEach(b=>b.onclick=()=>setCount(Number(b.dataset.count)));
 document.querySelectorAll("[data-key]").forEach(b=>b.onclick=()=>{if(state.buf==="0")state.buf=b.dataset.key;else state.buf+=b.dataset.key;render()});
 $("countMinus").onclick=()=>setCount(state.N-1);$("countPlus").onclick=()=>setCount(state.N+1);$("pointCountInput").onchange=setCountFromInput;$("pointCountInput").onblur=setCountFromInput;
 $("rangeStartInput").onchange=setRangeFromInputs;$("rangeStartInput").onblur=setRangeFromInputs;$("rangeEndInput").onchange=setRangeFromInputs;$("rangeEndInput").onblur=setRangeFromInputs;$("toleranceInput").onchange=()=>{state.tolerance=Number($("toleranceInput").value)||0;update()};
 $("rangeStartMinus").onclick=()=>{state.rangeStart=Math.max(1,state.rangeStart-1);saveActiveSettings();update()};$("rangeStartPlus").onclick=()=>{state.rangeStart=Math.min(state.N,state.rangeStart+1);if(state.rangeStart>state.rangeEnd)state.rangeEnd=state.rangeStart;saveActiveSettings();update()};
 $("rangeEndMinus").onclick=()=>{state.rangeEnd=Math.max(1,state.rangeEnd-1);if(state.rangeEnd<state.rangeStart)state.rangeStart=state.rangeEnd;saveActiveSettings();update()};$("rangeEndPlus").onclick=()=>{state.rangeEnd=Math.min(state.N,state.rangeEnd+1);saveActiveSettings();update()};$("rangeAll").onclick=()=>{state.rangeStart=state.N?1:0;state.rangeEnd=state.N;saveActiveSettings();update()};
 $("backspace").onclick=()=>{state.buf=state.buf.slice(0,-1);render()};$("clearBuf").onclick=()=>{state.buf="";render()};$("blankBtn").onclick=commitBlank;$("minusLock").onclick=()=>{state.minusLock=!state.minusLock;render()};
 $("prevRow").onclick=()=>{if(state.row>1)state.row--;state.buf=currentValue();render()};$("skipRow").onclick=()=>{moveNext();state.buf=currentValue();render()};$("commit").onclick=commit;
 const clearAllBtn=$("clearBtn"); if(clearAllBtn) clearAllBtn.onclick=clearAllMeasurements;
 for(let cm=1;cm<=4;cm++){
  const btn=$("clearMode"+cm);
  if(btn) btn.onclick=()=>clearOneMeasurement(cm);
 }
 $("graphInvertYBtn").onclick=()=>{state.graphInvertY=!state.graphInvertY;update()};$("graphInvertXBtn").onclick=()=>{state.graphInvertX=!state.graphInvertX;update()};
 $("autoLineBtn").onclick=()=>setGraphLineMode("auto");
 $("manualLineBtn").onclick=()=>setGraphLineMode("manual");
 $("offLineBtn").onclick=()=>setGraphLineMode("off");
 $("graph").addEventListener("click",handleManualGraphTap);
 $("toggleTable").onclick=()=>$("tableWrap").classList.toggle("hidden");$("csvBtn").onclick=csvOut;$("jsonBtn").onclick=jsonOut;$("historySaveBtn").onclick=saveHistory;$("historyToggleBtn").onclick=()=>$("historyWrap").classList.toggle("hidden");
 $("jsonLoad").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{Object.assign(state,JSON.parse(rd.result));normalize();buildTable();update()}catch(err){alert("読込に失敗しました")}};rd.readAsText(f)};
 $("inputBtn").onclick=showInput;
 $("shotBtn").onclick=showShot;
 $("printBtn").onclick=showShot;
 $("backInput1").onclick=showInput;
 $("doPrint").onclick=()=>runPrint(false);
 $("printAllModes").onclick=()=>runPrint(true);
 document.querySelectorAll("[data-print-mode]").forEach(b=>b.onclick=()=>setPrintPreviewMode(Number(b.dataset.printMode)));
 $("lightBtn").onclick=()=>applyTheme("light");$("darkBtn").onclick=()=>applyTheme("dark");
 document.addEventListener("click",e=>{
  const id=e.target&&e.target.id;
  if(id==="clearBtn"){e.preventDefault();clearAllMeasurements()}
  if(id&&id.startsWith("clearMode")){e.preventDefault();clearOneMeasurement(Number(id.replace("clearMode","")))}
 });
});

window.clearAllMeasurements=clearAllMeasurements;
window.clearOneMeasurement=clearOneMeasurement;
