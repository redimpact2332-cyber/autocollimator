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
 const rowCount=46;
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
  <div class="originalTopCode"></div>
  <table class="fieldMeta originalMeta"><tbody>
   <tr>
    <th>製番</th><td>${state.meta.serial||""}</td>
    <th rowspan="3" class="nameHead">名称</th>
    <td rowspan="3" class="nameCell">${state.meta.name||""}</td>
    <th>測定日時</th><td>${formatPrintDate(state.meta.date||"")}</td>
   </tr>
   <tr>
    <th>型格</th><td>${state.meta.model||""}</td>
    <th>測定時温度</th>
    <td>外気温：${state.meta.outsideTemp||""}${state.meta.outsideTemp?" ℃":""}　　機体温度：${state.meta.machineTemp||""}${state.meta.machineTemp?" ℃":""}</td>
   </tr>
   <tr>
    <th>測定者</th><td>${state.meta.operator||""}</td>
    <th>測定器</th><td></td>
   </tr>
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
  <div class="originalFooter">
   <div class="originalFooterLeft">
    <div><span>摺動面全長</span><span class="unitCell">mm</span></div>
    <div><span>測定間隔</span><span class="unitCell">mm</span></div>
    <div><span>測定位置</span><span class="unitCell"></span></div>
   </div>
   <div class="judgeLabel">判定</div>
   <div class="judgeValue">${judgement}</div>
   <div class="footerBlank"></div>
  </div>`;
 requestAnimationFrame(()=>{
  const cv=page.querySelector(".fieldPrintGraph");
  const trList=[...page.querySelectorAll(".fieldTable tbody tr")];
  const cvRect=cv.getBoundingClientRect();
  const scaleY=cv.height/Math.max(1,cvRect.height);
  const rowCenters={};
  trList.forEach((tr,idx)=>{
    const r=tr.getBoundingClientRect();
    rowCenters[idx+1]=((r.top+r.bottom)/2-cvRect.top)*scaleY;
  });
  const first=trList[0]?.getBoundingClientRect();
  const zeroY=first?(first.top-cvRect.top)*scaleY:0;
  drawFieldPrintGraph(cv,pr.data,pr.dev,rowCount,{
    measureCount:ps.N,
    cumulativeData:pr.rows.map(r=>({p:r.pos,y:r.cu})),
    rowCenters,
    zeroY,
    invertY:state.graphInvertY,
    invertX:state.graphInvertX
  });
});
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


function pdfDrawText(ctx,text,x,y,maxWidth,size=24,align="left",weight="normal"){
 ctx.save();
 ctx.font=`${weight} ${size}px "Yu Gothic","Meiryo",sans-serif`;
 ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillStyle="#000";
 let s=String(text??"");
 while(s&&ctx.measureText(s).width>maxWidth)s=s.slice(0,-1);
 if(s!==String(text??""))s=(s.slice(0,-1)||"")+"…";
 ctx.fillText(s,x,y);ctx.restore();
}
function drawPdfReportCanvas(mode){
 const ps=printStateForMode(mode),pr=calcSeries(ps),rows=46;
 const W=1240,H=1754,mg=42,top=45,titleH=50,metaH=145,footH=74;
 const c=document.createElement("canvas");c.width=W;c.height=H;
 const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);x.strokeStyle="#000";x.fillStyle="#000";
 const bodyTop=top+titleH+metaH,bodyBottom=H-mg-footH,bodyH=bodyBottom-bodyTop;
 const leftW=525,graphX=mg+leftW,graphW=W-mg-graphX;
 const line=(x1,y1,x2,y2,w=1)=>{x.beginPath();x.lineWidth=w;x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke()};
 const rect=(a,b,w,h,lw=1)=>{x.lineWidth=lw;x.strokeRect(a,b,w,h)};

 pdfDrawText(x,"",W/2,top+titleH/2,W-300,34,"center","bold");
 pdfDrawText(x,"",W-mg,top+titleH/2,280,17,"right","bold");

 const my=top+titleH,mx=mg,mw=W-2*mg;
 rect(mx,my,mw,metaH,2);
 const cols=[0,90,365,460,800,915,mw];
 for(const cx of cols.slice(1,-1))line(mx+cx,my,mx+cx,my+metaH);
 line(mx,my+metaH/3,mx+365,my+metaH/3);
 line(mx,my+2*metaH/3,mx+365,my+2*metaH/3);
 line(mx+800,my+metaH/3,mx+mw,my+metaH/3);
 pdfDrawText(x,"製番",mx+45,my+metaH/6,78,18,"center","bold");
 pdfDrawText(x,state.meta.serial||"",mx+105,my+metaH/6,245,18);
 pdfDrawText(x,"形格",mx+45,my+metaH/2,78,18,"center","bold");
 pdfDrawText(x,state.meta.model||"",mx+105,my+metaH/2,245,18);
 pdfDrawText(x,"測定者",mx+45,my+5*metaH/6,78,18,"center","bold");
 pdfDrawText(x,state.meta.operator||"",mx+105,my+5*metaH/6,245,18);
 pdfDrawText(x,"名称",mx+412,my+metaH/2,78,18,"center","bold");
 pdfDrawText(x,state.meta.name||"",mx+630,my+metaH/2,310,20,"center","bold");
 pdfDrawText(x,"測定日時",mx+855,my+metaH/6,105,17,"center","bold");
 pdfDrawText(x,formatPrintDate(state.meta.date||""),mx+930,my+metaH/6,200,16);
 pdfDrawText(x,"測定時温度",mx+855,my+2*metaH/3,105,16,"center","bold");
 pdfDrawText(x,`外気温：${state.meta.outsideTemp||""}${state.meta.outsideTemp?"℃":""}`,mx+940,my+metaH/2+12,190,15);
 pdfDrawText(x,`機体温度：${state.meta.machineTemp||""}${state.meta.machineTemp?"℃":""}`,mx+940,my+metaH/2+40,190,15);

 rect(mg,bodyTop,leftW,bodyH,2);rect(graphX,bodyTop,graphW,bodyH,2);
 const headH=64,rowH=(bodyH-headH)/rows;
 const widths=[54,104,104,104,79,80],xs=[mg];
 for(const w of widths)xs.push(xs[xs.length-1]+w);
 for(const vx of xs.slice(1,-1))line(vx,bodyTop,vx,bodyBottom);
 line(mg,bodyTop+headH,mg+leftW,bodyTop+headH,2);
 const headers=[["位置",mg+27],["測定1",xs[1]+52],["測定2",xs[2]+52],["平均",xs[3]+52],["補正",xs[4]+39],["累計",xs[5]+40]];
 for(const [t,cx] of headers)pdfDrawText(x,t,cx,bodyTop+headH/2,96,17,"center","bold");

 const rmap=new Map(pr.rows.map(r=>[r.pos,r]));
 const numericRows=pr.rows.filter(r=>Number.isFinite(r.m)),avgRow=numericRows.length?numericRows[0].pos:1;
 for(let i=1;i<=rows;i++){
  const y=bodyTop+headH+(i-1)*rowH;
  line(mg,y,mg+leftW,y,.65);
  const r=rmap.get(i),raw=(state.vals[i-1]||[])[mode-1],val=i<=ps.N?displayValue(raw):"";
  pdfDrawText(x,i,mg+27,y+rowH/2,45,12,"center");
  pdfDrawText(x,val,xs[1]+52,y+rowH/2,95,12,"center");
  pdfDrawText(x,"",xs[2]+52,y+rowH/2,95,12,"center");
  pdfDrawText(x,i===avgRow?fmt(pr.avg):"",xs[3]+52,y+rowH/2,95,12,"center");
  pdfDrawText(x,r?fmt(r.co):"",xs[4]+39,y+rowH/2,70,12,"center");
  pdfDrawText(x,r?fmt(r.cu):"",xs[5]+40,y+rowH/2,70,12,"center");
 }

 const gh=64,plotY=bodyTop+gh,plotH=bodyH-gh;
 line(graphX,plotY,graphX+graphW,plotY,2);
 pdfDrawText(x,"図示（単位 0.001mm）",graphX+graphW/2,bodyTop+18,graphW-20,19,"center","bold");

 const invertY=!!state.graphInvertY,invertX=!!state.graphInvertX;
 const cumulative=[{p:0,y:0},...pr.rows.filter(r=>Number.isFinite(r.cu)).map(r=>({p:r.pos,y:r.cu}))]
  .map(d=>({p:d.p,y:invertY?-d.y:d.y}));
 const vals=cumulative.map(d=>d.y);
 if(pr.dev&&pr.dev.line&&typeof pr.dev.line.lineYAt==="function"){
  for(let p=1;p<=ps.N;p++){const raw=pr.dev.line.lineYAt(p);const v=Number.isFinite(raw)?(invertY?-raw:raw):NaN;if(Number.isFinite(v))vals.push(v)}
 }
 const vmin=vals.length?Math.min(...vals):0,vmax=vals.length?Math.max(...vals):0;
 let gmin=Math.floor((vmin-20)/20)*20,gmax=gmin+100;
 if(vmax+20>gmax){gmax=Math.ceil((vmax+20)/20)*20;gmin=gmax-100}
 if(vmin-20<gmin){gmin=Math.floor((vmin-20)/20)*20;gmax=gmin+100}
 const gx=v=>graphX+(v-gmin)/(gmax-gmin)*graphW;
 const displayP=p=>invertX?Math.max(0,ps.N-p):p;
 const gy=p=>{const q=displayP(p);return q<=0?plotY:plotY+((q-.5)/rows)*plotH;};

 for(let i=0;i<=20;i++){
  const v=gmin+i*5,major=i%2===0;
  x.strokeStyle=major?"#666":"#bbb";x.setLineDash(major?[]:[4,4]);line(gx(v),plotY,gx(v),bodyBottom,major?1.35:.7);
 }
 x.setLineDash([]);
 for(let p=0;p<=rows;p++){const yy=plotY+p/rows*plotH;x.strokeStyle="#999";line(graphX,yy,graphX+graphW,yy,.65)}
 if(gmin<=0&&gmax>=0){x.strokeStyle="#000";line(gx(0),plotY,gx(0),bodyBottom,2.5)}


 if(cumulative.length){
  x.save();x.beginPath();x.rect(graphX,plotY,graphW,plotH);x.clip();
  x.strokeStyle="#000";x.lineWidth=2.5;x.beginPath();
  cumulative.forEach((d,i)=>i?x.lineTo(gx(d.y),gy(d.p)):x.moveTo(gx(d.y),gy(d.p)));x.stroke();
  x.fillStyle="#000";for(const d of cumulative){x.beginPath();x.arc(gx(d.y),gy(d.p),3,0,Math.PI*2);x.fill()}
  if(pr.dev&&pr.dev.line&&typeof pr.dev.line.lineYAt==="function"){
   const s=Math.max(1,Math.min(ps.N,Number(pr.dev.line.s)||1)),e=Math.max(s,Math.min(ps.N,Number(pr.dev.line.e)||s));
   const seg=(a,b,dash)=>{const r1=pr.dev.line.lineYAt(a),r2=pr.dev.line.lineYAt(b);const y1=Number.isFinite(r1)?(invertY?-r1:r1):NaN,y2=Number.isFinite(r2)?(invertY?-r2:r2):NaN;if(!Number.isFinite(y1)||!Number.isFinite(y2))return;
    x.setLineDash(dash?[9,6]:[]);x.strokeStyle="#333";x.lineWidth=2;x.beginPath();x.moveTo(gx(y1),gy(a));x.lineTo(gx(y2),gy(b));x.stroke()};
   if(s>1)seg(1,s,true);seg(s,e,false);if(e<ps.N)seg(e,ps.N,true);x.setLineDash([]);
  }
  x.restore();
 }

 const fy=bodyBottom,fw=[145,145,155,270,W-2*mg-715],fx=[mg];
 for(const w of fw)fx.push(fx[fx.length-1]+w);
 rect(mg,fy,W-2*mg,footH,2);for(const vx of fx.slice(1,-1))line(vx,fy,vx,fy+footH);
 const judgement=state.tolerance>0?(pr.dev.maxDev<=state.tolerance?"合格":"不合格"):"---";
 pdfDrawText(x,`判定 ${judgement}`,mg+72,fy+footH/2,135,15,"center","bold");
 pdfDrawText(x,`平均 ${fmt(pr.avg)}`,fx[1]+72,fy+footH/2,135,15,"center","bold");
 pdfDrawText(x,`最大差 ${fmt(pr.dev.maxDev)}`,fx[2]+77,fy+footH/2,145,15,"center","bold");
 pdfDrawText(x,`赤線条件 ${printLineCondition(mode,pr.dev)}`,fx[3]+135,fy+footH/2,255,14,"center","bold");
 pdfDrawText(x,`備考：${state.meta.note||""}`,fx[4]+8,fy+footH/2,fw[4]-16,14);
 return c;
}
function pdfU8Concat(parts){const total=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(total);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function pdfS8(s){return new TextEncoder().encode(s)}
function pdfB64U8(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function makeReportPdf(canvases){
 const imgs=canvases.map(c=>pdfB64U8(c.toDataURL("image/jpeg",.92).split(",")[1]));
 const entries=[],kids=[];let next=3;
 for(let i=0;i<canvases.length;i++){const page=next++,content=next++,image=next++;kids.push(`${page} 0 R`);entries.push({n:page,t:"p",content,image});entries.push({n:content,t:"c"});entries.push({n:image,t:"i",data:imgs[i],w:canvases[i].width,h:canvases[i].height})}
 const max=next-1,parts=[pdfS8("%PDF-1.4\n")],offs=new Array(max+1).fill(0);let pos=parts[0].length;
 const emit=(n,chunks)=>{offs[n]=pos;for(const c of chunks){parts.push(c);pos+=c.length}};
 emit(1,[pdfS8("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")]);
 emit(2,[pdfS8(`2 0 obj\n<< /Type /Pages /Count ${canvases.length} /Kids [${kids.join(" ")}] >>\nendobj\n`)]);
 for(const e of entries){
  if(e.t==="p")emit(e.n,[pdfS8(`${e.n} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${e.image} 0 R >> >> /Contents ${e.content} 0 R >>\nendobj\n`)]);
  else if(e.t==="c"){const st=pdfS8("q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n");emit(e.n,[pdfS8(`${e.n} 0 obj\n<< /Length ${st.length} >>\nstream\n`),st,pdfS8("endstream\nendobj\n")])}
  else emit(e.n,[pdfS8(`${e.n} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${e.w} /Height ${e.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${e.data.length} >>\nstream\n`),e.data,pdfS8("\nendstream\nendobj\n")]);
 }
 const xref=pos;let xs=`xref\n0 ${max+1}\n0000000000 65535 f \n`;for(let i=1;i<=max;i++)xs+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
 parts.push(pdfS8(xs+`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
 return new Blob([pdfU8Concat(parts)],{type:"application/pdf"});
}
function openReportPdf(blob,name){
 const url=URL.createObjectURL(blob),win=window.open(url,"_blank");
 if(!win){const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()}
 setTimeout(()=>URL.revokeObjectURL(url),120000);
}
function savePdfSelected(){openReportPdf(makeReportPdf([drawPdfReportCanvas(printPreviewMode)]),`autocollimator_measure${printPreviewMode}.pdf`)}
function savePdfAll(){openReportPdf(makeReportPdf([1,2,3,4].map(drawPdfReportCanvas)),"autocollimator_all_measurements.pdf")}

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
 $("pdfSelected").onclick=savePdfSelected;
 $("pdfAllModes").onclick=savePdfAll;
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
