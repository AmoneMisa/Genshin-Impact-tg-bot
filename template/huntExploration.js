// Local room adaptation, not original L2 world coordinates or geodata.
export const HUNT_EXPLORATION = Object.freeze([
  {
    "id": "plains-of-dion",
    "names": [
      "Межа у полей",
      "У деревянных башен",
      "Сад за изгородью"
    ]
  },
  {
    "id": "cruma-marshlands",
    "names": [
      "Болотная тропа",
      "Затопленные корни",
      "У каменных обломков"
    ]
  },
  {
    "id": "sea-of-spores",
    "names": [
      "Пепельная поляна",
      "Круг грибных исполинов",
      "У разрушенного пилона"
    ]
  },
  {
    "id": "cruma-tower",
    "names": [
      "Входной зал",
      "Галерея механизмов",
      "У разбитого ядра"
    ]
  },
  {
    "id": "garden-of-eva",
    "names": [
      "Подводная галерея",
      "Терраса раковин",
      "У затонувшего святилища"
    ]
  },
  {
    "id": "cemetery",
    "names": [
      "Дорога кладбища",
      "У забытой часовни",
      "Аллея надгробий"
    ]
  },
  {
    "id": "valley-of-saints",
    "names": [
      "Каменная долина",
      "У расколотой статуи",
      "Золотистый уступ"
    ]
  },
  {
    "id": "tower-of-insolence",
    "names": [
      "Нижняя галерея",
      "Зал высоких арок",
      "Балкон над облаками"
    ]
  },
  {
    "id": "primeval-isle",
    "names": [
      "Джунглевая тропа",
      "У корней исполина",
      "Папоротниковая низина"
    ]
  },
  {
    "id": "imperial-tomb",
    "names": [
      "Погребальный проход",
      "Зал каменных стражей",
      "Преддверие усыпальницы"
    ]
  },
  {
    "id": "hot-springs",
    "names": [
      "Тропа у источников",
      "Красные минеральные чаши",
      "У жёлтого источника"
    ]
  },
  {
    "id": "blazing-swamp",
    "names": [
      "Обугленная поляна",
      "У горящего ствола",
      "Над лавовыми протоками"
    ]
  },
  {
    "id": "outlaw-forest",
    "names": [
      "Лесная дорога",
      "У старого дозора",
      "Поляна под соснами"
    ]
  },
  {
    "id": "wall-of-argos",
    "names": [
      "Каменный проход",
      "У скалы с нишей",
      "У светлого святилища"
    ]
  },
  {
    "id": "varka-outpost",
    "names": [
      "У ворот лагеря",
      "У скалы с рогами",
      "Тропа за частоколом"
    ]
  },
  {
    "id": "ketra-outpost",
    "names": [
      "У ворот заставы",
      "У костров гарнизона",
      "За сторожевыми вышками"
    ]
  },
  {
    "id": "monastery-of-silence",
    "names": [
      "Монастырский проход",
      "Галерея витражей",
      "Зал высоких сводов"
    ]
  },
  {"id":"talking-island","names":["Дорога у рощи","У каменной ограды","Лесная опушка"]},
  {"id":"elven-fields","names":["Зелёная поляна","У старой арки","Под сенью ветвей"]},
  {"id":"marsh-zombies","names":["Тропа среди топей","У мшистого ствола","Кромка стоячей воды"]},
  {"id":"dark-forest","names":["Сумрачная тропа","У переплетённых корней","Каменная низина"]},
  {"id":"turek-orcs","names":["Подступы к лагерю","У деревянных тотемов","За частоколом"]},
  {"id":"vuku-lands","names":["Земляная тропа","У тёмных камней","Опушка низины"]},
  {"id":"brekas-stronghold","names":["Тропа среди холмов","У старых деревьев","Каменистый склон"]},
  {"id":"bee-hive","names":["Тропа у пасеки","У каменной ограды","Луговая поляна"]},
  {"id":"alligator-beach","names":["Илистый берег","У камышовой заводи","Пальмовая отмель"]},
  {"id":"timak-outpost","names":["Подступы к заставе","У дерева с тотемами","За деревянной оградой"]},
  {"id":"plains-of-glory","names":["Открытая равнина","У скального склона","Тропа среди лугов"]},
  {"id":"fields-of-massacre","names":["Тропа между елями","У старой стены","Каменистая поляна"]},
  {"id":"swamp-of-screams","names":["Сухая болотная тропа","У кольцевой заводи","Мшистая низина"]},
]);
const zones=new Map(HUNT_EXPLORATION.map(zone=>[zone.id,zone]));
export const explorationZone=id=>zones.get(id)||null;
export function explorationSection(zoneId,roomId='r0c0'){
 const zone=explorationZone(zoneId),match=/^r(\d+)c(\d+)$/.exec(roomId);
 if(!zone||!match)return null;
 const index=(Number(match[1])*2+Number(match[2]))%zone.names.length;
 return {index,name:zone.names[index],asset:index?zone.id+'-area-'+index:null};
}
