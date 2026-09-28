import {writeFileSync,mkdirSync} from 'node:fs';
const rate=44100;
for(const name of ['beads','water','rain','stones','soft']){
 let seed=117;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
 const duration=name==='rain'?.18:.14,length=Math.ceil(rate*duration),data=Buffer.alloc(44+length*2);data.write('RIFF');data.writeUInt32LE(36+length*2,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(length*2,40);
 for(let i=0;i<length;i++){const t=i/rate,attack=Math.min(1,t/.0015);let v=0;
  if(name==='beads')v=(Math.sin(2*Math.PI*1400*t)*.17+Math.sin(2*Math.PI*2300*t)*.07+random()*.10)*Math.exp(-t*85);
  if(name==='water')v=Math.sin(2*Math.PI*(720*t+6200*t*t))*.22*Math.exp(-t*30);
  if(name==='rain'){for(const delay of [0,.028,.060]){const u=t-delay;if(u>=0)v+=(random()*.09+Math.sin(2*Math.PI*1800*u)*.04)*Math.exp(-u*110);}}
  if(name==='stones')v=(Math.sin(2*Math.PI*2400*t)*.12+Math.sin(2*Math.PI*3700*t)*.06+random()*.08)*Math.exp(-t*70);
  if(name==='soft')v=Math.sin(2*Math.PI*(520*t-550*t*t))*.18*Math.exp(-t*32);
  const fade=Math.min(1,(duration-t)/.005);data.writeInt16LE(Math.round(Math.max(-.9,Math.min(.9,v*attack*fade))*32767),44+i*2);
 }
 for(const dir of ['android/app/src/main/assets','web/sounds']){mkdirSync(dir,{recursive:true});writeFileSync(dir+'/'+name+'.wav',data);}
}
