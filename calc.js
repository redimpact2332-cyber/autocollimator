function fmt(x){return Number.isFinite(x)?String(Math.round(x*10)/10).replace(/\.0$/,''):''}
function half(x){return Math.round(x*2)/2}
function activeMode(state){return Math.min(4,Math.max(1,Number(state.mode)||1))}
function measuredAt(state,i){
 const c=activeMode(state)-1;
 const row=state.vals[i]||[];
 const v=row[c];
 return v!==null&&Number.isFinite(Number(v))?Number(v):NaN;
}
function calcAverage(state){
 if(state.N===0)return 0;
 const s=Math.max(1,Math.min(state.rangeStart,state.rangeEnd));
 const e=Math.min(state.N,Math.max(state.rangeStart,state.rangeEnd));
 const arr=[];
 for(let i=s-1;i<=e-1;i++){
  const v=measuredAt(state,i);
  if(Number.isFinite(v))arr.push(v);
 }
 return arr.length?half(arr.reduce((a,b)=>a+b,0)/arr.length):0;
}
function calcSeries(state){
 const avg=calcAverage(state);
 let cum=0;
 const data=[{p:0,y:0,base:true}];
 const rows=[];
 for(let i=0;i<state.N;i++){
  const m=measuredAt(state,i);
  let co=NaN,cu=NaN;
  if(Number.isFinite(m)){
   co=half(m-avg);
   cum=half(cum+co);
   cu=cum;
  }
  data.push({p:i+1,y:cu});
  rows.push({pos:i+1,vals:state.vals[i],m,co,cu});
 }
 const dev=calcDeviation(data,state);
 return {avg,data,rows,dev,last:rows.length?rows[rows.length-1].cu:NaN};
}
function calcDeviation(data,state){
 const s=state.rangeStart,e=state.rangeEnd;
 const ps=data.find(d=>d.p===s&&Number.isFinite(d.y));
 const pe=data.find(d=>d.p===e&&Number.isFinite(d.y));
 const blank={maxDev:0,devPoint:null};
 if(!ps||!pe||s===e)return{maxDev:0,devPoint:null,line:null,left:{...blank},center:{...blank},right:{...blank}};
 const lineYAt=p=>ps.y+(pe.y-ps.y)*(p-s)/(e-s);
 const sections={left:{maxDev:0,devPoint:null},center:{maxDev:0,devPoint:null},right:{maxDev:0,devPoint:null}};
 for(const d of data){
  if(!Number.isFinite(d.y))continue;
  const ly=lineYAt(d.p),dv=Math.abs(d.y-ly);
  const key=d.p<s?'left':(d.p>e?'right':'center');
  if(dv>sections[key].maxDev)sections[key]={maxDev:dv,devPoint:{p:d.p,y:d.y,lineY:ly,dev:dv}};
 }
 for(const k of ['left','center','right'])sections[k].maxDev=half(sections[k].maxDev);
 let maxObj=sections.left;
 for(const k of ['center','right'])if(sections[k].maxDev>maxObj.maxDev)maxObj=sections[k];
 return{maxDev:maxObj.maxDev,devPoint:maxObj.devPoint,line:{s,e,y1:ps.y,y2:pe.y,lineYAt},...sections};
}
