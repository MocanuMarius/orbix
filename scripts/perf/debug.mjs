// Ad-hoc probe: node scripts/perf/debug.mjs "<url query>" "<js after load>"
import {startServer,launch,emulatePhone,delay,until} from './lib.mjs';
const [query='mock=boundary&cards=1',js='1',throttle='1']=process.argv.slice(2);
const srv=await startServer(process.env.ROOT||'dist');const b=await launch();
try{await emulatePhone(b,{throttle:Number(throttle)});
 await b.send('Page.navigate',{url:srv.base+'/game.html?'+query});
 await until(()=>b.ev('!!window.__perf?.bridge'),'bridge',60000);await delay(2500);
 const fn=new Function('b','delay','until','return (async()=>{'+js+'})()');
 console.log(JSON.stringify(await fn(b,delay,until),null,1));
 if(process.env.SHOT)await b.shot(process.env.SHOT);
}finally{await b.close();srv.close();}
