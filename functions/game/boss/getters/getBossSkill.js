import bossesTemplate from '../../../../template/bossTemplate.js';
import bossSkillsTemplate from '../../../../template/bossSkillsTemplate.js';
import getRandom from '../../../getters/getRandom.js';

export default function (bossName) {
    let bossTemplate = bossesTemplate.find(boss => boss.name === bossName);
    if (!bossTemplate) {
        throw new Error(`Босса с таким именем не найдено: ${bossName}`);
    }

    let skills = bossTemplate.availableSkills;
    if (!skills?.length) {
        throw new Error(`У босса с именем ${bossName} нет ни одного доступного скилла.`);
    }

    let randomSkill = skills[getRandom(0, skills.length - 1)]
    let skill = bossSkillsTemplate.find(_skill => _skill.effect === randomSkill);
    if (!skill) {
        throw new Error(`Скилл с таким эффектом не найден: ${randomSkill}`);
    }

    return skill;
}