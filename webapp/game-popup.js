import {dialogHeading} from './dialog-heading.js';

/** Shared game popup shell. Body markup is produced by the caller, never API HTML. */
export function createGamePopup({title,className='',panelClass='',body='',canClose=()=>true,onClose=()=>{}}) {
    const overlay=document.createElement('section');
    overlay.className=`game-overlay ${className}`;
    const backdrop=document.createElement('div');backdrop.className='overlay-backdrop';
    const panel=document.createElement('div');panel.className=`overlay-panel ${panelClass}`;
    panel.innerHTML=dialogHeading(title)+body;
    overlay.append(backdrop,panel);
    let closed=false;
    const close=()=>{if(closed||!canClose())return;closed=true;overlay.remove();onClose();};
    panel.querySelector('[data-dismiss]').onclick=close;backdrop.onclick=close;
    const show=()=>{document.body.append(overlay);requestAnimationFrame(()=>{if(!closed)overlay.classList.add('visible');});panel.querySelector('[data-dismiss]').focus();};
    return {overlay,panel,close,show};
}
