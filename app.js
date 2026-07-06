const STORAGE="auto_collimator_v7_full";
const HISTORY="auto_collimator_v7_history";
const state={N:40,mode:1,row:1,buf:"",minusLock:false,rangeStart:1,rangeEnd:40,tolerance:0,invertY:false,invertX:false,vals:Array.from({length:40},()=>[null,null,null,null]),meta:{}};
let result=null, undoStack=[], redoStack=[];
const $=id=>document.getElementById(id);
const THEME_KEY="auto_collimator_theme";

function applyTheme(theme){
 document.body.classList.toggle("dark", theme==="dark");
 localStorage.setItem(THEME_KEY, theme);
 redraw();
}
function loadTheme(){
 const t=localStorage.getItem(THEME_KEY)||"light";
 document.body.classList.toggle("dark", t==="dark");
}
function redraw(){
 window.graphInvertY=!!state.invertY;
 window.graphInvertX=!!state.invertX;
 if(result&&$("graph"))drawGraph($("graph"),result.data,result.dev,state.N);
 if(result&&$("printGraph"))drawGraph($("printGraph"),result.data,result.dev,state.N);
}
function cloneVals(){return state.vals.map(r=>r.slice())}
function pushUndo(){
 undoStack.push({vals:cloneVals(),N:state.N,rangeStart:state.rangeStart,rangeEnd:state.rangeEnd,tolerance:state.tolerance,invertY:state.invertY,invertX:state.invertX});
 if(undoStack.length>50)undoStack.shift();
 redoStack=[];
}
function restore(s){
 state.vals=s.vals.map(r=>r.slice());
 state.N=s.N;
 state.rangeStart=s.rangeStart;
 state.rangeEnd=s.rangeEnd;
 state.tolerance=s.tolerance||0;
 state.invertY=!!s.invertY;
 state.invertX=!!s.invertX;
 normalize();
 buildTable();
 update(false);
}
function normalize(){
 state.N=Math.max(0,Math.min(100,Math.round(state.N)));
 while(state.vals.length<state.N)state.vals.push([null,null,null,null]);
 state.vals=state.vals.slice(0,state.N);
 if(state.N===0){state.row=0;state.rangeStart=0;state.rangeEnd=0}
 else{
  state.row=Math.min(Math.max(1,state.row),state.N);
  state.rangeStart=Math.min(Math.max(1,state.rangeStart),state.N);
  state.rangeEnd=Math.min(Math.max(state.rangeStart,state.rangeEnd),state.N);
 }
 state.tolerance=Math.max(0,Number(state.tolerance)||0);
}
function metaIds(){return ["serial","model","name","date","outsideTemp","machineTemp","operator","note"]}
function save(){
 metaIds().forEach(id=>{if($(id))state.meta[id]=$(id).value});
 if($("toleranceInput"))state.tolerance=Number($("toleranceInput").value)||0;
 localStorage.setItem(STORAGE,JSON.stringify(state));
}
function load(){
 try{
  const s=JSON.parse(localStorage.getItem(STORAGE)||"{}");
  Object.assign(state,s);
  if(!state.vals)state.vals=Array.from({length:state.N||40},()=>[null,null,null,null]);
 }catch(e){}
 normalize();
}
function buildTable(){
 const tb=$("tbody");
 if(!tb)return;
 tb.innerHTML="";
 for(let i=1;i<=state.N;i++){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${i}</td>${[1,2,3,4].map(c=>`<td><button data-edit="${i},${c}" id="v${c}_${i}"></button></td>`).join("")}<td id="m_${i}"></td><td id="co_${i}"></td><td id="cu_${i}"></td>`;
  tb.appendChild(tr);
 }
 tb.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
  const [r,c]=b.dataset.edit.split(",").map(Number);
  state.row=r;
  state.mode=c;
  state.buf=currentValue();
  if($("tableWrap"))$("tableWrap").classList.add("hidden");
  update();
  scrollTo({top:0,behavior:"smooth"});
 });
}
function currentValue(){
 if(state.N===0||state.row<1)return"";
 const v=state.vals[state.row-1][state.mode-1];
 return v===null?"":String(Math.abs(v));
}
function inputNumber(){
 if(state.buf==="")return NaN;
 let x=Number(state.buf);
 if(state.minusLock&&x>0)x=-x;
 return x;
}
function moveNext(){
 if(state.N===0){state.row=0;return}
 if(state.row<state.N)state.row++;
 else if(state.mode<4){state.mode++;state.row=1}
 else state.row=state.N;
}
function commit(){
 if(state.N===0)return;
 const x=inputNumber();
 if(Number.isFinite(x)){
  pushUndo();
  state.vals[state.row-1][state.mode-1]=x;
  moveNext();
  state.buf=currentValue();
  update();
 }
}
function setCount(n){
 pushUndo();
 state.N=n;
 normalize();
 buildTable();
 update();
}
function setRangeFromInputs(){
 pushUndo();
 let s=Number($("rangeStartInput").value),e=Number($("rangeEndInput").value);
 if(!Number.isFinite(s))s=1;
 if(!Number.isFinite(e))e=state.N;
 s=Math.round(s);e=Math.round(e);
 if(state.N===0){state.rangeStart=0;state.rangeEnd=0}
 else{
  s=Math.max(1,Math.min(state.N,s));
  e=Math.max(1,Math.min(state.N,e));
  if(e<s){const t=s;s=e;e=t}
  state.rangeStart=s;
  state.rangeEnd=e;
 }
 update();
}
function setCountFromInput(){
 let n=Number($("pointCountInput").value);
 if(!Number.isFinite(n))n=state.N;
 setCount(n);
}
function ensureGraphButtons(){
 if($("invertYBtn"))return;
 const graph=$("graph");
 if(!graph||!graph.parentNode)return;
 const box=document.createElement("div");
 box.className="rowBtns";
 box.style.marginBottom="8px";
 box.innerHTML=`<button id="invertYBtn" type="button">＋−上下反転</button><button id="invertXBtn" type="button">左右反転</button><div class="note">グラフ表示だけ反転します。計算値は変わりません。</div>`;
 graph.parentNode.insertBefore(box,graph);
 $("invertYBtn").onclick=()=>{state.invertY=!state.invertY;update()};
 $("invertXBtn").onclick=()=>{state.invertX=!state.invertX;update()};
}
function render(){
 if($("modeText"))$("modeText").textContent=state.mode;
 if($("rowText"))$("rowText").textContent=state.N?state.row:"-";
 if($("readout"))$("readout").textContent=state.buf===""?"0":fmt(inputNumber());
 const done=state.vals.filter(v=>v[state.mode-1]!==null).length;
 if($("doneText"))$("doneText").textContent=done;
 if($("totalText"))$("totalText").textContent=state.N;
 if($("progressBar"))$("progressBar").style.width=(state.N?done/state.N*100:0)+"%";
 if($("minusLock")){
  $("minusLock").classList.toggle("minusOn",state.minusLock);
  $("minusLock").textContent=state.minusLock?"−固定中":"−固定";
 }
 if($("pointCountInput"))$("pointCountInput").value=state.N;
 if($("rangeStartInput"))$("rangeStartInput").value=state.rangeStart;
 if($("rangeEndInput"))$("rangeEndInput").value=state.rangeEnd;
 if($("rangeLabel"))$("rangeLabel").textContent=state.rangeStart+"-"+state.rangeEnd;
 if($("toleranceInput"))$("toleranceInput").value=state.tolerance||0;
 if($("invertYBtn"))$("invertYBtn").textContent=state.invertY?"＋−上下反転中":"＋−上下反転";
 if($("invertXBtn"))$("invertXBtn").textContent=state.invertX?"左右反転中":"左右反転";
}
function update(doSave=true){
 normalize();
 result=calcSeries(state);
 if($("avgText"))$("avgText").textContent=fmt(result.avg);
 if($("lastText"))$("lastText").textContent=fmt(result.last);
 if($("devText"))$("devText").textContent=fmt(result.dev.maxDev);
 const ok=state.tolerance>0 ? result.dev.maxDev<=state.tolerance : null;
 if($("judgeText")){
  $("judgeText").textContent=ok===null?"---":(ok?"PASS":"NG");
  $("judgeText").className=ok===null?"":(ok?"pass":"ng");
 }
 if($("devDetailText"))$("devDetailText").textContent=`測定${state.mode}：左 ${fmt(result.dev.left.maxDev)} / 中央 ${fmt(result.dev.center.maxDev)} / 右 ${fmt(result.dev.right.maxDev)}`;
 for(const r of result.rows){
  for(let c=1;c<=4;c++)if($("v"+c+"_"+r.pos))$("v"+c+"_"+r.pos).textContent=fmt(r.vals[c-1]);
  if($("m_"+r.pos))$("m_"+r.pos).textContent=fmt(r.m);
  if($("co_"+r.pos))$("co_"+r.pos).textContent=fmt(r.co);
  if($("cu_"+r.pos))$("cu_"+r.pos).textContent=fmt(r.cu);
 }
 redraw();
 render();
 if(doSave)save();
}
function showShot(){
 $("inputView").classList.add("hidden");
 $("shotView").classList.remove("hidden");
 $("pSerial").textContent=state.meta.serial||"";
 $("pModel").textContent=state.meta.model||"";
 $("pName").textContent=state.meta.name||"";
 $("pDate").textContent=state.meta.date||"";
 $("pOutside").textContent=state.meta.outsideTemp||"";
 $("pMachine").textContent=state.meta.machineTemp||"";
 $("pOperator").textContent=state.meta.operator||"";
 $("pNote").textContent=state.meta.note||"";
 $("pSummary").textContent=`測定${state.mode}　平均範囲：${state.rangeStart}-${state.rangeEnd}　平均：${fmt(result.avg)}　全体最大差：${fmt(result.dev.maxDev)}　判定：${$("judgeText").textContent}`;
 $("pDevDetail").textContent=$("devDetailText").textContent;
 redraw();
 $("printTable").innerHTML=`<table>${$("dataTable").innerHTML}</table>`;
 scrollTo({top:0});
}
function showInput(){
 $("shotView").classList.add("hidden");
 $("inputView").classList.remove("hidden");
 scrollTo({top:0});
}
function download(name,text,type){
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([text],{type}));
 a.download=name;
 a.click();
}
function csvOut(){
 const rows=[["位置","測定1","測定2","測定3","測定4",`測定${state.mode}平均`,`測定${state.mode}補正`,`測定${state.mode}累計`]];
 result.rows.forEach(r=>rows.push([r.pos,...r.vals.map(fmt),fmt(r.m),fmt(r.co),fmt(r.cu)]));
 download("autocollimator.csv","\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv");
}
function jsonOut(){save();download("autocollimator_data.json",JSON.stringify(state,null,2),"application/json")}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY)||"[]")}catch(e){return[]}}
function saveHistory(){
 save();
 const h=history();
 h.unshift({time:new Date().toLocaleString(),title:`${state.meta.serial||""} ${state.meta.name||""}`.trim()||"測定データ",data:JSON.parse(JSON.stringify(state))});
 localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,50)));
 renderHistory();
 alert("履歴保存しました");
}
function renderHistory(){
 const h=history(),box=$("historyList");
 if(!box)return;
 box.innerHTML="";
 h.forEach((item,i)=>{
  const div=document.createElement("div");
  div.className="histItem";
  div.innerHTML=`<span>${item.time} / ${item.title}</span><span><button data-load="${i}">読込</button><button data-del="${i}">削除</button></span>`;
  box.appendChild(div);
 });
 box.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{Object.assign(state,h[Number(b.dataset.load)].data);normalize();buildTable();update()});
 box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const arr=history();arr.splice(Number(b.dataset.del),1);localStorage.setItem(HISTORY,JSON.stringify(arr));renderHistory()});
}
document.addEventListener("DOMContentLoaded",()=>{
 loadTheme();
 load();
 metaIds().forEach(id=>{
  if($(id)){
   $(id).value=state.meta[id]||"";
   $(id).oninput=()=>{state.meta[id]=$(id).value;save()};
  }
 });
 buildTable();
 ensureGraphButtons();
 update(false);
 renderHistory();

 document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{state.mode=Number(b.dataset.mode);state.row=1;state.buf=currentValue();update()});
 document.querySelectorAll("[data-count]").forEach(b=>b.onclick=()=>setCount(Number(b.dataset.count)));
 document.querySelectorAll("[data-key]").forEach(b=>b.onclick=()=>{if(state.buf==="0")state.buf=b.dataset.key;else state.buf+=b.dataset.key;render()});

 $("countMinus").onclick=()=>setCount(state.N-1);
 $("countPlus").onclick=()=>setCount(state.N+1);
 $("pointCountInput").onchange=setCountFromInput;
 $("pointCountInput").onblur=setCountFromInput;

 $("rangeStartInput").onchange=setRangeFromInputs;
 $("rangeStartInput").onblur=setRangeFromInputs;
 $("rangeEndInput").onchange=setRangeFromInputs;
 $("rangeEndInput").onblur=setRangeFromInputs;
 $("toleranceInput").onchange=()=>{state.tolerance=Number($("toleranceInput").value)||0;update()};

 $("rangeStartMinus").onclick=()=>{state.rangeStart=Math.max(1,state.rangeStart-1);update()};
 $("rangeStartPlus").onclick=()=>{state.rangeStart=Math.min(state.N,state.rangeStart+1);if(state.rangeStart>state.rangeEnd)state.rangeEnd=state.rangeStart;update()};
 $("rangeEndMinus").onclick=()=>{state.rangeEnd=Math.max(1,state.rangeEnd-1);if(state.rangeEnd<state.rangeStart)state.rangeStart=state.rangeEnd;update()};
 $("rangeEndPlus").onclick=()=>{state.rangeEnd=Math.min(state.N,state.rangeEnd+1);update()};
 $("rangeAll").onclick=()=>{state.rangeStart=state.N?1:0;state.rangeEnd=state.N;update()};

 $("backspace").onclick=()=>{state.buf=state.buf.slice(0,-1);render()};
 $("clearBuf").onclick=()=>{state.buf="";render()};
 $("minusLock").onclick=()=>{state.minusLock=!state.minusLock;render()};
 $("prevRow").onclick=()=>{if(state.row>1)state.row--;state.buf=currentValue();render()};
 $("skipRow").onclick=()=>{moveNext();state.buf=currentValue();render()};
 $("commit").onclick=commit;

 $("clearBtn").onclick=()=>{if(confirm("全部消去しますか？")){pushUndo();state.vals=Array.from({length:state.N},()=>[null,null,null,null]);state.row=1;state.mode=1;state.buf="";update()}};
 $("undoBtn").onclick=()=>{const s=undoStack.pop();if(s){redoStack.push({vals:cloneVals(),N:state.N,rangeStart:state.rangeStart,rangeEnd:state.rangeEnd,tolerance:state.tolerance,invertY:state.invertY,invertX:state.invertX});restore(s)}};
 $("redoBtn").onclick=()=>{const s=redoStack.pop();if(s){undoStack.push({vals:cloneVals(),N:state.N,rangeStart:state.rangeStart,rangeEnd:state.rangeEnd,tolerance:state.tolerance,invertY:state.invertY,invertX:state.invertX});restore(s)}};

 $("toggleTable").onclick=()=>$("tableWrap").classList.toggle("hidden");
 $("csvBtn").onclick=csvOut;
 $("jsonBtn").onclick=jsonOut;
 $("historySaveBtn").onclick=saveHistory;
 $("historyToggleBtn").onclick=()=>$("historyWrap").classList.toggle("hidden");

 $("jsonLoad").onchange=e=>{
  const f=e.target.files[0];
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
   try{Object.assign(state,JSON.parse(rd.result));normalize();buildTable();update()}
   catch(err){alert("読込に失敗しました")}
  };
  rd.readAsText(f);
 };

 $("inputBtn").onclick=showInput;
 $("shotBtn").onclick=showShot;
 $("printBtn").onclick=()=>{showShot();setTimeout(()=>print(),100)};
 $("backInput1").onclick=showInput;
 $("doPrint").onclick=()=>print();
 $("lightBtn").onclick=()=>applyTheme("light");
 $("darkBtn").onclick=()=>applyTheme("dark");
});