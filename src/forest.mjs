// Decorative, deterministic vector scenery. No generated media or client claims.
export function forestScene(className = '') {
 const tree = '<path d="M0 0 -7 20 -3 19 -14 36 -8 34 -23 57 -14 54 -31 78 -20 74 -40 101 -5 95 -5 115 5 115 5 95 40 101 20 74 31 78 14 54 23 57 8 34 14 36 3 19 7 20Z"/>';
 const layer=(count,y,scale,seed)=>Array.from({length:count},(_,i)=>{
  const n=((i*73+seed*41)%97)/97; const s=scale*(.7+n*.55);
  return '<g transform="translate('+Math.round(i*1440/(count-1))+' '+Math.round(y-n*60)+') scale('+s.toFixed(2)+')">'+tree+'</g>';
 }).join('');
 return '<svg class="forest-scene '+className+'" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><path class="forest-sky" d="M0 0H1440V720H0Z"/><path class="forest-peak" d="M0 440 170 330 260 365 430 220 520 310 704 126 779 235 826 202 1040 380 1190 320 1440 430V720H0Z"/><path class="forest-snow" d="m704 126 -92 109 48-18 20 22 24-58 33 47 42 7Z"/><g class="forest-far">'+layer(43,350,1.8,1)+'</g><path class="forest-mist" d="M0 455Q360 400 720 455T1440 455V560Q1100 505 720 545T0 555Z"/><g class="forest-near">'+layer(24,430,2.9,3)+'</g><path class="forest-ground" d="M0 655Q360 585 720 655T1440 630V720H0Z"/><g class="forest-edge forest-edge-left" transform="translate(54 30) scale(6.5)">'+tree+'</g><g class="forest-edge forest-edge-right" transform="translate(1386 70) scale(6.2)">'+tree+'</g></svg>';
}
