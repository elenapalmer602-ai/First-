/* Chainex Supply — page behaviour */
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ARROW='<svg class="ico"><use href="#i-arrow"/></svg>';

  /* Nav turns solid once the page scrolls */
  var nav=$('.nav');
  var onScroll=function(){nav.classList.toggle('scrolled',window.scrollY>24||!menu.hidden)};
  window.addEventListener('scroll',onScroll,{passive:true});

  /* Hero film: plays muted on a loop while the hero is on screen. With reduced motion, or if the browser
     blocks autoplay, the opening still shows instead (and the button offers to play it). */
  var hero=$('.hero-film');
  if(hero){
    var vid=$('.hf-video',hero),hfBtn=$('.hf-toggle',hero),held=false,heroOn=true,loaded=false;
    var FILM=[['assets/film/hero-av1.mp4','video/mp4; codecs="av01.0.08M.08"'],['assets/film/hero.mp4','video/mp4; codecs="avc1.640029"']];
    var setStatic=function(on){hero.classList.toggle('hf-static',on);if(on)hero.classList.remove('hf-playing')};
    var setBtn=function(paused){
      hfBtn.hidden=false;hfBtn.setAttribute('aria-pressed',String(paused));
      hfBtn.setAttribute('aria-label',paused?'Play the film':'Pause the film');
    };
    var play=function(){
      if(reduce||held||!heroOn||document.hidden||!loaded)return;
      var p=vid.play();
      // only a refusal to autoplay counts; an interrupted play is not a failure
      if(p&&p.catch)p.catch(function(e){if(e&&e.name==='NotAllowedError'&&vid.paused){setStatic(true);setBtn(true)}});
    };
    vid.addEventListener('playing',function(){hero.classList.add('hf-playing');setStatic(false);setBtn(false)});
    hfBtn.addEventListener('click',function(){
      if(vid.paused){held=false;setStatic(false);play()}
      else{held=true;vid.pause();setBtn(true)}
    });
    if(reduce)setStatic(true);
    else{
      vid.innerHTML=FILM.map(function(s){return '<source src="'+s[0]+'" type=\''+s[1]+'\'>'}).join('');
      // only when every source has failed does the still take over
      vid.lastElementChild.addEventListener('error',function(){setStatic(true)});
      vid.preload='auto';vid.load();loaded=true;
      if('IntersectionObserver' in window){
        new IntersectionObserver(function(en){
          heroOn=en[0].isIntersecting;
          if(heroOn)play();else if(!vid.paused)vid.pause();
        },{threshold:.05}).observe(hero);
      }
      document.addEventListener('visibilitychange',function(){if(!document.hidden)play()});
      play();
    }
  }

  /* Savings chart: a faint line is always visible; the bright line draws over it on view.
     Hover, tap or arrow keys show each month. */
  var chartCard=$('#chart');
  if(chartCard){
    var drawLine=$('.c-draw',chartCard);
    var go=function(){chartCard.classList.add('in');if(drawLine)drawLine.style.strokeDashoffset='0'};
    if(drawLine&&!reduce&&'IntersectionObserver' in window){
      var L=drawLine.getTotalLength();drawLine.style.strokeDasharray=L;drawLine.style.strokeDashoffset=L;
      new IntersectionObserver(function(en,ob){if(en[0].isIntersecting){go();ob.disconnect()}},{threshold:.35}).observe(chartCard);
    }else go();
    if(reduce)$$('svg',chartCard).forEach(function(s){if(s.pauseAnimations)s.pauseAnimations()});
    var svg=$('svg.chart',chartCard),tip=$('.c-tip',chartCard),guide=$('.c-guide',chartCard),hov=$('.c-hover',chartCard);
    var DATA=[];try{DATA=JSON.parse(chartCard.getAttribute('data-points'))}catch(e){}
    var money=function(v){return (v<0?'−':'')+'£'+Math.abs(v).toFixed(1)+'k'};
    var showM=function(i){
      var pt=DATA[i];if(!pt)return;
      guide.setAttribute('x1',pt.x);guide.setAttribute('x2',pt.x);guide.style.opacity=1;
      hov.setAttribute('cx',pt.x);hov.setAttribute('cy',pt.y);hov.style.opacity=1;
      tip.innerHTML='<b>Month '+(i+1)+'</b><span>This month <em>'+money(pt.m)+'</em></span><span>Total saved <em>'+money(pt.c)+'</em></span>'+(pt.note?'<small>'+pt.note+'</small>':'');
      var r=svg.getBoundingClientRect(),cr=chartCard.getBoundingClientRect(),k=r.width/600,half=tip.offsetWidth/2;
      tip.style.left=Math.max(12+half,Math.min(cr.width-12-half,r.left-cr.left+pt.x*k))+'px';tip.style.top=(r.top-cr.top+pt.y*k)+'px';
      tip.classList.toggle('low',pt.y<70);tip.classList.add('on');
    };
    var hideM=function(){tip.classList.remove('on');guide.style.opacity=0;hov.style.opacity=0};
    var idx=function(e){var r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*600;return Math.max(0,Math.min(11,Math.round((x-60)/(520/11))))};
    svg.addEventListener('pointermove',function(e){showM(idx(e))});
    svg.addEventListener('pointerdown',function(e){showM(idx(e))});
    svg.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')hideM()});
    var ki=-1;
    svg.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();ki=Math.max(0,Math.min(11,(ki<0?0:ki+(e.key==='ArrowRight'?1:-1))));showM(ki)}
      if(e.key==='Escape')hideM();
    });
    svg.addEventListener('blur',hideM);
  }

  /* Six stages: each stage lights up as it scrolls into view, and the line fills behind them */
  var tl=$('#timeline');
  if(tl){
    var tlItems=$$('.tl-item',tl),fill=$('.tl-fill'),wrapEl=tl.parentNode;
    if(!reduce&&'IntersectionObserver' in window){
      tl.classList.add('ready');
      var tio=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');tio.unobserve(x.target)}})},{rootMargin:'0px 0px -30% 0px'});
      tlItems.forEach(function(it){tio.observe(it)});
    }else tlItems.forEach(function(it){it.classList.add('on')});
    var tlProg=function(){
      if(!fill)return;
      if(reduce){fill.style.transform='scaleY(1)';return}
      var r=wrapEl.getBoundingClientRect(),vh=window.innerHeight;
      fill.style.transform='scaleY('+Math.min(1,Math.max(0,(vh*.7-r.top)/r.height)).toFixed(3)+')';
    };
    window.addEventListener('scroll',tlProg,{passive:true});window.addEventListener('resize',tlProg);tlProg();
  }

  /* Certification badges: hover flips them; a tap or click keeps them flipped */
  $$('.cert-flip').forEach(function(b){b.addEventListener('click',function(){b.classList.toggle('flipped')})});

  /* Process stack: six canvas-rendered plates, one per stage. While on screen they collapse bottom-up,
     a tick grows on top, then they lift apart again, on a loop. Panning across the stack (mouse, a sideways
     swipe or arrow keys) takes over; the loop resumes about 4s after the last input, unless paused. */
  (function(){
    'use strict';
    var root=document.getElementById('pstack');
    if(!root)return;
    var stage=root.querySelector('.ps-stage');
    var cv=root.querySelector('.ps-cv'),ctx=cv.getContext('2d');
    var glowW=root.querySelector('.ps-glow-w'),glowG=root.querySelector('.ps-glow-g'),floorL=root.querySelector('.ps-floor');
    var psN=document.getElementById('psN'),psName=document.getElementById('psName');
    var mq=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
    var reduce=!!(mq&&mq.matches);

    var NAMES=['Discover','Source and compare','Verify and test','Model and recommend','Set up and transition','Monitor and improve'];
    var DONE_TXT='All six stages, one clear result';
    var OFF=[[-13,-5],[15,4.5],[-10,-3],[16,5],[-14,-4.5],[9,3]];   // spread offset per plate: x (px), twist (deg)
    var Q=0.56,C=Math.SQRT1_2,PI=Math.PI;
    var HI=[255,238,224];                                          // warm white light
    var RESUME=4;                                                  // seconds without input before auto-play resumes

    /* Finishes, bottom (stage 1) to top (stage 6). face: gradient stops from the back corner to the front corner.
       lat: light on the left corner / shade on the right corner. tex: leather grain. */
    var MATS=[
      {face:[[0,'#5d5954'],[.42,'#383532'],[.8,'#2a2826'],[1,'#47433e']],lat:[.07,.16],spec:.2,lip:.22,rim:.62,back:.12,wall:'#2b2826',tex:0,grain:.09},
      {face:[[0,'#7a6f62'],[.45,'#4a433b'],[.8,'#322d28'],[1,'#544b41']],lat:[.06,.18],spec:.24,lip:.24,rim:.64,back:.13,wall:'#312b25',tex:0,grain:.09},
      {face:[[0,'#55534f'],[.38,'#2c2c2a'],[.68,'#55574f'],[1,'#c6cfc2']],lat:[.12,.06],spec:.12,lip:.4,rim:.72,back:.12,wall:'#282725',tex:1,texA:.42,grain:.04},
      {face:[[0,'#83725f'],[.45,'#4e4236'],[.8,'#362e26'],[1,'#594c3f']],lat:[.06,.18],spec:.24,lip:.24,rim:.64,back:.13,wall:'#322a21',tex:0,grain:.09},
      {face:[[0,'#686057'],[.38,'#37332f'],[.68,'#605952'],[1,'#d4cab8']],lat:[.12,.06],spec:.12,lip:.4,rim:.72,back:.12,wall:'#2b2723',tex:1,texA:.42,grain:.04},
      {face:[[0,'#a29683'],[.32,'#71675a'],[.72,'#45403a'],[1,'#3b3631']],lat:[.08,.14],spec:.34,lip:.2,rim:.7,back:.16,wall:'#2f2a25',tex:0,grain:.1}
    ];

    /* ---------- helpers ---------- */
    function mk(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c}
    function hex(h){h=h.replace('#','');return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]}
    function rgba(c,a){return 'rgba('+Math.round(Math.max(0,Math.min(255,c[0])))+','+Math.round(Math.max(0,Math.min(255,c[1])))+','+Math.round(Math.max(0,Math.min(255,c[2])))+','+(a==null?1:+a.toFixed(4))+')'}
    function cl(x){return x<0?0:x>1?1:x}
    function smooth(x){x=cl(x);return x*x*(3-2*x)}
    function eoc(x){x=cl(x);return 1-Math.pow(1-x,3)}
    function eob(x){x=cl(x);var c1=1.5,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}
    function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

    // rounded square in plate-local coordinates (u to the right-front, v to the left-front)
    function rr(g,h,r){
      g.beginPath();g.moveTo(-h+r,-h);
      g.lineTo(h-r,-h);g.arc(h-r,-h+r,r,-PI/2,0);
      g.lineTo(h,h-r);g.arc(h-r,h-r,r,0,PI/2);
      g.lineTo(-h+r,h);g.arc(-h+r,h-r,r,PI/2,PI);
      g.lineTo(-h,-h+r);g.arc(-h+r,-h+r,r,PI,PI*1.5);
      g.closePath();
    }
    // the outline's front half, from the left extreme through the front corner to the right extreme
    function frontHalf(g,h,r){
      g.beginPath();
      g.arc(-h+r,h-r,r,PI*.75,PI*.5,true);g.lineTo(h-r,h);
      g.arc(h-r,h-r,r,PI*.5,0,true);g.lineTo(h,-h+r);
      g.arc(h-r,-h+r,r,0,-PI*.25,true);
    }
    function backHalf(g,h,r){
      g.beginPath();
      g.arc(h-r,-h+r,r,-PI*.25,-PI*.5,true);g.lineTo(-h+r,-h);
      g.arc(-h+r,-h+r,r,-PI*.5,-PI,true);g.lineTo(-h,h-r);
      g.arc(-h+r,h-r,r,PI,PI*.75,true);
    }
    // projection of the plate plane (with a twist th about the vertical axis) to the screen: [a,b,c,d]
    function faceMat(th){
      var cs=Math.cos(th),sn=Math.sin(th);
      return [C*(cs-sn),C*Q*(cs+sn),C*(-sn-cs),C*Q*(cs-sn)];
    }
    // the same twist expressed as a screen-space transform, applied to a sprite rendered untwisted
    function twistMat(th){
      var M=faceMat(th),a=M[0],b=M[1],c=M[2],d=M[3];
      return [C*(a-c),C*(b-d),(a+c)*C/Q,(b+d)*C/Q];
    }

    /* ---------- geometry (set on resize) ---------- */
    var floorRef=0,W=0,H=0,S=1,DPR=1,CW=0,CH=0,PX=0,PT=0,PB=0;
    var HALF,RAD,T,SEAM,GAP,HOV_S,HOV_C,XL,YH,BOB;
    var sprites=[],refl=[],shadows=[],SIG=[],seam=null,flashFace=null,halo=null,greenFace=null,tickGlow=null,texLeather=null,texGrain=null,texDPR=0;

    function geometry(){
      W=stage.clientWidth;H=stage.clientHeight;
      S=Math.min(W/380,H/360);
      DPR=Math.min(2,window.devicePixelRatio||1);
      HALF=88*S;RAD=16*S;T=7*S;SEAM=1.3*S;GAP=33*S;HOV_S=14*S;HOV_C=4.5*S;BOB=3.2*S;
      XL=(2*HALF-RAD*(2-Math.SQRT2))*C;     // half width of the projected rounded square
      YH=XL*Q;
      PX=Math.round(58*S);PT=Math.round(46*S);PB=Math.round(76*S);
      CW=W+2*PX;CH=H+PT+PB;
      [cv,glowW,glowG,floorL].forEach(function(c){
        c.style.left=-PX+'px';c.style.top=-PT+'px';c.style.width=CW+'px';c.style.height=CH+'px';
      });
      cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);
    }

    /* ---------- textures ---------- */
    function makeLeather(N,cells,seed){
      var rnd=rng(seed),pts=new Float32Array(cells*cells*2),i,j;
      for(j=0;j<cells;j++)for(i=0;i<cells;i++){var o=(j*cells+i)*2;pts[o]=(i+.12+.76*rnd())/cells;pts[o+1]=(j+.12+.76*rnd())/cells}
      var c=mk(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,vals=new Float32Array(N*N),sum=0;
      for(var y=0;y<N;y++){
        var py=(y+.5)/N,cj=Math.floor(py*cells);
        for(var x=0;x<N;x++){
          var px=(x+.5)/N,ci=Math.floor(px*cells),f1=9,f2=9,fx=0,fy=0;
          for(var dj=-1;dj<=1;dj++){
            var jj=cj+dj,wy=0;if(jj<0){jj+=cells;wy=-1}else if(jj>=cells){jj-=cells;wy=1}
            for(var di=-1;di<=1;di++){
              var ii=ci+di,wx=0;if(ii<0){ii+=cells;wx=-1}else if(ii>=cells){ii-=cells;wx=1}
              var oo=(jj*cells+ii)*2,qx=pts[oo]+wx-px,qy=pts[oo+1]+wy-py,dd=qx*qx+qy*qy;
              if(dd<f1){f2=f1;f1=dd;fx=qx;fy=qy}else if(dd<f2)f2=dd;
            }
          }
          f1=Math.sqrt(f1)*cells;f2=Math.sqrt(f2)*cells;
          var crease=smooth((f2-f1)/.26);
          var lx=-fx*cells,ly=-fy*cells;                       // pebble centre -> pixel
          var dome=-(lx+ly)*.7071;                             // faces the back-corner light
          var v=.5+.15*dome*crease-.24*(1-crease)-.05*f1+(rnd()-.5)*.1;
          var k=(y*N+x)*4;vals[k>>2]=v;sum+=v;
        }
      }
      var shift=.5-sum/(N*N);
      for(i=0;i<N*N;i++){var b=Math.round(cl(vals[i]+shift)*255);d[i*4]=d[i*4+1]=d[i*4+2]=b;d[i*4+3]=255}
      g.putImageData(img,0,0);return c;
    }
    function makeGrain(N,seed){
      var rnd=rng(seed),c=mk(N,N),g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data;
      for(var i=0;i<N*N;i++){var b=Math.round(128+(rnd()-.5)*110);d[i*4]=d[i*4+1]=d[i*4+2]=b;d[i*4+3]=255}
      g.putImageData(img,0,0);return c;
    }
    function pattern(g,tex,scale){
      var p=g.createPattern(tex,'repeat');
      if(p&&p.setTransform&&window.DOMMatrix){try{p.setTransform(new DOMMatrix([scale,0,0,scale,0,0]))}catch(e){}}
      return p;
    }

    /* ---------- sprite builders (run once per size) ---------- */
    function wallV(f){         // vertical light profile down the slab edge: bright bevel, darker body, faint bottom lip
      if(f<.14)return 1-.22*(f/.14);
      if(f<.84)return .78-.24*((f-.14)/.7);
      if(f<.94)return .54+.16*((f-.84)/.1);
      return .7-.3*((f-.94)/.06);
    }
    function wallH(xn){        // along the edge: dark at the side corners, catching light at the front corner
      var a=Math.abs(xn);
      return (.3+.55*(1-Math.pow(a,1.5))+.5*Math.exp(-(xn/.16)*(xn/.16)))*(1+.1*xn);
    }
    function wallRow(g,ox,f,wc,mirror,alphaMul){
      var gr=g.createLinearGradient(ox-XL,0,ox+XL,0);
      for(var j=0;j<=12;j++){
        var xn=j/6-1,v=wallV(f)*wallH(xn);
        var sp=.2*Math.exp(-(xn/.1)*(xn/.1))*Math.max(0,1-f/.32);
        var col=[wc[0]*v*1.25+HI[0]*sp,wc[1]*v*1.25+HI[1]*sp,wc[2]*v*1.25+HI[2]*sp];
        if(mirror)col=[col[0]*.8,col[1]*.8,col[2]*.82];
        gr.addColorStop(j/12,rgba(col,alphaMul));
      }
      return gr;
    }
    function spriteFrame(extraPad){
      var pad=Math.ceil(extraPad);
      var ox=Math.ceil((pad+XL)*DPR)/DPR,oy=Math.ceil((pad+YH)*DPR)/DPR;
      var w=ox+XL+pad,h=oy+YH+T+pad;
      var c=mk(w*DPR,h*DPR);
      return {c:c,g:c.getContext('2d'),ox:ox,oy:oy,w:c.width/DPR,h:c.height/DPR};
    }
    function cropLower(sp){
      var top=Math.max(0,Math.floor((sp.oy-2)*DPR)),h=sp.c.height-top,c=mk(sp.c.width,h);
      c.getContext('2d').drawImage(sp.c,0,top,sp.c.width,h,0,0,sp.c.width,h);
      return {c:c,ox:sp.ox,oy:sp.oy-top/DPR,w:sp.w,h:h/DPR};
    }
    function setLocal(g,ox,oy,th){var F=faceMat(th||0),R=DPR;g.setTransform(R*F[0],R*F[1],R*F[2],R*F[3],R*ox,R*oy)}
    function setScreen(g){g.setTransform(DPR,0,0,DPR,0,0)}

    function buildPlate(m){
      var sp=spriteFrame(4*S+2),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD,wc=hex(m.wall),i,f;
      // slab edge: stacked slices of the outline, each lit by its depth below the rim
      var step=.5/DPR;
      for(i=T;i>0;i-=step){
        f=i/T;
        setLocal(g,ox,oy+i);rr(g,h,r);
        setScreen(g);g.fillStyle=wallRow(g,ox,f,wc,false,1);g.fill();
      }
      // top face
      setLocal(g,ox,oy);rr(g,h,r);
      g.save();g.clip();
      var lg=g.createLinearGradient(-h,-h,h,h);
      m.face.forEach(function(s){lg.addColorStop(s[0],s[1])});
      g.fillStyle=lg;g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
      var lat=g.createLinearGradient(-h,h,h,-h);
      lat.addColorStop(0,'rgba(255,240,226,'+m.lat[0]+')');lat.addColorStop(.5,'rgba(255,240,226,0)');
      lat.addColorStop(.5,'rgba(0,0,0,0)');lat.addColorStop(1,'rgba(0,0,0,'+m.lat[1]+')');
      g.fillStyle=lat;g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
      // satin sheen from the back corner
      g.globalCompositeOperation='screen';
      var rg=g.createRadialGradient(-.62*h,-.62*h,0,-.62*h,-.62*h,1.35*h);
      rg.addColorStop(0,rgba(HI,m.spec));rg.addColorStop(.4,rgba(HI,m.spec*.38));rg.addColorStop(1,rgba(HI,0));
      g.fillStyle=rg;g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
      // soft lip of light inside the front edges (several strokes approximate a soft falloff)
      var lipG=g.createLinearGradient(-h,h,h,-h);
      lipG.addColorStop(0,rgba(HI,0));lipG.addColorStop(.5,rgba(HI,1));lipG.addColorStop(1,rgba(HI,.15));
      [16,10,6,3].forEach(function(wd){
        frontHalf(g,h,r);g.lineWidth=wd*S;g.globalAlpha=m.lip*.28;g.strokeStyle=lipG;g.stroke();
      });
      g.globalAlpha=1;
      if(m.tex){
        [[-h,h],[h,-h]].forEach(function(p,ii){
          var sg=g.createRadialGradient(p[0],p[1],0,p[0],p[1],h*.95);
          sg.addColorStop(0,rgba(HI,ii?.1:.16));sg.addColorStop(1,rgba(HI,0));
          g.fillStyle=sg;g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
        });
      }
      // finishes
      if(m.tex){
        g.globalCompositeOperation='overlay';g.globalAlpha=m.texA;
        g.fillStyle=pattern(g,texLeather,1/DPR);g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
        g.globalAlpha=m.texA*.45;g.globalCompositeOperation='soft-light';g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
      }
      g.globalCompositeOperation='overlay';g.globalAlpha=m.grain;
      g.fillStyle=pattern(g,texGrain,1/DPR);g.fillRect(-h-2,-h-2,2*h+4,2*h+4);
      g.restore();
      // crisp rims, stroked in screen space so the line width stays even
      setLocal(g,ox,oy);frontHalf(g,h,r);setScreen(g);
      var rimG=g.createLinearGradient(ox-XL,0,ox+XL,0);
      rimG.addColorStop(0,rgba(HI,.02));rimG.addColorStop(.22,rgba(HI,m.rim*.3));rimG.addColorStop(.5,rgba(HI,m.rim));
      rimG.addColorStop(.78,rgba(HI,m.rim*.42));rimG.addColorStop(1,rgba(HI,.05));
      g.lineWidth=1.15*Math.max(.8,S);g.strokeStyle=rimG;g.stroke();
      var core=g.createLinearGradient(ox-XL*.5,0,ox+XL*.5,0);
      core.addColorStop(0,'rgba(255,250,244,0)');core.addColorStop(.5,'rgba(255,250,244,.75)');core.addColorStop(1,'rgba(255,250,244,0)');
      g.lineWidth=.6;g.strokeStyle=core;g.stroke();
      setLocal(g,ox,oy);backHalf(g,h,r);setScreen(g);
      g.lineWidth=.8;g.strokeStyle=rgba(HI,m.back);g.stroke();
      // faint lower lip of the slab
      setLocal(g,ox,oy+T);frontHalf(g,h,r);setScreen(g);
      g.lineWidth=.7;g.strokeStyle=rgba(HI,.07);g.stroke();
      return sp;
    }

    // mirrored slab edge for the floor reflection: the rim ends up at the far (lower) side of the band
    function buildReflection(m){
      var sp=spriteFrame(4*S+2),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD,wc=hex(m.wall);
      var step=.5/DPR;
      for(var i=T;i>0;i-=step){
        setLocal(g,ox,oy+i);rr(g,h,r);setScreen(g);
        g.fillStyle=wallRow(g,ox,1-i/T,wc,true,1);g.fill();
      }
      g.globalCompositeOperation='destination-out';
      setLocal(g,ox,oy);rr(g,h,r);g.fill();
      g.globalCompositeOperation='source-over';
      setLocal(g,ox,oy+T);frontHalf(g,h,r);setScreen(g);
      var rimG=g.createLinearGradient(ox-XL,0,ox+XL,0);
      rimG.addColorStop(0,rgba(HI,0));rimG.addColorStop(.5,rgba(HI,m.rim*.8));rimG.addColorStop(1,rgba(HI,.05));
      g.lineWidth=1;g.strokeStyle=rimG;g.stroke();
      if('filter' in g){       // soften slightly where the browser can
        var c2=mk(sp.c.width,sp.c.height),g2=c2.getContext('2d');
        g2.filter='blur('+(.7*DPR).toFixed(2)+'px)';g2.drawImage(sp.c,0,0);sp.c=c2;
      }
      return cropLower(sp);
    }

    // blurred plate footprint in plate-local units (drawn under the plate projection)
    function buildShadow(sig){
      var h=HALF,r=RAD,E=h+sig*3+2,n=Math.ceil(2*E*DPR),c=mk(n,n),g=c.getContext('2d'),off=n+64;
      g.shadowColor='#000';g.shadowBlur=sig*2*DPR;g.shadowOffsetX=off;
      g.setTransform(DPR,0,0,DPR,E*DPR-off,E*DPR);
      rr(g,h,r);g.fillStyle='#000';g.fill();
      return {c:c,E:E,s:n/DPR};
    }

    // light squeezed out of the seam when a plate lands
    function buildSeam(){
      var sp=spriteFrame(18*S+4),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD,off=sp.c.width+80;
      g.shadowColor='rgba(255,232,210,1)';g.shadowOffsetX=off;
      setLocal(g,ox-off/DPR,oy);frontHalf(g,h,r);setScreen(g);
      g.strokeStyle='rgba(255,232,210,1)';
      g.shadowBlur=16*S*DPR;g.lineWidth=6*S;g.stroke();
      g.shadowBlur=6*S*DPR;g.lineWidth=2.5*S;g.stroke();
      g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetX=0;
      setLocal(g,ox,oy);frontHalf(g,h,r);setScreen(g);
      var lg=g.createLinearGradient(ox-XL,0,ox+XL,0);
      lg.addColorStop(0,'rgba(255,246,236,0)');lg.addColorStop(.5,'rgba(255,246,236,1)');lg.addColorStop(1,'rgba(255,246,236,.1)');
      g.lineWidth=1.4;g.strokeStyle=lg;g.stroke();
      return cropLower(sp);
    }

    function buildFlashFace(){
      var sp=spriteFrame(2),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD;
      for(var i=T;i>0;i-=.5/DPR){setLocal(g,ox,oy+i);rr(g,h,r);setScreen(g);g.fillStyle='rgba(255,236,220,.75)';g.fill()}
      setLocal(g,ox,oy);rr(g,h,r);
      g.globalCompositeOperation='destination-out';g.fillStyle='#000';g.fill();g.globalCompositeOperation='source-over';
      var lg=g.createLinearGradient(-h,-h,h,h);
      lg.addColorStop(0,'rgba(255,236,220,.08)');lg.addColorStop(.6,'rgba(255,236,220,.35)');lg.addColorStop(1,'rgba(255,240,228,1)');
      g.fillStyle=lg;g.fill();
      return sp;
    }
    // green halo around the finished top plate, and the green wash on its face
    function buildHalo(){
      var sp=spriteFrame(30*S+6),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD,off=sp.c.width+80;
      g.shadowColor='rgba(110,235,170,1)';g.shadowBlur=22*S*DPR;g.shadowOffsetX=off;
      setLocal(g,ox-off/DPR,oy);rr(g,h,r);setScreen(g);
      g.lineWidth=5*S;g.strokeStyle='rgba(110,235,170,1)';g.stroke();
      g.shadowBlur=8*S*DPR;g.lineWidth=2*S;g.stroke();
      return sp;
    }
    function buildGreenFace(){
      var sp=spriteFrame(2),g=sp.g,ox=sp.ox,oy=sp.oy,h=HALF,r=RAD;
      setLocal(g,ox,oy);rr(g,h,r);
      var rg=g.createRadialGradient(0,0,0,0,0,h*.78);
      rg.addColorStop(0,'rgba(120,226,170,.8)');rg.addColorStop(.38,'rgba(80,170,126,.42)');rg.addColorStop(.8,'rgba(50,110,82,.08)');rg.addColorStop(1,'rgba(50,110,82,0)');
      g.fillStyle=rg;g.fill();
      setScreen(g);
      setLocal(g,ox,oy);frontHalf(g,h,r);setScreen(g);
      var lg=g.createLinearGradient(ox-XL,0,ox+XL,0);
      lg.addColorStop(0,'rgba(170,255,210,0)');lg.addColorStop(.5,'rgba(190,255,220,.9)');lg.addColorStop(1,'rgba(170,255,210,.1)');
      g.lineWidth=1.3;g.strokeStyle=lg;g.stroke();
      return sp;
    }

    // backlight glows: static, dithered so the dark falloff never bands; brightness is animated with CSS opacity
    function paintGlow(c,col,cy,rx,ry,peak,seed){
      var sc=.5*DPR,w=Math.round(CW*sc),h=Math.round(CH*sc);c.width=w;c.height=h;
      var g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data,rnd=rng(seed);
      var cxp=w/2,cyp=cy*sc,rxp=rx*sc,ryp=ry*sc;
      for(var y=0;y<h;y++){
        var ny=(y-cyp)/ryp;
        for(var x=0;x<w;x++){
          var nx=(x-cxp)/rxp,r2=nx*nx+ny*ny;
          if(r2>=1){continue}
          var a=peak*Math.exp(-r2*3.2)*(1-smooth((r2-.55)/.45));
          var k=(y*w+x)*4;
          d[k]=col[0];d[k+1]=col[1];d[k+2]=col[2];d[k+3]=Math.max(0,Math.min(255,Math.round(a*255+(rnd()-.5)*1.6)));
        }
      }
      g.putImageData(img,0,0);
    }

    function buildAll(){
      geometry();
      if(texDPR!==DPR){
        texLeather=makeLeather(256,DPR>=1.5?Math.round(256/(3.1*DPR)):46,7);
        texGrain=makeGrain(128,11);texDPR=DPR;
      }
      sprites=MATS.map(buildPlate);
      refl=MATS.map(buildReflection);
      SIG=[1*S,4*S,10*S,22*S];
      shadows=SIG.map(buildShadow);
      seam=buildSeam();flashFace=buildFlashFace();halo=buildHalo();greenFace=buildGreenFace();tickGlow=buildTickGlow();
      var cy=PT+H*.47;
      paintGlow(glowW,HI,cy,Math.min(CW*.5,260*S),Math.min(CH*.5,230*S),.3,3);
      paintGlow(glowG,[124,240,180],PT+H*.44,Math.min(CW*.5,190*S),Math.min(CH*.5,150*S),.16,5);
      floorRef=PT+H*.62;
      floorL.width=Math.round(CW*DPR);floorL.height=Math.round(CH*DPR);
      var fg=floorL.getContext('2d'),sh=shadows[3],F=faceMat(0),sc=1.12;
      fg.setTransform(DPR*F[0]*sc,DPR*F[1]*sc,DPR*F[2]*sc,DPR*F[3]*sc,DPR*(PX+W/2),DPR*floorRef);
      fg.drawImage(sh.c,-sh.E,-sh.E,sh.s,sh.s);
      floorL._t=floorL._o=null;
      camY=null;
    }

    /* ---------- state ---------- */
    var DUR={hold:1.4,collapse:3.12,tick:.7,done:2.2,decon:1.6},ORDER=['hold','collapse','tick','done','decon'];
    var mode=reduce?'static':'auto',phase='hold',pt=0,blendT=0;
    var s=[0,0,0,0,0,0],landed=[true,false,false,false,false,false],landT=[-9,-9,-9,-9,-9,-9];
    var Ptarget=reduce?1:0,tickP=reduce?1:0,tickT0=-9,clock=0,floatClock=0,lastInput=-99,camY=null,capKey='',flashGlow=0;
    if(reduce){for(var q=1;q<6;q++){s[q]=1;landed[q]=true}}
    var X=[0,0,0,0,0,0],Yf=[0,0,0,0,0,0],TH=[0,0,0,0,0,0],ZB=[0,0,0,0,0,0];

    function targetsFromP(P,out){for(var k=1;k<6;k++)out[k]=cl(P*5-(k-1))}
    function countLanded(){var n=1;for(var k=1;k<6;k++){if(landed[k])n++;else break}return n}

    function step(dt){
      var sT=[0,0,0,0,0,0],k,capLock=null,autoTick=null;
      if(mode==='auto'){
        pt+=dt;
        while(pt>=DUR[phase]){pt-=DUR[phase];phase=ORDER[(ORDER.indexOf(phase)+1)%ORDER.length]}
        if(phase==='collapse')targetsFromP(Math.min(1,pt/3),sT);
        else if(phase==='tick'||phase==='done'){for(k=1;k<6;k++)sT[k]=1}
        else if(phase==='decon'){
          var d=pt/DUR.decon;
          for(k=1;k<6;k++)sT[k]=1-smooth((d-(5-k)*.07)/.62);
          capLock=1;
        }
        autoTick=phase==='tick'?pt/DUR.tick:phase==='done'?1:phase==='decon'?Math.max(0,1-pt/.35):0;
      }else{
        targetsFromP(Ptarget,sT);
        if(mode==='manual'&&!held&&clock-lastInput>RESUME&&!kbdFocus())resumeAuto();
      }
      var a=1;
      if(mode==='manual')a=1-Math.exp(-dt*12);
      else if(mode==='auto'&&blendT>0){a=1-Math.exp(-dt*9);blendT-=dt}
      for(k=1;k<6;k++){s[k]+=(sT[k]-s[k])*a;if(Math.abs(sT[k]-s[k])<1e-4)s[k]=sT[k]}
      // landings: settle bounce and a flash of light, plate by plate
      for(k=1;k<6;k++){
        if(!landed[k]&&s[k]>=.985){landed[k]=true;if(mode==='auto'||mode==='manual')landT[k]=clock}
        else if(landed[k]&&s[k]<.9)landed[k]=false;
      }
      var n=countLanded(),all=n===6;
      if(autoTick!=null){tickP=autoTick}
      else if(mode==='manual'){
        if(all)tickP=Math.min(1,tickP+dt/DUR.tick);else tickP=Math.max(0,tickP-dt/.3);
      }else tickP=all?1:0;
      // caption and slider value
      var done=(mode==='auto')?(phase==='tick'||phase==='done'):all;
      var shown=capLock||n;
      var key=done?'done':String(shown);
      if(key!==capKey){
        capKey=key;
        psN.textContent='0'+(done?6:shown);
        psName.textContent=done?DONE_TXT:NAMES[shown-1];
        root.classList.toggle('done',done);
        stage.setAttribute('aria-valuenow',String(done?6:shown));
        stage.setAttribute('aria-valuetext',done?'All six stages together':'Stage '+shown+' of 6, '+NAMES[shown-1]);
        if(psName.animate&&!reduce)psName.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
      }
    }

    function resumeAuto(){
      mode='auto';blendT=.5;
      var sum=0,all1=true,all0=true;
      for(var k=1;k<6;k++){sum+=s[k];if(s[k]<.985)all1=false;if(s[k]>.015)all0=false}
      if(all1){if(tickP>=.99){phase='done';pt=0}else{phase='tick';pt=tickP*DUR.tick}}
      else if(all0){phase='hold';pt=DUR.hold*.4}
      else{phase='collapse';pt=sum/5*3}
    }

    function layout(dt){
      var k,free=[],cx=PX+W/2,base=0,camBase=0;
      for(k=0;k<6;k++)free[k]=1-(k===0?s[1]:s[k]);
      var swing=(mode==='auto'&&phase==='decon')?eob:smooth;
      var hov=HOV_C+(HOV_S-HOV_C)*smooth(free[0]);
      for(k=0;k<6;k++){
        var e=swing(free[k]);
        X[k]=cx+OFF[k][0]*S*e;
        TH[k]=OFF[k][1]*PI/180*e;
        var bob=reduce?0:Math.sin(floatClock*1.15+k*1.15)*BOB*free[k];
        if(k===0){base=hov;camBase=hov}
        else{
          var sk=s[k],gap=SEAM+(GAP-T-SEAM)*(1-sk*sk),bt=clock-landT[k],bounce=0;
          if(bt>=0&&bt<.5)bounce=4*S*Math.abs(Math.sin(PI*bt/.13))*Math.exp(-bt*9);
          base+=T+gap+bounce;camBase+=T+gap;
        }
        ZB[k]=base+bob;
      }
      var camT=PT+H*.5-6*S+(camBase+T)/2;
      if(camY==null||mode==='test'||mode==='static'||!dt)camY=camT;
      else camY+=(camT-camY)*(1-Math.exp(-dt*6));
      for(k=0;k<6;k++)Yf[k]=camY-ZB[k]-T;
    }

    /* ---------- render ---------- */
    function snap(v){return Math.round(v*DPR)/DPR}
    function drawSprite(sp,x,y,th){
      if(Math.abs(th)<1e-4){ctx.drawImage(sp.c,snap(x-sp.ox),snap(y-sp.oy),sp.w,sp.h);return}
      var M=twistMat(th);
      ctx.save();ctx.transform(M[0],M[1],M[2],M[3],x,y);ctx.drawImage(sp.c,-sp.ox,-sp.oy,sp.w,sp.h);ctx.restore();
    }
    function plateXY(k){            // the exact screen position each sprite is drawn at
      if(Math.abs(TH[k])<1e-4){var sp=sprites[k];return [snap(X[k]-sp.ox)+sp.ox,snap(Yf[k]-sp.oy)+sp.oy]}
      return [X[k],Yf[k]];
    }
    function drawShadowAt(x,y,th,sig,alpha,scale){
      var i=0;while(i<SIG.length-2&&sig>SIG[i+1])i++;
      var t=cl((sig-SIG[i])/(SIG[i+1]-SIG[i]));
      var F=faceMat(th);
      ctx.save();ctx.transform(F[0]*scale,F[1]*scale,F[2]*scale,F[3]*scale,x,y);
      if(1-t>.01){var a=shadows[i];ctx.globalAlpha=alpha*(1-t);ctx.drawImage(a.c,-a.E,-a.E,a.s,a.s)}
      if(t>.01){var b=shadows[i+1];ctx.globalAlpha=alpha*t;ctx.drawImage(b.c,-b.E,-b.E,b.s,b.s)}
      ctx.restore();
    }
    function facePath(x,y,th){var F=faceMat(th);ctx.save();ctx.transform(F[0],F[1],F[2],F[3],x,y);rr(ctx,HALF,RAD);ctx.restore()}

    function render(){
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
      ctx.setTransform(DPR,0,0,DPR,0,0);
      var k,P=[],floorY=camY;
      for(k=0;k<6;k++)P[k]=plateXY(k);
      var cx=PX+W/2,collapse=(s[1]+s[2]+s[3]+s[4]+s[5])/5;
      // floor: wide ambient shadow, then the tight contact shadow under the bottom plate
      var hov=ZB[0];
      var ft2='translate3d(0,'+(floorY+7*S-floorRef).toFixed(2)+'px,0)',fo=(.5+.15*collapse).toFixed(3);
      if(floorL._t!==ft2){floorL.style.transform=ft2;floorL._t=ft2}
      if(floorL._o!==fo){floorL.style.opacity=fo;floorL._o=fo}
      drawShadowAt(X[0],floorY+hov*.35,TH[0],SIG[0]+hov*.5,.92-.25*cl(hov/(16*S)),1.01);
      // floor reflection of the slab edges, fading with height above the floor
      for(k=5;k>=0;k--){
        var ra=.55*Math.exp(-ZB[k]/(20*S));
        if(ra<.012)continue;
        ctx.globalAlpha=ra;drawSprite(refl[k],X[k],floorY+ZB[k],TH[k]);
      }
      ctx.globalAlpha=1;
      if(tickP>0){
        var gte=eoc(tickP),fy=floorY+ZB[0]*.3;
        ctx.save();ctx.translate(X[0],fy);ctx.scale(1,Q);
        var pool=ctx.createRadialGradient(0,0,0,0,0,XL*1.35);
        pool.addColorStop(0,'rgba(124,240,180,'+(.22*gte).toFixed(3)+')');pool.addColorStop(1,'rgba(124,240,180,0)');
        ctx.globalCompositeOperation='lighter';ctx.fillStyle=pool;ctx.fillRect(-XL*1.4,-XL*1.4,XL*2.8,XL*2.8);
        ctx.restore();
      }
      // plates, bottom up, each followed by the contact shadow the plate above casts on it
      for(k=0;k<6;k++){
        drawSprite(sprites[k],P[k][0],P[k][1],TH[k]);
        var lt=clock-landT[k];
        if(lt>=0&&lt<.5){
          ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.2*Math.pow(1-lt/.5,2);
          drawSprite(flashFace,P[k][0],P[k][1],TH[k]);
          ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
        }
        if(k<5){
          var gap=Math.max(0,ZB[k+1]-(ZB[k]+T));
          // occlusion under the overhang: an inset, soft footprint, so the lower face is darkest deep
          // under the plate above and opens up toward its own front edge
          var sig=SIG[0]+gap*.8,inset=gap*.75,sc=Math.max(.6,(HALF-inset)/HALF);
          ctx.save();
          ctx.beginPath();facePath(P[k][0],P[k][1],TH[k]);ctx.clip();
          drawShadowAt(X[k+1],P[k][1]+gap*.2,TH[k+1],sig/sc,1,sc);
          if(gap>2*S){
            var gs=smooth(gap/(GAP-T));
            drawShadowAt(X[k+1],P[k][1]+gap*.42,TH[k+1],SIG[1]+gap*.22,.62*gs,1);
            drawShadowAt(X[k+1],P[k][1]+gap*.2,TH[k+1],SIG[3],.4*gs,1.02);
          }
          ctx.restore();
        }
      }
      // landing flashes: light squeezed out of the seam
      ctx.globalCompositeOperation='lighter';
      flashGlow=0;
      for(k=1;k<6;k++){
        var ft=clock-landT[k];
        if(ft>=0&&ft<.55){
          var f=Math.pow(1-ft/.55,2);flashGlow=Math.max(flashGlow,f);
          ctx.globalAlpha=f*.95;drawSprite(seam,P[k][0],P[k][1]+T,0);
        }
      }
      ctx.globalAlpha=1;
      // finished: green halo, green wash on the top face, a sweep of light and the tick
      var tp=tickP;
      if(tp>0){
        var te=eoc(tp),x5=P[5][0],y5=P[5][1];
        ctx.globalAlpha=.42*te;drawSprite(halo,x5,y5,TH[5]);
        ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.34*te;drawSprite(greenFace,x5,y5,TH[5]);
        ctx.globalCompositeOperation='screen';ctx.globalAlpha=.05*te;drawSprite(greenFace,x5,y5,TH[5]);
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
        var SWD=1.25,sw=(mode==='auto'&&phase==='tick')?pt/SWD:(mode==='auto'&&phase==='done')?(pt+DUR.tick)/SWD:(mode==='manual'?(clock-tickT0)/SWD:-1);
        if(sw>0&&sw<1&&!reduce){
          ctx.save();ctx.beginPath();facePath(x5,y5,TH[5]);ctx.clip();
          var sx=x5-XL*1.5+XL*3*smooth(sw),lg=ctx.createLinearGradient(sx-40*S,y5-22*S,sx+40*S,y5+22*S);
          lg.addColorStop(0,'rgba(255,248,240,0)');lg.addColorStop(.5,'rgba(255,248,240,'+(.3*Math.sin(PI*sw)).toFixed(3)+')');lg.addColorStop(1,'rgba(255,248,240,0)');
          ctx.globalCompositeOperation='screen';ctx.fillStyle=lg;ctx.fillRect(x5-XL,y5-YH,2*XL,2*YH);
          ctx.restore();
        }
        drawTick(x5,y5,tp);
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      // backlight: brighter as the stack comes together, a pulse on each landing, green at the end
      var gw=(.55+.35*collapse+.25*flashGlow).toFixed(3),gg=(eoc(tp)*.95).toFixed(3);
      if(glowW._o!==gw){glowW.style.opacity=gw;glowW._o=gw}
      if(glowG._o!==gg){glowG.style.opacity=gg;glowG._o=gg}
    }

    var TICK_LEN=5.8+12.95;
    function buildTickGlow(){
      var sc=HALF*2*.72/24,m=26*S,w=24*sc+2*m,h=24*sc*Q+2*m,c=mk(w*DPR,h*DPR),g=c.getContext('2d'),off=c.width+80;
      g.setTransform(DPR,0,0,DPR,0,0);g.translate(w/2-off/DPR,h/2);g.transform(1,0,0,Q,0,0);g.scale(sc,sc);g.translate(-12,-12);
      g.shadowColor='rgba(124,240,180,.85)';g.shadowBlur=12*DPR*S;g.shadowOffsetX=off;
      g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(5.5,12.6);g.lineTo(9.6,16.7);g.lineTo(18.6,7.4);
      g.lineWidth=2.1;g.strokeStyle='#000';g.stroke();
      return {c:c,w:w,h:h};
    }
    function drawTick(x,y,p){
      var grow=eoc(Math.min(1,p/.85)),pop=.8+.2*eob(p);
      var sc=HALF*2*.72/24*pop;
      if(tickGlow){ctx.save();ctx.globalAlpha=grow;ctx.translate(x,y);ctx.scale(pop,pop);ctx.drawImage(tickGlow.c,-tickGlow.w/2,-tickGlow.h/2,tickGlow.w,tickGlow.h);ctx.restore()}
      ctx.save();
      ctx.translate(x,y);ctx.transform(1,0,0,Q,0,0);ctx.scale(sc,sc);ctx.translate(-12,-12);
      ctx.lineCap='round';ctx.lineJoin='round';
      if(ctx.setLineDash)ctx.setLineDash([TICK_LEN*grow+.001,TICK_LEN*2]);
      function path(dx,dy){ctx.beginPath();ctx.moveTo(5.5+dx,12.6+dy);ctx.lineTo(9.6+dx,16.7+dy);ctx.lineTo(18.6+dx,7.4+dy)}
      // contact shadow of the tick on the plate
      path(.35,1.1);ctx.lineWidth=2.6;ctx.strokeStyle='rgba(0,0,0,.42)';ctx.stroke();
      // glowing green stroke
      var gr=ctx.createLinearGradient(3,3,21,21);gr.addColorStop(0,'#A6F8CC');gr.addColorStop(1,'#1FAE69');
      path(0,0);ctx.lineWidth=2.1;ctx.strokeStyle=gr;ctx.stroke();
      // glossy highlight along the stroke
      path(-.12,-.38);ctx.lineWidth=.7;ctx.strokeStyle='rgba(235,255,244,.6)';ctx.stroke();
      ctx.restore();
    }

    /* ---------- loop ---------- */
    var raf=0,lastTs=0,visible=true,perf=[],lastSig='';
    function signature(){
      var out=[camY.toFixed(2),tickP.toFixed(3),phase==='tick'||phase==='done'?pt.toFixed(2):'',mode==='manual'?Math.min(2,clock-tickT0).toFixed(2):''];
      for(var k=0;k<6;k++){out.push(ZB[k].toFixed(2),X[k].toFixed(2),TH[k].toFixed(4));var lt=clock-landT[k];if(lt>=0&&lt<.6)out.push(lt.toFixed(3))}
      return out.join(',');
    }
    function shouldRun(){return built&&mode!=='static'&&visible&&!document.hidden}
    function frame(ts){
      raf=0;
      if(!shouldRun()){lastTs=0;return}
      var dt=lastTs?Math.min(.1,(ts-lastTs)/1000):1/60;lastTs=ts;
      clock+=dt;if(mode!=='test')floatClock+=dt;
      step(dt);layout(dt);
      var sig=signature();
      if(sig!==lastSig){lastSig=sig;var t0=performance.now();render();perf.push(performance.now()-t0);if(perf.length>240)perf.shift()}
      raf=requestAnimationFrame(frame);
    }
    function kick(){if(!raf&&shouldRun()){lastTs=0;raf=requestAnimationFrame(frame)}}
    function paintNow(){step(0);layout(0);render();lastSig=''}

    /* ---------- input ---------- */
    function kbdFocus(){try{return document.activeElement===stage&&stage.matches(':focus-visible')}catch(e){return false}}
    function takeControl(){
      if(mode==='static'){return}
      if(mode!=='manual'){Ptarget=(s[1]+s[2]+s[3]+s[4]+s[5])/5;mode='manual'}
      lastInput=clock;root.classList.add('used');kick();
    }
    function setP(p){
      var wasAll=Ptarget>=.999;
      Ptarget=cl(p);
      if(mode==='static'){targetsFromP(Ptarget,s);for(var k=1;k<6;k++)landed[k]=s[k]>=.985;root.classList.add('used');paintNow();return}
      if(!wasAll&&Ptarget>=.999)tickT0=clock;
    }
    function fromX(x){var r=stage.getBoundingClientRect();return cl((x-r.left-r.width*.14)/(r.width*.72))}
    var lastSX=null,lastSY=null,armed=false;
    stage.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'){armed=false;lastSX=e.screenX;lastSY=e.screenY}});
    stage.addEventListener('pointermove',function(e){
      if(e.pointerType!=='mouse')return;
      if(e.screenX===lastSX&&e.screenY===lastSY)return;   // the page scrolled under a resting cursor
      lastSX=e.screenX;lastSY=e.screenY;
      if(!armed){armed=true;return}                        // the first move only marks the cursor's arrival
      takeControl();setP(fromX(e.clientX));
    });
    var tStart=null,dragX=null,dragFrom=0;
    stage.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'){tStart=[e.clientX,e.clientY];dragX=null}});
    stage.addEventListener('pointermove',function(e){
      if(e.pointerType==='mouse'||!tStart)return;
      if(dragX===null){
        var dx=e.clientX-tStart[0],dy=e.clientY-tStart[1];
        if(Math.abs(dy)>8&&Math.abs(dy)>=Math.abs(dx)){tStart=null;return}   // a vertical scroll: leave the loop running
        if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;
        takeControl();dragX=e.clientX;dragFrom=Ptarget;
      }
      var r=stage.getBoundingClientRect();
      takeControl();setP(dragFrom+(e.clientX-dragX)/(r.width*.75));
    });
    ['pointerup','pointercancel'].forEach(function(t){stage.addEventListener(t,function(e){if(e.pointerType!=='mouse'){tStart=null;dragX=null}})});
    var toggle=root.querySelector('.ps-toggle'),held=false;
    if(toggle)toggle.addEventListener('click',function(){
      held=!held;
      toggle.setAttribute('aria-pressed',String(held));
      toggle.setAttribute('aria-label',held?'Play the stack animation':'Pause the stack animation');
      root.classList.toggle('held',held);
      if(held)takeControl();else{resumeAuto();kick()}
    });
    stage.addEventListener('keydown',function(e){
      var key=e.key,cur=mode==='manual'||mode==='static'?Ptarget:(s[1]+s[2]+s[3]+s[4]+s[5])/5,st=Math.round(cur*5),p;
      if(key==='ArrowRight'||key==='ArrowUp')p=Math.min(5,st+1)/5;
      else if(key==='ArrowLeft'||key==='ArrowDown')p=Math.max(0,st-1)/5;
      else if(key==='Home')p=0;
      else if(key==='End')p=1;
      else return;
      e.preventDefault();takeControl();setP(p);
    });
    stage.addEventListener('focus',function(){if(kbdFocus())takeControl()});

    if('IntersectionObserver' in window){
      var goneAt=0;
      new IntersectionObserver(function(en){
        var v=en[en.length-1].isIntersecting;
        if(!v&&visible)goneAt=performance.now();
        else if(v&&!visible&&goneAt&&mode==='auto'&&performance.now()-goneAt>1500){phase='hold';pt=0;blendT=.8}
        visible=v;if(visible)kick();
      },{rootMargin:'40px 0px'}).observe(stage);
    }
    document.addEventListener('visibilitychange',function(){if(!document.hidden)kick()});
    if(mq&&mq.addEventListener)mq.addEventListener('change',function(){
      reduce=mq.matches;
      if(reduce){mode='static';Ptarget=1;tickP=1;for(var k=1;k<6;k++){s[k]=1;landed[k]=true}root.classList.add('static');if(built)paintNow()}
      else{mode='auto';phase='hold';pt=0;blendT=.8;root.classList.remove('static');kick()}
    });
    if(reduce)root.classList.add('static');

    var rsT=0,lastW=0,lastH=0,lastD=0;
    function onResize(){
      if(!built)return;
      var w=stage.clientWidth,h=stage.clientHeight,d=Math.min(2,window.devicePixelRatio||1);
      if(w===lastW&&h===lastH&&d===lastD)return;
      lastW=w;lastH=h;lastD=d;buildAll();paintNow();
    }
    if('ResizeObserver' in window)new ResizeObserver(function(){clearTimeout(rsT);rsT=setTimeout(onResize,60)}).observe(stage);
    window.addEventListener('resize',function(){clearTimeout(rsT);rsT=setTimeout(onResize,60)});

    var built=false;
    function build(){if(built)return;built=true;onResize();kick()}
    if('IntersectionObserver' in window){
      var nio=new IntersectionObserver(function(en){
        if(!en[en.length-1].isIntersecting)return;
        nio.disconnect();
        (window.requestIdleCallback||function(f){return setTimeout(f,1)})(build,{timeout:400});
      },{rootMargin:'700px 0px'});
      nio.observe(stage);
    }else build();

    /* test hook for exact-state screenshots (not used by the page itself) */
    root._test={
      setProgress:function(p){
        p=cl(+p||0);
        if(mode!=='static')mode='test';
        Ptarget=p;targetsFromP(p,s);
        for(var k=1;k<6;k++){landed[k]=s[k]>=.985;landT[k]=-9}
        floatClock=0;paintNow();
      },
      play:function(){if(mode==='static')return;mode='auto';phase='hold';pt=0;blendT=.5;kick()},
      build:build,
      info:function(){return {mode:mode,phase:phase,t:+pt.toFixed(2),caption:psN.textContent+' / 06 '+psName.textContent,tick:+tickP.toFixed(2)}},
      perf:function(){var a=perf.slice().sort(function(x,y){return x-y});if(!a.length)return null;var sum=a.reduce(function(x,y){return x+y},0);return {frames:a.length,avgMs:+(sum/a.length).toFixed(3),p95Ms:+a[Math.floor(a.length*.95)].toFixed(3),maxMs:+a[a.length-1].toFixed(3)}}
    };
  })();

  /* Boxes pop up one by one as each group scrolls into view. Before they arrive they sit dimmed and
     slightly lower, never hidden, so nothing is lost if motion is off or a screenshot catches them early. */
  if(!reduce&&'IntersectionObserver' in window){
    var RV=['.facts > div','.people .person','.fit li:not(.mono-label)','.photo-trio .shot','.points li','.cmp-card','.kpi','.chart-card','.ess-grid .flip','.svc-group','.ownbrand .ob-media','.ownbrand .ob-copy','.q-photo','.paid-points li','.pay-card','.pay-quote','.q-part-head','.ver-copy','.checklist li','.st-intro-copy','.route','.st-sub','.st-step','.tf','.setup-panel','.models li:not(.mono-label)','.hs-media','.care-list li','.log','.faq-list details','.faq-shot','.next li','.dcard','.social-row','.quick-actions .btn','.form-card','.pstack'].join(',');
    var rvEls=$$(RV).filter(function(el){return !el.closest('.hero,#builder,.modal,.msg-panel,.drawer')});
    var rio=new IntersectionObserver(function(en){
      var hits=en.filter(function(x){return x.isIntersecting}).map(function(x){return x.target});
      hits.sort(function(a,b){var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();return (ra.top-rb.top)||(ra.left-rb.left)});
      hits.forEach(function(el,i){
        rio.unobserve(el);
        var d=Math.min(i,7)*95;
        el.style.setProperty('--rv-d',d+'ms');
        el.classList.add('rv-in');
        setTimeout(function(){el.classList.remove('rv','rv-in');el.style.removeProperty('--rv-d')},d+1000);
      });
    },{rootMargin:'0px 0px -8% 0px',threshold:.12});
    rvEls.forEach(function(el){
      var r=el.getBoundingClientRect();
      if(r.bottom<0)return;            // already scrolled past: leave it alone
      el.classList.add('rv');rio.observe(el);
    });
  }

  /* Section titles light up word by word as you read down. Screen readers get the title as one piece. */
  if(!reduce&&'IntersectionObserver' in window){
    var wsets=[];
    $$('main .h-section, main .ob-title').forEach(function(h){
      if(h.closest('.hero'))return;
      var words=[],sr=document.createElement('span'),vis=document.createElement('span');
      sr.className='sr';sr.textContent=h.textContent.replace(/\s+/g,' ').trim();
      vis.className='wl';vis.setAttribute('aria-hidden','true');
      var walk=function(node,into){
        Array.prototype.slice.call(node.childNodes).forEach(function(ch){
          if(ch.nodeType===3){
            ch.textContent.split(/(\s+)/).forEach(function(part){
              if(!part)return;
              if(/^\s+$/.test(part)){into.appendChild(document.createTextNode(' '));return}
              var w=document.createElement('span');w.className='w';w.textContent=part;into.appendChild(w);words.push(w);
            });
          }else if(ch.nodeType===1){var c=ch.cloneNode(false);into.appendChild(c);walk(ch,c)}
        });
      };
      walk(h,vis);
      h.textContent='';h.appendChild(sr);h.appendChild(vis);
      var set={el:h,words:words,last:-1};h._ws=set;wsets.push(set);
    });
    var wActive=[],wRaf=0;
    var wPaint=function(){
      wRaf=0;var vh=window.innerHeight;
      wActive.forEach(function(s){
        var r=s.el.getBoundingClientRect();
        var p=Math.max(0,Math.min(1,(vh*.9-r.top)/(vh*.42)));
        var lit=p*(s.words.length+1.2);
        if(Math.abs(lit-s.last)<.015)return;
        s.last=lit;
        s.words.forEach(function(w,i){
          var on=Math.max(0,Math.min(1,lit-i));
          w.style.setProperty('--on',on.toFixed(3));
          w.style.setProperty('--hl',(4*on*(1-on)).toFixed(3));
        });
      });
    };
    var wio=new IntersectionObserver(function(en){
      en.forEach(function(x){
        var s=x.target._ws,i=wActive.indexOf(s);
        if(x.isIntersecting&&i<0)wActive.push(s);
        else if(!x.isIntersecting&&i>-1){wActive.splice(i,1);if(x.boundingClientRect.top<0){s.words.forEach(function(w){w.style.setProperty('--on','1');w.style.setProperty('--hl','0')});s.last=-1}}
      });
      if(!wRaf)wRaf=requestAnimationFrame(wPaint);
    },{rootMargin:'15% 0px 15% 0px'});
    wsets.forEach(function(s){wio.observe(s.el)});
    window.addEventListener('scroll',function(){if(!wRaf&&wActive.length)wRaf=requestAnimationFrame(wPaint)},{passive:true});
    window.addEventListener('resize',function(){if(!wRaf)wRaf=requestAnimationFrame(wPaint)});
  }

  /* Headline numbers count up when they come into view; the final value is already in the page */
  var counters=$$('[data-count]');
  if(counters.length&&!reduce&&'IntersectionObserver' in window){
    var cio=new IntersectionObserver(function(en){
      en.forEach(function(x){
        if(!x.isIntersecting)return;
        cio.unobserve(x.target);
        var el=x.target,to=parseFloat(el.dataset.count),from=parseFloat(el.dataset.from||'0'),dec=parseInt(el.dataset.dec||'0',10);
        var pre=el.dataset.pre||'',suf=el.dataset.suf||'',final=el.textContent,t0=0;
        var step=function(t){
          if(!t0)t0=t;
          var k=Math.min(1,(t-t0)/1500),e=1-Math.pow(1-k,3);
          el.textContent=k<1?pre+(from+(to-from)*e).toFixed(dec)+suf:final;
          if(k<1)requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },{threshold:.6});
    counters.forEach(function(el){cio.observe(el)});
  }

  /* Test file: tabs (arrow keys move between them); the score dots fill in once the file is on screen */
  var tf=$('#testFile');
  if(tf){
    var tabs=$$('[role="tab"]',tf);
    var pickTab=function(t,focus){
      tabs.forEach(function(b){var on=b===t;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!on});
      if(focus)t.focus();
    };
    tabs.forEach(function(b,i){
      b.addEventListener('click',function(){pickTab(b)});
      b.addEventListener('keydown',function(e){
        var k=e.key,n=k==='ArrowRight'?i+1:k==='ArrowLeft'?i-1:k==='Home'?0:k==='End'?tabs.length-1:null;
        if(n===null)return;
        e.preventDefault();pickTab(tabs[(n+tabs.length)%tabs.length],true);
      });
    });
    if(!reduce&&'IntersectionObserver' in window){
      tf.classList.add('pre');
      var tio=new IntersectionObserver(function(en){if(en[0].isIntersecting){tf.classList.remove('pre');tio.disconnect()}},{threshold:.3});
      tio.observe(tf);
    }
  }

  /* Sample route: the travelling parcels only run while the diagram is on screen */
  var route=$('.route');
  if(route){
    var rsv=$$('.route-svg',route).filter(function(s){return s.pauseAnimations});
    var runRoute=function(on){rsv.forEach(function(s){on?s.unpauseAnimations():s.pauseAnimations()})};
    if(reduce)runRoute(false);
    else if('IntersectionObserver' in window)new IntersectionObserver(function(en){runRoute(en[0].isIntersecting)}).observe(route);
  }

  /* How we get paid: the saving on a $50 product splits 80/20. Pick a price with the slider or a column. */
  var pay=$('#payCard');
  if(pay){
    var NOW=50,RATE=.2,STEP=2.5;
    var pcs=$$('.pc-col',pay),pxl=$$('.pc-xl li',pay),prange=$('#payRange'),ptip=$('.pay-tip',pay),parea=$('.pc-area',pay);
    var money=function(v){return '$'+v.toFixed(2)};
    var split=function(i){var s=i*STEP,fee=s*RATE;return {s:s,fee:fee,keep:s-fee,price:NOW-s}};
    var pickPrice=function(i){
      var v=split(i);
      pcs.forEach(function(c,k){c.classList.toggle('on',k===i)});
      pxl.forEach(function(c,k){c.classList.toggle('on',k===i)});
      prange.value=i;prange.style.setProperty('--p',(i/(pcs.length-1)*100)+'%');
      prange.setAttribute('aria-valuetext',money(v.price)+' per unit. '+(v.s?'Saving '+money(v.s)+', our fee '+money(v.fee)+', you keep '+money(v.keep)+'.':'No saving, so no fee.'));
      $('#payPrice').textContent=money(v.price);
      $('#paySave').textContent=money(v.s);$('#payFee').textContent=money(v.fee);$('#payKeep').textContent=money(v.keep);
      $('#payPct').textContent=v.s?Math.round(v.s/NOW*100)+'% less than today':'Same as today';
      $('#payNote').textContent=v.s?'You keep '+money(v.keep)+' of every '+money(v.s)+' we save you, on every unit.':'No saving means no fee. You never pay us for a price we cannot beat.';
    };
    prange.addEventListener('input',function(){pickPrice(+prange.value)});
    var tipRow=function(cls,val,label){
      var r=document.createElement('span');
      if(cls){var k=document.createElement('i');k.className=cls;r.appendChild(k)}
      var e=document.createElement('em');e.textContent=val;r.appendChild(e);r.appendChild(document.createTextNode(label));return r;
    };
    pcs.forEach(function(c,i){
      c.addEventListener('click',function(){pickPrice(i)});
      c.addEventListener('pointerenter',function(e){
        if(e.pointerType!=='mouse')return;
        var v=split(i),mark=$('.pc-bar',c)||$('.pc-zero',c),ar=parea.getBoundingClientRect(),br=mark.getBoundingClientRect(),cr=c.getBoundingClientRect();
        ptip.textContent='';
        var head=document.createElement('b');head.textContent=v.s?money(v.s)+' saved per unit':'No saving, no fee';ptip.appendChild(head);
        if(v.s){ptip.appendChild(tipRow('k-keep',money(v.keep),'you keep'));ptip.appendChild(tipRow('k-fee',money(v.fee),'our fee'))}
        var foot=document.createElement('small');foot.textContent=v.s?'$50.00 today, '+money(v.price)+' with us':'Price stays at $50.00';ptip.appendChild(foot);
        ptip.style.left=(cr.left+cr.width/2-ar.left)+'px';
        ptip.style.top=(br.top-ar.top-(v.s?34:4))+'px';
        ptip.classList.add('on');
      });
      c.addEventListener('pointerleave',function(){ptip.classList.remove('on')});
    });
    pickPrice(+prange.value);
    if(!reduce&&'IntersectionObserver' in window){
      pay.classList.add('pre');
      var pio=new IntersectionObserver(function(en){if(en[0].isIntersecting){pay.classList.remove('pre');pio.disconnect()}},{threshold:.35});
      pio.observe($('.pc',pay));
    }
  }

  /* Mobile menu */
  var menuBtn=$('#menuBtn'), menu=$('#mobileMenu');
  menuBtn.addEventListener('click',function(){var open=menu.hidden;menu.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open));onScroll()});
  onScroll();
  $$('#mobileMenu a, #mobileMenu button').forEach(function(a){a.addEventListener('click',function(){menu.hidden=true;menuBtn.setAttribute('aria-expanded','false');onScroll()})});

  /* Hero comparison */
  var SUP={A:{f:1.10,fr:0.95,d:0.28},B:{f:1.35,fr:0.42,d:0.34},C:{f:1.25,fr:0.78,d:0.31}};
  var SCALE=2.5, card=$('#cmpCard'), list=$('#cmpRows'), rows=$$('.cmp-row',list);
  var NOTES={
    landed:'Supplier B has the highest factory price but costs the least once delivered, and its samples passed testing. That makes it our recommendation.',
    factory:'On factory price alone, Supplier A looks cheapest. Add freight and duty, and it is not. This is why we never compare quotes on factory price.'
  };
  function flipOrder(order){
    var first=new Map();
    rows.forEach(function(r){first.set(r,r.getBoundingClientRect().top)});
    order.forEach(function(r){list.appendChild(r)});
    if(reduce) return;
    rows.forEach(function(r){
      var dy=first.get(r)-r.getBoundingClientRect().top;
      if(!dy) return;
      r.style.transition='none';
      r.style.transform='translateY('+dy+'px)';
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        r.style.transition='transform .6s cubic-bezier(.2,.7,.2,1), box-shadow .3s, background .3s';
        r.style.transform='';
      })});
    });
  }
  function setMode(mode){
    $$('[data-mode]',card).forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
    card.classList.toggle('factory',mode==='factory');
    var total=function(id){var s=SUP[id];return mode==='landed'?s.f+s.fr+s.d:s.f};
    rows.forEach(function(r){
      var s=SUP[r.dataset.id], seg=$$('.cmp-bar i',r);
      seg[0].style.width=(s.f/SCALE*100)+'%';
      seg[1].style.width=(mode==='landed'?s.fr/SCALE*100:0)+'%';
      seg[2].style.width=(mode==='landed'?s.d/SCALE*100:0)+'%';
      $('.cmp-val',r).textContent='$'+total(r.dataset.id).toFixed(2);
    });
    var order=rows.slice().sort(function(a,b){return total(a.dataset.id)-total(b.dataset.id)});
    rows.forEach(function(r){
      var top=r===order[0], pick=$('.cmp-pick',r);
      r.classList.toggle('is-top',top);
      pick.hidden=!top;
      pick.textContent=mode==='landed'?'Recommended':'Lowest quote';
    });
    flipOrder(order);
    $('#cmpNote').textContent=NOTES[mode];
    $('#cmpMetric').textContent=mode==='landed'?'Landed cost per unit':'Factory price per unit';
  }
  $$('[data-mode]',card).forEach(function(b){b.addEventListener('click',function(){setMode(b.dataset.mode)})});

  /* Flip cards */
  $$('[data-flip]').forEach(function(c){
    var front=$('.front',c), back=$('.back',c), bf=$('.front .flip-btn',c), bb=$('.back .flip-btn',c);
    function set(on,focus){
      c.classList.toggle('is-flipped',on);
      front.inert=on; back.inert=!on;
      front.setAttribute('aria-hidden',String(on)); back.setAttribute('aria-hidden',String(!on));
      bf.setAttribute('aria-expanded',String(on));
      if(focus){(on?bb:bf).focus({preventScroll:true})}
    }
    bf.addEventListener('click',function(e){e.stopPropagation();set(true,true)});
    bb.addEventListener('click',function(e){e.stopPropagation();set(false,true)});
    c.addEventListener('click',function(e){if(e.target.closest('a,button'))return;set(!c.classList.contains('is-flipped'),false)});
  });

  /* Service drawer */
  var SVC={
    sourcing:{g:'Find',t:'Tailored sourcing',s:'We start by mapping exactly what you need, then search against that profile rather than a fixed list of contacts.',l:['A working session on your product, market, costs and current problems','Priorities weighted with you: cost, quality, speed, packaging and compliance','Suppliers approached and screened on capability, capacity and responsiveness','Your requirements written up as clear, factory ready specifications'],r:'A written requirement brief that every supplier is measured against.'},
    compare:{g:'Find',t:'Supplier comparison',s:'For every brief we go to market, gather competing quotes from vetted suppliers in our network and beyond, and put them side by side on the measures that matter to you.',l:['Quotes gathered against the same specification, so they genuinely compare','Prices compared on landed cost, including freight and duty','Minimum orders, lead times, payment terms and sample quality weighed together','Direct negotiation with the strongest options before we recommend'],r:'A shortlist with a like for like comparison and a clear recommendation, with the reasoning shown.',m:['#compare','See an example comparison']},
    intel:{g:'Find',t:'Product intelligence',s:'We analyse reviews, complaints and category data to separate supplier faults from problems built into the product itself.',l:['Your reviews and complaints coded into clear categories','Compared against similar products across sellers and price points','Format and category trends tracked over time','Better product directions brought to you unprompted'],r:'A written intelligence summary with specific, actionable recommendations.'},
    verify:{g:'Prove',t:'Verification and due diligence',s:'Anyone can send a quotation. We establish whether the company behind it is real, active and safe to pay.',l:['Legal entity and registration checked against official records','Certificates confirmed with the issuing body where possible','Invoicing company, shipper and bank account name matched','The actual manufacturer identified, not just the trading company','Escalating checks before any money moves'],r:'A verification summary, with anything unresolved flagged plainly.',m:['#quality','See our verification checklist']},
    compliance:{g:'Prove',t:'Compliance checks',s:'What you must hold to sell legally depends on where you sell. We map the requirements and gather the evidence before launch, not after a complaint.',l:['Requirements mapped for each market you sell into','Ingredients and colourants reviewed for your product type','Factory registrations, safety assessments and test reports collected','Labels checked on the packaging that will actually ship','A clear split of what sits with you and what sits with the supplier'],r:'A compliance file for your market, and a written gap list showing what is outstanding and who resolves it.',c:['ISO 22716 GMP','CPSR','UK SCPN','EU CPNP','US MoCRA']},
    quality:{g:'Prove',t:'Quality testing',s:'We physically test samples ourselves against a defined protocol, and give you the evidence rather than an opinion.',l:['A quality benchmark defined for your product before launch','Packaging, consistency, performance and durability tested','Several units tested to expose variation between them','Photo and video evidence for every finding'],r:'A documented quality report, with a defect and consistency assessment against the benchmark.',m:['#quality','See an example report']},
    setup:{g:'Run',t:'Setup modelling and transition',s:'We cost every route to your customer honestly, recommend the one that fits your stage, then manage the switch so orders keep flowing.',l:['Dropshipping, bulk purchasing and 3PL warehousing compared','Full landed cost per order, including freight, duty and fulfilment','Cash tied up in stock, and when not to commit it yet','A staged transition plan with no gap in service'],r:'A costed options analysis and a transition plan matched to your current stage.',m:['#setups','Compare the setups']},
    monitor:{g:'Run',t:'Ongoing monitoring',s:'We stay involved after launch, checking your orders, shipments and product so problems are fixed before customers notice.',l:['Supplier invoices reconciled against your orders','Shipments tracked and stalled parcels chased','Your live product bought and retested at agreed intervals','Supplier issues raised and resolved on your behalf'],r:'Regular performance reports covering defects, delivery and cost.',m:['#aftercare','How we stay hands on']},
    ownbrand:{g:'Run',t:'Own brand development',s:'When you are ready to move from a stock product to one that is genuinely yours, the groundwork is already done.',l:['Your ideas turned into factory ready specifications','Packaging, branding and formulation options scoped','Tooling, minimum orders and costs modelled up front','Manufacturers vetted for custom production','The move from stock to custom managed end to end'],r:'A customisation readiness file, so your own brand launch is never a cold start.'}
  };
  var KEYS=Object.keys(SVC), drawer=$('#drawer'), scrim=$('#scrim'), lastFocus=null;
  function esc(t){return t.replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
  function render(key){
    var s=SVC[key], i=KEYS.indexOf(key), n=KEYS.length;
    $('#drGroup').textContent=s.g+'  ·  '+(i+1)+' of '+n;
    $('#drTitle').textContent=s.t;
    $('#drSum').textContent=s.s;
    $('#drList').innerHTML=s.l.map(function(x){return '<li>'+esc(x)+'</li>'}).join('');
    $('#drReceive').textContent=s.r;
    var chips=$('#drChips');
    chips.hidden=!s.c;
    if(s.c){$('ul',chips).innerHTML=s.c.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')}
    var more=$('#drMore');
    more.hidden=!s.m;
    if(s.m){more.setAttribute('href',s.m[0]);more.innerHTML=esc(s.m[1])+ARROW}
    var p=KEYS[(i-1+n)%n], q=KEYS[(i+1)%n];
    $('#drPrev').dataset.key=p; $('b',$('#drPrev')).textContent=SVC[p].t;
    $('#drNext').dataset.key=q; $('b',$('#drNext')).textContent=SVC[q].t;
    $('#drBody').scrollTop=0;
  }
  function openDrawer(key){
    if(!SVC[key]) return;
    lastFocus=document.activeElement;
    render(key);
    drawer.inert=false;
    drawer.classList.add('open'); scrim.classList.add('open');
    document.documentElement.classList.add('lock');
    setTimeout(function(){$('#drClose').focus({preventScroll:true})},60);
  }
  function closeDrawer(restore){
    if(!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); scrim.classList.remove('open');
    drawer.inert=true;
    document.documentElement.classList.remove('lock');
    if(restore!==false && lastFocus && lastFocus.focus){lastFocus.focus({preventScroll:true})}
  }
  $$('[data-svc]').forEach(function(b){b.addEventListener('click',function(){openDrawer(b.dataset.svc)})});
  $('#drClose').addEventListener('click',function(){closeDrawer()});
  scrim.addEventListener('click',function(){closeDrawer()});
  $('#drPrev').addEventListener('click',function(){render(this.dataset.key)});
  $('#drNext').addEventListener('click',function(){render(this.dataset.key)});
  $('#drMore').addEventListener('click',function(){closeDrawer(false)});
  $$('[data-close-nav]',drawer).forEach(function(a){a.addEventListener('click',function(){closeDrawer(false)})});
  document.addEventListener('keydown',function(e){
    if(!drawer.classList.contains('open')) return;
    if(e.key==='Escape'){closeDrawer();return}
    if(e.key==='ArrowRight'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){render($('#drNext').dataset.key)}
    if(e.key==='ArrowLeft'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){render($('#drPrev').dataset.key)}
    if(e.key==='Tab'){
      var f=$$('a[href]:not([hidden]),button',drawer).filter(function(x){return x.offsetParent!==null});
      if(!f.length) return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  var h=(location.hash||'').replace('#','');
  if(h.indexOf('service-')===0){openDrawer(h.slice(8))}

  /* Setup models */
  var METRICS=['Low unit cost','Low upfront cash','Delivery speed','Quality control','Flexibility','Simplicity'];
  var WORDS=['','Weak','Limited','Moderate','Good','Strong'];
  var MODELS={
    drop:{n:'Dropshipping',h:'Your supplier or fulfilment agent ships each order from overseas as it comes in. There is no stock to buy, but every order travels internationally.',f:['Factory','Supplier ships each order','Customer'],b:'You are testing products, or demand is still unpredictable.',s:[2,5,2,2,5,5]},
    hybrid:{n:'Hybrid',h:'Proven best sellers are held in a warehouse near your customers, while newer or slower lines ship direct. Often the safest bridge from dropshipping to stock.',f:['Factory',['Best sellers stocked at a 3PL','Other lines shipped direct'],'Customer'],b:'You are ready to scale your best sellers without committing everything at once.',s:[4,3,4,4,4,2]},
    bulk:{n:'Bulk stock + 3PL',h:'You buy stock in bulk, it travels in one consignment, and a warehouse near your customers picks, packs and ships each order locally.',f:['Factory','Bulk freight, sea or air','3PL warehouse','Customer'],b:'Demand is steady and you want the lowest unit cost and fastest delivery.',s:[5,1,5,5,2,3]}
  };
  function renderModel(key){
    var m=MODELS[key];
    $$('[data-model]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.model===key))});
    $('#mdName').textContent=m.n;
    $('#mdHow').textContent=m.h;
    $('#mdBest').textContent=m.b;
    $('#mdFlow').innerHTML=m.f.map(function(x,i){
      var node=Array.isArray(x)
        ?'<div class="node split">'+x.map(function(y){return '<span>'+esc(y)+'</span>'}).join('')+'</div>'
        :'<div class="node'+(i===m.f.length-1?' end':'')+'">'+esc(x)+'</div>';
      return (i?'<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg>':'')+node;
    }).join('');
    $('#mdMeters').innerHTML=METRICS.map(function(lbl,i){
      var v=m.s[i];
      return '<div class="meter"><span>'+lbl+'</span><span class="track" aria-hidden="true"><i style="width:'+(v*20)+'%"></i></span><span class="mval">'+WORDS[v]+'</span></div>';
    }).join('');
  }
  $$('[data-model]').forEach(function(b){b.addEventListener('click',function(){renderModel(b.dataset.model)})});
  renderModel('drop');

  /* Copy helpers */
  function copyText(text,status,selectEl){
    var done=function(){if(status){status.textContent='Copied to clipboard.'}};
    var fail=function(){
      if(selectEl){selectEl.focus();if(selectEl.select){selectEl.select()}else{var r=document.createRange();r.selectNodeContents(selectEl);var s=window.getSelection();s.removeAllRanges();s.addRange(r)}}
      if(status){status.textContent='Text selected. Press Ctrl+C or Cmd+C to copy.'}
    };
    try{navigator.clipboard.writeText(text).then(done,fail)}catch(e){fail()}
  }
  $$('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var el=document.getElementById(b.dataset.copy);
      try{
        navigator.clipboard.writeText(el.textContent.trim()).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy'},1600)},function(){copyText('',null,el)});
      }catch(e){copyText('',null,el)}
    });
  });

  /* Forms */
  var forms={brand:$('#f-brand'),maker:$('#f-maker')}, result=$('#result'), activeForm=forms.brand;
  $$('[data-form]').forEach(function(b){
    b.addEventListener('click',function(){
      $$('[data-form]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
      activeForm=forms[b.dataset.form];
      forms.brand.hidden=activeForm!==forms.brand;
      forms.maker.hidden=activeForm!==forms.maker;
      result.hidden=true;
    });
  });
  Object.keys(forms).forEach(function(k){
    var f=forms[k];
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!f.checkValidity()){f.reportValidity();return}
      var lines=[f.dataset.kind+' for Chainex',''];
      $$('input,select,textarea',f).forEach(function(el){
        var v=(el.value||'').trim();
        if(v) lines.push(el.name+': '+v);
      });
      var text=lines.join('\n');
      $('#resultText').value=text;
      var subject=encodeURIComponent(f.dataset.kind);
      $('#mailBrief').setAttribute('href','mailto:elenapalmer@chainex.supply?subject='+subject+'&body='+encodeURIComponent(text));
      $('#copyStatus').textContent='';
      f.hidden=true; result.hidden=false;
      $('#copyBrief').focus({preventScroll:true});
    });
  });
  $('#copyBrief').addEventListener('click',function(){copyText($('#resultText').value,$('#copyStatus'),$('#resultText'))});
  $('#editBrief').addEventListener('click',function(){result.hidden=true;activeForm.hidden=false;var first=$('input',activeForm);if(first)first.focus()});
})();
