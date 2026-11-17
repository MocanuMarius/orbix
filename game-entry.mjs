import {desktopDocumentUrl,gameNeedsDesktopHost} from './display-layout.mjs?v=panels-1';

const query=new URLSearchParams(location.search);
const needsHost=gameNeedsDesktopHost({requested:query.get('display'),hosted:query.get('hosted')==='1',embedded:window.parent!==window,
 coarse:matchMedia('(pointer: coarse)').matches,hover:matchMedia('(hover: hover)').matches,
 screenWidth:screen.width||innerWidth,screenHeight:screen.height||innerHeight});
if(needsHost)location.replace(desktopDocumentUrl(location.href).href);
else{
 // Import only after routing so a direct desktop entry never boots two games.
 const source=document.querySelector('script[data-app-src]').dataset.appSrc;
 await import(new URL(source,document.baseURI).href);
}
