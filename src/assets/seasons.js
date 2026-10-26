// Local calendar seasons: no service, account, or network dependency.
export function seasonForDate(date = new Date()) {
  const month = Number(new Intl.DateTimeFormat('en-US', {timeZone:'America/Denver', month:'numeric'}).format(date));
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'fall' : 'winter';
}

const leaf = 'M0-48 9-29 23-36 20-17 39-23 30-7 46-2 28 9 32 24 14 21 5 38 3 57-2 57-3 35-17 25-32 27-28 12-46 3-31-5-40-19-20-16-24-34-9-29Z';
const veins = 'M0 44V-40M0-8 17-25M0 5 29-8M0 18 20 16M0-8-15-25M0 6-29-5M0 20-20 17';
const snowman = `<ellipse cx="180" cy="243" rx="107" ry="15" fill="#c2d9df"/><circle cx="179" cy="190" r="56" fill="url(#snow)"/><circle cx="178" cy="115" r="40" fill="url(#snow)"/><path d="m139 141 76 2-5 17-63 1Z" fill="#b75b30"/><path d="m202 152 15 48-18 4-10-49Z" fill="#a54827"/><path d="m145 78 64 1-9-43h-46Z" fill="#27383b"/><path d="M131 79h91v9h-91Z" fill="#192b30"/><circle cx="167" cy="108" r="3" fill="#29383b"/><circle cx="190" cy="108" r="3" fill="#29383b"/><path d="m179 118 31 7-31 5Z" fill="#df792f"/><path d="M165 136q15 10 27-1" stroke="#526770" fill="none" stroke-linecap="round" stroke-dasharray="1 7" stroke-width="3"/><path d="m126 176-58-35m161 31 46-45" stroke="#6d5240" stroke-width="6" stroke-linecap="round"/><g fill="#34454b"><circle cx="179" cy="174" r="4"/><circle cx="179" cy="194" r="4"/><circle cx="179" cy="214" r="4"/></g>`;
const beach = `<ellipse cx="160" cy="240" rx="158" ry="22" fill="#d2b477" opacity=".6"/><path d="M142 47v183" stroke="#80653e" stroke-width="5"/><path d="M39 84Q141-42 245 84Z" fill="#c87837"/><path d="M39 84Q86 55 111 82L142 9Q78 18 39 84Z" fill="#eee1b9"/><path d="m142 9 31 73q34-29 72 2Q204 19 142 9" fill="#eee1b9"/><path d="M142 9 111 82q30-17 62 0Z" fill="#417c78"/><g stroke="#73593b" stroke-width="5" fill="none" stroke-linecap="round"><path d="m33 157 35 52h65l38-80M58 200l-15 35m83-26 20 25M182 177l24 35h67l26-62m-100 53-9 32m76-23 20 22"/></g><path d="m37 154 31 48h64l36-76-15-7-34 66H78l-27-40Z" fill="#e3dcc4"/><path d="m186 173 22 32h63l25-58-13-5-22 49h-44l-19-26Z" fill="#61908a"/>`;
const volleyball = `<ellipse cx="164" cy="242" rx="148" ry="14" fill="#d8bd83" opacity=".5"/><path d="M45 65v173m220-173v173" stroke="#756247" stroke-width="6"/><path d="M46 81h219v81H46Z" fill="#f3eee0" fill-opacity=".18" stroke="#e0d6b7" stroke-width="4"/><path d="M46 100h219M46 121h219M46 143h219M70 81v81m25-81v81m25-81v81m25-81v81m25-81v81m25-81v81m25-81v81m25-81v81" stroke="#e2d9bf" stroke-opacity=".7"/><circle cx="213" cy="214" r="23" fill="#eee4c5"/><path d="M192 207q25-3 39 11m-21-26q-2 23-17 31m31-26q-18 11-15 39" fill="none" stroke="#bc8c4d" stroke-width="3"/>`;
const spring = `<g fill="#447b3a"><path d="M0 260V160l22 80 9-124 21 120 37-101-13 111 46-73-18 87Zm109 0 14-90 13 71 34-127-9 127 43-93-22 100 44-71-24 83Z"/><path d="m220 260 3-75 15 53 31-112-8 113 46-68-29 89Z"/></g><g stroke="#537d3c" stroke-width="4" fill="none"><path d="M72 260v-98m102 98-3-124m82 124-8-75"/></g><g fill="#eee4cb"><circle cx="72" cy="156" r="16"/><circle cx="171" cy="131" r="18"/><circle cx="245" cy="183" r="14"/></g><g fill="#d6ab47"><circle cx="72" cy="156" r="6"/><circle cx="171" cy="131" r="7"/><circle cx="245" cy="183" r="5"/></g>`;

function scenery(season, id) {
  const defs=`<defs><radialGradient id="${id}-snow" cx=".3" cy=".2"><stop stop-color="#fffdf1"/><stop offset=".65" stop-color="#e4eff0"/><stop offset="1" stop-color="#aec9d1"/></radialGradient></defs>`;
  let panorama='', corners='';
  if(season==='winter') {
    panorama='<path d="M0 340 185 100 296 245 421 66 661 340 849 151 1034 328 1192 112 1440 360V420H0Z" fill="#789ba6"/><path d="m107 202 78-102 111 145-83-45-28 23-31-43Zm232-33 82-103 115 132-88-37-25 29-33-41Zm797 16 56-73 101 101-78-30-19 23-30-38Z" fill="#ecf3ed"/><path d="M0 358q180-74 380 13t394-7 666 7v49H0Z" fill="#dbe9e9"/><path d="M0 402q272-65 485-2t541-7 414 6v21H0Z" fill="#f2f5ed"/>';
    corners=`<svg class="seasonal-vignette seasonal-right" viewBox="0 0 320 260">${defs}${snowman.replaceAll('url(#snow)',`url(#${id}-snow)`)}</svg>`;
  } else if(season==='summer') {
    panorama='<path d="M0 300q280-60 630 1t810-2v121H0Z" fill="#719a94" opacity=".7"/><path d="M0 328q300-35 648 8t792-10v94H0Z" fill="#d5bd87"/><path d="M0 369q320-69 729 5t711-4v50H0Z" fill="#e5d2a4"/>';
    corners=`<svg class="seasonal-vignette seasonal-left" viewBox="0 0 320 260">${beach}</svg><svg class="seasonal-vignette seasonal-right" viewBox="0 0 320 260">${volleyball}</svg>`;
  } else if(season==='spring') {
    panorama='<path d="M0 365q170-128 412-23t438-18 590 34v62H0Z" fill="#568447"/><path d="M0 398q300-95 552-14t441-4 447 8v32H0Z" fill="#7ba255"/>';
    corners=`<svg class="seasonal-vignette seasonal-left" viewBox="0 0 320 260">${spring}</svg><svg class="seasonal-vignette seasonal-right" viewBox="0 0 320 260">${spring}</svg>`;
  } else {
    panorama='<path d="M0 392q280-60 561-5t879-14v47H0Z" fill="#a16a39" opacity=".3"/><path d="M0 416q260-36 606-6t834-11v21H0Z" fill="#926039" opacity=".3"/>';
  }
  return `<svg class="seasonal-panorama" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">${panorama}</svg>${corners}`;
}

function foliage(season, id) {
  const colors=season==='spring'?['#739846','#4f7c36','#89a94a']:['#b45b25','#c08029','#914026','#cf9a41','#89532d'];
  const positions=[[3,8,60,-30],[93,6,76,25],[83,18,64,-40],[96,38,52,80],[5,45,66,20],[76,7,42,80],[12,91,75,-60],[88,91,70,35],[63,96,54,90],[31,97,45,25],[1,73,44,-90],[97,69,62,80],[72,29,36,-15],[92,58,43,80],[9,26,33,-50],[48,94,57,90]];
  return positions.map(([x,y,size,turn],i)=>`<svg class="seasonal-leaf ${y>85?'seasonal-ground-leaf':''} ${x>12&&x<88?'seasonal-mid-leaf':''}" style="left:${x}%;top:${y}%;width:${size}px;--leaf-turn:${turn}deg;--leaf-delay:-${i*.7}s" viewBox="-55 -55 110 120"><defs><linearGradient id="${id}-leaf-${i}" x2=".8" y2="1"><stop stop-color="${colors[i%colors.length]}"/><stop offset=".48" stop-color="${colors[(i+1)%colors.length]}"/><stop offset="1" stop-color="${season==='spring'?'#335b29':'#69412a'}"/></linearGradient></defs><g class="seasonal-leaf-motion" data-season-leaf><path d="${leaf}" fill="url(#${id}-leaf-${i})"/><path d="${veins}" stroke="${season==='spring'?'#c0ce79':'#edc77c'}" stroke-width="1.1" fill="none" opacity=".55"/><path d="M2 43 3 58" stroke="#795735" stroke-width="2"/></g></svg>`).join('');
}

function weather(season) {
  if(season!=='winter'&&season!=='spring')return '';
  return Array.from({length:14},(_,i)=>`<i class="seasonal-weather" style="left:${(i*31+7)%100}%;top:${(i*19)%89}%;--weather-delay:-${i*.8}s"></i>`).join('');
}

export function bootSeasons(doc = document, now = () => new Date()) {
  if(doc.body.classList.contains('page-tool'))return;
  const view=doc.defaultView;
  const reduce=view.matchMedia('(prefers-reduced-motion: reduce)');
  const sections=[...doc.querySelectorAll('main > .section:not(.forest-opening), main > .page-hero, .site-footer')];
  if(!sections.length)return;
  let active='', frame=0;
  const visible=new Set();
  const observer=new view.IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{target.classList.toggle('seasonal-visible',isIntersecting);if(isIntersecting)visible.add(target);else visible.delete(target);}),{rootMargin:'80px'});
  sections.forEach((section,i)=>{
    section.classList.add('seasonal-section');
    if(section.previousElementSibling?.matches('.hero'))section.classList.add('seasonal-light');
    const layer=doc.createElement('div');layer.className='seasonal-backdrop';layer.setAttribute('aria-hidden','true');layer.dataset.seasonLayer=String(i);section.prepend(layer);observer.observe(section);
  });
  const refresh=()=>{
    const season=seasonForDate(now());if(active===season)return;
    active=season;doc.body.dataset.season=season;
    sections.forEach((section,i)=>{section.querySelector('[data-season-layer]').innerHTML=scenery(season,`season-${i}`)+(season==='fall'||season==='spring'?foliage(season,`season-${i}`):'')+weather(season);});
  };
  const draw=()=>{frame=0;for(const section of visible){const top=section.getBoundingClientRect().top;section.style.setProperty('--season-scroll',reduce.matches?'0px':`${Math.max(-10,Math.min(10,top*.018))}px`);}};
  const scroll=()=>{if(!frame)frame=view.requestAnimationFrame(draw);};
  doc.addEventListener('pointerdown',event=>{
    const target=event.target.closest?.('[data-season-leaf]');
    if(!target||reduce.matches)return;
    target.getAnimations().forEach(a=>a.cancel());
    target.animate([{transform:'translate(0,0) rotate(0deg)'},{transform:'translate(32px,-28px) rotate(65deg)',offset:.45},{transform:'translate(-10px,-6px) rotate(-18deg)',offset:.78},{transform:'translate(0,0) rotate(0deg)'}],{duration:1400,easing:'ease-out'});
  });
  view.addEventListener('scroll',scroll,{passive:true});
  reduce.addEventListener?.('change',scroll);
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){refresh();scroll();}});
  view.setInterval(refresh,60000);
  refresh();scroll();
}
