// Custom spirals use fixed reward pools, with an account-wide limit of three free rolls.
const spirals=[
 {name:'newbie',translatedName:'Спираль новичка',piecesForFleeCall:5},
 {name:'common',translatedName:'Обычная спираль',piecesForFleeCall:15},
 {name:'rare',translatedName:'Редкая спираль',piecesForFleeCall:45},
 {name:'royal',translatedName:'Королевская спираль',piecesForFleeCall:85},
 {name:'goddess',translatedName:'Божественная спираль',piecesForFleeCall:120},
];
const odds=[[42,36,15,6,1],[35,33,23,8,1],[25,25,32,17,1],[18,22,38,21,1],[12,18,42,27,1]];
const kinds=[["resource","Ресурсы"],["consumable","Расходники"],["piece","Куски"],["recipe","Рецепты"],["shadow","Теневое +7"]];
const grades=[[["noGrade",.7],["D",.285],["C",.015]],[["D",.4],["C",.6]],[["B",.8],["A",.2]],[["S",1]],[["S80",.85],["S84",.15]]];
const fees=[{gold:600},{gold:2200},{gold:12000,ancientAdena:1500},{gold:50000},{gold:250000,luckCoins:5}];
export default spirals.map((s,i)=>({...s,needLvl:[5,20,52,76,80][i],freeSpins:0,gradesForSpin:grades[i].map(([value,chance])=>({value,chance})),spinCost:fees[i],materialCost:i===3?{crystal_S:10}:{},rewards:kinds.map(([kind,label],j)=>({kind,label,chance:odds[i][j]}))}));
