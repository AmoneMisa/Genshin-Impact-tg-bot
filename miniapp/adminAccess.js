import {myId} from '../config.js';

export const isOwner = userId => myId!=null && String(userId)===String(myId);
export const canUnstack = status => status==='administrator'||status==='creator';

export function unstackGame(text){
 const command=/^\/(\w+)(?:@\w+)?(?:\s+(\w+))?\s*$/i.exec(String(text||''));
 if(!command)return null;
 if(command[1]==='reset_point_game')return 'reset_point';
 if(command[1]==='reset_elements_game')return 'reset_elements';
 if(command[1]==='unstack')return command[2]==='21'?'reset_point':command[2]==='elements'?'reset_elements':null;
 return null;
}
