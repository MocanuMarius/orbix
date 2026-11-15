import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function until(fn,label,attempts=1800){for(let i=0;i<attempts;i++){try{const value=await fn();if(value)return value;}catch{}await delay(100);}throw Error('Timed out: '+label);}
export async function chrome(extra=[]){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-release-'));
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,...extra,'about:blank'],{windowsHide:true,stdio:'ignore'});
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
 const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let serial=0;const pending=new Map(),errors=[],badResponses=[];
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const [resolve,reject]=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);else if(message.method==='Network.responseReceived'&&message.params.response.status>=400)badResponses.push({url:message.params.response.url,status:message.params.response.status});});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 return {send,ev,errors,badResponses,visit:url=>send('Page.navigate',{url}),shot:async file=>fs.writeFile(file,Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64')),close:()=>{socket.close();browser.kill();}};
}
