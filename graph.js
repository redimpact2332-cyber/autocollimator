function drawGraph(canvas,data,dev,N){
 const dark=document.body&&document.body.classList.contains("dark");
 const invY=window.graphInvertY===true;
 const invX=window.graphInvertX===true;

 const bg=dark?"#0d1117":"#fff";
 const fg=dark?"#e9edf5":"#333";
 const gridMinor=dark?"#202734":"#eee";
 const gridMajor=dark?"#3b4658":"#bbb";
 const border=dark?"#8c98aa":"#000";
 const line=dark?"#f5f7fb":"#111";

 const g=canvas.getContext("2d"),w=canvas.width,h=canvas.height,L=64,T=30,R=22,B=46;
 g.clearRect(0,0,w,h);
 g.fillStyle=bg;
 g.fillRect(0,0,w,h);

 const valid=data.filter(d=>Number.isFinite(d.y));
 const ys=valid.map(d=>invY?-d.y:d.y);

 let min=Math.min(-5,...ys,0);
 let max=Math.max(5,...ys,0);

 if(dev.line){
   for(let p=0;p<=N;p++){
     const ly=dev.line.lineYAt(p);
     if(Number.isFinite(ly)){
       const y=invY?-ly:ly;
       min=Math.min(min,y);
       max=Math.max(max,y);
     }
   }
 }

 min=Math.floor(min/5)*5;
 max=Math.ceil(max/5)*5;
 if(min===max){min-=5;max+=5}

 const graphN=Math.max(1,N);
 const xs=p=>{
   const t=graphN<=0?0:p/graphN;
   return L+t*(w-L-R);
 const yy=y=>T+(max-y)/(max-min)*(h-T-B);
 const gy=y=>-y;

 g.font="16px sans-serif";
 g.lineWidth=1;

 for(let i=0;i<=N;i++){
   g.strokeStyle=i%5?gridMinor:gridMajor;
   g.beginPath();
   g.moveTo(xs(i),T);
   g.lineTo(xs(i),h-B);
   g.stroke();

   if(i%5===0||i===0||i===N){
     g.fillStyle=fg;
     g.fillText(String(i),xs(i)-8,h-14);
   }
 }

 for(let y=min;y<=max;y+=0.5){
   const major=Math.abs(y%5)<.001;
   g.strokeStyle=major?gridMajor:gridMinor;
   g.beginPath();
   g.moveTo(L,yy(y));
   g.lineTo(w-R,yy(y));
   g.stroke();

   if(major){
     g.fillStyle=fg;
     g.fillText((y>0?"+":"")+fmt(y),8,yy(y)+5);
   }
 }

 g.strokeStyle=border;
 g.lineWidth=2;
 g.setLineDash([]);
 g.strokeRect(L,T,w-L-R,h-T-B);

 g.beginPath();
 g.moveTo(L,yy(0));
 g.lineTo(w-R,yy(0));
 g.stroke();

 if(valid.length){
   g.strokeStyle=line;
   g.lineWidth=4;
   g.beginPath();
   valid.forEach((d,i)=>{
     const x=xs(d.p);
     const y=yy(gy(d.y));
     i?g.lineTo(x,y):g.moveTo(x,y);
   });
   g.stroke();
 }

 if(dev.line){
   const lineY=p=>gy(dev.line.lineYAt(p));
   g.strokeStyle="red";
   g.lineWidth=3;

   if(dev.line.s>0){
     g.setLineDash([8,6]);
     g.beginPath();
     g.moveTo(xs(0),yy(lineY(0)));
     g.lineTo(xs(dev.line.s),yy(gy(dev.line.y1)));
     g.stroke();
   }

   g.setLineDash([]);
   g.beginPath();
   g.moveTo(xs(dev.line.s),yy(gy(dev.line.y1)));
   g.lineTo(xs(dev.line.e),yy(gy(dev.line.y2)));
   g.stroke();

   if(dev.line.e<N){
     g.setLineDash([8,6]);
     g.beginPath();
     g.moveTo(xs(dev.line.e),yy(gy(dev.line.y2)));
     g.lineTo(xs(N),yy(lineY(N)));
     g.stroke();
   }

   g.setLineDash([]);
   const labels=[["左",dev.left,8,-10],["中央",dev.center,8,-10],["右",dev.right,-95,-10]];
   g.font="bold 18px sans-serif";

   for(const [name,obj,dx,dy] of labels){
     if(obj&&obj.devPoint){
       const x=xs(obj.devPoint.p);
       const y1=yy(gy(obj.devPoint.y));
       const y2=yy(gy(obj.devPoint.lineY));

       g.strokeStyle="red";
       g.lineWidth=2;
       g.setLineDash([4,4]);
       g.beginPath();
       g.moveTo(x,y1);
       g.lineTo(x,y2);
       g.stroke();
       g.setLineDash([]);

       g.fillStyle="red";
       g.beginPath();
       g.arc(x,y1,6,0,Math.PI*2);
       g.fill();

       g.fillText(name+" "+fmt(obj.maxDev),Math.max(L+2,Math.min(w-R-95,x+dx)),Math.max(T+20,y1+dy));
     }
   }
 }

 g.setLineDash([]);
}