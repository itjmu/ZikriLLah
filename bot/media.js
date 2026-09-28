import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const LIMIT=20*1024*1024;
export function mediaExtension(bytes){
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString()))return 'gif';
  if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'webp';
  if(bytes.subarray(4,8).toString()==='ftyp')return 'mp4';
  throw Error('Unsupported media');
}
export function mediaSaver(api,token,dir){return async attachment=>{
  if(attachment.file_size>LIMIT)throw Error('Too large');
  const file=await api('getFile',{file_id:attachment.file_id});
  if(file.file_size>LIMIT||!file.file_path||!/^[-a-zA-Z0-9_./]+$/.test(file.file_path)||file.file_path.includes('..'))throw Error('Invalid file');
  const response=await fetch('https://api.telegram.org/file/bot'+token+'/'+file.file_path,{redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!response.ok||Number(response.headers.get('content-length'))>LIMIT)throw Error('Download failed');
  const chunks=[];let total=0;
  for await(const chunk of response.body){total+=chunk.length;if(total>LIMIT)throw Error('Too large');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks),extension=mediaExtension(bytes),name=randomUUID()+'.'+extension;
  await mkdir(join(dir,'media'),{recursive:true});await writeFile(join(dir,'media',name),bytes,{flag:'wx'});return '/media/'+name;
};}
