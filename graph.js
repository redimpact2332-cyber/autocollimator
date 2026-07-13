function drawGraph(canvas,data,dev,N,options={}){
 if(!canvas)return;
 const dark=document.body&&document.body.classList.contains('dark');
 const bg=dark?'#0d1117':'#fff',fg=dark?'#e9edf5':'#333',gridMinor=dark?'#202734':'#eee',gridMajor=dark?'#3b4658':'#bbb',border=dark?'#8c98aa':'#000',line=dark?'#f5f7fb':'#111';
 const invertY=!!options.invertY;
 const invertX=!!options.invertX;
 const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,L=64,T=30,R=22,B=46;
 g.clearRect(0,0,w,h);g.fillStyle=bg;g.fillRect(0,0,w,h);
 const plotData=(data||[]).map(d=>({p:d.p,y:Number.isFinite(d.y)?(invertY?-d.y:d.y):NaN}));
 const valid=plotData.filter(d=>Number.isFinite(d.y)),ys=valid.map(d=>d.y);
 let min=Math.min(-5,...ys),max=Math.max(5,...ys);
 const lineYAtRaw=dev&&dev.line?dev.line.lineYAt:null;
 if(lineYAtRaw){for(let p=0;p<=N;p++){const ly=lineYAtRaw(p);if(Number.isFinite(ly)){const y=invertY?-ly:ly;min=Math.min(min,y);max=Math.max(max,y)}}}
 min=Math.floor(min/5)*5;max=Math.ceil(max/5)*5;if(min===max){min-=5;max+=5}
 const xs=p=>{
  const graphN=Math.max(1,N);
  const t=Math.max(0,Math.min(1,p/graphN));
  return invertX?(w-R-t*(w-L-R)):(L+t*(w-L-R));
 };
 const yy=y=>T+(max-y)/(max-min)*(h-T-B);
 const lineY=p=>{
  if(!lineYAtRaw)return NaN;
  const v=lineYAtRaw(p);
  return Number.isFinite(v)?(invertY?-v:v):NaN;
 };
 g.font='16px sans-serif';g.lineWidth=1;
 for(let i=0;i<=N;i++){
  g.strokeStyle=i%5?gridMinor:gridMajor;g.beginPath();g.moveTo(xs(i),T);g.lineTo(xs(i),h-B);g.stroke();
  if(i%5===0||i===0||i===N){g.fillStyle=fg;g.fillText(String(i),xs(i)-8,h-14)}
 }
 for(let y=min;y<=max;y+=0.5){
  const major=Math.abs(y%5)<.001;g.strokeStyle=major?gridMajor:gridMinor;g.beginPath();g.moveTo(L,yy(y));g.lineTo(w-R,yy(y));g.stroke();
  if(major){g.fillStyle=fg;g.fillText((y>0?'+':'')+fmt(y),8,yy(y)+5)}
 }
 g.strokeStyle=border;g.lineWidth=2;g.setLineDash([]);g.strokeRect(L,T,w-L-R,h-T-B);g.beginPath();g.moveTo(L,yy(0));g.lineTo(w-R,yy(0));g.stroke();
 if(valid.length){g.strokeStyle=line;g.lineWidth=4;g.beginPath();valid.forEach((d,i)=>i?g.lineTo(xs(d.p),yy(d.y)):g.moveTo(xs(d.p),yy(d.y)));g.stroke()}
 if(dev&&dev.line){
  g.strokeStyle='red';g.lineWidth=3;
  if(dev.line.s>0){g.setLineDash([8,6]);g.beginPath();g.moveTo(xs(0),yy(lineY(0)));g.lineTo(xs(dev.line.s),yy(lineY(dev.line.s)));g.stroke()}
  g.setLineDash([]);g.beginPath();g.moveTo(xs(dev.line.s),yy(lineY(dev.line.s)));g.lineTo(xs(dev.line.e),yy(lineY(dev.line.e)));g.stroke();
  if(dev.line.e<N){g.setLineDash([8,6]);g.beginPath();g.moveTo(xs(dev.line.e),yy(lineY(dev.line.e)));g.lineTo(xs(N),yy(lineY(N)));g.stroke()}
  g.setLineDash([]);
  g.font='bold 18px sans-serif';
  if(dev.showSignedExtrema){
   // プラス最大値とマイナス最大値をそれぞれ表示する。
   const positives=valid.filter(d=>d.y>0);
   const negatives=valid.filter(d=>d.y<0);
   const extrema=[];
   if(positives.length){
    const maxPoint=positives.reduce((a,b)=>b.y>a.y?b:a);
    extrema.push({name:'最大',point:maxPoint,color:'red',dx:8,dy:-10});
   }
   if(negatives.length){
    const minPoint=negatives.reduce((a,b)=>b.y<a.y?b:a);
    extrema.push({name:'最小',point:minPoint,color:'#1687ff',dx:8,dy:28});
   }
   for(const ex of extrema){
    const x=xs(ex.point.p),y1=yy(ex.point.y),y2=yy(lineY(ex.point.p));
    g.strokeStyle=ex.color;g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.moveTo(x,y1);g.lineTo(x,y2);g.stroke();g.setLineDash([]);
    g.fillStyle=ex.color;g.beginPath();g.arc(x,y1,6,0,Math.PI*2);g.fill();
    const value=(ex.point.y>0?'+':'')+fmt(ex.point.y);
    g.fillText(ex.name+' '+value,Math.max(L+2,Math.min(w-R-105,x+ex.dx)),Math.max(T+20,Math.min(h-B-8,y1+ex.dy)));
   }
  }else{
   const labels=[['左',dev.left,8,-10],['中央',dev.center,8,-10],['右',dev.right,-95,-10]];
   for(const [name,obj,dx,dy] of labels){
    if(obj&&obj.devPoint){
     const x=xs(obj.devPoint.p),y1=yy(invertY?-obj.devPoint.y:obj.devPoint.y),y2=yy(lineY(obj.devPoint.p));
     g.strokeStyle='red';g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.moveTo(x,y1);g.lineTo(x,y2);g.stroke();g.setLineDash([]);
     g.fillStyle='red';g.beginPath();g.arc(x,y1,6,0,Math.PI*2);g.fill();
     g.fillText(name+' '+fmt(obj.maxDev),Math.max(L+2,Math.min(w-R-95,x+dx)),Math.max(T+20,y1+dy));
    }
   }
  }
 }
 if(dev&&dev.manual&&Array.isArray(dev.pendingPoints)){
  for(const p of dev.pendingPoints){
   const point=valid.find(d=>d.p===p);
   if(!point)continue;
   const x=xs(point.p),y=yy(point.y);
   g.fillStyle="#ff9500";
   g.beginPath();g.arc(x,y,9,0,Math.PI*2);g.fill();
   g.fillStyle=fg;g.font="bold 16px sans-serif";
   g.fillText("点"+p,Math.max(L+2,Math.min(w-R-45,x+10)),Math.max(T+18,y-10));
  }
 }
 g.setLineDash([]);
}


function drawFieldPrintGraph(canvas,data,dev,rowCount,options={}){
 if(!canvas)return;
 const g=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
 const rows=46;
 const measureCount=Math.max(0,Math.min(rows,Number(options.measureCount)||0));
 const rowCenters=options.rowCenters||{};
 const zeroY=Number.isFinite(options.zeroY)?options.zeroY:0;
 const invertY=!!options.invertY;
 const invertX=!!options.invertX;

 g.clearRect(0,0,w,h);
 g.fillStyle="#fff";g.fillRect(0,0,w,h);

 const cumulative=[{p:0,y:0},...(options.cumulativeData||[])
  .filter(d=>d.p>=1&&d.p<=46&&Number.isFinite(d.y))
  .sort((a,b)=>a.p-b.p)]
  .map(d=>({p:d.p,y:invertY?-d.y:d.y}));

 const values=cumulative.map(d=>d.y);
 if(dev&&dev.line&&typeof dev.line.lineYAt==="function"){
  for(let p=1;p<=measureCount;p++){
   const raw=dev.line.lineYAt(p);
   const v=Number.isFinite(raw)?(invertY?-raw:raw):NaN;
   if(Number.isFinite(v))values.push(v);
  }
 }

 const vmin=values.length?Math.min(...values):0;
 const vmax=values.length?Math.max(...values):0;
 const rawSpan=Math.max(1,vmax-vmin);
 const pad=Math.max(2,rawSpan*.10,Math.max(Math.abs(vmin),Math.abs(vmax))*.04);
 let min=Math.min(0,vmin)-pad;
 let max=Math.max(0,vmax)+pad;
 if(max-min<40){
  const mid=(min+max)/2;
  min=mid-20;max=mid+20;
 }
 const cellStep=(max-min)/20;
 const xx=v=>(v-min)/(max-min)*w;

 const baseY=p=>{
  if(Number.isFinite(rowCenters[p]))return rowCenters[p];
  return ((p-.5)/rows)*h;
 };
 const rowBoundary=p=>{
  if(p<=0)return zeroY;
  if(Number.isFinite(rowCenters[p])&&Number.isFinite(rowCenters[p+1])){
   return (rowCenters[p]+rowCenters[p+1])/2;
  }
  return (p/rows)*h;
 };
 const yy=p=>{
  if(!invertX)return p<=0?rowBoundary(0):baseY(p);
  if(p<=0)return rowBoundary(measureCount);
  return baseY(measureCount-p+1);
 };

 const scaleBox=canvas.parentElement&&canvas.parentElement.querySelector(".fieldScaleLabels");
 if(scaleBox)scaleBox.innerHTML="";

 for(let i=0;i<=20;i++){
  const v=min+i*cellStep,major=i%2===0;
  g.strokeStyle=major?"#555":"#888";
  g.lineWidth=major?1.25:.75;
  g.setLineDash(major?[]:[5,5]);
  g.beginPath();g.moveTo(xx(v),0);g.lineTo(xx(v),h);g.stroke();
 }
 g.setLineDash([]);

 for(let p=1;p<=46;p++){
  const y=baseY(p);
  g.strokeStyle="#777";g.lineWidth=.8;
  g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();
 }

 g.strokeStyle="#000";g.lineWidth=2;g.strokeRect(0,0,w,h);
 if(min<=0&&max>=0){
  g.lineWidth=3;
  g.beginPath();g.moveTo(xx(0),0);g.lineTo(xx(0),h);g.stroke();
 }

 g.save();g.beginPath();g.rect(0,0,w,h);g.clip();

 g.strokeStyle="#000";g.lineWidth=3;g.setLineDash([]);
 g.beginPath();g.moveTo(xx(0),yy(0));
 for(let i=1;i<cumulative.length;i++){
  const d=cumulative[i];
  g.lineTo(xx(d.y),yy(d.p));
 }
 g.stroke();

 g.fillStyle="#000";
 g.beginPath();g.arc(xx(0),yy(0),3.8,0,Math.PI*2);g.fill();
 for(let i=1;i<cumulative.length;i++){
  const d=cumulative[i];
  g.beginPath();g.arc(xx(d.y),yy(d.p),3.8,0,Math.PI*2);g.fill();
 }

 if(dev&&dev.line&&typeof dev.line.lineYAt==="function"&&measureCount>=1){
  const s=Math.max(1,Math.min(measureCount,Number(dev.line.s)||1));
  const e=Math.max(s,Math.min(measureCount,Number(dev.line.e)||s));
  const at=p=>{
   const raw=dev.line.lineYAt(p);
   return Number.isFinite(raw)?(invertY?-raw:raw):NaN;
  };
  const seg=(a,b,dash)=>{
   const y1=at(a),y2=at(b);
   if(!Number.isFinite(y1)||!Number.isFinite(y2)||b<a)return;
   g.strokeStyle="#333";g.lineWidth=2.2;g.setLineDash(dash?[9,6]:[]);
   g.beginPath();g.moveTo(xx(y1),yy(a));g.lineTo(xx(y2),yy(b));g.stroke();
  };
  if(s>1)seg(1,s,true);
  seg(s,e,false);
  if(e<measureCount)seg(e,measureCount,true);
 }

 g.restore();
 g.setLineDash([]);
}
