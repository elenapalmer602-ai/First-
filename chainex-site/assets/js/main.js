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

  /* Hero line pulses: SMIL ignores reduced motion, so pause it here */
  if(reduce){$$('.links-svg').forEach(function(s){if(s.pauseAnimations)s.pauseAnimations()})}

  /* Hero: sit the rock edges on the horizon, and tilt the scene toward the pointer */
  var hero=$('.hero'), art=$('.art');
  if(hero&&art){
    var placeHorizon=function(){var top=art.getBoundingClientRect().top-hero.getBoundingClientRect().top;hero.style.setProperty('--hz',(top+art.offsetWidth*.737)+'px');hero.classList.add('has-hz')};
    placeHorizon();
    if(window.ResizeObserver){new ResizeObserver(placeHorizon).observe(hero)}
    window.addEventListener('resize',placeHorizon);
    if(!reduce&&window.matchMedia('(pointer: fine)').matches){
      hero.addEventListener('pointermove',function(e){
        var r=art.getBoundingClientRect();
        var x=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2));
        var y=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2));
        art.style.setProperty('--mx',x.toFixed(3));art.style.setProperty('--my',y.toFixed(3));
      });
      hero.addEventListener('pointerleave',function(){art.style.setProperty('--mx','0');art.style.setProperty('--my','0')});
    }
  }

  /* Hero: spotlight, magnetic button, drifting dust */
  if(hero&&art){
    var fine=window.matchMedia('(pointer: fine)').matches;
    if(!reduce&&fine){
      hero.addEventListener('pointermove',function(e){
        var hr=hero.getBoundingClientRect();
        hero.style.setProperty('--sx',(e.clientX-hr.left)+'px');hero.style.setProperty('--sy',(e.clientY-hr.top)+'px');
      });
      $$('.hero-ctas .btn').forEach(function(btn){
        btn.addEventListener('pointermove',function(e){var r=btn.getBoundingClientRect();btn.style.translate=((e.clientX-r.left-r.width/2)*.18).toFixed(1)+'px '+((e.clientY-r.top-r.height/2)*.3).toFixed(1)+'px'});
        btn.addEventListener('pointerleave',function(){btn.style.translate=''});
      });
    }
    var cv=$('#motes'), cx=cv&&cv.getContext&&cv.getContext('2d');
    if(cx&&!reduce){
      var W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2),motes=[],mouse={x:-9999,y:-9999},on=true,raf=0;
      var size=function(){var r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0)};
      var make=function(init){var a=Math.random()*6.283,rad=Math.pow(Math.random(),.6)*.34;
        return {x:.5+Math.cos(a)*rad*.9,y:init?.42+Math.sin(a)*rad:.62+Math.random()*.1,r:.4+Math.random()*1.3,v:.00012+Math.random()*.00035,ph:Math.random()*6.283,vx:0,vy:0,warm:Math.random()<.45}};
      for(var i=0;i<46;i++)motes.push(make(true));
      cv.parentNode.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top});
      cv.parentNode.addEventListener('pointerleave',function(){mouse.x=mouse.y=-9999});
      var tick=function(t){
        cx.clearRect(0,0,W,H);
        motes.forEach(function(m,k){
          m.y-=m.v; m.ph+=.012;
          var px=m.x*W,py=m.y*H,dx=px-mouse.x,dy=py-mouse.y,dd=dx*dx+dy*dy;
          if(dd<9000){var f=(1-dd/9000)*.6;m.vx+=dx/Math.sqrt(dd+1)*f;m.vy+=dy/Math.sqrt(dd+1)*f}
          m.vx*=.92;m.vy*=.92;px+=m.vx;py+=m.vy;m.x=px/W;m.y=py/H;
          var fade=Math.min(1,(m.y-.08)/.2)*Math.min(1,(.8-m.y)/.15);
          if(m.y<.06||fade<=0&&m.y<.5){motes[k]=make(false);return}
          var a=Math.max(0,fade)*(.35+.35*Math.sin(m.ph));
          cx.beginPath();cx.arc(px,py,m.r,0,6.283);
          cx.fillStyle=m.warm?'rgba(232,214,194,'+a+')':'rgba(255,255,255,'+a+')';cx.fill();
        });
        raf=on&&!document.hidden?requestAnimationFrame(tick):0;
      };
      size();window.addEventListener('resize',size);
      new IntersectionObserver(function(en){on=en[0].isIntersecting;if(on&&!raf)raf=requestAnimationFrame(tick)}).observe(cv);
      document.addEventListener('visibilitychange',function(){if(on&&!document.hidden&&!raf)raf=requestAnimationFrame(tick)});
    }
  }

  /* Savings chart: the line draws itself when it comes into view */
  var chartCard=$('#chart');
  if(chartCard){
    var lines=$$('.c-line',chartCard);
    var draw=function(){chartCard.classList.add('in');lines.forEach(function(p){p.style.strokeDashoffset='0'})};
    if(reduce||!('IntersectionObserver' in window)){draw()}
    else{
      lines.forEach(function(p){var L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L});
      new IntersectionObserver(function(en,ob){if(en[0].isIntersecting){draw();ob.disconnect()}},{threshold:.3}).observe(chartCard);
    }
    if(reduce){$$('svg',chartCard).forEach(function(s){if(s.pauseAnimations)s.pauseAnimations()})}
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
  $$('#mobileMenu a').forEach(function(a){a.addEventListener('click',function(){menu.hidden=true;menuBtn.setAttribute('aria-expanded','false')})});

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
