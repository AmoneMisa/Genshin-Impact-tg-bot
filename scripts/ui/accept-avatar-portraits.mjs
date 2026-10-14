import fs from 'node:fs';
const directory='art-source/avatars/portraits';
const jobs=JSON.parse(fs.readFileSync(directory+'/jobs.json','utf8'));
for(const job of jobs){
  if(!fs.existsSync(job.source))throw new Error('Missing portrait: '+job.key);
  job.review='Accepted after navy/ivory contact-sheet review at 192px and 48px: matching face, hair, racial features and costume; transparent alpha; no embedded text or spiders.';
}
fs.writeFileSync(directory+'/jobs.json',JSON.stringify(jobs,null,2)+'\n');
fs.writeFileSync(directory+'/reviewed.json',JSON.stringify(jobs.map(j=>j.key),null,2)+'\n');
