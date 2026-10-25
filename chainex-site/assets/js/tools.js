/* Chainex Supply — product brief builder, call booking and quick message */
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root=document.documentElement;
  var EMAIL='elenapalmer@chainex.supply', CC='alex.ward@chainex.supply';
  var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var pad=function(n){return (n<10?'0':'')+n};
  var mailto=function(subject,body){return 'mailto:'+EMAIL+'?cc='+CC+'&subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};

  function copyText(text,status,selectEl){
    var done=function(){if(status)status.textContent='Copied to clipboard.'};
    var fail=function(){
      if(selectEl){selectEl.focus();if(selectEl.select)selectEl.select()}
      if(status)status.textContent='Select the text and press Ctrl+C or Cmd+C to copy.';
    };
    try{navigator.clipboard.writeText(text).then(done,fail)}catch(e){fail()}
  }

  /* ---------- layers: open, close, Escape, keep focus inside ---------- */
  var stack=[], lastFocus=[];
  function closeMenu(){var mm=$('#mobileMenu'),mb=$('#menuBtn');if(mm&&!mm.hidden){mm.hidden=true;if(mb)mb.setAttribute('aria-expanded','false')}}
  function openLayer(el,focusSel){
    if(!el||!el.hidden)return;
    closeMenu();
    lastFocus.push(document.activeElement);
    el.hidden=false;stack.push(el);
    if(el.dataset.lock!=='no')root.classList.add('lock');
    var f=focusSel?$(focusSel,el):$('button,input,a[href]',el);
    setTimeout(function(){if(f)f.focus({preventScroll:true})},60);
  }
  function closeLayer(el){
    if(!el||el.hidden)return;
    el.hidden=true;stack=stack.filter(function(x){return x!==el});
    if(!stack.some(function(x){return x.dataset.lock!=='no'}))root.classList.remove('lock');
    var f=lastFocus.pop();if(f&&f.focus)f.focus({preventScroll:true});
  }
  document.addEventListener('keydown',function(e){
    var top=stack[stack.length-1];if(!top)return;
    if(e.key==='Escape'){e.preventDefault();closeLayer(top);return}
    if(e.key==='Tab'){
      var f=$$('a[href],button:not([disabled]),input,textarea,select,[tabindex="0"]',top).filter(function(x){return x.offsetParent!==null});
      if(!f.length)return;
      var first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });

  /* =====================================================================
     PRODUCT BRIEF BUILDER
     ===================================================================== */
  var BRIEF=[
    {id:'product',tab:'Product',title:'What are you making?',label:'Product',mode:'multi',custom:'Type a product, e.g. peptide eye cream',items:[
      {v:'Serum',d:'Water or oil based'},{v:'Moisturiser or cream',d:'Face or body'},{v:'Cleanser',d:'Gel, foam or balm'},
      {v:'Brow tint or gel',d:'Brush or pen applicator'},{v:'Lip product',d:'Gloss, oil, tint or balm'},{v:'Lash or mascara',d:'Tubes, serums or extensions'},
      {v:'Hair care',d:'Shampoo, oils or masks'},{v:'Body care',d:'Lotions, scrubs or oils'}]},
    {id:'fulfil',tab:'Fulfilment',title:'How should orders reach your customers?',label:'Fulfilment model',mode:'single',items:[
      {v:'Dropshipping',d:'Supplier ships each order to the customer',line:'Dropshipping: supplier ships each order direct to the customer'},
      {v:'Bulk stock to a 3PL',d:'Stock held in a warehouse near customers',line:'Bulk stock shipped to our 3PL warehouse'},
      {v:'Hybrid',d:'Best sellers stocked, other lines shipped direct',line:'Hybrid: best sellers stocked at a 3PL, other lines dropshipped'},
      {v:'Not sure yet',d:'Model the options for me',line:'Undecided: please model dropshipping, hybrid and bulk'}]},
    {id:'custom',tab:'Customisation',title:'How much of the product should be yours?',label:'Customisation',mode:'multi',items:[
      {v:'Stock product',d:'Sell it as it comes',line:'Stock product, no changes'},
      {v:'Private label',d:'Your logo on existing packaging',line:'Private label: our logo on existing packaging'},
      {v:'Custom packaging',d:'Bottles, boxes and print to your design',line:'Custom packaging to our design'},
      {v:'Custom formula',d:'Adjusted or new formulation',line:'Custom or adjusted formula'},
      {v:'Custom applicator',d:'Brush, tip or pump changes',line:'Custom applicator (brush, tip or pump)'}]},
    {id:'ship',tab:'Shipping speed',title:'How fast should orders arrive?',label:'Delivery to customer',mode:'single',custom:'Type a range, e.g. 6–10 days',items:[
      {v:'3–5 days',d:'From order to doorstep'},{v:'6–10 days',d:'From order to doorstep'},{v:'11–15 days',d:'From order to doorstep'},{v:'16–25 days',d:'From order to doorstep'}]},
    {id:'volume',tab:'Volume',title:'How many units a month?',label:'Monthly volume',mode:'single',custom:'Type a number, e.g. 3,500 units',items:[
      {v:'Under 500 units',d:'Testing or early sales'},{v:'500–2,000 units',d:'Growing steadily'},{v:'2,000–10,000 units',d:'Established product'},{v:'10,000+ units',d:'High volume'}]},
    {id:'cost',tab:'Target cost',title:'What should each unit cost, delivered?',label:'Target landed cost',mode:'single',custom:'Type a target, e.g. £2.40 per unit',items:[
      {v:'Under £1 per unit',d:'Including freight and duty'},{v:'£1–£3 per unit',d:'Including freight and duty'},{v:'£3–£6 per unit',d:'Including freight and duty'},{v:'£6+ per unit',d:'Including freight and duty'}]},
    {id:'markets',tab:'Markets',title:'Where will you sell?',label:'Target markets',mode:'multi',custom:'Type another market',items:[
      {v:'United Kingdom'},{v:'European Union'},{v:'United States'},{v:'Middle East'},{v:'Australia'}]},
    {id:'docs',tab:'Compliance',title:'Which documents do you need?',label:'Compliance and documents',mode:'multi',items:[
      {v:'CPSR',d:'UK and EU safety report'},{v:'CPNP / SCPN',d:'EU and UK product notification'},{v:'US MoCRA',d:'US registration and listing'},
      {v:'MSDS',d:'Safety data sheet'},{v:'COA',d:'Certificate of analysis per batch'},{v:'GMP / ISO 22716',d:'Factory certification'}]},
    {id:'claims',tab:'Claims',title:'Any claims or certifications?',label:'Claims and certifications',mode:'multi',custom:'Type another claim',items:[
      {v:'Vegan'},{v:'Cruelty-free'},{v:'Halal'},{v:'Fragrance-free'},{v:'Dermatologically tested'}]},
    {id:'quality',tab:'Quality checks',title:'What should we test before you order?',label:'Quality checks',mode:'multi',items:[
      {v:'Pre-production samples',d:'From each shortlisted supplier'},{v:'Water resistance',d:'Filmed and documented'},
      {v:'Shade and finish match',d:'Against your reference'},{v:'Applicator measurements',d:'Size, density and leaks'},
      {v:'Competitor benchmark',d:'Side by side with a market leader'}]},
    {id:'timeline',tab:'Timeline',title:'When do you want to launch?',label:'Launch timeline',mode:'single',custom:'Type a date or month, e.g. March 2027',items:[
      {v:'Within 1 month'},{v:'1–3 months'},{v:'3–6 months'},{v:'Flexible'}]},
    {id:'notes',tab:'Notes',title:'Anything else suppliers should know?',label:'Notes',mode:'multi',notes:true,custom:'e.g. current supplier issues, reference products, budget for samples'}
  ];

  var builder=$('#builder');
  if(builder){
    var state={},active=0,typeTimer=null;
    var tabs=$('#bTabs'),panel=$('#bPanel'),rows=$('#bRows'),count=$('#bCount'),cart=$('#bCart'),
        empty=$('#bEmpty'),stamp=$('#bStamp'),send=$('#bSend'),status=$('#bStatus'),brand=$('#bBrand'),paper=$('#bPaper'),
        peekLine=$('#bPeekLine'),peekCount=$('#bPeekCount');
    var ref='CHX-BR-'+(1000+Math.floor(Math.random()*9000));
    var today=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    $('#bRef').textContent='Ref '+ref;$('#bDate').textContent=today;

    var lineFor=function(c,v){var it=(c.items||[]).filter(function(x){return x.v===v})[0];return it&&it.line?it.line:v};
    var valueText=function(c){return (state[c.id]||[]).map(function(v){return lineFor(c,v)}).join('; ')};
    var filled=function(){return BRIEF.filter(function(c){return (state[c.id]||[]).length})};
    var total=function(){return BRIEF.reduce(function(s,c){return s+(state[c.id]||[]).length},0)};

    function briefText(){
      var name=(brand.value||'').trim()||'[Brand]';
      var lines=['SUPPLIER BRIEF: '+name,ref+' · '+today,''];
      filled().forEach(function(c,i){lines.push(pad(i+1)+'  '+c.label+': '+valueText(c))});
      lines.push('','Prepared with Chainex Supply · chainex.supply');
      return lines.join('\n');
    }
    function syncSend(){send.setAttribute('href',mailto('Product brief: '+((brand.value||'').trim()||'new brand'),briefText()))}

    function renderTabs(){
      tabs.innerHTML=BRIEF.map(function(c,i){
        var has=(state[c.id]||[]).length;
        return '<button type="button" role="tab" class="b-tab'+(has?' has':'')+'" aria-selected="'+(i===active)+'" data-i="'+i+'"><span class="n">'+pad(i+1)+'</span>'+esc(c.tab)+'</button>';
      }).join('');
      var cur=$('.b-tab[aria-selected="true"]',tabs);
      if(cur){var r=cur.getBoundingClientRect(),tr=tabs.getBoundingClientRect();if(tr.width)tabs.scrollLeft+=r.left-tr.left-(tr.width-r.width)/2}
      tabEdge();
    }
    function tabEdge(){tabs.classList.toggle('end',tabs.scrollLeft+tabs.clientWidth>=tabs.scrollWidth-4)}
    tabs.addEventListener('scroll',tabEdge,{passive:true});
    function renderPanel(){
      var c=BRIEF[active],sel=state[c.id]||[];
      var h='<div class="b-q"><h3>'+esc(c.title)+'</h3><p class="b-hint">'+(c.notes?'Write anything you like, then add it.':(c.mode==='single'?'Choose one':'Add as many as you need')+(c.custom?', or type your own.':'.'))+'</p></div>';
      if(c.items){
        h+='<div class="b-items">'+c.items.map(function(it,k){
          var on=sel.indexOf(it.v)>-1;
          return '<div class="b-item'+(on?' added':'')+'"><b>'+esc(it.v)+'</b>'+(it.d?'<small>'+esc(it.d)+'</small>':'')+
            '<button type="button" class="b-add" data-k="'+k+'" aria-pressed="'+on+'"><svg class="ico"><use href="#i-'+(on?'tick':'bag')+'"/></svg>'+(on?'Added':'Add to brief')+'</button></div>';
        }).join('')+'</div>';
      }
      if(c.custom){
        h+='<form class="b-custom" data-custom><label class="sr" for="bCustom">'+esc(c.custom)+'</label>'+
          (c.notes?'<textarea id="bCustom" rows="3" placeholder="'+esc(c.custom)+'"></textarea>':'<input id="bCustom" placeholder="'+esc(c.custom)+'" autocomplete="off">')+
          '<button type="submit" class="btn btn-ghost btn-sm"><svg class="ico"><use href="#i-bag"/></svg>'+(c.notes?'Add note':'Add')+'</button></form>';
        var custom=sel.filter(function(v){return !(c.items||[]).some(function(it){return it.v===v})});
        if(custom.length)h+='<div class="b-chips">'+custom.map(function(v){return '<button type="button" class="b-chip" data-v="'+esc(v)+'">'+esc(v)+'<svg class="ico"><use href="#i-close"/></svg></button>'}).join('')+'</div>';
      }
      panel.innerHTML=h;
      $('#bPrev').disabled=active===0;
      $('#bNext').innerHTML=active===BRIEF.length-1?'Review brief<svg class="ico"><use href="#i-arrow"/></svg>':'Next<svg class="ico"><use href="#i-arrow"/></svg>';
    }
    function type(el,text){
      clearInterval(typeTimer);
      var i=0,caret=document.createElement('span');caret.className='p-caret';
      el.textContent='';el.appendChild(caret);
      var step=Math.max(1,Math.round(text.length/40));
      typeTimer=setInterval(function(){
        i=Math.min(text.length,i+step);el.textContent=text.slice(0,i);el.appendChild(caret);
        if(i>=text.length){clearInterval(typeTimer);setTimeout(function(){if(caret.parentNode)caret.parentNode.removeChild(caret)},700)}
      },24);
    }
    function renderPaper(changedId){
      var f=filled();
      empty.hidden=f.length>0;
      rows.innerHTML=f.map(function(c,i){
        return '<li class="p-row'+(c.id===changedId?' fresh':'')+'" data-id="'+c.id+'"><span class="pn">'+pad(i+1)+'</span><span class="pl">'+esc(c.label)+'</span><span class="pv"></span></li>';
      }).join('');
      f.forEach(function(c){
        var pv=$('.p-row[data-id="'+c.id+'"] .pv',rows),text=valueText(c);
        if(c.id===changedId&&!reduce)type(pv,text);else pv.textContent=text;
      });
      count.textContent=total();
      stamp.classList.toggle('on',f.length>=6);
      peekCount.textContent=f.length;
      var last=f.filter(function(c){return c.id===changedId})[0]||f[f.length-1];
      peekLine.textContent=last?pad(f.indexOf(last)+1)+'  '+last.label+': '+valueText(last):'Nothing added yet';
      if(changedId&&!reduce){peekLine.classList.remove('new');void peekLine.offsetWidth;peekLine.classList.add('new')}
      renderTabs();syncSend();
    }
    function fly(a){
      cart.classList.remove('bump');void cart.offsetWidth;cart.classList.add('bump');
      if(reduce||!a||!a.width)return;
      var b=cart.getBoundingClientRect();
      var el=document.createElement('span');el.className='fly';el.setAttribute('aria-hidden','true');
      el.innerHTML='<svg class="ico"><use href="#i-bag"/></svg>';document.body.appendChild(el);
      var x0=a.left+a.width/2,y0=a.top+a.height/2,x1=b.left+24,y1=b.top+b.height/2;
      if(!el.animate){el.remove();return}
      el.animate([
        {transform:'translate('+x0+'px,'+y0+'px) scale(1)',opacity:1},
        {transform:'translate('+((x0+x1)/2)+'px,'+(Math.min(y0,y1)-90)+'px) scale(.9)',opacity:1,offset:.5},
        {transform:'translate('+x1+'px,'+y1+'px) scale(.35)',opacity:.25}
      ],{duration:760,easing:'cubic-bezier(.45,0,.2,1)'}).onfinish=function(){el.remove()};
    }
    function toggle(c,v,src,refocusK){
      var sel=state[c.id]||(state[c.id]=[]),i=sel.indexOf(v),adding=i<0;
      var from=src&&src.getBoundingClientRect?src.getBoundingClientRect():null;
      if(adding){if(c.mode==='single')sel.length=0;sel.push(v)}else sel.splice(i,1);
      renderPanel();renderPaper(adding?c.id:null);
      if(adding)fly(from);
      if(refocusK!=null){var nb=$('.b-add[data-k="'+refocusK+'"]',panel);if(nb)nb.focus({preventScroll:true})}
      status.textContent='';
    }

    tabs.addEventListener('click',function(e){var t=e.target.closest('.b-tab');if(!t)return;active=+t.dataset.i;renderTabs();renderPanel()});
    panel.addEventListener('click',function(e){
      var c=BRIEF[active],b=e.target.closest('.b-add');
      if(b){toggle(c,c.items[+b.dataset.k].v,b,+b.dataset.k);return}
      var chip=e.target.closest('.b-chip');
      if(chip)toggle(c,chip.dataset.v,null,null);
    });
    panel.addEventListener('submit',function(e){
      e.preventDefault();
      var c=BRIEF[active],inp=$('#bCustom',panel),v=(inp.value||'').trim().replace(/\s+/g,' ');
      if(!v){inp.focus();return}
      var match=(c.items||[]).filter(function(it){return it.v.toLowerCase()===v.toLowerCase()})[0];
      if(match)v=match.v;
      if((state[c.id]||[]).indexOf(v)<0)toggle(c,v,e.target.querySelector('button'),null);
      var again=$('#bCustom',panel);if(again)again.focus();
    });
    $('#bPrev').addEventListener('click',function(){if(active>0){active--;renderTabs();renderPanel();if(tabs.getBoundingClientRect().top<72)tabs.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'})}});
    $('#bNext').addEventListener('click',function(){
      if(active<BRIEF.length-1){active++;renderTabs();renderPanel();if(tabs.getBoundingClientRect().top<72)tabs.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'})}
      else{paper.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});send.focus({preventScroll:true})}
    });
    var toPaper=function(){paper.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'})};
    cart.addEventListener('click',toPaper);$('#bPeek').addEventListener('click',toPaper);
    brand.addEventListener('input',syncSend);
    send.addEventListener('click',function(e){
      if(!total()){e.preventDefault();status.textContent='Add at least one requirement first.';return}
      status.textContent='Your email app opens with the brief filled in. Press send there to reach us.';
    });
    $('#bCopy').addEventListener('click',function(){
      if(!total()){status.textContent='Add at least one requirement first.';return}
      copyText(briefText(),status,null);
    });
    $('#bClear').addEventListener('click',function(){state={};renderPanel();renderPaper(null);status.textContent='Brief cleared.'});

    renderTabs();renderPanel();renderPaper(null);

    var openBrief=function(){openLayer(builder,'.b-back');renderTabs()};
    $$('[data-open-brief]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();openBrief()})});
    $$('[data-close-brief]',builder).forEach(function(b){b.addEventListener('click',function(){closeLayer(builder)})});
    if(location.hash==='#brief')openBrief();
  }

  /* =====================================================================
     BOOK A CALL
     ===================================================================== */
  var bk=$('#bookModal');
  if(bk){
    var calDays=$('#calDays'),calMonth=$('#calMonth'),slotList=$('#slotList'),slotLabel=$('#slotLabel'),sum=$('#bkSummary'),bkForm=$('#bkForm'),bkDone=$('#bkDone'),bkGrid=$('.bk-grid',bk);
    var now=new Date(),today0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    var maxDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+42);
    var view=new Date(now.getFullYear(),now.getMonth(),1),selDay=null,selSlot=null;
    var SLOTS=['09:30','10:00','10:30','11:00','11:30','12:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
    var same=function(a,b){return !!a&&!!b&&a.toDateString()===b.toDateString()};
    var slotTime=function(day,s){var p=s.split(':');return new Date(day.getFullYear(),day.getMonth(),day.getDate(),+p[0],+p[1])};
    var soonest=function(){return new Date(Date.now()+2*3600e3)};
    var dayOpen=function(d){
      var wd=d.getDay();
      if(d<today0||d>maxDay||wd===0||wd===6)return false;
      return SLOTS.some(function(s){return slotTime(d,s)>soonest()});
    };
    function renderCal(){
      calMonth.textContent=view.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
      var first=(view.getDay()+6)%7,days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate(),h='';
      for(var i=0;i<first;i++)h+='<span aria-hidden="true"></span>';
      for(var d=1;d<=days;d++){
        var dt=new Date(view.getFullYear(),view.getMonth(),d),open=dayOpen(dt);
        h+='<button type="button" class="cal-day'+(same(dt,now)?' today':'')+'" data-d="'+d+'"'+(open?'':' disabled')+' aria-pressed="'+same(dt,selDay)+'" aria-label="'+dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+(open?'':', unavailable')+'">'+d+'</button>';
      }
      calDays.innerHTML=h;
      $('#calPrev').disabled=view<=new Date(now.getFullYear(),now.getMonth(),1);
      $('#calNext').disabled=new Date(view.getFullYear(),view.getMonth()+1,1)>maxDay;
    }
    function renderSlots(){
      if(!selDay){slotLabel.textContent='Available times';slotList.innerHTML='<p class="slot-empty">Pick a weekday to see the times we are free.</p>';return}
      slotLabel.textContent=selDay.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
      slotList.innerHTML=SLOTS.map(function(s){
        var off=slotTime(selDay,s)<=soonest();
        return '<button type="button" class="slot" data-s="'+s+'"'+(off?' disabled':'')+' aria-pressed="'+(s===selSlot)+'">'+s+'</button>';
      }).join('');
    }
    function renderSum(){
      sum.innerHTML=selDay&&selSlot?'<b>'+esc(selDay.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}))+', '+selSlot+'</b> UK time · 20 minutes':'Choose a day and time';
    }
    calDays.addEventListener('click',function(e){
      var b=e.target.closest('.cal-day');if(!b||b.disabled)return;
      selDay=new Date(view.getFullYear(),view.getMonth(),+b.dataset.d);selSlot=null;
      renderCal();renderSlots();renderSum();
      var first=$('.slot:not([disabled])',slotList);if(first&&window.innerWidth<720)first.scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'});
    });
    slotList.addEventListener('click',function(e){var b=e.target.closest('.slot');if(!b||b.disabled)return;selSlot=b.dataset.s;renderSlots();renderSum()});
    $('#calPrev').addEventListener('click',function(){view=new Date(view.getFullYear(),view.getMonth()-1,1);renderCal()});
    $('#calNext').addEventListener('click',function(){view=new Date(view.getFullYear(),view.getMonth()+1,1);renderCal()});
    bkForm.addEventListener('submit',function(e){
      e.preventDefault();
      if(!selDay||!selSlot){sum.innerHTML='<b>Choose a day and time first.</b>';return}
      if(!bkForm.checkValidity()){bkForm.reportValidity();return}
      var when=selDay.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+', '+selSlot+' UK time';
      var topic=$('#bk-topic').value.trim();
      var text='Call request for Chainex\n\nTime: '+when+' (20 minutes)\nName: '+$('#bk-name').value.trim()+'\nEmail or phone: '+$('#bk-contact').value.trim()+(topic?'\nTopic: '+topic:'');
      $('#bkText').value=text;$('#bkWhen').textContent=when;
      $('#bkMail').setAttribute('href',mailto('Call request: '+when,text));
      bkForm.hidden=true;bkGrid.hidden=true;bkDone.hidden=false;$('#bkStatus').textContent='';
      $('#bkMail').focus({preventScroll:true});
    });
    $('#bkEdit').addEventListener('click',function(){bkDone.hidden=true;bkForm.hidden=false;bkGrid.hidden=false;$('#bk-name').focus()});
    $('#bkCopy').addEventListener('click',function(){copyText($('#bkText').value,$('#bkStatus'),$('#bkText'))});
    renderCal();renderSlots();renderSum();

    $$('[data-open-book]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();openLayer(bk,'#calNext')})});
    $$('[data-close-book]',bk).forEach(function(b){b.addEventListener('click',function(){closeLayer(bk)})});
    bk.addEventListener('click',function(e){if(e.target===bk)closeLayer(bk)});
    if(location.hash==='#book')openLayer(bk,'#calNext');
  }

  /* =====================================================================
     QUICK MESSAGE
     ===================================================================== */
  var mp=$('#msgPanel');
  if(mp){
    var mf=$('#msgForm'),md=$('#msgDone');
    var toggleMsg=function(e){if(e)e.preventDefault();if(mp.hidden)openLayer(mp,'#msg-contact');else closeLayer(mp)};
    $$('[data-open-msg]').forEach(function(b){b.addEventListener('click',toggleMsg)});
    $$('[data-close-msg]',mp).forEach(function(b){b.addEventListener('click',function(){closeLayer(mp)})});
    mf.addEventListener('submit',function(e){
      e.preventDefault();
      if(!mf.checkValidity()){mf.reportValidity();return}
      var who=$('#msg-contact').value.trim(),msg=$('#msg-text').value.trim();
      var text='Message for Chainex\n\nFrom: '+who+'\n\n'+msg;
      $('#msgText').value=text;
      $('#msgMail').setAttribute('href',mailto('Website message from '+who,text));
      mf.hidden=true;md.hidden=false;$('#msgStatus').textContent='';
      $('#msgMail').focus({preventScroll:true});
    });
    $('#msgEdit').addEventListener('click',function(){md.hidden=true;mf.hidden=false;$('#msg-text').focus()});
    $('#msgCopy').addEventListener('click',function(){copyText($('#msgText').value,$('#msgStatus'),$('#msgText'))});
  }
})();
