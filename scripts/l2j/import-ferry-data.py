"""Import pinned H5 ferry vessels, vendors and tickets; no authored spawn points."""
import json
import hashlib
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

base = Path(sys.argv[1]) if len(sys.argv) > 1 else next(Path('.tmp/world-source/h5-data').glob('*/L2J*/dist/game/data'))
pin = '9fb01cb20513e55190cdde8d91e41be2c0914f84'
def read_ship(file):
    return (base/'scripts/vehicles'/file).read_text()
def rows(java,name):
    block = re.search(r'VehiclePathPoint\[\]\s+' + name + r'\s*=\s*\{(.*?)\};', java, re.S).group(1)
    return [[int(n.strip()) for n in row.split(',')] for row in re.findall(r'new VehiclePathPoint\(([^)]+)\)', block)]
ships = [
    {'id':'gludin-rune','file':'BoatGludinRune.java','ports':['gludin','rune'],'dockMs':600000,'initialDockMs':480000},
    {'id':'talking-gludin','file':'BoatTalkingGludin.java','ports':['talking-gludin','gludin-talking'],'dockMs':600000,'initialDockMs':480000},
    {'id':'rune-primeval','file':'BoatRunePrimeval.java','ports':['rune-primeval','primeval-rune'],'dockMs':180000,'initialDockMs':180000},
]
paths={}
for ship in ships:
    ship['java']=read_ship(ship['file'])
    ship['pathKeys']={}
    for name in re.findall(r'VehiclePathPoint\[\]\s+(\w+)\s*=',ship['java']):
        values=rows(ship['java'],name)
        key=name if name not in paths or paths[name]==values else ship['id']+':'+name
        paths[key]=values;ship['pathKeys'][name]=key
    if ship['id']=='rune-primeval':
        paths['PRIMEVAL_DOCK']=[paths['RUNE_TO_PRIMEVAL'][-1]]
        ship['pathKeys']['PRIMEVAL_DOCK']='PRIMEVAL_DOCK'
prices = ET.parse(base / 'MerchantPriceConfig.xml').getroot()
default_price = next(p for p in prices if p.get('id') == prices.get('defaultPriceConfig'))
ports = {}
tickets = {}
configurations=[
 ('gludin','gludin',30387,7905,'Порт Глудина','gludin-rune','rune','GLUDIN_DOCK',['GLUDIN_TO_RUNE','RUNE_DOCK']),
 ('rune','rune',31351,7904,'Порт Руны','gludin-rune','gludin','RUNE_DOCK',['RUNE_TO_GLUDIN','GLUDIN_DOCK']),
 ('talking-gludin','talking-island-village',30047,1074,'Говорящий остров → Глудин','talking-gludin','gludin-talking','TALKING_DOCK',['TALKING_TO_GLUDIN','GLUDIN_DOCK']),
 ('gludin-talking','gludin',30387,1075,'Глудин → Говорящий остров','talking-gludin','talking-gludin','GLUDIN_DOCK',['GLUDIN_TO_TALKING','TALKING_DOCK']),
 ('rune-primeval','rune',31351,8925,'Руна → Первобытный остров','rune-primeval','primeval-rune','RUNE_DOCK',['RUNE_TO_PRIMEVAL']),
 ('primeval-rune','rune',32106,8924,'Первобытный остров → Руна','rune-primeval','rune-primeval','PRIMEVAL_DOCK',['PRIMEVAL_TO_RUNE','RUNE_DOCK']),
]
for port_id,city,npc_id,ticket_id,title,vessel,destination,dock_name,path_names in configurations:
    ship=next(ship for ship in ships if ship['id']==vessel);java=ship['java']
    path_names=[ship['pathKeys'][name] for name in path_names]
    dock_key=ship['pathKeys'][dock_name]
    spawn = None
    for file in (base / 'spawns').rglob('*.xml'):
        for npc in ET.parse(file).iter('npc'):
            if npc.get('id') == str(npc_id) and npc.get('x') is not None:
                assert spawn is None, 'ambiguous vendor spawn'
                spawn = {k:int(npc.get(k)) for k in ['x','y','z']}
                spawn['source'] = file.relative_to(base).as_posix()
    assert spawn
    definition = next(n for n in ET.parse(base/'stats/npcs'/f'{npc_id//100*100:05}-{npc_id//100*100+99:05}.xml').getroot() if n.get('id')==str(npc_id))
    assert not any(p.get('name') == 'PriceConfig' for p in definition.iter('param'))
    # These wharf managers are below/outside all priced TownZone volumes.
    for file in (base/'zones').glob('*.xml'):
        for zone in ET.parse(file).getroot():
            if not zone.get('id') or zone.get('id') not in {p.get('zoneId') for p in prices}: continue
            nodes = list(zone.iter('node'))
            if not nodes: continue
            xs=[int(n.get('X')) for n in nodes];ys=[int(n.get('Y')) for n in nodes]
            inside = min(xs)<=spawn['x']<=max(xs) and min(ys)<=spawn['y']<=max(ys) and int(zone.get('minZ'))<=spawn['z']<=int(zone.get('maxZ'))
            assert not inside, 'vendor needs explicit priced-zone resolution'
    item = next(n for n in ET.parse(base/'stats/items'/f'{ticket_id//100*100:05}-{ticket_id//100*100+99:05}.xml').getroot() if n.get('id')==str(ticket_id))
    props = {n.get('name'):n.get('val') for n in item.findall('set')}
    buylist = ET.parse(base/'buylists'/f'{npc_id}00.xml').getroot()
    stock = next(n for n in buylist.findall('item') if n.get('id')==str(ticket_id))
    price = int(stock.get('price', props['price']))
    tax = int(default_price.get('baseTax'))
    tickets[str(ticket_id)] = {'id':ticket_id,'name':item.get('name'),'icon':props['icon'],'price':int(props['price']),'weight':int(props['weight']),'type':'EtcItem','grade':'NONE','etc':'ticket'}
    oust = [int(v) for v in re.search(r'payForRide\('+str(ticket_id)+r',\s*1,\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\)',java).groups()]
    ports[port_id] = {'id':port_id,'vessel':vessel,'destination':destination,'pathNames':path_names,'harbor':dock_name,'name':title,'city':city,'vendor':{**spawn,'npcId':npc_id,'name':definition.get('name')},'dock':dict(zip(['x','y','z'],paths[dock_key][0][:3])),'oust':dict(zip(['x','y','z'],oust)),'ticket':ticket_id,'buylist':f'buylists/{npc_id}00.xml','ticketPrice':price*(100+tax)//100,'priceConfig':dict(default_price.attrib)}
    if port_id=='primeval-rune':ports[port_id]['island']='primeval-isle'
source_files = [*[base/'scripts/vehicles'/ship['file'] for ship in ships], base/'MerchantPriceConfig.xml', base/'zones/custom_town.xml', base/'stats/items/07900-07999.xml',base/'stats/items/01000-01099.xml', *[base/p['vendor']['source'] for p in ports.values()], *[base/p['buylist'] for p in ports.values()]]
source_files += [base/'stats/items/08900-08999.xml',base/'teleporters/town/31320.xml']
entry_file=base/'teleporters/town/31320.xml'
entry=next(n for n in ET.parse(entry_file).iter('location') if n.get('name')=='Primeval Isle Wharf')
entry_source={'file':entry_file.relative_to(base).as_posix(),'npcId':31320,'type':'NORMAL','name':entry.get('name')}
keeper=next(n for n in ET.parse(base/'stats/npcs/31300-31399.xml').getroot() if n.get('id')=='31320')
entrances={'primeval-isle':{**{k:int(entry.get(k)) for k in ['x','y','z']},'teleportGold':int(entry.get('feeCount')),'entrySource':entry_source,'entryRoutes':[{'npcId':31320,'npcName':keeper.get('name'),'type':'NORMAL','item':57,'fee':int(entry.get('feeCount')),'source':entry_source}]}}
data = {'source':{'commit':pin,'file':'scripts/vehicles/BoatGludinRune.java','boardingSource':'RequestGetOnVehicle.java','boardingRadius':1000,'vendorInteractionRadius':250,'files':{p.relative_to(base).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files}},'dockMs':600000,'vessels':[{k:v for k,v in ship.items() if k not in ['java','pathKeys']} for ship in ships],'ports':ports,'paths':paths}
Path('template/ferryData.js').write_text('// Original H5 vessel and wharf data. Generated by scripts/l2j/import-ferry-data.py.\n// L2J Mobius GPL-3.0; source revision is included below.\nexport default '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
Path('template/ferryTickets.js').write_text('// Original H5 item definitions; generated by scripts/l2j/import-ferry-data.py.\nexport const FERRY_TICKETS='+json.dumps(tickets,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
Path('template/nativeIslandEntries.js').write_text('// Original H5 island entrance; generated by scripts/l2j/import-ferry-data.py.\nexport default '+json.dumps(entrances,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'Imported {len(ships)} original vessels, {len(ports)} departures, {len(tickets)} tickets')
