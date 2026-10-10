
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='kotoba-v1';
let sel=new Set(),cfg={mode:'mc',dir:'mix',shuffle:true,auto:true,ldir:'ah',tt:['mc','tf','ty','ls'],tn:'20',tfb:true},Q=null,msg='',DL=[];
try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d){sel=new Set(d.sel||[])}}catch(e){}
const VDEF=__VDEF_JSON__;
/* kho gốc: từ vựng luôn lấy từ VDEF, không lưu trên trình duyệt */
const words=VDEF;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({sel:[...sel]}))}catch(e){}};
const F={h:'Hiragana',k:'Kanji',m:'Nghĩa'};
const DIRS={mix:'Trộn tất cả các chiều',kh:'Kanji → Hiragana',km:'Kanji → Nghĩa',hm:'Hiragana → Nghĩa',mh:'Nghĩa → Hiragana',mk:'Nghĩa → Kanji',hk:'Hiragana → Kanji'};
const LD={ah:'Nghe → Hiragana',ak:'Nghe → Kanji',am:'Nghe → Nghĩa',mix:'Trộn (Hiragana, Kanji, Nghĩa)'};
const MODES={mc:['Trắc nghiệm','4 đáp án'],tf:['Đúng / Sai','Đáp án này đúng không?'],fc:['Ghép thẻ','Chọn 2 thẻ tương ứng'],ty:['Gõ đáp án','Gõ rồi chấm'],ls:['Nghe → viết','Nghe rồi gõ đáp án'],test:['Bài kiểm tra','Trộn nhiều dạng câu']};
const TL={mc:'Trắc nghiệm',tf:'Đúng / Sai',ty:'Gõ đáp án',ls:'Nghe → viết'};
const cm=()=>{const q=Q&&Q.list&&Q.list[Q.i];return(q&&q.type)||(Q&&Q.mode)};
const dirsFor=(w,t)=>(t==='ls'?['ah','ak','am']:(cfg.dir==='mix'?Object.keys(DIRS).slice(1):[cfg.dir])).filter(d=>(d[0]==='a'?(w.h||w.k):w[d[0]])&&w[d[1]]);
const dl=d=>/^\d+$/.test(d)?'Ngày '+d:d;
/* ---------- audio (giọng đọc tiếng Nhật của trình duyệt) ---------- */
let VO=null,VN='',RT=.9;
try{VN=localStorage.getItem('kotoba-voice')||'';RT=+localStorage.getItem('kotoba-rate')||.9}catch(e){}
const jaVoices=()=>'speechSynthesis' in window?speechSynthesis.getVoices().filter(x=>/^ja/i.test(x.lang)):[];
const pickVoice=()=>{const v=jaVoices();VO=v.find(x=>x.name===VN)||v.find(x=>/Natural|Online/i.test(x.name))||v.find(x=>/Google/i.test(x.name))||v[0]||null;return VO};
if('speechSynthesis' in window){speechSynthesis.onvoiceschanged=()=>{pickVoice();if(!Q&&document.activeElement===document.body)render()};pickVoice()}
if('speechSynthesis' in window){let vt=0;const vp=setInterval(()=>{const had=VO;pickVoice();vt++;if(VO&&!had&&!Q&&!G&&document.activeElement===document.body)render();if(VO||vt>12)clearInterval(vp)},500)}
let AUD={},AUDN=0,ACT=null,PACK=null,PACKP=null;
const akey=t=>String(t||'').trim();
function loadPack(){
  if(PACK)return Promise.resolve(PACK);
  if(!PACKP)PACKP=fetch('audio/pack.bin').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>(PACK=b)).catch(()=>{PACKP=null;return null});
  return PACKP;
}
try{fetch('audio/index.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).then(j=>{AUD=j&&typeof j==='object'?j:{};AUDN=Object.keys(AUD).length;if(AUDN){if(Object.values(AUD).some(v=>Array.isArray(v)))loadPack();if(!Q&&!G&&document.activeElement===document.body)render()}}).catch(()=>{})}catch(e){}
function stopAud(){if(ACT){try{ACT.pause()}catch(e){}ACT=null}}
function say(t){
  if(!t)return;t=String(t);
  const f=AUD[akey(t)];
  let src=null;
  if(Array.isArray(f)){if(PACK)src=URL.createObjectURL(new Blob([PACK.slice(f[0],f[0]+f[1])],{type:'audio/mpeg'}));else loadPack()}
  else if(f)src='audio/'+f;
  if(src){
    stopAud();if('speechSynthesis' in window)speechSynthesis.cancel();
    const a=new Audio(src);try{a.playbackRate=Math.max(.5,Math.min(1.5,RT/.9));a.preservesPitch=true}catch(e){}
    ACT=a;const fb=()=>{if(ACT===a){ACT=null;sayTTS(t)}};
    a.onerror=fb;a.onended=()=>{if(Array.isArray(f))URL.revokeObjectURL(src)};
    const p=a.play();if(p&&p.catch)p.catch(fb);return;
  }
  stopAud();sayTTS(t);
}
async function prefetchAudio(){
  const st=()=>document.getElementById('aud-st');
  if(st())st().textContent='Đang tải…';
  if(Object.values(AUD).some(v=>Array.isArray(v))){
    const b=await loadPack();
    if(st())st().textContent=b?`Xong. Đã lưu ${AUDN} câu/từ (${Math.round(b.byteLength/1048576*10)/10} MB), dùng được khi không có mạng.`:'Chưa tải được (kiểm tra mạng rồi bấm lại).';return;
  }
  const fs=[...new Set(Object.values(AUD))],tot=fs.length;let n=0,bad=0;
  const run=async()=>{while(fs.length){const f=fs.pop();try{const r=await fetch('audio/'+f);if(!r.ok)throw 0;await r.arrayBuffer()}catch(e){bad++}n++;if(st())st().textContent=`Đã tải ${n}/${tot}…`}};
  await Promise.all([run(),run(),run(),run()]);
  if(st())st().textContent=bad?`Xong, ${bad} file chưa tải được.`:`Xong. Đã lưu ${tot} file.`;
}
const audBox=()=>AUDN?`<p class="hint" style="margin:8px 0 0">✓ Có <b>${AUDN}</b> câu/từ phát bằng giọng Nanami (file âm thanh). Những chỗ chưa có file sẽ dùng giọng hệ thống.</p><div class="row" style="margin-top:6px"><button class="btn" onclick="prefetchAudio()">⬇ Tải sẵn âm thanh để dùng offline</button><span id="aud-st" class="hint" style="margin:0"></span></div>`:'';
function sayTTS(t){
  if(!('speechSynthesis' in window)||!t)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=RT;
  const v=VO||pickVoice();if(v)u.voice=v;
  speechSynthesis.speak(u);
}
function setVoice(n){VN=n;try{localStorage.setItem('kotoba-voice',n)}catch(e){}pickVoice();say('日本語の勉強は楽しいですね。')}
function setRate(r){RT=+r;try{localStorage.setItem('kotoba-rate',r)}catch(e){}say('日本語の勉強は楽しいですね。')}
const spk=t=>t?`<button class="spk" type="button" data-t="${esc(t)}" onclick="event.stopPropagation();say(this.dataset.t)" aria-label="Nghe phát âm" title="Nghe phát âm">🔊</button>`:'';
const wk=w=>[w.d,w.h,w.k,w.m].join('\u0001');
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const days=()=>{const m=new Map();words.forEach(w=>m.set(w.d,(m.get(w.d)||0)+1));return[...m].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'vi',{numeric:true}))};


function tog(i){const d=DL[i];sel.has(d)?sel.delete(d):sel.add(d);save();render()}
function selAll(){const all=DL.length&&DL.every(d=>sel.has(d));sel=new Set(all?[]:DL);save();render()}

const open=new Set();
function tgl(i){
  const tr=document.getElementById('w'+i);if(!tr)return;
  const nx=tr.nextElementSibling;
  if(open.has(i)){open.delete(i);if(nx&&nx.classList.contains('det'))nx.remove()}
  else{open.add(i);tr.insertAdjacentHTML('afterend',`<tr class="det"><td colspan="${tr.cells.length}">${ansb(words[i])}</td></tr>`)}
}

/* ---------- quiz engine ---------- */
function startTest(){
  if(!cfg.tt.length){msg='Chọn ít nhất một dạng câu hỏi.';return render()}
  const pool=words.filter(w=>sel.has(w.d)),total=cfg.tn==='all'?pool.length:+cfg.tn,qs=[];
  let order=[],guard=0;
  while(qs.length<total&&guard++<total*3+pool.length){
    if(!order.length)order=shuf(pool);
    const w=order.pop();
    for(const t of shuf(cfg.tt)){const ds=dirsFor(w,t);if(ds.length){const d=ds[Math.random()*ds.length|0];qs.push({w,f:d[0],t:d[1],type:t});break}}
  }
  if(!qs.length){msg='Không tạo được câu nào (thiếu Kanji hoặc Hiragana?).';return render()}
  qs.forEach(q=>prepQ(q));
  Q={mode:'test',list:qs,ans:{},i:0,score:0,ok:0,wrong:[],log:[],fin:false,warned:false};
  scrollTo(0,0);render();
}
const ttog=(k,on)=>{cfg.tt=on?[...new Set([...cfg.tt,k])]:cfg.tt.filter(x=>x!==k)};
function start(){ed=-1;if(cfg.mode==='test')return startTest();
  const qs=[];
  words.filter(w=>sel.has(w.d)).forEach(w=>{
    let ds=(cfg.mode==='ls'?(cfg.ldir==='mix'?['ah','ak','am']:[cfg.ldir]):(cfg.dir==='mix'?Object.keys(DIRS).slice(1):[cfg.dir])).filter(d=>(d[0]==='a'?(w.h||w.k):w[d[0]])&&w[d[1]]);
    if(ds.length){const d=ds[Math.random()*ds.length|0];qs.push({w,f:d[0],t:d[1]})}
  });
  if(!qs.length){msg='Không có từ nào dùng được cho chiều ôn này (thiếu Kanji hoặc Hiragana?).';return render()}
  const L=cfg.shuffle?shuf(qs):qs;if(cfg.mode==='fc')return startMatch(L);
  Q={list:L,said:-1,i:0,score:0,streak:0,ok:0,wrong:[],state:null,flip:false,mode:cfg.mode};
  prep();render();
}
function prepQ(q,mode){
  const md=q.type||mode||Q.mode,ans=q.w[q.t];
  const others=shuf([...new Set(words.filter(x=>x!==q.w&&x[q.t]&&x[q.t]!==ans).map(x=>x[q.t]))]);
  if(md==='mc')q.opts=shuf([ans,...others.slice(0,3)]);
  if(md==='tf'){q.isT=Math.random()<.5||!others.length;q.shown=q.isT?ans:others[0]}
}
function prep(){const q=Q.list[Q.i];if(!q)return;Q.state=null;Q.flip=false;prepQ(q)}
function grade(ok,pick){
  if(Q.state)return;const q=Q.list[Q.i];
  Q.state={ok,pick};const quiet=Q.mode==='test'&&!Q.fb;if(Q.log)Q.log.push({q,ok,pick});if(cfg.auto&&!quiet)say(q.w.h||q.w.k);
  if(ok){Q.ok++;Q.streak++;Q.score+=100+Math.min(Q.streak-1,5)*20}else{Q.streak=0;Q.wrong.push(q)}
  if(quiet)return next();
  render();
}
function next(){Q.i++;if(Q.i<Q.list.length)prep();render()}
const pick=i=>{const q=Q.list[Q.i];grade(q.opts[i]===q.w[q.t],q.opts[i])};
const tf=b=>{const q=Q.list[Q.i];grade(b===q.isT,b)};
const norm=s=>s.toLowerCase().replace(/\s+/g,' ').trim();
function check(){
  const q=Q.list[Q.i],v=norm(kconv($('#ans').value)),full=norm(kconv(q.w[q.t]));
  const vs=full.split(/[,;/、；]/).map(norm).filter(Boolean);
  grade(!!v&&(v===full||vs.includes(v)),v);
}
function startMatch(qs){
  const rounds=[];for(let i=0;i<qs.length;i+=6)rounds.push(qs.slice(i,i+6));
  if(rounds.length>1&&rounds[rounds.length-1].length<3){const l=rounds.pop();rounds[rounds.length-1].push(...l)}
  Q={mode:'fc',list:qs,rounds,r:0,miss:new Set(),moves:0,ok:0,score:0,wrong:[],t0:Date.now(),fin:false};
  setRound();render();
}
function setRound(){
  Q.cards=shuf(Q.rounds[Q.r].flatMap(q=>[{q,side:'f',txt:q.w[q.f]},{q,side:'t',txt:q.w[q.t]}])).map(c=>({...c,st:0}));
  Q.open=[];Q.lock=false;Q.done=false;Q.got=[];
}
function flip(i){
  const cs=Q.cards,c=cs[i];if(Q.lock||c.st===2)return;
  if(c.st===1){c.st=0;Q.open=[];return render()}
  c.st=1;Q.open.push(c);
  if(cfg.auto&&(c.side==='f'?c.q.f:c.q.t)!=='m')say(c.txt);
  if(Q.open.length===2){
    Q.moves++;const[a,b]=Q.open,f=a.side==='f'?a:b,t=f===a?b:a;
    if(a.side!==b.side&&f.q.w[f.q.t]===t.txt){
      a.st=b.st=2;Q.open=[];Q.got.push(f.q.w);
      if(cs.every(x=>x.st===2))Q.done=true;
    }else{
      Q.lock=true;a.st=b.st=3;Q.miss.add(a.q);Q.miss.add(b.q);
      setTimeout(()=>{if(Q&&Q.cards===cs){a.st=b.st=0;Q.open=[];Q.lock=false;render()}},650);
    }
  }
  render();
}
function nextRound(){
  if(Q.r+1<Q.rounds.length){Q.r++;setRound()}
  else{Q.fin=true;Q.secs=Math.round((Date.now()-Q.t0)/1000);Q.wrong=[...Q.miss];Q.ok=Q.list.length-Q.miss.size}
  render();
}
function match(){
  const R=Q.rounds.length,total=Q.list.length,last=Q.r+1===R;
  const dn=Q.rounds.slice(0,Q.r).reduce((s,r)=>s+r.length,0)+Q.got.length;
  return`<div class="qwrap"><div class="bar"><button class="ghost" onclick="quit()">✕ Thoát</button><div class="prog"><i style="width:${dn/total*100}%"></i></div><b>${dn}/${total}</b><span class="pts">Vòng ${Q.r+1}/${R} · ${Q.moves} lượt</span></div>
<p class="hint" style="margin:0 0 12px;text-align:center">Bấm chọn hai thẻ tương ứng với nhau để ghép cặp.</p>
<div class="mg">${Q.cards.map((c,i)=>`<button class="mc ${['','open','ok','bad'][c.st]}" ${c.st===2?'aria-disabled="true"':''} onclick="flip(${i})" aria-label="${esc(c.txt)}"><span class="jp" style="font-size:${c.txt.length>10?17:c.txt.length>5?24:32}px">${esc(c.txt)}</span></button>`).join('')}</div>
${Q.done?`<div class="fb ok" style="margin-top:16px"><b>Đã ghép xong vòng ${Q.r+1}!</b></div><button class="pri" onclick="nextRound()">${last?'Xem kết quả':'Vòng tiếp theo'} (Enter)</button>`:''}
${Q.got.length?`<div class="panel got" style="margin-top:16px"><h2>Đã ghép đúng</h2>${Q.got.map(ansb).join('')}</div>`:''}</div>`;
}
const answered=()=>Object.values(Q.ans).filter(v=>v===true||v===false||String(v).trim()!=='').length;
function updProg(){Q.list.forEach((_,i)=>{const e=$('#q'+i);if(e){const v=Q.ans[i];e.classList.toggle('done',v===true||v===false||String(v??'').trim()!=='')}});const a=answered(),n=Q.list.length;$('#pc').textContent=a+'/'+n;$('#pb').style.width=a/n*100+'%';$('#pn').textContent=a}
function pickP(i,j){Q.ans[i]=Q.list[i].opts[j];document.querySelectorAll('#q'+i+' .opt').forEach((b,k)=>b.classList.toggle('sel',k===j));updProg()}
function tfP(i,v){Q.ans[i]=v;document.querySelectorAll('#q'+i+' .tfb').forEach((b,k)=>b.classList.toggle('sel',(k===0)===v));updProg()}
function typeP(i,v){Q.ans[i]=v;updProg()}
function submitTest(){
  const un=Q.list.map((q,i)=>i).filter(i=>{const v=Q.ans[i];return!(v===true||v===false||String(v??'').trim()!=='')});
  if(un.length&&!Q.warned){
    Q.warned=true;const w=$('#wm');w.hidden=false;w.textContent=`Còn ${un.length} câu chưa làm (câu ${un.slice(0,8).map(i=>i+1).join(', ')}${un.length>8?'…':''}). Bấm Nộp bài lần nữa để nộp luôn.`;
    $('#q'+un[0])?.scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  Q.log=Q.list.map((q,i)=>{
    const a=Q.ans[i];let ok=false;
    if(q.type==='mc')ok=a===q.w[q.t];
    else if(q.type==='tf')ok=a===q.isT;
    else{const v=norm(kconv(String(a||''))),full=norm(kconv(q.w[q.t]));ok=!!v&&(v===full||full.split(/[,;/、；]/).map(norm).filter(Boolean).includes(v))}
    return{q,ok,pick:a};
  });
  Q.ok=Q.log.filter(x=>x.ok).length;Q.wrong=Q.log.filter(x=>!x.ok).map(x=>x.q);Q.fin=true;
  scrollTo(0,0);render();
}
function paper(){
  const n=Q.list.length,a=answered();
  const items=Q.list.map((q,i)=>{
    const md=q.type,v=Q.ans[i];let body;
    if(md==='mc')body=`<div class="opts">${q.opts.map((o,j)=>`<button class="opt jp ${v===o?'sel':''}" onclick="pickP(${i},${j})"><b class="lt">${'ABCD'[j]||j+1}</b><span>${esc(o)}</span></button>`).join('')}</div>`;
    else if(md==='tf')body=`<div class="gq">Đáp án này có đúng không?</div><div class="gst jp">${esc(q.shown)}</div><div class="two"><button class="btn tfb ${v===true?'sel':''}" onclick="tfP(${i},true)">✓ Đúng</button><button class="btn tfb ${v===false?'sel':''}" onclick="tfP(${i},false)">✗ Sai</button></div>`;
    else body=`<input class="ty jp" autocomplete="off" value="${esc(v||'')}" placeholder="Gõ ${F[q.t]}" aria-label="Câu ${i+1}" oninput="typeP(${i},this.value)" style="margin:0">`;
    const ask=q.f==='a'?`<button class="spk bigs" type="button" data-t="${esc(q.w.h||q.w.k)}" onclick="say(this.dataset.t)" aria-label="Nghe">🔊 <span>Nghe</span></button>`:`<div class="askrow"><div class="big jp">${esc(q.w[q.f])}</div>${q.f!=='m'?spk(q.w[q.f]):''}</div>`;
    const dn=v===true||v===false||String(v??'').trim()!=='';
    return`<section class="q pq ${dn?'done':''}" id="q${i}"><div class="qh"><span class="qn">${i+1}</span><span class="sk sk-${({mc:'nghe',tf:'doc',ty:'viet',ls:'hieu'})[md]}">${TL[md]}</span><span class="qp">${q.f==='a'?'Nghe':F[q.f]} → ${F[q.t]}</span></div>${ask}<div class="pbody">${body}</div></section>`;
  }).join('');
  return`<div class="qwrap gw"><div class="gtitle"><small>Đang làm</small><h2>Bài kiểm tra từ vựng</h2></div><div class="bar sticky"><button class="ghost" onclick="quit()">✕ Thoát</button><div class="prog"><i id="pb" style="width:${a/n*100}%"></i></div><b id="pc">${a}/${n}</b><button class="pri" style="width:auto;padding:6px 18px" onclick="submitTest()">Nộp bài</button></div><div class="gl">${items}</div>
<div id="wm" class="msg" hidden role="status"></div><p class="hint" style="text-align:center">Đã làm <span id="pn">${a}</span>/${n} câu. Đáp án và giải thích sẽ hiện sau khi nộp bài.</p><button class="pri" onclick="submitTest()">Nộp bài</button></div>`;
}
function quit(){Q=null;render()}
function retry(){if(Q.mode==='fc')return startMatch(shuf(Q.wrong));
  if(Q.mode==='test'){const l=shuf(Q.wrong);l.forEach(q=>prepQ(q));Q={mode:'test',list:l,ans:{},i:0,score:0,ok:0,wrong:[],log:[],fin:false,warned:false};scrollTo(0,0);return render()}Q.list=shuf(Q.wrong);Q.wrong=[];if(Q.log)Q.log=[];Q.said=-1;Q.i=0;Q.score=0;Q.streak=0;Q.ok=0;prep();render()}

/* ---------- views ---------- */
function home(){
  DL=days().map(d=>d[0]);
  const chosen=words.filter(w=>sel.has(w.d)),multi=sel.size>1;
  return`${tabs('vocab')}
<div class="grid"><div>
<div class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2 style="margin:0">1. Chọn ngày</h2>${DL.length?`<button class="btn" onclick="selAll()">${DL.every(d=>sel.has(d))?'Bỏ chọn hết':'Chọn tất cả'}</button>`:''}</div>
${DL.length?`<div class="chips hs">${days().map(([d,n],i)=>`<button class="chip ${sel.has(d)?'on':''}" onclick="tog(${i})">${esc(dl(d))}<i>${n}</i></button>`).join('')}</div>`:'<div class="empty">Chưa có từ vựng.</div>'}</div>
${chosen.length?`<div class="panel"><h2>Các từ đã chọn (${chosen.length})</h2><p class="hint" style="margin:-4px 0 10px">Bấm vào một từ để xem đầy đủ thông tin (Kanji, Hiragana, Nghĩa, Hán Việt, cấu tạo, gợi nhớ, ví dụ).</p><div class="tw"><table class="wt"><colgroup>${multi?'<col style="width:8%">':''}<col style="width:12%"><col style="width:9%"><col style="width:15%"><col><col style="width:132px"></colgroup><thead><tr>${multi?'<th>Ngày</th>':''}<th>Hiragana</th><th>Kanji</th><th>Nghĩa</th><th>Cấu tạo</th><th></th></tr></thead><tbody>${words.map((w,i)=>!sel.has(w.d)?'':`<tr id="w${i}" class="clk" tabindex="0" onclick="tgl(${i})" onkeydown="if(event.key==='Enter')tgl(${i})" title="Bấm để xem đầy đủ thông tin">${multi?`<td>${esc(dl(w.d))}</td>`:''}<td class="jp">${esc(w.h)}</td><td class="jp">${esc(w.k)}</td><td class="mn">${esc(w.m)}</td><td class="mn gnc">${[w.hv&&`<b>${esc(w.hv)}</b>`,w.cs&&esc(w.cs)].filter(Boolean).map(x=>`<div>${x}</div>`).join('')}</td><td class="ac">${spk(w.h||w.k)}</td></tr>${open.has(i)?`<tr class="det"><td colspan="${multi?6:5}">${ansb(w)}</td></tr>`:''}`).join('')}</tbody></table></div></div>`:''}
</div>
<div class="panel aside"><h2>3. Chế độ ôn tập</h2>
${msg?`<div class="msg">${esc(msg)}</div>`:''}
<div class="modes">${Object.entries(MODES).map(([k,[t,s]])=>`<button class="mode ${cfg.mode===k?'on':''}" onclick="cfg.mode='${k}';render()"><b>${t}</b><span>${s}</span></button>`).join('')}</div>
${cfg.mode==='test'?`<div class="tcfg"><b>Các dạng câu trong bài</b>${Object.entries(TL).map(([k,v])=>`<label class="chk"><input type="checkbox" ${cfg.tt.includes(k)?'checked':''} onchange="ttog('${k}',this.checked)"> ${v}</label>`).join('')}<label for="tn"><b>Số câu</b></label><select id="tn" onchange="cfg.tn=this.value">${['10','20','30','50','all'].map(v=>`<option value="${v}" ${cfg.tn===v?'selected':''}>${v==='all'?'Mỗi từ một câu':v+' câu'}</option>`).join('')}</select><p class="hint" style="margin:0">Tất cả câu hiện trên một trang, làm xong bấm Nộp bài. Chiều ôn bên dưới áp dụng cho các dạng còn lại. Câu Nghe → viết sẽ trộn Hiragana, Kanji và Nghĩa.</p></div>`:''}
<select aria-label="Chiều ôn" onchange="cfg[cfg.mode==='ls'?'ldir':'dir']=this.value;render()">${Object.entries(cfg.mode==='ls'?LD:DIRS).map(([k,v])=>`<option value="${k}" ${(cfg.mode==='ls'?cfg.ldir:cfg.dir)===k?'selected':''}>${v}</option>`).join('')}</select>
<label class="chk"><input type="checkbox" ${cfg.shuffle?'checked':''} onchange="cfg.shuffle=this.checked"> Xáo trộn thứ tự câu hỏi</label>
<label class="chk"><input type="checkbox" ${cfg.auto?'checked':''} onchange="cfg.auto=this.checked"> Tự đọc từ khi có đáp án</label>
<div class="tcfg"><b>Giọng đọc tiếng Nhật</b><select aria-label="Giọng đọc" style="margin-top:6px" onchange="setVoice(this.value)">${jaVoices().length?jaVoices().map(v=>`<option value="${esc(v.name)}" ${VO&&VO.name===v.name?'selected':''}>${esc(v.name)}</option>`).join(''):'<option>Chưa thấy giọng tiếng Nhật (vẫn thử đọc bằng giọng mặc định)</option>'}</select>
<div class="row"><select aria-label="Tốc độ đọc" style="width:auto;margin:0" onchange="setRate(this.value)">${[['0.7','Chậm'],['0.9','Vừa'],['1','Bình thường']].map(([v,l])=>`<option value="${v}" ${RT===+v?'selected':''}>${l}</option>`).join('')}</select><button class="btn" onclick="say('日本語の勉強は楽しいですね。')">🔊 Nghe thử</button></div>
<p class="hint" style="margin:8px 0 0">Giọng có chữ <b>Natural</b> hoặc <b>Online</b> (Edge trên máy tính) nghe tự nhiên nhất. Trên iPad/iPhone, app dùng giọng của hệ thống: vào Cài đặt &gt; Trợ năng &gt; Nội dung được đọc &gt; Giọng nói &gt; Tiếng Nhật để tải giọng (Kyoko, Otoya).</p>${audBox()}</div>
<button class="pri" ${chosen.length?'':'disabled'} onclick="msg='';start()">Bắt đầu${chosen.length?` (${chosen.length} từ)`:''}</button>
${cfg.mode==='mc'||cfg.mode==='tf'?'<p class="hint">Đáp án nhiễu được lấy từ tất cả các từ đã nhập, không chỉ các ngày đang chọn.</p>':''}</div></div>`;
}
function full(w){return`<span class="jp">${esc(w.h)}${w.k?' · '+esc(w.k):''}</span> — ${esc(w.m)}`}
const ex=w=>(w.hv||w.cs||w.gh||w.gn||w.vd)?`<div class="ex">${[['Hán Việt','hv'],['Cấu tạo','cs'],['Ghép từ','gh'],['Gợi nhớ','gn'],['Ví dụ','vd']].filter(([,f])=>w[f]).map(([l,f])=>`<div><b>${l}:</b> <span class="${f==='cs'||f==='vd'||f==='gh'?'jp':''}">${esc(w[f])}</span></div>`).join('')}</div>`:'';
const ansb=w=>`<div class="ab"><div class="ansg">${w.k?`<div><small>Kanji</small><b class="jp">${esc(w.k)}</b></div>`:''}${w.h?`<div><small>Hiragana</small><b class="jp">${esc(w.h)}</b></div>`:''}<div><small>Nghĩa</small><b>${esc(w.m)}</b></div>${spk(w.h||w.k)}</div>${ex(w)}</div>`;
function quiz(){
  if(Q.mode==='test')return Q.fin?result():paper();
  if(Q.mode==='fc')return Q.fin?result():match();
  if(Q.i>=Q.list.length)return result();
  const q=Q.list[Q.i],n=Q.list.length,st=Q.state,ans=q.w[q.t],md=q.type||Q.mode;
  const head=`<div class="bar"><button class="ghost" onclick="quit()">✕ Thoát</button><div class="prog"><i style="width:${Q.i/n*100}%"></i></div><b>${Q.i+1}/${n}</b>${Q.mode!=='fc'?`<span class="pts">${Q.score} đ${Q.streak>1?' · x'+Q.streak:''}</span>`:''}</div>`;
  const prompt=q.f==='a'?`<div class="q"><small class="qpill">${Q.mode==='test'?TL[md]+' · ':''}Nghe → viết ${F[q.t]}</small><button class="spk bigs" type="button" data-t="${esc(q.w.h||q.w.k)}" onclick="say(this.dataset.t)" aria-label="Nghe lại">🔊 <span>Nghe lại</span></button><div class="hint">Bấm để nghe lại</div>`:`<div class="q"><small class="qpill">${Q.mode==='test'?TL[md]+' · ':''}${F[q.f]} → ${F[q.t]}</small><div class="big jp">${esc(q.w[q.f])}</div>${q.f!=='m'?spk(q.w[q.f]):''}`;
  const fb=st?`<div class="fb ${st.ok?'ok':'no'}"><b>${st.ok?'Chính xác!':'Chưa đúng.'}</b> ${ansb(q.w)}</div><button class="pri" onclick="next()">Tiếp tục (Enter)</button>`:'';
  let b='';
  if(md==='mc'){
    b=`${prompt}</div><div class="opts">${q.opts.map((o,i)=>`<button class="opt jp ${st?(o===ans?'right':o===st.pick?'bad':''):''}" ${st?'disabled':''} onclick="pick(${i})"><b class="lt">${'ABCD'[i]||i+1}</b><span>${esc(o)}</span></button>`).join('')}</div><div style="margin-top:14px">${fb}</div>`;
  }else if(md==='tf'){
    b=`${prompt}<div class="tfans jp">${esc(q.shown)}</div></div>${st?fb:`<div class="two"><button class="pri ok-b" onclick="tf(true)">Đúng</button><button class="pri no-b" onclick="tf(false)">Sai</button></div>`}`;
  }else{
    b=`${prompt}</div>${st?`<div class="fb ${st.ok?'ok':'no'}"><b>${st.ok?'Chính xác!':'Chưa đúng.'}</b> Bạn gõ: ${esc(st.pick)||'(bỏ trống)'}${ansb(q.w)}</div><button class="pri" onclick="next()">Tiếp tục (Enter)</button>`:`<input id="ans" class="ty jp" autocomplete="off" placeholder="Gõ ${F[q.t]} rồi nhấn Enter"><button class="pri" onclick="check()">Chấm</button>`}`;
  }
  return`<div class="qwrap">${head}${b}</div>`;
}
function breakdown(){
  return`<div class="chips" style="justify-content:center;margin-top:10px">${Object.keys(TL).map(t=>{const l=Q.log.filter(x=>x.q.type===t);return l.length?`<span class="chip">${TL[t]}<i>${l.filter(x=>x.ok).length}/${l.length}</i></span>`:''}).join('')}</div>`;
}
function review(){
  return`<div class="panel"><h2>Xem lại bài (${Q.log.length} câu)</h2><div class="gl">${Q.log.map(({q,ok,pick},i)=>{
    const ask=q.f==='a'?`Nghe → viết ${F[q.t]}`:`<span class="jp">${esc(q.w[q.f])}</span> (${F[q.f]} → ${F[q.t]})`;
    const you=q.type==='tf'?(pick===undefined?'(chưa trả lời)':`${pick?'Đúng':'Sai'} (đáp án được đưa ra: ${esc(q.shown)})`):(esc(pick)||'(bỏ trống)');
    return`<div class="rv ${ok?'ok':'no'}"><b>${i+1}. ${TL[q.type]} ${ok?'✓ Đúng':'✗ Sai'}</b><div>${ask}</div><div>Bạn trả lời: <span class="jp">${you}</span></div>${ansb(q.w)}</div>`}).join('')}</div></div>`;
}
function result(){
  const n=Q.list.length,pct=Math.round(Q.ok/n*100);
  return`<div class="qwrap gw"><div class="q gres ${pct>=80?'good':''}"><small class="qpill">Hoàn thành</small><div class="stat">${Q.ok}/${n}</div><p>${Q.mode==='fc'?`từ ghép đúng ngay lần đầu · ${Q.moves} lượt · ${Q.secs} giây`:`${pct}% đúng · ${Q.mode==='test'?'điểm '+(Q.ok/n*10).toFixed(1)+'/10':Q.score+' điểm'}`}</p>${Q.mode==='test'?breakdown():''}</div>
<div class="btnrow">${Q.wrong.length?`<button class="pri" onclick="retry()">Ôn lại ${Q.wrong.length} từ sai</button>`:'<button class="pri" onclick="start()">Chơi lại</button>'}<button class="btn" onclick="quit()">Về thư viện</button></div>
${Q.wrong.length&&Q.mode!=='test'?`<div class="panel"><h2>Từ cần ôn thêm</h2><table>${Q.wrong.map(q=>`<tr><td>${full(q.w)}</td></tr>`).join('')}</table></div>`:''}${Q.mode==='test'?review():''}</div>`;
}
/* ---------- NGỮ PHÁP ---------- */
const GD=/*GD*/__GD_JSON__/*GD*/;
const RD=/*RD*/__RD_JSON__/*RD*/;
const SK={nghe:'Nghe',doc:'Đọc',viet:'Viết',hieu:'Hiểu'};
const GPT={1:{1:"N1 は N2 です",2:"N1 は N2 じゃありません",3:"N1 は ～ですか (だれ・なんさい)",4:"N も ～です",5:"N1 の N2"},2:{1:"これ・それ・あれ",2:"A ですか、B ですか",3:"N1 の N2 です (だれの)",4:"この・その・あの + N",5:"N1 の N2 (なんの)"},3:{1:"ここ・そこ・あそこ",2:"N1 は N2 (vị trí)",3:"N1 は どこ/どちらですか",4:"この・その・あの + N",5:"～いくらですか"},4:{1:"～時・～分です",2:"N(thời gian) は ～曜日です",3:"V ます・V ません・V ました",4:"N(thời gian) に V",5:"N1 から N2 まで"},5:{1:"N(địa điểm) へ 行きます・来ます・帰ります",2:"N(phương tiện) で 行きます・来ます・帰ります",3:"N(người) と V",4:"いつ / N(thời gian) に V",5:"N1 から N2 まで (ngày tháng)"},6:{1:"N を V",2:"N(địa điểm) で N を V",3:"V ませんか (rủ rê)",4:"V ましょう"},7:{1:"N で V (dụng cụ/cách thức)",2:"「～」は ～語で 何ですか",3:"N(người) に あげます・かします・おしえます",4:"N(người) に/から もらいます・かります・ならいます",5:"もう V ましたか"},8:{1:"N は Aいです・Aなです",2:"Aい/Aな + N",3:"あまり + phủ định",4:"～。そして、～ / ～が、～"},9:{1:"S は N が すき/きらい/じょうず/へた です",2:"S は N が あります/分かります",3:"どうして～か、～から"},10:{1:"N に N が あります／います",2:"N は N に あります／います（どこ）",3:"N の うえ／した／まえ／うしろ／みぎ／ひだり／なか／そと／となり／ちかく／あいだ に",4:"N や N［など］／なにが ありますか"},11:{1:"N を [số lượng] V ます (ひとつ・まい・だい)",2:"Đếm người: ひとり・ふたり・～にん／なんにん",3:"Khoảng thời gian: ～じかん／にち／しゅうかん／かげつ／ねん・かかります・やすみます・どのぐらい",4:"～に ～かい／N だけ／ぜんぶで"},12:{1:"Quá khứ của danh từ / tính từ な (でした・では ありませんでした)",2:"Quá khứ của tính từ い (かったです・くなかったです)",3:"So sánh hơn: より・ほう・どちら・どちらも",4:"So sánh nhất: いちばん"},13:{1:"N が ほしいです／ほしくないです",2:"V-たいです／V-たくないです",3:"N へ V-stem に いきます (mục đích)",4:"Hội thoại và đọc hiểu (ほしい・たい・に いきます)",5:"Ôn trộn Bài 10–13"},14:{1:"Động từ thể て (nhóm 1/2/3)",2:"V ています (đang diễn ra)",3:"V ています (thói quen / trạng thái)"},15:{1:"V てもいいですか (xin phép)",2:"V てはいけません (cấm)",3:"V ないでください (đừng làm)"},16:{1:"V1 てから、V2 (sau khi)",2:"Aい→Aくて / Aな→Aで / N+で (nối câu)"},17:{1:"V なくてもいいです (không cần)",2:"V なければなりません (phải làm)"},18:{1:"Động từ thể từ điển (辞書形)",2:"V ること ができます (có thể)"},19:{1:"V たことがあります (đã từng)",2:"V1 たり、V2 たりします (liệt kê)",3:"A くなります / に なります (trở nên)"},20:{1:"Thể thường của động từ",2:"Thể thường của tính từ・danh từ"},21:{1:"「Câu」+ と言います (tường thuật)",2:"Thể thường + でしょう? (xác nhận)"},22:{1:"Mệnh đề bổ nghĩa + N (định ngữ)"},23:{1:"Aい/Aな/N + とき (khi)",2:"V ると、〜 (cứ...thì)"},24:{1:"V てくれます (làm cho tôi)",2:"V てあげます (làm cho người khác)",3:"V てもらいます (được làm cho)"},25:{1:"V1 たら、V2 (nếu / sau khi)",2:"V ても (dù...cũng)"}};
Object.assign(GPT,{"3": {"1": "ここ・そこ・あそこ", "2": "N1 は N2 (vị trí) です", "3": "N1 は どこ/どちら ですか", "4": "N1 の N2 (どこの)", "5": "～いくらですか"}, "4": {"1": "～じ ～ふん です", "2": "N は ～ようび です", "3": "時間 は V (ます・ません・ました・ませんでした)", "4": "N (thời gian) に V", "5": "N1 から N2 まで"}, "5": {"1": "N (địa điểm) へ いきます・きます・かえります", "2": "N (phương tiện) で", "3": "N (người) と", "4": "N (thời gian) に", "5": "～月～日 (たんじょうびは いつですか)"}, "6": {"1": "(S は) N を V (なにを・なにも)", "2": "～は 地点 で N を V", "3": "(いっしょに) V ませんか", "4": "V ましょう"}, "7": {"1": "N で V (phương tiện)", "2": "「từ/câu」は ～ごで なんですか", "3": "N (người nhận) に ～ V (あげます)", "4": "N (người cho) に/から ～ V (もらいます)", "5": "もう V ましたか"}, "8": {"1": "N は A い/A な です (khẳng định, phủ định, どうですか)", "2": "N1 は A い/A な N2 です (どんな N2)", "3": "あまり ～ない", "4": "～。そして、～ / ～が、～"}, "9": {"1": "S は N が すき/きらい/じょうず/へた", "2": "S は N が あります/わかります (+ よく・だいたい・すこし・あまり・ぜんぜん)", "3": "どうして ～か。 ～から。"}});
Object.assign(GPT,{"10": {"1": "N に N が あります／います", "2": "N は N に あります／います（どこ）", "3": "N の うえ／した／まえ／うしろ／みぎ／ひだり／なか／そと／となり／ちかく／あいだ に", "4": "N や N［など］／なにが ありますか"}, "11": {"1": "N を [số lượng] V ます (ひとつ・まい・だい)", "2": "Đếm người: ひとり・ふたり・～にん／なんにん", "3": "Khoảng thời gian: ～じかん／にち／しゅうかん／かげつ／ねん・かかります・やすみます・どのぐらい", "4": "～に ～かい／N だけ／ぜんぶで"}, "12": {"1": "Quá khứ của danh từ / tính từ な (でした・では ありませんでした)", "2": "Quá khứ của tính từ い (かったです・くなかったです)", "3": "So sánh hơn: より・ほう・どちら・どちらも", "4": "So sánh nhất: いちばん"}, "13": {"1": "N が ほしいです／ほしくないです", "2": "V-たいです／V-たくないです", "3": "N へ V-stem に いきます (mục đích)", "4": "Hội thoại và đọc hiểu (ほしい・たい・に いきます)", "5": "Ôn trộn Bài 10–13"}});

/* ---------- nhập thêm bài tập ngữ pháp từ file ---------- */
let tab='vocab',G=null,gcfg={ls:new Set([1]),pt:new Set(),sk:new Set(['nghe','doc','viet','hieu']),n:'20'};
const tabs=t=>`<div class="top"><h1>Kotoba<small>Ôn tiếng Nhật</small></h1><div class="tabs">${stChip()}<button class="tab ${t==='vocab'?'on':''}" onclick="setTab('vocab')">Từ vựng</button><button class="tab ${t==='gram'?'on':''}" onclick="setTab('gram')">Ngữ pháp</button><button class="tab ${t==='read'?'on':''}" onclick="setTab('read')">Đọc hiểu</button><button class="tab ${t==='stat'?'on':''}" onclick="setTab('stat')">Chuỗi học</button><button class="tab ${t==='docs'?'on':''}" onclick="setTab('docs')">Tài liệu</button><button class="tab" onclick="auOut()" title="${esc(AU.email)}">Đăng xuất</button></div></div>`;
const setTab=t=>{tab=t;render()};
const gLessons=()=>[...new Set(GD.map(q=>q.l))].sort((a,b)=>a-b);
const gPool=()=>GD.filter(q=>gcfg.ls.has(q.l)&&(!gcfg.pt.size||gcfg.pt.has(q.l+'.'+q.g))&&gcfg.sk.has(q.s));
function gTog(kind,v){
  const S=gcfg[kind];S.has(v)?S.delete(v):S.add(v);
  if(kind==='ls')[...gcfg.pt].forEach(p=>{if(!gcfg.ls.has(+p.split('.')[0]))gcfg.pt.delete(p)});
  render();
}
const GPK='kotoba-gprog';let GP={};try{GP=JSON.parse(localStorage.getItem(GPK)||'{}')||{}}catch(e){}
const gSaveP=()=>{try{localStorage.setItem(GPK,JSON.stringify(GP));localStorage.setItem(GPK+'-t',String(Date.now()))}catch(e){}};
function gSets(l){
  const by={};GD.filter(q=>q.l===l).forEach(q=>(by[q.g]=by[q.g]||[]).push(q));
  const out=[];
  Object.keys(by).map(Number).sort((a,b)=>a-b).forEach(g=>{
    const a=by[g],k=Math.max(1,Math.round(a.length/20));
    for(let p=0;p<k;p++)out.push({key:l+'.'+g+'.'+p,l,g,part:p,parts:k,qs:a.slice(Math.floor(a.length*p/k),Math.floor(a.length*(p+1)/k))});
  });
  out.forEach((s,i)=>s.no=i+1);return out;
}
const gSetBy=key=>gSets(+key.split('.')[0]).find(s=>s.key===key);
const gSetTitle=s=>`Bài ${s.l} · Luyện tập ${s.no}: ${(GPT[s.l]||{})[s.g]||'Mẫu '+s.g}`;
function gStartSet(key){const s=gSetBy(key);if(s)gStart(shuf(s.qs),key,gSetTitle(s))}
function gMix(l){gStart(shuf(GD.filter(q=>q.l===l)).slice(0,20),null,`Bài ${l} · Ôn tổng hợp`)}
function gResetP(l){if(!confirm(`Đặt lại tiến độ các bài luyện tập của Bài ${l}?`))return;Object.keys(GP).forEach(k=>{if(k.split('.')[0]==l)delete GP[k]});gSaveP();render()}
function ghome(){
  const L=gLessons();if(!L.includes(gcfg.cur))gcfg.cur=L[0];
  const l=gcfg.cur,sets=gSets(l),nd=sets.filter(s=>GP[s.key]).length;
  const ld=x=>{const ss=gSets(x);return ss.filter(s=>GP[s.key]).length+'/'+ss.length};
  const card=s=>{
    const p=GP[s.key],nm=(GPT[l]||{})[s.g]||('Mẫu '+s.g);
    const sk=Object.keys(SK).map(k=>{const c=s.qs.filter(q=>q.s===k).length;return c?`<span class="sk sk-${k}">${SK[k]} ${c}</span>`:''}).join('');
    return`<div class="setc ${p?'done':''}"><div class="sh"><span class="sno">${p?'✓':s.no}</span><div><b>Luyện tập ${s.no}${s.parts>1?` (phần ${s.part+1})`:''}</b><div class="hint" style="margin:0">Mẫu ${l}.${s.g} · ${esc(nm)}</div></div></div><div class="sks">${sk}</div><div class="sf">${p?`<span class="st ok">✓ Đã làm</span><span class="hint" style="margin:0">Cao nhất ${p.best}/${p.n} · ${p.tries} lần</span>`:`<span class="st">Chưa làm</span><span class="hint" style="margin:0">${s.qs.length} câu</span>`}</div><button class="${p?'btn':'pri'} sb" onclick="gStartSet('${s.key}')">${p?'Làm lại':'Bắt đầu'}</button></div>`;
  };
  return`${tabs('gram')}
<div class="grid"><div>
<div class="panel"><h2>Chọn bài ngữ pháp</h2><div class="chips">${L.map(x=>`<button class="chip ${x===l?'on':''}" onclick="gcfg.cur=${x};render()">Bài ${x}<i>${ld(x)}</i></button>`).join('')}</div>
<p class="hint">Số nhỏ trên mỗi bài là số bài luyện tập đã làm. Từ vựng trong bài tập chỉ lấy từ Ngày 1 đến ngày tương ứng.</p></div>
<div class="panel"><div class="ph"><h2>Bài ${l} · ${sets.length} bài luyện tập</h2><span class="ps">${nd}/${sets.length} đã làm</span></div>
<div class="prog" style="margin-bottom:14px"><i style="width:${sets.length?nd/sets.length*100:0}%"></i></div>
<div class="setgrid">${sets.map(card).join('')}</div>
<div class="row" style="margin-top:14px"><button class="btn" onclick="gMix(${l})">Ôn tổng hợp 20 câu ngẫu nhiên</button>${nd?`<button class="ghost" onclick="gResetP(${l})">Đặt lại tiến độ Bài ${l}</button>`:''}</div></div>
</div>
</div>`;
}
function gStart(list,key,title){
  const L=(list||shuf(GD)).map(q=>({...q}));
  L.forEach(q=>{if(q.t==='order'){let sh;let g=0;do{sh=shuf(q.tk.map((_,i)=>i))}while(g++<20&&q.tk.length>1&&sh.every((v,i)=>v===i));q.sh=sh}});
  G={list:L,ans:{},fin:false,warned:false,log:[],key:key||null,title:title||'Luyện tập ngữ pháp'};scrollTo(0,0);render();
}
/* ---------- đọc hiểu ---------- */
let rLesson=1;
function rLessons(){return[...new Set(RD.map(r=>r.l))].sort((a,b)=>a-b)}
function rhome(){
  const L=rLessons();if(!L.length)return`${tabs('read')}<div class="panel"><h2>Đọc hiểu</h2><p class="hint">Chưa có bài đọc nào.</p></div>`;
  if(!L.includes(rLesson))rLesson=L[0];
  const ps=RD.filter(r=>r.l===rLesson);
  const card=p=>`<div class="setc"><div class="sh"><span class="sno">📖</span><div><b>${esc(p.title)}</b><div class="hint" style="margin:0">${p.questions.length} câu hỏi · ${p.text.length} ký tự</div></div></div><div class="sf"><button class="btn" onclick="rView(${p.l},${p.id})">Đọc</button> <button class="pri" onclick="rStart(${p.l},${p.id})">Làm bài</button></div></div>`;
  return`${tabs('read')}
<div class="grid"><div>
<div class="panel"><h2>Chọn bài đọc hiểu</h2><div class="chips">${L.map(x=>`<button class="chip ${x===rLesson?'on':''}" onclick="rLesson=${x};render()">Bài ${x}</button>`).join('')}</div>
<p class="hint">Mỗi bài có 4 bài đọc (đoạn văn + hội thoại), dùng từ vựng và ngữ pháp từ Bài 1 đến bài hiện tại. Mỗi bài đọc có câu hỏi trắc nghiệm / điền từ.</p></div>
<div class="panel"><div class="ph"><h2>Bài ${rLesson} · ${ps.length} bài đọc</h2></div>
<div class="setgrid">${ps.map(card).join('')}</div>
<div class="row" style="margin-top:14px"><button class="btn" onclick="rStartAll(${rLesson})">Làm cả ${ps.reduce((n,p)=>n+p.questions.length,0)} câu Bài ${rLesson}</button></div></div>
<div id="rdv"></div>
</div>
</div>`;
}
function rView(l,id){
  const p=RD.find(x=>x.l===l&&x.id===id);if(!p)return;
  const e=document.getElementById('rdv');if(!e)return;
  e.innerHTML=`<div class="panel"><div class="ph"><h2>📖 ${esc(p.title)}</h2><button class="ghost" onclick="document.getElementById('rdv').innerHTML=''">Đóng</button></div><div class="jp" style="white-space:pre-line;line-height:2">${esc(p.text)}</div><div class="row" style="margin-top:12px"><button class="pri" onclick="rStart(${l},${id})">Làm ${p.questions.length} câu hỏi</button></div></div>`;
  e.scrollIntoView({behavior:'smooth',block:'start'});
}
function rStart(l,id){
  const p=RD.find(x=>x.l===l&&x.id===id);if(!p)return;
  const qs=p.questions.map(q=>({...q,l,g:0,rd:1,c:p.text,s:q.t}));
  gStart(qs,'rd'+l+'-'+id,'Đọc hiểu Bài '+l+': '+p.title);
}
function rStartAll(l){
  const ps=RD.filter(r=>r.l===l),qs=[];
  ps.forEach(p=>p.questions.forEach(q=>qs.push({...q,l,g:0,rd:1,c:p.text,s:q.t})));
  if(!qs.length)return;
  gStart(qs,'rd'+l+'-all','Đọc hiểu Bài '+l+' (tất cả)');
}
const gquit=()=>{G=null;render()};
let KM=null,KRE=null,KN=-1;
const EXTK=[["学生","がくせい"],["研究者","けんきゅうしゃ"],["病院","びょういん"],["番号","ばんごう"],["今日","きょう"],["昨日","きのう"],["明日","あした"],["今朝","けさ"],["先週","せんしゅう"],["今週","こんしゅう"],["来週","らいしゅう"],["先月","せんげつ"],["今月","こんげつ"],["来月","らいげつ"],["去年","きょねん"],["今年","ことし"],["来年","らいねん"],["男","おとこ"],["女","おんな"],["子供","こども"],["椅子","いす"],["鞄","かばん"],["傘","かさ"],["買い物","かいもの"],["勉強","べんきょう"],["仕事","しごと"],["好き","すき"],["嫌い","きらい"],["良い","いい"],["良","よ"],["易しい","やさしい"],["面白い","おもしろい"],["美味しい","おいしい"],["大変","たいへん"],["元気","げんき"],["有名","ゆうめい"],["静か","しずか"],["綺麗","きれい"],["賑やか","にぎやか"],["暇","ひま"],["北","きた"],["南","みなみ"],["東","ひがし"],["西","にし"],["日本","にほん"],["中国","ちゅうごく"],["韓国","かんこく"],["山田","やまだ"],["田中","たなか"],["木村","きむら"],["始まります","はじまります"],["作ります","つくります"],["走ります","はしります"],["付けます","つけます"],["撮ります","とります"],["届けます","とどけます"],["描きます","かきます"],["掛けます","かけます"],["頼みます","たのみます"],["分かります","わかります"],["有ります","あります"],["何時","なんじ"],["何人","なんにん"],["何枚","なんまい"],["何台","なんだい"],["何回","なんかい"],["一つ","ひとつ"],["二つ","ふたつ"],["三つ","みっつ"],["四つ","よっつ"],["五つ","いつつ"],["六つ","むっつ"],["七つ","ななつ"],["八つ","やっつ"],["九つ","ここのつ"],["一人","ひとり"],["二人","ふたり"],["三人","さんにん"],["四人","よにん"],["五人","ごにん"],["六人","ろくにん"],["七人","ななにん"],["八人","はちにん"],["九人","きゅうにん"],["十人","じゅうにん"],["一時間","いちじかん"],["二時間","にじかん"],["三時間","さんじかん"],["一週間","いっしゅうかん"],["二週間","にしゅうかん"],["一か月","いっかげつ"],["一年","いちねん"],["二年","にねん"],["三年","さんねん"],["一日","いちにち"],["二日","ふつか"],["三日","みっか"],["四日","よっか"],["五日","いつか"],["六日","むいか"],["七日","なのか"],["八日","ようか"],["九日","ここのか"],["十日","とおか"],["一枚","いちまい"],["二枚","にまい"],["三枚","さんまい"],["一台","いちだい"],["二台","にだい"],["三台","さんだい"],["一回","いっかい"],["二回","にかい"],["三回","さんかい"],["何","なに"],["今","いま"],["私","わたし"],["私たち","わたしたち"],["彼","かれ"],["彼女","かのじょ"],["皆さん","みなさん"],["皆","みんな"],["時","とき"],["後ろ","うしろ"],["前","まえ"],["上","うえ"],["下","した"],["中","なか"],["外","そと"],["隣","となり"],["横","よこ"],["間","あいだ"],["近く","ちかく"],["所","ところ"],["場所","ばしょ"],["色","いろ"],["赤","あか"],["青","あお"],["白","しろ"],["黒","くろ"],["手","て"],["目","め"],["口","くち"],["耳","みみ"],["足","あし"],["顔","かお"],["頭","あたま"],["体","からだ"],["声","こえ"],["話","はなし"],["歌","うた"],["絵","え"],["字","じ"],["音楽","おんがく"],["写真","しゃしん"],["旅行","りょこう"],["料理","りょうり"],["食事","しょくじ"],["運動","うんどう"],["散歩","さんぽ"],["結婚","けっこん"],["質問","しつもん"],["宿題","しゅくだい"],["試験","しけん"],["授業","じゅぎょう"],["会議","かいぎ"],["電気","でんき"],["天気","てんき"],["雨","あめ"],["雪","ゆき"],["風","かぜ"],["空","そら"],["海","うみ"],["山","やま"],["川","かわ"],["花","はな"],["木","き"],["犬","いぬ"],["猫","ねこ"],["鳥","とり"],["魚","さかな"],["肉","にく"],["野菜","やさい"],["果物","くだもの"],["卵","たまご"],["飯","ごはん"],["朝","あさ"],["昼","ひる"],["夜","よる"],["晩","ばん"],["毎週","まいしゅう"],["毎月","まいつき"],["毎年","まいとし"],["毎朝","まいあさ"],["毎晩","まいばん"],["毎日","まいにち"]];
function kbuild(){
  KM={};const cl=x=>String(x).replace(/[「（(][^」）)]*[」）)]/g,'').replace(/[～〜]/g,'').trim();
  const kj=/[一-鿿]/,add=(a,b)=>{if(a&&b&&kj.test(a)&&a!==b)KM[a]=b};
  EXTK.map(x=>({k:x[0],h:x[1]})).concat(VDEF).forEach(w=>{
    if(!w||!w.k||!w.h)return;
    const ks=cl(w.k).split(/[\/／]/).map(x=>x.trim()),hs=cl(w.h).split(/[\/／]/).map(x=>x.trim().split(/[、,]/)[0]);
    if(ks.length!==hs.length)return;
    ks.forEach((k,i)=>{
      let h=hs[i];
      if(k.endsWith('な')&&!h.endsWith('な')&&/「な」\s*$/.test(String(w.h)))k=k.slice(0,-1);
      add(k,h);
      if(k.endsWith('ます')&&h.endsWith('ます')){add(k.slice(0,-2),h.slice(0,-2))}
      else if(k.length>1&&k.endsWith('い')&&h.endsWith('い')){add(k.slice(0,-1),h.slice(0,-1))}
    });
  });
  const ks=Object.keys(KM).sort((a,b)=>b.length-a.length);
  KRE=ks.length?new RegExp(ks.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'):null;KN=words.length;
}
function kconv(s){
  s=String(s==null?'':s);
  if(!/[一-鿿]/.test(s))return s;
  if(KN!==words.length||!KM)kbuild();
  return KRE?s.replace(KRE,m=>KM[m]||m):s;
}
const gn=s=>kconv(String(s||'')).replace(/[\s\u3000。、．，.,!！?？]/g,'');
function gDone(i){
  const q=G.list[i],a=G.ans[i];
  if(q.t==='fill')return!!a&&q.a.every((_,k)=>String(a[k]||'').trim()!=='');
  if(q.t==='order')return!!a&&a.length===q.tk.length;
  if(q.t==='dict')return String(a||'').trim()!=='';
  return a!==undefined;
}
function gProg(){const n=G.list.length,a=G.list.filter((_,i)=>gDone(i)).length;G.list.forEach((_,i)=>{const e=$('#g'+i);if(e)e.classList.toggle('done',gDone(i))});$('#gpc').textContent=a+'/'+n;$('#gpb').style.width=a/n*100+'%'}
function gRedraw(i){const el=$('#g'+i);if(el)el.outerHTML=gcard(i)}
const gSet=(i,v)=>{G.ans[i]=v;gRedraw(i);gProg()};
const gFill=(i,k,v)=>{const a=G.ans[i]=G.ans[i]||[];a[k]=v;gProg()};
const gDict=(i,v)=>{G.ans[i]=v;gProg()};
const gPush=(i,j)=>{(G.ans[i]=G.ans[i]||[]).push(j);gRedraw(i);gProg()};
const gUndo=(i,n)=>{G.ans[i].splice(n,1);gRedraw(i);gProg()};
function gcard(i){
  const q=G.list[i],a=G.ans[i];let body='';
  const pn=(GPT[q.l]||{})[q.g]||'',LT='ABCD';
  if(q.t==='mc'||q.t==='lmc')body=`<div class="opts">${q.o.map((o,j)=>`<button class="opt jp ${a===j?'sel':''}" onclick="gSet(${i},${j})"><b class="lt">${LT[j]||j+1}</b><span>${esc(o)}</span></button>`).join('')}</div>`;
  else if(q.t==='tf')body=`<div class="two"><button class="btn tfb ${a===true?'sel':''}" onclick="gSet(${i},true)">✓ Đúng</button><button class="btn tfb ${a===false?'sel':''}" onclick="gSet(${i},false)">✗ Sai</button></div>`;
  else if(q.t==='fill')body=`<div class="fillrow jp">${q.p.map(p=>typeof p==='string'?`<span>${esc(p)}</span>`:`<input class="gin jp" autocomplete="off" aria-label="Chỗ trống ${p+1}" style="width:${Math.max(4,Math.max(...q.a[p].map(x=>x.length))*1.7+2)}ch" value="${esc((a||[])[p]||'')}" oninput="gFill(${i},${p},this.value)">`).join('')}</div>`;
  else if(q.t==='order'){const u=a||[];body=`<div class="ordans jp">${u.length?u.map((j,n)=>`<button class="tok on" onclick="gUndo(${i},${n})">${esc(q.tk[j])}</button>`).join(''):'<span class="hint">Bấm các từ bên dưới theo thứ tự đúng</span>'}</div><div class="ordpool jp">${q.sh.map(j=>`<button class="tok" ${u.includes(j)?'disabled':''} onclick="gPush(${i},${j})">${esc(q.tk[j])}</button>`).join('')}</div>`}
  else body=`<input class="ty jp" autocomplete="off" placeholder="Gõ câu bạn nghe được" aria-label="Câu ${i+1}" value="${esc(a||'')}" oninput="gDict(${i},this.value)" style="margin:0">`;
  const ask=q.t==='tf'?`<div class="gq">Theo đoạn trên, câu sau đúng hay sai?</div><div class="gst jp">${esc(q.q)}</div>`:`<div class="gq">${esc(q.q)}</div>`;
  return`<section class="q pq ${gDone(i)?'done':''}" id="g${i}"><div class="qh"><span class="qn">${i+1}</span><span class="sk sk-${q.s}">${SK[q.s]}</span><span class="qp">${q.rd?'Đọc hiểu · Bài '+q.l:'Mẫu '+q.l+'.'+q.g}${pn&&!q.rd?' · '+esc(pn):''}</span></div>${q.c?`<div class="ctxb jp">${esc(q.c)}</div>`:''}${q.say?`<button class="spk bigs" type="button" data-t="${esc(q.say)}" onclick="say(this.dataset.t)" aria-label="Nghe">🔊 <span>Nghe</span></button>`:''}${ask}<div class="pbody">${body}</div></section>`;
}
function gpaper(){
  const n=G.list.length,a=G.list.filter((_,i)=>gDone(i)).length;
  return`<div class="qwrap gw"><div class="gtitle"><small>Đang làm</small><h2>${esc(G.title)}</h2></div><div class="bar sticky"><button class="ghost" onclick="gquit()">✕ Thoát</button><div class="prog"><i id="gpb" style="width:${a/n*100}%"></i></div><b id="gpc">${a}/${n}</b><button class="pri" style="width:auto;padding:6px 18px" onclick="gSubmit()">Nộp bài</button></div><div class="gl">${G.list.map((_,i)=>gcard(i)).join('')}</div><div id="gwm" class="msg" hidden role="status"></div><button class="pri" onclick="gSubmit()">Nộp bài</button></div>`;
}
function gOK(q,a){
  if(q.t==='mc'||q.t==='lmc'||q.t==='tf')return a===q.a;
  if(q.t==='fill')return q.a.every((c,k)=>gn((a||[])[k])!==''&&c.some(x=>gn(x)===gn((a||[])[k])));
  if(q.t==='order'){const b=(a||[]).map(j=>q.tk[j]).join('');return b===q.a||(q.alt||[]).includes(b)}
  return gn(a)!==''&&q.a.some(x=>gn(x)===gn(a));
}
function gSubmit(){
  const un=G.list.map((_,i)=>i).filter(i=>!gDone(i));
  if(un.length&&!G.warned){
    G.warned=true;const w=$('#gwm');w.hidden=false;w.textContent=`Còn ${un.length} câu chưa làm (câu ${un.slice(0,8).map(i=>i+1).join(', ')}${un.length>8?'…':''}). Bấm Nộp bài lần nữa để nộp luôn.`;
    $('#g'+un[0])?.scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  G.log=G.list.map((q,i)=>({q,a:G.ans[i],ok:!!gOK(q,G.ans[i])}));G.fin=true;if(G.key){const ok=G.log.filter(x=>x.ok).length,n=G.log.length,p=GP[G.key]||{};GP[G.key]={n,best:Math.max(p.best||0,ok),last:ok,tries:(p.tries||0)+1,at:Date.now()};gSaveP()}scrollTo(0,0);render();
}
function gYou(q,a){
  if(a===undefined||a===null)return'(chưa trả lời)';
  if(q.t==='mc'||q.t==='lmc')return q.o[a];
  if(q.t==='tf')return a?'Đúng':'Sai';
  if(q.t==='fill')return q.p.map(p=>typeof p==='string'?p:((a||[])[p]||'＿＿')).join('');
  if(q.t==='order')return(a||[]).map(j=>q.tk[j]).join('')||'(bỏ trống)';
  return a||'(bỏ trống)';
}
function gKey(q){
  if(q.t==='mc'||q.t==='lmc')return q.o[q.a];
  if(q.t==='tf')return q.a?'Đúng':'Sai';
  if(q.t==='fill')return q.p.map(p=>typeof p==='string'?p:q.a[p][0].replace(/。$/,'')).join('');
  if(q.t==='order')return q.a;
  return q.a[0];
}
function gresult(){
  const L=G.log,n=L.length,ok=L.filter(x=>x.ok).length,pct=Math.round(ok/n*100);
  const chip=(l,a,b)=>`<span class="chip">${esc(l)}<i>${a}/${b}</i></span>`;
  const bySk=Object.keys(SK).map(k=>{const l=L.filter(x=>x.q.s===k);return l.length?chip(SK[k],l.filter(x=>x.ok).length,l.length):''}).join('');
  const keys=[...new Set(L.map(x=>x.q.l+'.'+x.q.g))];
  const byPt=keys.map(k=>{const l=L.filter(x=>x.q.l+'.'+x.q.g===k);const[a,b]=k.split('.');return chip(`${k} ${(GPT[a]||{})[b]||''}`,l.filter(x=>x.ok).length,l.length)}).join('');
  const review=L.map(({q,a,ok:o},i)=>{
    const key=gKey(q),audio=q.say||((q.t==='fill'||q.t==='order')?key:'');
    return`<div class="rv ${o?'ok':'no'}"><b>${i+1}. ${SK[q.s]} · Bài ${q.l}.${q.g} ${o?'✓ Đúng':'✗ Sai'}</b>${q.c?`<div class="jp" style="white-space:pre-line">${esc(q.c)}</div>`:''}<div>${esc(q.q)}</div>${q.say?`<div>♪ ${spk(q.say)} <span class="jp">${esc(q.say)}</span></div>`:''}<div>Bạn trả lời: <span class="jp">${esc(gYou(q,a))}</span></div><div>Đáp án: <b class="jp">${esc(key)}</b> ${q.say?'':spk(audio)}</div><div class="hint" style="margin-top:4px">${esc(q.x)}</div></div>`}).join('');
  const cur=G.key?gSetBy(G.key):null,nx=cur?gSets(cur.l).find(s=>s.no===cur.no+1):null;
  return`<div class="qwrap gw"><div class="q gres ${pct>=80?'good':''}"><small>${esc(G.title)}</small><div class="stat">${ok}/${n}</div><p>${pct}% đúng · điểm ${(ok/n*10).toFixed(1)}/10</p>${G.key?'<p class="st ok" style="display:inline-block">✓ Đã đánh dấu hoàn thành bài luyện tập này</p>':''}<div class="chips" style="justify-content:center">${bySk}</div><div class="chips" style="justify-content:center;margin-top:8px">${byPt}</div></div>
<div class="btnrow">${ok<n?`<button class="pri" onclick="gStart(G.log.filter(x=>!x.ok).map(x=>x.q),null,G.title+' (câu sai)')">Làm lại ${n-ok} câu sai</button>`:''}${nx?`<button class="${ok<n?'btn':'pri'}" onclick="gStartSet('${nx.key}')">Bài luyện tập tiếp theo →</button>`:''}${G.key?`<button class="btn" onclick="gStartSet('${G.key}')">Làm lại bài này</button>`:''}<button class="btn" onclick="gquit()">Về trang ngữ pháp</button></div>
<div class="panel"><h2>Xem lại bài (${n} câu)</h2><div class="gl">${review}</div></div></div>`;
}
const gui=()=>G.fin?gresult():gpaper();
function render(){
  if(!auOn()){$('#app').innerHTML=auGate();return}
  const tw=$('.tw'),st=tw?tw.scrollTop:0;
  $('#app').innerHTML=G?gui():Q?quiz():tab==='gram'?ghome():tab==='read'?rhome():tab==='stat'?shome():tab==='docs'?dhome():home();
  if(!Q){const t2=$('.tw');if(t2)t2.scrollTop=st}
  if(Q&&Q.mode!=='test'&&(cm()==='ty'||cm()==='ls')&&!Q.state&&Q.i<Q.list.length){
    setTimeout(()=>$('#ans')?.focus());
    if(cm()==='ls'&&Q.said!==Q.i){Q.said=Q.i;const w=Q.list[Q.i].w;setTimeout(()=>say(w.h||w.k),250)}
  }
}
document.addEventListener('keydown',e=>{
  if(!Q)return;
  if(Q.mode==='test')return;
  if(Q.mode==='fc'){if(e.key==='Enter'&&Q.done&&!Q.fin){e.preventDefault();nextRound()}return}
  if(Q.i>=Q.list.length)return;
  if(e.key==='Enter'){e.preventDefault();if(Q.state)next();else if(cm()==='ty'||cm()==='ls')check()}
  else if(cm()==='mc'&&!Q.state&&/^[1-4]$/.test(e.key)&&Q.list[Q.i].opts[e.key-1]!==undefined)pick(e.key-1);
});
/* ---------- chuỗi học & thời gian học ---------- */
const STK='kotoba-study',IDLE_MS=60000;
let ST={days:{},goal:15},stPend=0,stPendDay='',stLastFlush=Date.now(),stLastAct=Date.now(),stLastTick=Date.now();
try{const s=JSON.parse(localStorage.getItem(STK)||'null');if(s){ST.days=s.days||{};ST.goal=Math.max(1,Math.min(600,Math.round(+s.goal||15)))}}catch(e){}
const stKey=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const stAt=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d,12)};
const stAdd=(k,n)=>{const d=stAt(k);d.setDate(d.getDate()+n);return stKey(d)};
const stSec=k=>(ST.days[k]||0)+((typeof RM!=='undefined'&&RM[k])||0)+(k===stPendDay?stPend:0);
const stGoal=()=>ST.goal*60;
function stSave(){try{localStorage.setItem(STK,JSON.stringify({days:ST.days,goal:ST.goal}))}catch(e){}}
function stFlush(){
  if(stPend<=0||!stPendDay)return;
  let days=ST.days;try{const s=JSON.parse(localStorage.getItem(STK)||'null');if(s&&s.days)days=s.days}catch(e){}
  days[stPendDay]=Math.round(((days[stPendDay]||0)+stPend)*10)/10;ST.days=days;stPend=0;stSave();
}
function stStats(){
  const g=stGoal(),today=stKey(),tod=stSec(today),met=tod>=g;
  let cur=0,k=met?today:stAdd(today,-1);
  while(stSec(k)>=g&&cur<20000){cur++;k=stAdd(k,-1)}
  const ks=[...new Set(stKeys().concat(stPendDay?[stPendDay]:[]))].filter(x=>stSec(x)>=g).sort();
  let best=0,run=0,prev=null;for(const x of ks){run=(prev&&stAdd(prev,1)===x)?run+1:1;if(run>best)best=run;prev=x}
  let wk=0,mo=0,tot=0,nd=0;for(let i=0;i<30;i++){const v=stSec(stAdd(today,-i));mo+=v;if(i<7)wk+=v}
  stKeys().forEach(x=>{const v=stSec(x);tot+=v;if(v>=60)nd++});
  return{cur,best,met,tod,wk,mo,tot,avg:nd?tot/nd:0,nd}
}
const stFmt=s=>{s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h} giờ ${String(m).padStart(2,'0')} phút`:m?`${m} phút ${String(x).padStart(2,'0')} giây`:`${x} giây`};
const stMin=s=>{const m=Math.floor(s/60);return m>=60?`${Math.floor(m/60)} giờ ${String(m%60).padStart(2,'0')} phút`:`${m} phút`};
const stLeft=s=>s.met?'✅ Hôm nay đã đạt mục tiêu — chuỗi được tính!':`Còn <b>${stMin(Math.max(0,stGoal()-s.tod)+59)}</b> nữa để ${s.cur?'giữ chuỗi':'bắt đầu chuỗi'} hôm nay.`;
const stChip=()=>{const s=stStats();return`<button class="stk${s.met?' ok':''}" onclick="setTab('stat')" aria-label="Chuỗi học và thời gian học" title="Chuỗi học · thời gian hôm nay / mục tiêu"><span>🔥</span><b id="stk-n">${s.cur}</b><i id="stk-t">${Math.floor(s.tod/60)}/${ST.goal}′</i></button>`};
function stPaint(){
  const chip=document.getElementById('stk-n'),big=document.getElementById('st-today');
  if(!chip&&!big)return;
  const s=stStats(),g=stGoal(),$i=id=>document.getElementById(id);
  if(chip){chip.textContent=s.cur;const t=$i('stk-t');if(t)t.textContent=`${Math.floor(s.tod/60)}/${ST.goal}′`;const b=chip.closest('.stk');if(b)b.classList.toggle('ok',s.met)}
  if(big){
    big.textContent=stFmt(s.tod);
    const bar=$i('st-bar');if(bar)bar.style.width=Math.min(100,s.tod/g*100)+'%';
    const l=$i('st-left');if(l)l.innerHTML=stLeft(s);
    const set=(id,v)=>{const e=$i(id);if(e)e.textContent=v};
    set('st-streak',s.cur);set('st-best',s.best);set('st-wk',stMin(s.wk));set('st-mo',stMin(s.mo));set('st-tot',stMin(s.tot));set('st-avg',stMin(s.avg));
  }
}
function stSetGoal(v){const n=Math.max(1,Math.min(600,Math.round(+v||0)));if(!n)return;stFlush();ST.goal=n;if(SY.on){SY.goalT=Date.now();sySave()}stSave();render();if(SY.on)syNow(true)}
function stReset(){if(confirm('Xóa toàn bộ dữ liệu thời gian học và chuỗi trên thiết bị này?')){ST.days={};stPend=0;stSave();render();if(SY.on)syNow(true)}}
['pointerdown','keydown','touchstart','wheel','scroll','input','click'].forEach(ev=>addEventListener(ev,()=>{stLastAct=Date.now()},{capture:true,passive:true}));
addEventListener('pointermove',()=>{const n=Date.now();if(n-stLastAct>2000)stLastAct=n},{passive:true});
const stPlaying=()=>{try{return(typeof ACT!=='undefined'&&ACT&&!ACT.paused)||('speechSynthesis' in window&&speechSynthesis.speaking)}catch(e){return false}};
function stTick(){
  const n=Date.now(),dt=Math.min(n-stLastTick,2500);stLastTick=n;
  const vis=document.visibilityState==='visible'&&(typeof document.hasFocus!=='function'||document.hasFocus());
  if(vis&&(n-stLastAct<=IDLE_MS||stPlaying())){
    const k=stKey();if(stPendDay&&stPendDay!==k)stFlush();stPendDay=k;stPend+=dt/1000;
    if(n-stLastFlush>10000){stFlush();stLastFlush=n}
  }
  stPaint();
}
setInterval(stTick,1000);
addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stFlush()});addEventListener('pagehide',stFlush);addEventListener('blur',stFlush);
function shome(){
  const s=stStats(),g=stGoal(),today=stKey(),days=[];for(let i=13;i>=0;i--)days.push(stAdd(today,-i));
  const mx=Math.max(g,...days.map(stSec),1);
  const bars=days.map(k=>{const v=stSec(k);return`<div class="stb ${v>=g?'ok':''} ${k===today?'today':''}" title="${stFmt(v)}"><i style="height:${v>0?Math.max(3,Math.round(v/mx*100)):0}%"></i></div>`}).join('');
  const labs=days.map(k=>{const d=stAt(k);return`<small>${d.getDate()}/${d.getMonth()+1}</small>`}).join('');
  const presets=[15,30,45,60,90,120].map(m=>`<button class="btn ${ST.goal===m?'sel':''}" onclick="stSetGoal(${m})">${m>=60?(m/60)+' giờ':m+' phút'}</button>`).join('');
  return`${tabs('stat')}
<div class="stgrid">
<div class="panel stcard"><h2>Chuỗi học</h2>
<div class="stflame"><span>🔥</span><b id="st-streak">${s.cur}</b><small>ngày liên tiếp</small></div>
<p class="hint" style="margin:6px 0 0">Kỷ lục: <b id="st-best">${s.best}</b> ngày. Một ngày được tính vào chuỗi khi bạn học đủ <b>${stMin(g)}</b> (mục tiêu bên dưới).</p></div>
<div class="panel stcard"><h2>Hôm nay</h2>
<div class="stbig" id="st-today">${stFmt(s.tod)}</div>
<div class="stbar"><i id="st-bar" style="width:${Math.min(100,s.tod/g*100)}%"></i></div>
<p class="hint" id="st-left" style="margin:8px 0 0">${stLeft(s)}</p></div>
<div class="panel stcard"><h2>Mục tiêu mỗi ngày</h2>
<div class="row" style="flex-wrap:wrap;gap:8px">${presets}</div>
<div class="row" style="margin-top:10px;align-items:center;gap:8px"><input type="number" id="st-goal" min="1" max="600" value="${ST.goal}" style="width:90px;margin:0" aria-label="Mục tiêu (phút)" onchange="stSetGoal(this.value)"> <span>phút / ngày</span><span class="hint" style="margin:0">(= ${stMin(g)})</span></div>
<p class="hint" style="margin:8px 0 0">Chuỗi được tính lại theo mục tiêu hiện tại: đổi mục tiêu thì những ngày trước đó cũng được xét lại theo mục tiêu mới.</p></div>
<div class="panel stcard"><h2>Tổng kết</h2>
<div class="stnums"><div><small>7 ngày qua</small><b id="st-wk">${stMin(s.wk)}</b></div><div><small>30 ngày qua</small><b id="st-mo">${stMin(s.mo)}</b></div><div><small>Tổng cộng</small><b id="st-tot">${stMin(s.tot)}</b></div><div><small>Trung bình / ngày có học</small><b id="st-avg">${stMin(s.avg)}</b></div></div></div>
<div class="panel stcard stwide"><h2>14 ngày gần nhất</h2>
<div class="stchart"><div class="stgl" style="bottom:${g/mx*100}%"><span>mục tiêu ${ST.goal}′</span></div>${bars}</div><div class="stlab">${labs}</div>
<p class="hint" style="margin:8px 0 0">Cột xanh = đạt mục tiêu. Đưa chuột vào (hoặc giữ ngón tay) lên cột để xem thời gian chính xác.</p></div>
${syPanel()}
<div class="panel stcard stwide"><details open><summary><b>Thời gian học được tính như thế nào?</b></summary>
<ul class="stul">
<li>Chỉ tính khi app đang <b>hiện trên màn hình</b> và là cửa sổ/tab bạn đang dùng. Chuyển sang app hoặc tab khác, thu nhỏ, khóa màn hình thì dừng.</li>
<li>Chỉ tính khi bạn <b>có thao tác</b> (bấm, chạm, gõ, cuộn, di chuột) trong vòng <b>60 giây</b> gần nhất. Để máy đó mà không động vào quá 60 giây thì ngừng tính, nên treo máy không được cộng.</li>
<li>Khi app đang phát âm thanh, thời gian vẫn được tính (để bạn nghe mà không cần chạm liên tục).</li>
<li>Máy ngủ hoặc tạm dừng không được bù thời gian.</li>
<li>Mọi chỗ trong app đều tính: làm bài, xem từ, nhập file, xem thống kê. Một ngày tính theo giờ trên máy bạn và đổi ngày lúc 0 giờ.</li>
<li>Dữ liệu lưu riêng trên từng thiết bị/trình duyệt. File sao lưu có kèm dữ liệu này, khi khôi phục sẽ gộp lại (lấy số lớn hơn của mỗi ngày). Muốn cộng dồn giữa nhiều thiết bị thì bật <b>Đồng bộ</b> ở trên.</li>
</ul>
<div class="row" style="margin-top:8px"><button class="btn" onclick="stReset()">Xóa dữ liệu thời gian học</button></div></details></div>
</div>`;
}
setTimeout(stPaint,0);
/* ---------- đồng bộ chuỗi học giữa các thiết bị (Firebase Realtime Database, REST) ---------- */
const SYK=STK.replace('study','sync'),SYDB='';
var SY={url:SYDB,code:'',dev:'',on:false,last:0,err:'',n:1,goalT:0},RM={},syBusy=false,syLastPut='';
try{const s=JSON.parse(localStorage.getItem(SYK)||'null');if(s){SY.url=s.url||SYDB;SY.code=s.code||'';SY.dev=s.dev||'';SY.on=false;SY.last=s.last||0;SY.goalT=s.goalT||0;RM=s.rm||{}}}catch(e){}
const sySave=()=>{try{localStorage.setItem(SYK,JSON.stringify({url:SY.url,code:SY.code,dev:SY.dev,on:SY.on,last:SY.last,goalT:SY.goalT,rm:RM}))}catch(e){}};
const syRand=n=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';const b=crypto.getRandomValues(new Uint8Array(n));for(const x of b)s+=a[x%a.length];return s};
const syBase=()=>auOn()?AU.db.replace(/\/+$/,'')+'/users/'+AU.uid+'/'+AUPF:SY.url.replace(/\/+$/,'')+'/s/'+encodeURIComponent(SY.code);
const syU=p=>syBase()+p+'.json'+(auOn()&&AU.tok?'?auth='+encodeURIComponent(AU.tok):'');
const syName=()=>{const u=navigator.userAgent;return/iPad/.test(u)?'iPad':/iPhone/.test(u)?'iPhone':/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac/.test(u)?'Mac':'Thiết bị'};
function stKeys(){return[...new Set(Object.keys(ST.days).concat(Object.keys(RM)))]}
async function syFetch(path,opt){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);
  try{const r=await fetch(syU(path),{...opt,signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}
}
const syBody=()=>JSON.stringify({days:ST.days,t:Date.now(),n:syName()});
async function syNow(manual){
  if(!(SY.on||auOn())||syBusy)return;
  if(navigator.onLine===false){SY.err='Không có mạng';syPaint();return}
  syBusy=true;SY.err='';
  try{
    if(auOn())await auTok();stFlush();
    const mine=JSON.stringify(ST.days);
    if(mine!==syLastPut||manual){await syFetch('/dev/'+SY.dev,{method:'PUT',headers:{'Content-Type':'text/plain'},body:syBody()});syLastPut=mine}
    const all=(await syFetch('',{method:'GET'}))||{};
    const dv=all.dev||{},rm={};let cnt=0;
    for(const id in dv){cnt++;if(id===SY.dev)continue;const d=(dv[id]&&dv[id].days)||{};for(const k in d){const v=+d[k];if(v>0)rm[k]=Math.round(((rm[k]||0)+v)*10)/10}}
    RM=rm;SY.n=Math.max(cnt,1);
    const g=all.goal;
    if(g&&g.t>SY.goalT&&g.v>=1&&g.v<=600){ST.goal=Math.round(g.v);SY.goalT=g.t;stSave()}
    else if(SY.goalT>0&&(!g||g.t<SY.goalT))await syFetch('/goal',{method:'PUT',headers:{'Content-Type':'text/plain'},body:JSON.stringify({v:ST.goal,t:SY.goalT})});
    if(auOn())await auData();
    SY.last=Date.now();sySave();
  }catch(e){SY.err=e&&e.name==='AbortError'?'Quá thời gian chờ':String((e&&e.message)||e)}
  syBusy=false;stPaint();syPaint();
  if(manual&&document.getElementById('st-goal')){const gi=document.getElementById('st-goal');if(gi&&document.activeElement!==gi)gi.value=ST.goal}
}
function syPush(){
  if(!(SY.on||auOn()))return;stFlush();
  const mine=JSON.stringify(ST.days);if(mine===syLastPut)return;
  try{fetch(syU('/dev/'+SY.dev),{method:'PUT',headers:{'Content-Type':'text/plain'},body:syBody(),keepalive:true});syLastPut=mine}catch(e){}
}
function syEnable(u,c){
  u=String(u||'').trim().replace(/\/+$/,'');c=String(c||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const m=document.getElementById('sy-msg'),bad=t=>{if(m)m.textContent=t;return false};
  if(!/^(https:\/\/[^\s/]+\.[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(u))return bad('Địa chỉ phải bắt đầu bằng https:// (lấy ở Firebase > Realtime Database).');
  if(c.length<8)return bad('Mã đồng bộ cần ít nhất 8 ký tự (bấm "Tạo mã" cho tiện).');
  SY.url=u;SY.code=c;SY.dev=SY.dev||syRand(10);SY.on=true;SY.err='';syLastPut='';sySave();render();syNow(true);return true;
}
function syConnect(){syEnable(document.getElementById('sy-url').value,document.getElementById('sy-code').value)}
function syGen(){const e=document.getElementById('sy-code');if(e)e.value=syRand(16)}
function syOff(){if(!confirm('Tắt đồng bộ trên thiết bị này? Số liệu của các thiết bị khác sẽ không còn được cộng vào đây.'))return;SY.on=false;RM={};sySave();render()}
function syLink(){return location.origin+location.pathname+'#sync='+btoa(unescape(encodeURIComponent(JSON.stringify({u:SY.url,c:SY.code})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function syCopyLink(){
  const l=syLink(),m=document.getElementById('sy-st');
  try{await navigator.clipboard.writeText(l);if(m)m.innerHTML='✓ Đã sao chép liên kết. Mở liên kết này trên thiết bị khác để kết nối.'}catch(e){prompt('Sao chép liên kết này rồi mở trên thiết bị khác:',l)}
}
function syStatus(){
  if(SY.err)return'⚠ Chưa đồng bộ được ('+esc(SY.err)+'). App sẽ tự thử lại.';
  return SY.last?`✓ Đã đồng bộ lúc ${new Date(SY.last).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} · ${SY.n} thiết bị.`:'Đang kết nối…';
}
function syPaint(){const e=document.getElementById('sy-st');if(e)e.innerHTML=syStatus()}
function syPanelOld(){
  if(SY.on)return`<div class="panel stcard stwide"><h2>Đồng bộ giữa các thiết bị</h2><p class="hint" id="sy-st" style="margin:0 0 8px">${syStatus()}</p><div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn" onclick="syNow(true)">⟳ Đồng bộ ngay</button><button class="btn" onclick="syCopyLink()">🔗 Sao chép liên kết kết nối</button><button class="btn" onclick="syOff()">Tắt đồng bộ</button></div><p class="hint" style="margin:8px 0 0">Mã đồng bộ: <b>${esc(SY.code)}</b>. Giữ bí mật: ai có mã đều đọc và ghi được số liệu học. Mở liên kết kết nối trên thiết bị khác để dùng chung chuỗi.</p></div>`;
  return`<div class="panel stcard stwide"><h2>Đồng bộ giữa các thiết bị</h2><p class="hint" style="margin:0 0 8px">Cộng dồn thời gian học và chuỗi từ nhiều thiết bị. Cần một cơ sở dữ liệu Firebase miễn phí (xem file HUONG_DAN_DONG_BO.md).</p><input id="sy-url" placeholder="Địa chỉ Firebase, vd: https://ten-du-an-default-rtdb.firebaseio.com" value="${esc(SY.url)}" style="margin:0 0 8px"><div class="row" style="gap:8px;align-items:center"><input id="sy-code" placeholder="Mã đồng bộ (từ 8 ký tự)" style="margin:0"><button class="btn" onclick="syGen()">Tạo mã</button></div><div class="row" style="margin-top:8px"><button class="btn sel" onclick="syConnect()">Bật đồng bộ</button></div><p class="hint" id="sy-msg" style="margin:8px 0 0">Thiết bị thứ hai: dùng cùng địa chỉ và cùng mã, hoặc mở liên kết kết nối.</p></div>`;
}
/* ---------- tài khoản (Firebase Authentication email + mật khẩu, REST) ---------- */
const AUKEY=(window.FBCFG&&FBCFG.key)||'',AUDB=(window.FBCFG&&FBCFG.db)||'',AUPF=STK.split('-')[0],AUK=STK.replace('study','auth');
const AUID='https://identitytoolkit.googleapis.com/v1/accounts:',AUST='https://securetoken.googleapis.com/v1/token';
var AU={k:AUKEY,db:AUDB,uid:'',email:'',rt:'',tok:'',exp:0,mg:''};
try{const s=JSON.parse(localStorage.getItem(AUK)||'null');if(s){AU.k=AUKEY||s.k||'';AU.db=AUDB||s.db||'';AU.uid=s.uid||'';AU.email=s.email||'';AU.rt=s.rt||'';AU.tok=s.tok||'';AU.exp=s.exp||0;AU.mg=s.mg||''}}catch(e){}
const auSave=()=>{try{localStorage.setItem(AUK,JSON.stringify({k:AU.k,db:AU.db,uid:AU.uid,email:AU.email,rt:AU.rt,tok:AU.tok,exp:AU.exp,mg:AU.mg}))}catch(e){}};
function auOn(){return!!(AU&&AU.uid&&AU.rt)}
const auMsg=(t,ok)=>{const m=document.getElementById('au-msg');if(m){m.textContent=t;m.style.color=ok?'var(--ok,#2e7d32)':''}return false};
function auErr(e){
  if(e&&e.name==='AbortError')return'Quá thời gian chờ, thử lại sau.';
  const m=String((e&&e.message)||e);
  const T=[['EMAIL_EXISTS','Email này đã có tài khoản. Hãy bấm Đăng nhập.'],['INVALID_LOGIN_CREDENTIALS','Sai email hoặc mật khẩu.'],['INVALID_PASSWORD','Sai email hoặc mật khẩu.'],['EMAIL_NOT_FOUND','Không có tài khoản với email này.'],['WEAK_PASSWORD','Mật khẩu cần ít nhất 6 ký tự.'],['INVALID_EMAIL','Email không hợp lệ.'],['MISSING_PASSWORD','Chưa nhập mật khẩu.'],['TOO_MANY_ATTEMPTS','Thử quá nhiều lần, hãy đợi vài phút rồi thử lại.'],['USER_DISABLED','Tài khoản đã bị khóa.'],['OPERATION_NOT_ALLOWED','Chưa bật đăng nhập Email/Mật khẩu trong Firebase (Authentication > Sign-in method).'],['CONFIGURATION_NOT_FOUND','Chưa bật Authentication trong Firebase.'],['API key not valid','API key không đúng.'],['Failed to fetch','Không có mạng hoặc bị chặn kết nối.']];
  for(const[a,b]of T)if(m.indexOf(a)>=0)return b;
  return m;
}
async function auPost(url,body,form){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
  try{
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':form?'application/x-www-form-urlencoded':'application/json'},body:form?body:JSON.stringify(body),signal:c.signal});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));
    return j;
  }finally{clearTimeout(t)}
}
async function auTok(){
  if(!auOn())return'';
  if(AU.tok&&AU.exp-Date.now()>120000)return AU.tok;
  try{
    const j=await auPost(AUST+'?key='+encodeURIComponent(AU.k),'grant_type=refresh_token&refresh_token='+encodeURIComponent(AU.rt),true);
    AU.tok=j.id_token;AU.rt=j.refresh_token||AU.rt;AU.exp=Date.now()+(+j.expires_in||3600)*1000;auSave();return AU.tok;
  }catch(e){
    if(/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND|USER_DISABLED|MISSING_REFRESH_TOKEN/.test(String(e.message||e))){AU.tok='';AU.rt='';AU.exp=0;auSave();if(document.getElementById('au-msg')||true)setTimeout(render,0)}
    throw e;
  }
}
const auReadCfg=()=>{
  AU.db=(AU.db||'').replace(/\/+$/,'');
  if(!AU.k||!/^(https:\/\/[^\s/]+\.[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/.test(AU.db))return auMsg('Trang chưa được cấu hình đăng nhập, hãy báo cho chủ trang.');
  return true;
};
async function auSubmit(kind){
  if(AU.busy)return;
  const em=(document.getElementById('au-email')||{}).value||'',pw=(document.getElementById('au-pw')||{}).value||'';
  if(!auReadCfg())return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim()))return auMsg('Email không hợp lệ.');
  if(pw.length<6)return auMsg('Mật khẩu cần ít nhất 6 ký tự.');
  const p2=document.getElementById('au-pw2');if(kind==='up'&&p2&&p2.value!==pw)return auMsg('Hai mật khẩu chưa giống nhau.');
  AU.busy=true;auMsg(kind==='up'?'Đang tạo tài khoản…':'Đang đăng nhập…',true);
  try{
    const j=await auPost(AUID+(kind==='up'?'signUp':'signInWithPassword')+'?key='+encodeURIComponent(AU.k),{email:em.trim(),password:pw,returnSecureToken:true});
    if(AU.uid&&AU.uid!==j.localId)AU.mg='';
    AU.uid=j.localId;AU.email=j.email||em.trim();AU.rt=j.refreshToken;AU.tok=j.idToken;AU.exp=Date.now()+(+j.expiresIn||3600)*1000;
    SY.dev=SY.dev||syRand(10);sySave();auSave();syLastPut='';AU.busy=false;tab='vocab';render();syNow(true);return true;
  }catch(e){AU.busy=false;return auMsg(auErr(e))}
}
async function auReset(){
  const em=((document.getElementById('au-email')||{}).value||'').trim();
  if(!auReadCfg())return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return auMsg('Nhập email của bạn vào ô Email rồi bấm lại.');
  try{await auPost(AUID+'sendOobCode?key='+encodeURIComponent(AU.k),{requestType:'PASSWORD_RESET',email:em});auSave();auMsg('Đã gửi email đặt lại mật khẩu (kiểm tra cả thư rác).',true)}catch(e){auMsg(auErr(e))}
}
function auOut(){
  if(!confirm('Đăng xuất khỏi tài khoản trên thiết bị này?\nDữ liệu học trên máy vẫn được giữ. Dữ liệu trên tài khoản không bị xóa.'))return;
  AU.uid='';AU.email='';AU.rt='';AU.tok='';AU.exp=0;AU.mg='';RM={};auSave();sySave();render();
}
/* --- đồng bộ từ vựng + tiến độ ngữ pháp (chạy trong syNow khi đã đăng nhập) --- */
const auLT=k=>{try{return+localStorage.getItem(k+'-t')||0}catch(e){return 0}};
const auSetT=(k,t)=>{try{localStorage.setItem(k+'-t',String(t))}catch(e){}};
const auBusyUI=()=>!!Q||(typeof G!=='undefined'&&G&&G.list&&!G.fin);
async function auData(){
  const get=p=>syFetch(p,{method:'GET'}),put=(p,o)=>syFetch(p,{method:'PUT',headers:{'Content-Type':'text/plain'},body:JSON.stringify(o)});
  const first=AU.mg!==AU.uid;let ch=false;
  /* tiến độ ngữ pháp: lần đầu thì gộp (lấy điểm cao hơn), sau đó bản mới hơn thắng */
  const cg=await get('/gprog');let rg=null;
  if(cg&&cg.j){try{rg=JSON.parse(cg.j)}catch(e){}}
  const lg=auLT(GPK);
  if(first){
    if(rg&&typeof rg==='object')for(const k in rg){const a=GP[k],b=rg[k]||{};if(!a||(b.best||0)>(a.best||0)||((b.best||0)===(a.best||0)&&(b.at||0)>(a.at||0)))GP[k]=b}
    if(Object.keys(GP).length){gSaveP();await put('/gprog',{t:auLT(GPK),j:JSON.stringify(GP)});ch=true}
  }else if(rg&&cg.t>lg){
    if(!auBusyUI()){GP=rg;try{localStorage.setItem(GPK,JSON.stringify(GP))}catch(e){}auSetT(GPK,cg.t);ch=true}
  }else if(lg>0&&(!cg||!cg.t||lg>cg.t))await put('/gprog',{t:lg,j:JSON.stringify(GP)});
  AU.mg=AU.uid;auSave();
  if(ch&&!auBusyUI())render();
}
var AUM='in';
function auGate(){
  const cfg=(AU.k&&AU.db)?'':`<p class="hint" style="color:var(--bad,#c62828)">Trang này chưa được cấu hình đăng nhập. Chủ trang cần điền file firebase-config.js (xem HUONG_DAN_TAI_KHOAN.md).</p>`;
  const nm=(document.title.split(/\s[–-]\s/)[0]||'').trim();
  const exp=AU.uid&&!AU.rt?'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.':'';
  const up=AUM==='up';
  return`<style>.augt input{display:block;width:100%;box-sizing:border-box;padding:12px 14px;font:inherit;font-size:16px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:inherit;margin:0 0 8px}.augt input:focus{outline:none;border-color:var(--pri)}</style><div class="panel augt" style="max-width:420px;margin:8vh auto 0"><h1 style="margin:0 0 4px">${esc(nm)}</h1><p class="hint" style="margin:0 0 12px">${up?'Tạo tài khoản mới để lưu chuỗi học, từ vựng và tiến độ bài tập.':'Đăng nhập để tiếp tục học và đồng bộ giữa các thiết bị.'}</p>
<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn${up?'':' sel'}" onclick="AUM='in';render()">Đăng nhập</button><button class="btn${up?' sel':''}" onclick="AUM='up';render()">Đăng ký</button></div>
${exp?`<p class="hint" style="color:var(--bad,#c62828)">${exp}</p>`:''}${cfg}
<input id="au-email" type="email" autocomplete="username" placeholder="Email" value="${esc(AU.email)}" style="margin:0 0 8px">
<input id="au-pw" type="password" autocomplete="${up?'new-password':'current-password'}" placeholder="Mật khẩu (từ 6 ký tự)" style="margin:0 0 8px" onkeydown="if(event.key==='Enter')auSubmit('${up?'up':'in'}')">
${up?`<input id="au-pw2" type="password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" style="margin:0 0 8px" onkeydown="if(event.key==='Enter')auSubmit('up')">`:''}
<div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn sel" onclick="auSubmit('${up?'up':'in'}')">${up?'Tạo tài khoản':'Đăng nhập'}</button>${up?'':'<button class="btn" onclick="auReset()">Quên mật khẩu</button>'}</div>
<p class="hint" id="au-msg" style="margin:8px 0 0"></p></div>`;
}
function auPanel(){
  return`<div class="panel stcard stwide"><h2>Tài khoản</h2><p style="margin:0 0 6px">👤 <b>${esc(AU.email)}</b></p><p class="hint" id="sy-st" style="margin:0 0 8px">${syStatus()}</p><div class="row" style="flex-wrap:wrap;gap:8px"><button class="btn" onclick="syNow(true)">⟳ Đồng bộ ngay</button><button class="btn" onclick="auOut()">Đăng xuất</button></div><p class="hint" style="margin:8px 0 0">Đang lưu theo tài khoản: chuỗi học và thời gian học, từ vựng đã chọn, tiến độ bài tập ngữ pháp. Đăng nhập cùng email trên thiết bị khác để học tiếp.</p></div>`;
}
function syPanel(){return auPanel()}

setTimeout(()=>syNow(),1500);
setInterval(()=>{if(document.visibilityState==='visible')syNow()},60000);
addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')syPush();else syNow()});
addEventListener('pagehide',syPush);addEventListener('online',()=>syNow());

if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
/* ---------- tài liệu: xem PDF, Word, Excel... ngay trên trang ---------- */
const DLK=STK.replace('study','docs');
let D={list:null,err:'',loading:false,q:'',view:null,zoom:1,pg:1,np:0,sheet:0,pdf:null,obs:null,tok:0};
try{D.list=JSON.parse(localStorage.getItem(DLK)||'null')}catch(e){}
const DEXT={pdf:'PDF',docx:'Word',doc:'Word',xlsx:'Excel',xls:'Excel',csv:'Bảng CSV',ods:'Bảng',txt:'Văn bản',md:'Văn bản',json:'Văn bản',pptx:'PowerPoint',ppt:'PowerPoint',mp3:'Âm thanh',wav:'Âm thanh',m4a:'Âm thanh',mp4:'Video',webm:'Video'};
const dext=n=>String(n).split('.').pop().toLowerCase();
const disimg=e=>/^(png|jpe?g|gif|webp|svg|bmp)$/.test(e);
const dico=e=>({pdf:'📕',docx:'📘',doc:'📘',xlsx:'📗',xls:'📗',csv:'📗',ods:'📗',pptx:'📙',ppt:'📙',txt:'📄',md:'📄',json:'📄',mp3:'🎧',wav:'🎧',m4a:'🎧',mp4:'🎬',webm:'🎬'})[e]||(disimg(e)?'🖼️':'📎');
const dsize=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const dUrl=f=>'docs/'+f.split('/').map(encodeURIComponent).join('/');
const dScripts={};
const dLoadJS=s=>dScripts[s]||(dScripts[s]=new Promise((ok,no)=>{const e=document.createElement('script');e.src=s;e.onload=ok;e.onerror=()=>{delete dScripts[s];no(new Error('Không tải được thư viện xem tài liệu (cần mạng ở lần đầu).'))};document.head.appendChild(e)}));
async function dGitHubList(){
  const m=/^([^.]+)\.github\.io$/.exec(location.hostname),rp=location.pathname.split('/')[1];
  if(!m||!rp)throw new Error('no github');
  const out=[];
  const walk=async(sub,depth)=>{
    const r=await fetch(`https://api.github.com/repos/${m[1]}/${rp}/contents/docs${sub?'/'+sub:''}`);
    if(!r.ok)throw new Error('api '+r.status);
    for(const x of await r.json()){
      if(x.type==='dir'&&depth<2)await walk((sub?sub+'/':'')+x.name,depth+1);
      else if(x.type==='file'&&!/^(index\.json|readme\.md|\.gitkeep|\.ds_store|thumbs\.db)$/i.test(x.name))out.push({f:(sub?sub+'/':'')+x.name,s:x.size||0});
    }
  };
  await walk('',0);return out;
}
async function dLoad(){
  D.loading=true;D.err='';let list=null;
  try{const r=await fetch('docs/index.json',{cache:'no-cache'});if(r.ok){const j=await r.json();list=(Array.isArray(j)?j:(j.files||[])).map(x=>typeof x==='string'?{f:x}:x).filter(x=>x&&x.f)}}catch(e){}
  if(!list){try{list=await dGitHubList()}catch(e){D.err=D.list&&D.list.length?'Không cập nhật được danh sách, đang hiện bản đã lưu trên máy.':'Chưa có tài liệu nào. Bỏ file vào thư mục "docs" của trang web rồi đẩy lên GitHub.'}}
  if(list){D.list=list.map(x=>({f:x.f,n:x.n||x.f.split('/').pop().replace(/\.[^.]+$/,''),s:x.s||0}));try{localStorage.setItem(DLK,JSON.stringify(D.list))}catch(e){}}
  D.loading=false;if(tab==='docs'&&!D.view)render();
}
function dListHTML(){
  if(D.list===null)return'<p class="hint">Đang tải danh sách…</p>';
  const q=D.q.trim().toLowerCase(),idx=new Map(D.list.map((x,i)=>[x,i]));
  const L=D.list.filter(x=>!q||x.n.toLowerCase().includes(q)||x.f.toLowerCase().includes(q));
  if(!L.length)return`<p class="hint">${D.list.length?'Không có tài liệu khớp từ khóa.':esc(D.err||'Chưa có tài liệu nào.')}</p>`;
  const g={};L.forEach(x=>{const c=x.f.includes('/')?x.f.split('/').slice(0,-1).join(' / '):'';(g[c]=g[c]||[]).push(x)});
  return(D.err?`<p class="hint">${esc(D.err)}</p>`:'')+Object.keys(g).sort((a,b)=>a.localeCompare(b,'vi')).map(c=>`${c?`<h3 class="dgh">📁 ${esc(c)}</h3>`:''}<div class="dgrid">${g[c].sort((a,b)=>a.n.localeCompare(b.n,'vi',{numeric:true})).map(x=>{const e=dext(x.f);return`<button class="dit" onclick="dOpen(${idx.get(x)})"><span class="di">${dico(e)}</span><span><b>${esc(x.n)}</b><small>${DEXT[e]||('.'+e)}${x.s?' · '+dsize(x.s):''}</small></span></button>`}).join('')}</div>`).join('');
}
function dFilter(v){D.q=v;const e=document.getElementById('d-list');if(e)e.innerHTML=dListHTML()}
function dhome(){
  if(D.view)return dview();
  if(D.list===null&&!D.loading)setTimeout(dLoad,0);
  return`${tabs('docs')}<div class="panel"><h2>Tài liệu</h2>
<input type="search" id="d-q" placeholder="Tìm tài liệu…" value="${esc(D.q)}" oninput="dFilter(this.value)" aria-label="Tìm tài liệu" style="margin:0 0 10px">
<div class="row" style="flex-wrap:wrap;gap:8px"><label class="btn sel" style="cursor:pointer">📂 Mở file từ máy<input type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.ods,.txt,.md,.json,image/*,audio/*,video/*,.pptx,.doc,.ppt" style="display:none" onchange="dOpenLocal(this)"></label><button class="btn" onclick="D.list=null;dLoad();render()">⟳ Làm mới</button><button class="btn" onclick="dPrefetch()">⬇ Tải để đọc offline</button></div>
<p class="hint" id="d-st" style="margin:8px 0 0">Xem trực tiếp PDF, Word (.docx), Excel, CSV, văn bản, ảnh, âm thanh, video. File mở từ máy chỉ xem trên trình duyệt của bạn, không bị tải lên đâu cả.</p></div>
<div class="panel" id="d-list">${dListHTML()}</div>`;
}
function dOpen(i){const x=D.list[i];if(!x)return;D.view={name:x.n,ext:dext(x.f),url:dUrl(x.f),file:x.f};D.zoom=1;D.sheet=0;D.pdf=null;render();window.scrollTo(0,0)}
function dOpenLocal(inp){const f=inp.files&&inp.files[0];if(!f)return;D.view={name:f.name,ext:dext(f.name),blob:f};D.zoom=1;D.sheet=0;D.pdf=null;inp.value='';render();window.scrollTo(0,0)}
function dClose(){D.view=null;D.pdf=null;D.tok++;if(D.obs){D.obs.disconnect();D.obs=null}render()}
function dview(){
  const v=D.view;
  setTimeout(dPaint,0);
  return`${tabs('docs')}<div class="dvbar"><button class="btn" onclick="dClose()">← Danh sách</button><span class="dvt">${esc(v.name)}</span>${v.ext==='pdf'?`<button class="btn" onclick="dZoom(-.2)" aria-label="Thu nhỏ">−</button><button class="btn" onclick="dZoom(.2)" aria-label="Phóng to">+</button><span id="d-pg" class="hint" style="margin:0"></span>`:''}<button class="btn" onclick="dDownload()">⬇ Tải về</button></div><div class="dvb" id="dv-body"><p class="hint">Đang mở…</p></div>`;
}
async function dBuf(v){if(v.blob)return v.blob.arrayBuffer();const r=await fetch(v.url);if(!r.ok)throw new Error('Không mở được file (mã '+r.status+').');return r.arrayBuffer()}
async function dPaint(){
  const v=D.view,b=document.getElementById('dv-body');if(!v||!b)return;
  try{
    const e=v.ext;
    if(e==='pdf')await dPdf(v,b);
    else if(e==='docx'){await dLoadJS('lib/mammoth.browser.min.js');const r=await mammoth.convertToHtml({arrayBuffer:await dBuf(v)});if(D.view!==v)return;b.innerHTML=`<div class="ddoc">${r.value||'<p class="hint">Tài liệu trống.</p>'}</div>`}
    else if(e==='xlsx'||e==='xls'||e==='ods'){await dLoadJS('lib/xlsx.min.js');const wb=XLSX.read(await dBuf(v),{type:'array'});if(D.view===v)dSheets(wb,b)}
    else if(e==='csv'){await dLoadJS('lib/xlsx.min.js');const wb=XLSX.read(new TextDecoder().decode(await dBuf(v)),{type:'string'});if(D.view===v)dSheets(wb,b)}
    else if(e==='txt'||e==='md'||e==='json'){const t=new TextDecoder().decode(await dBuf(v));if(D.view===v)b.innerHTML=`<pre class="dtxt">${esc(t)}</pre>`}
    else{
      const src=v.blob?URL.createObjectURL(v.blob):v.url;
      if(disimg(e))b.innerHTML=`<img src="${esc(src)}" alt="${esc(v.name)}" style="max-width:100%;height:auto;display:block;margin:0 auto">`;
      else if(/^(mp3|wav|m4a)$/.test(e))b.innerHTML=`<audio controls src="${esc(src)}" style="width:100%"></audio>`;
      else if(/^(mp4|webm)$/.test(e))b.innerHTML=`<video controls src="${esc(src)}" style="width:100%;max-height:75vh"></video>`;
      else b.innerHTML=`<p>Trình duyệt chưa xem trực tiếp được định dạng <b>.${esc(e)}</b> (ví dụ PowerPoint hoặc Word cũ .doc). Bấm <b>⬇ Tải về</b> để mở bằng ứng dụng trên máy, hoặc đổi file sang PDF rồi tải lên.</p>`;
    }
  }catch(err){if(D.view===v)b.innerHTML=`<p class="hint">Không mở được: ${esc(err.message||err)}</p>`}
}
function dSheets(wb,b){
  const names=wb.SheetNames;
  const draw=i=>{
    D.sheet=i;const rows=XLSX.utils.sheet_to_json(wb.Sheets[names[i]],{header:1,defval:'',raw:false});
    const cut=rows.length>1500,R=rows.slice(0,1500),w=Math.min(60,Math.max(1,...R.map(r=>r.length)));
    b.innerHTML=`${names.length>1?`<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${names.map((n,j)=>`<button class="btn ${j===i?'sel':''}" data-i="${j}">${esc(n)}</button>`).join('')}</div>`:''}<div style="overflow:auto"><table class="dtbl">${R.map(r=>`<tr>${Array.from({length:w},(_,k)=>`<td>${esc(r[k]??'')}</td>`).join('')}</tr>`).join('')}</table></div>${cut?'<p class="hint">Chỉ hiện 1500 dòng đầu.</p>':''}`;
    b.querySelectorAll('button[data-i]').forEach(x=>x.onclick=()=>draw(+x.dataset.i));
  };
  draw(D.sheet<names.length?D.sheet:0);
}
async function dPdf(v,b){
  await dLoadJS('lib/pdf.min.js');pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js';
  const doc=await pdfjsLib.getDocument({data:new Uint8Array(await dBuf(v))}).promise;
  if(D.view!==v)return;D.pdf=doc;D.np=doc.numPages;D.pg=1;await dPdfLayout(b);
}
async function dPdfLayout(b){
  b=b||document.getElementById('dv-body');const doc=D.pdf;if(!doc||!b)return;
  if(D.obs)D.obs.disconnect();
  const token=++D.tok,p1=await doc.getPage(1),v1=p1.getViewport({scale:1}),W=Math.max(200,b.clientWidth-16)*D.zoom,sc=W/v1.width;
  b.innerHTML='';const pages=[];
  for(let i=1;i<=doc.numPages;i++){const d=document.createElement('div');d.className='dpg';d.dataset.p=i;d.style.width=W+'px';d.style.height=Math.round(v1.height*sc)+'px';b.appendChild(d);pages.push(d)}
  const draw=async d=>{
    if(d.dataset.done)return;d.dataset.done=1;
    const p=await doc.getPage(+d.dataset.p),vp=p.getViewport({scale:W/p.getViewport({scale:1}).width}),dpr=Math.min(2,window.devicePixelRatio||1),c=document.createElement('canvas');
    c.width=Math.floor(vp.width*dpr);c.height=Math.floor(vp.height*dpr);d.style.height=Math.round(vp.height)+'px';
    await p.render({canvasContext:c.getContext('2d'),viewport:p.getViewport({scale:vp.scale*dpr})}).promise;
    if(D.tok===token)d.appendChild(c);
  };
  D.obs=new IntersectionObserver(es=>{
    es.forEach(e=>{if(e.isIntersecting)draw(e.target).catch(()=>{})});
    const vis=es.filter(e=>e.isIntersecting).sort((x,y)=>y.intersectionRatio-x.intersectionRatio)[0];
    if(vis){D.pg=+vis.target.dataset.p;dPg()}
  },{rootMargin:'700px 0px',threshold:[0,.5]});
  pages.forEach(d=>D.obs.observe(d));dPg();
}
function dPg(){const e=document.getElementById('d-pg');if(e)e.textContent=`Trang ${D.pg}/${D.np}`}
function dZoom(dz){D.zoom=Math.max(.6,Math.min(3,Math.round((D.zoom+dz)*10)/10));dPdfLayout()}
function dDownload(){
  const v=D.view;if(!v)return;const a=document.createElement('a');
  a.href=v.blob?URL.createObjectURL(v.blob):v.url;a.download=v.file?v.file.split('/').pop():v.name;
  document.body.appendChild(a);a.click();a.remove();
}
async function dPrefetch(){
  const st=document.getElementById('d-st'),L=D.list||[];let n=0,bad=0;
  if(!L.length){if(st)st.textContent='Chưa có tài liệu nào để tải.';return}
  for(const u of['lib/pdf.min.js','lib/pdf.worker.min.js','lib/mammoth.browser.min.js','lib/xlsx.min.js'])try{await fetch(u)}catch(e){}
  for(const x of L){try{const r=await fetch(dUrl(x.f));if(!r.ok)throw 0;await r.arrayBuffer()}catch(e){bad++}n++;if(st)st.textContent=`Đã tải ${n}/${L.length}…`}
  if(st)st.textContent=bad?`Xong, ${bad} file chưa tải được.`:'Xong. Đã lưu để đọc khi không có mạng.';
}

render();
