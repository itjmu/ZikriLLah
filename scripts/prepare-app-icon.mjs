import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {mediaExtension} from '../bot/media.js';
const MAX=5*1024*1024;
async function download(url){const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Download failed: '+response.status);let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>MAX)throw Error('Image exceeds 5 MB');chunks.push(chunk);}return Buffer.concat(chunks);}
let bytes;if(process.argv[2]==='--server'){const origin=new URL(process.argv[3]);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Use an HTTPS origin');const config=JSON.parse((await download(origin.origin+'/api/content')).toString());const path=config.experience?.appIcon;if(!/^\/media\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path||''))throw Error('No icon published by admin');bytes=await download(origin.origin+path);}else{if(!process.argv[2])throw Error('Pass an image file path or --server https://zikrillah.duckdns.org');bytes=readFileSync(process.argv[2]);}
if(bytes.length>MAX)throw Error('Image exceeds 5 MB');const ext=mediaExtension(bytes);if(!['png','jpg','webp'].includes(ext))throw Error('Use PNG, JPG or WebP');
// One stable raw resource avoids duplicate resource names when the format changes.
const raw=fileURLToPath(new URL('../android/app/src/main/res/raw/',import.meta.url));mkdirSync(raw,{recursive:true});writeFileSync(raw+'app_icon',bytes);
writeFileSync(fileURLToPath(new URL('../android/app/src/main/res/drawable/ic_launcher.xml',import.meta.url)),'<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@raw/app_icon" android:gravity="fill" android:filter="true"/>\n');
console.log('Launcher image prepared. Build and distribute the updated APK.');
