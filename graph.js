function drawGraph(canvas,data,dev,N){
 const g=canvas.getContext("2d"),w=canvas.width,h=canvas.height,L=64,T=30,R=22,B=46;
 g.clearRect(0,0,w,h);g.fillStyle="#fff";g.fillRect(0,0,w,h);
 const valid=data.filter(d=>Number.isFinite(d.y)), ys=valid.map(d=>d.y);
 let min=Math.min(-5,...ys),max=Math.max(5,...ys);
 if(dev.line){for(let p=1;p<=N;p++){const ly=dev.line.lineYAt(p);min=Math.min(min,ly);max=Math.max(max,ly)}}
 min=Math.floor(min/5)*5;max=Math.ceil(max/5)*5;if(min===max){min-=5;max+=5}
 const xs=p=>L+(N<=1?0:(p-1)/(N-1))*(w-L-R), yy=y=>T+(max-y)/(max-min)*(h-T-B);
 g.font="16px sans-serif";g.lineWidth=1;
 for(let i=1;i<=N;i++){g.strokeStyle=i%5?"#eee":"#bbb";g.beginPath();g.moveTo(xs(i),T);g.lineTo(xs(i),h-B);g.stroke();if(i%5===0||i===1||i===N){g.fillStyle="#333";g.fillText(i,xs(i)-8,h-14)}}
 for(let y=min;y<=max;y+=0.5){const major=Math.abs(y%5)<.001;g.strokeStyle=major?"#aaa":"#eee";g.beginPath();g.moveTo(L,yy(y));g.lineTo(w-R,yy(y));g.stroke();if(major){g.fillStyle="#333";g.fillText((y>0?"+":"")+fmt(y),8,yy(y)+5)}}
 g.strokeStyle="#000";g.lineWidth=2;g.setLineDash([]);g.strokeRect(L,T,w-L-R,h-T-B);g.beginPath();g.moveTo(L,yy(0));g.lineTo(w-R,yy(0));g.stroke();
 if(valid.length){g.strokeStyle="#111";g.lineWidth=4;g.beginPath();valid.forEach((d,i)=>i?g.lineTo(xs(d.p),yy(d.y)):g.moveTo(xs(d.p),yy(d.y)));g.stroke()}
 if(dev.line){
   const lineY=p=>dev.line.lineYAt(p); g.strokeStyle="red";g.lineWidth=3;
   if(dev.line.s>1){g.setLineDash([8,6]);g.beginPath();g.moveTo(xs(1),yy(lineY(1)));g.lineTo(xs(dev.line.s),yy(dev.line.y1));g.stroke()}
   g.setLineDash([]);g.beginPath();g.moveTo(xs(dev.line.s),yy(dev.line.y1));g.lineTo(xs(dev.line.e),yy(dev.line.y2));g.stroke();
   if(dev.line.e<N){g.setLineDash([8,6]);g.beginPath();g.moveTo(xs(dev.line.e),yy(dev.line.y2));g.lineTo(xs(N),yy(lineY(N)));g.stroke()}
   g.setLineDash([]);
   const labels=[["左",dev.left,8,-10],["中央",dev.center,8,-10],["右",dev.right,-95,-10]];
   g.font="bold 18px sans-serif";
   for(const [name,obj,dx,dy] of labels){
     if(obj&&obj.devPoint){
       const x=xs(obj.devPoint.p), y1=yy(obj.devPoint.y), y2=yy(obj.devPoint.lineY);
       g.strokeStyle="red";g.lineWidth=2;g.setLineDash([4,4]);g.beginPath();g.moveTo(x,y1);g.lineTo(x,y2);g.stroke();g.setLineDash([]);
       g.fillStyle="red";g.beginPath();g.arc(x,y1,6,0,Math.PI*2);g.fill();
       g.fillText(name+" "+fmt(obj.maxDev),Math.max(L+2,Math.min(w-R-95,x+dx)),Math.max(T+20,y1+dy));
     }
   }
 }
 g.setLineDash([]);
}
