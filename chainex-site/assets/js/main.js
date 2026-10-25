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

  /* Hero: the photograph tilts toward the pointer, a soft spotlight follows it, the floating labels
     drift by depth and warm up as the pointer comes near, and the buttons lean in */
  var hero=$('.hero'), hv=$('#heroVisual');
  var fine=window.matchMedia&&window.matchMedia('(pointer: fine)').matches;
  if(hero&&hv&&!reduce&&fine){
    var labels=$$('.flabel',hv),heroRaf=0,last=null;
    var applyTilt=function(){
      heroRaf=0;if(!last)return;
      var hr=hero.getBoundingClientRect(),r=hv.getBoundingClientRect();
      var rects=labels.map(function(l){return l.getBoundingClientRect()});
      hero.style.setProperty('--sx',(last.x-hr.left)+'px');hero.style.setProperty('--sy',(last.y-hr.top)+'px');
      var x=Math.max(-1,Math.min(1,((last.x-r.left)/r.width-.5)*2)),y=Math.max(-1,Math.min(1,((last.y-r.top)/r.height-.5)*2));
      hv.style.setProperty('--ry',(x*6).toFixed(2)+'deg');hv.style.setProperty('--rx',(-y*4.5).toFixed(2)+'deg');
      hv.style.setProperty('--px',x.toFixed(3));hv.style.setProperty('--py',y.toFixed(3));
      labels.forEach(function(l,k){
        var b=rects[k],dx=last.x-(b.left+b.width/2),dy=last.y-(b.top+b.height/2);
        l.style.setProperty('--near',Math.max(0,1-Math.sqrt(dx*dx+dy*dy)/260).toFixed(3));
      });
    };
    hero.addEventListener('pointermove',function(e){last={x:e.clientX,y:e.clientY};if(!heroRaf)heroRaf=requestAnimationFrame(applyTilt)});
    hero.addEventListener('pointerleave',function(){
      last=null;['--rx','--ry','--px','--py'].forEach(function(p){hv.style.removeProperty(p)});
      labels.forEach(function(l){l.style.removeProperty('--near')});
    });
    $$('.hero-ctas .btn').forEach(function(btn){
      btn.addEventListener('pointermove',function(e){var r=btn.getBoundingClientRect();btn.style.translate=((e.clientX-r.left-r.width/2)*.16).toFixed(1)+'px '+((e.clientY-r.top-r.height/2)*.28).toFixed(1)+'px'});
      btn.addEventListener('pointerleave',function(){btn.style.translate=''});
    });
  }

  /* Hero: dust drifting up past the photograph, pushed aside by the pointer */
  var cv=$('#motes'), cx=cv&&cv.getContext&&cv.getContext('2d');
  if(cx&&!reduce){
    var W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2),motes=[],mouse={x:-9999,y:-9999},on=true,raf=0;
    var size=function(){var r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0)};
    var make=function(init){return {x:Math.random(),y:init?.1+Math.random()*.85:.86+Math.random()*.12,r:.4+Math.random()*1.3,v:.00016+Math.random()*.0004,ph:Math.random()*6.283,vx:0,vy:0,warm:Math.random()<.5}};
    for(var i=0;i<54;i++)motes.push(make(true));
    if(fine){
      hv.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top});
      hv.addEventListener('pointerleave',function(){mouse.x=mouse.y=-9999});
    }
    var tick=function(){
      cx.clearRect(0,0,W,H);
      motes.forEach(function(m,k){
        m.y-=m.v;m.ph+=.012;
        var px=m.x*W,py=m.y*H,dx=px-mouse.x,dy=py-mouse.y,dd=dx*dx+dy*dy;
        if(dd<10000){var f=(1-dd/10000)*.7;m.vx+=dx/Math.sqrt(dd+1)*f;m.vy+=dy/Math.sqrt(dd+1)*f}
        m.vx*=.92;m.vy*=.92;px+=m.vx;py+=m.vy;m.x=px/W;m.y=py/H;
        if(m.y<.03||m.x<-.05||m.x>1.05){motes[k]=make(false);return}
        var fade=Math.max(0,Math.min(1,(m.y-.04)/.22)*Math.min(1,(.97-m.y)/.18));
        var a=fade*(.32+.32*Math.sin(m.ph));
        cx.beginPath();cx.arc(px,py,m.r,0,6.283);
        cx.fillStyle=m.warm?'rgba(240,222,198,'+a+')':'rgba(255,255,255,'+a+')';cx.fill();
      });
      raf=on&&!document.hidden?requestAnimationFrame(tick):0;
    };
    size();window.addEventListener('resize',size);
    if('IntersectionObserver' in window)new IntersectionObserver(function(en){on=en[0].isIntersecting;if(on){size();if(!raf)raf=requestAnimationFrame(tick)}}).observe(cv);
    else raf=requestAnimationFrame(tick);
    document.addEventListener('visibilitychange',function(){if(on&&!document.hidden&&!raf)raf=requestAnimationFrame(tick)});
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

  /* Process stack: six plates, one per stage. Panning across the stack (mouse, touch drag or arrow keys)
     brings them together from the bottom up; once all six have landed a tick grows on top. */
  var ps=$('#pstack');
  if(ps){
    var stage=$('.ps-stage',ps),plates=$$('.ps-plate',ps),psShadow=$('.ps-shadow',ps),psN=$('#psN'),psName=$('#psName');
    var NAMES=['Discover','Source and compare','Verify and test','Model and recommend','Set up and transition','Monitor and improve'];
    var OFF=[[-18,-7],[20,6],[-14,-4],[22,7],[-20,-6],[12,4]];
    var GAP=50,THICK=10.5,cur=0,target=0,psVisible=false,psRaf=0,landed=[],together=0,isDone=false;
    var smooth=function(s){return s*s*(3-2*s)};
    var layout=function(time){
      var z=[0],s=[1];
      for(var k=1;k<6;k++){s[k]=Math.max(0,Math.min(1,cur*5-(k-1)));z[k]=z[k-1]+GAP+(THICK-GAP)*smooth(s[k])}
      var mid=(z[0]+z[5])/2,count=1;
      for(k=0;k<6;k++){
        var own=k===0?s[1]:s[k],free=1-own;
        var bob=reduce?0:Math.sin(time*.0011+k*1.15)*3.4*free;
        plates[k].style.setProperty('--z',(z[k]-mid+bob).toFixed(2)+'px');
        plates[k].style.setProperty('--x',(OFF[k][0]*free).toFixed(2)+'px');
        plates[k].style.setProperty('--r',(OFF[k][1]*free).toFixed(2)+'deg');
        if(k>0){
          var on=s[k]>.92;
          if(on){count++;if(!landed[k]&&!reduce){(function(p){p.classList.add('lit');setTimeout(function(){p.classList.remove('lit')},420)})(plates[k])}}
          landed[k]=on;
        }
      }
      var bottomY=-(z[0]-mid)*.848;
      psShadow.style.setProperty('--sy',(bottomY+66).toFixed(1)+'px');
      psShadow.style.setProperty('--warm',cur.toFixed(3));
      var done=cur>.985||(isDone&&cur>.96);
      if(done!==isDone){isDone=done;ps.classList.toggle('done',done)}
      if(count!==together||done!==ps._wasDone){
        together=count;ps._wasDone=done;
        psN.textContent='0'+count;
        psName.textContent=done?'All six stages, one clear result':NAMES[count-1];
        stage.setAttribute('aria-valuenow',String(count));
        stage.setAttribute('aria-valuetext',done?'All six stages together':'Stage '+count+' of 6, '+NAMES[count-1]);
      }
    };
    var psTick=function(time){
      psRaf=0;
      cur+=(target-cur)*(reduce?1:.15);
      if(Math.abs(target-cur)<.0015)cur=target;
      layout(time||performance.now());
      // keep animating while the plates move, or while any plate is still free to float
      if(psVisible&&!reduce&&(cur!==target||cur<1))psRaf=requestAnimationFrame(psTick);
    };
    var kick=function(){if(!psRaf)psRaf=requestAnimationFrame(psTick)};
    var used=function(){ps.classList.add('used')};
    var fromX=function(x){var r=stage.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left-r.width*.14)/(r.width*.72)))};
    stage.addEventListener('pointermove',function(e){
      if(e.pointerType==='mouse'){target=fromX(e.clientX);used();kick()}
    });
    var dragX=null,dragFrom=0;
    stage.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'){dragX=e.clientX;dragFrom=target}});
    stage.addEventListener('pointermove',function(e){
      if(dragX===null||e.pointerType==='mouse')return;
      var r=stage.getBoundingClientRect();
      target=Math.max(0,Math.min(1,dragFrom+(e.clientX-dragX)/(r.width*.75)));used();kick();
    });
    ['pointerup','pointercancel','pointerleave'].forEach(function(t){stage.addEventListener(t,function(e){if(e.pointerType!=='mouse')dragX=null})});
    stage.addEventListener('keydown',function(e){
      var k=e.key,step=Math.round(target*5);
      if(k==='ArrowRight'||k==='ArrowUp')target=Math.min(5,step+1)/5;
      else if(k==='ArrowLeft'||k==='ArrowDown')target=Math.max(0,step-1)/5;
      else if(k==='Home')target=0;
      else if(k==='End')target=1;
      else return;
      e.preventDefault();used();kick();
    });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(en){psVisible=en[0].isIntersecting;if(psVisible)kick()},{rootMargin:'60px 0px'}).observe(stage);
    }else{psVisible=true}
    layout(0);kick();
  }

  /* Boxes pop up one by one as each group scrolls into view. Before they arrive they sit dimmed and
     slightly lower, never hidden, so nothing is lost if motion is off or a screenshot catches them early. */
  if(!reduce&&'IntersectionObserver' in window){
    var RV=['.facts > div','.people .person','.fit li:not(.mono-label)','.photo-trio .shot','.points li','.cmp-card','.kpi','.chart-card','.ess-grid .flip','.svc-group','.ownbrand .ob-media','.ownbrand .ob-copy','.q-photo','.proof-col','.reel-head','.setup-panel','.models li:not(.mono-label)','.hs-media','.care-list li','.log','.faq-list details','.faq-shot','.next li','.dcard','.social-row','.quick-actions .btn','.form-card','.pstack','.shot.banner'].join(',');
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

  /* Test-bench reel: buttons, drag to scroll, video plays only while visible */
  $$('.reel').forEach(function(reel){
    var track=$('.reel-track',reel), prev=$('.reel-prev',reel), next=$('.reel-next',reel);
    var step=function(){var it=$('.reel-item',track);return it?it.getBoundingClientRect().width+22:300};
    var sync=function(){prev.disabled=track.scrollLeft<4;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-4};
    prev.addEventListener('click',function(){track.scrollBy({left:-step(),behavior:reduce?'auto':'smooth'})});
    next.addEventListener('click',function(){track.scrollBy({left:step(),behavior:reduce?'auto':'smooth'})});
    track.addEventListener('scroll',sync,{passive:true});sync();
    var down=false,sx=0,sl=0,moved=false;
    track.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'||e.target.closest('button'))return;down=true;moved=false;sx=e.clientX;sl=track.scrollLeft});
    window.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;if(Math.abs(dx)>4){moved=true;track.classList.add('drag')}track.scrollLeft=sl-dx});
    window.addEventListener('pointerup',function(){if(!down)return;down=false;track.classList.remove('drag')});
    track.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();next.click()}if(e.key==='ArrowLeft'){e.preventDefault();prev.click()}});
    $$('.reel-video',reel).forEach(function(v){
      var btn=v.parentNode.querySelector('.reel-play'), userPaused=reduce;
      var show=function(){btn.classList.toggle('paused',v.paused);btn.setAttribute('aria-label',v.paused?'Play video':'Pause video')};
      btn.addEventListener('click',function(){if(v.paused){userPaused=false;v.play().catch(function(){})}else{userPaused=true;v.pause()}});
      v.addEventListener('play',show);v.addEventListener('pause',show);show();
      if('IntersectionObserver' in window){new IntersectionObserver(function(en){if(en[0].isIntersecting&&!userPaused){v.play().catch(function(){})}else{v.pause()}},{threshold:.5}).observe(v)}
    });
  });

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
