import {createGamePopup} from './game-popup.js';
import {materialIcon} from './material-icons.js';

export async function openSealExchange({api,renderState=()=>{},haptic=()=>{}}){
    let state=await api('/api/shop/exchange'),pending=false;
    const popup=createGamePopup({title:'Обменник',body:'<div data-seal-content></div><p data-seal-feedback role="status"></p>',canClose:()=>!pending});
    const content=popup.overlay.querySelector('[data-seal-content]'),feedback=popup.overlay.querySelector('[data-seal-feedback]');
    const names={blue:'Синие камни печати',green:'Зелёные камни печати',red:'Красные камни печати'};
    const fmt=n=>new Intl.NumberFormat('ru-RU').format(n);
    function render(){
        const total=Object.values(state.seals).reduce((sum,row)=>sum+row.count*row.rate,0);
        content.innerHTML=`<p>Древняя адена · ${fmt(state.aa)}</p>${Object.entries(state.seals).map(([color,row])=>`<div class="ui-content-row">${materialIcon(`seal_${color}`)}<div><strong>${names[color]}</strong><small>${fmt(row.count)} × ${row.rate} AA</small></div><b>${fmt(row.count*row.rate)} AA</b></div>`).join('')}<button class="ui-button primary" type="button" data-seal-exchange ${!total||pending?'disabled':''}>Обменять все · ${fmt(total)} AA</button>`;
        content.querySelector('[data-seal-exchange]').onclick=async()=>{
            if(pending)return;pending=true;render();feedback.textContent='';
            try{const result=await api('/api/shop/exchange',{method:'POST',body:JSON.stringify({counts:Object.fromEntries(Object.entries(state.seals).map(([color,row])=>[color,row.count]))})});state=result.exchange;if(result.state)renderState(result.state);feedback.textContent=`Получено ${fmt(result.aa)} AA`;haptic('light');}
            catch(error){if(error.payload?.exchange)state=error.payload.exchange;feedback.textContent=error.payload?.reason==='invalid_seals'?'Количество камней изменилось. Повторите обмен.':error.message;}
            finally{pending=false;if(popup.overlay.isConnected)render();}
        };
    }
    render();popup.show();return popup.overlay;
}
