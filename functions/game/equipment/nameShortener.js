export default function (phrase) {
    const replacements = [
        { full: 'noGrade', short: 'NG' },
        { full: 'Обычное', short: 'об.' },
        { full: 'Необычное', short: 'необ.' },
        { full: 'Особое', short: 'ос.' },
        { full: 'Редкое', short: 'ред.' },
        { full: 'Королевское', short: 'кор.' },
        { full: 'Магическое', short: 'маг.' },
        { full: 'Божественное', short: 'бож.' },
        { full: 'Сломано', short: 'слом.' },
        { full: 'Grade', short: '' }
    ];

    function shortenPart(part) {
        for (const rule of replacements) {
            if (part.includes(rule.full)) {
                return part.replace(rule.full, rule.short).trim();
            }
        }

        return part;
    }

    function shortenItemName(itemName) {
        const nameParts = itemName.split(' ');

        if (nameParts.includes('щит')) {
            if (nameParts[0] === 'Маленький') {
                return `М. щит`;
            } else if (nameParts[0] === 'Большой') {
                return `Б. щит`;
            }
        } else if (nameParts.includes('сигил')) {
            if (nameParts[0] === 'Маленький') {
                return `М. сигил`;
            } else if (nameParts[0] === 'Большой') {
                return `Б. сигил`;
            }
        }

        return nameParts[0];
    }

    const parts = phrase.split(' - ');
    let grade = shortenPart(parts[0]);
    const qualityAndItem = parts[1].split(') ');
    const quality = shortenPart(qualityAndItem[0]);
    const itemName = shortenItemName(qualityAndItem[1]);

    const itemWithoutNumbers = itemName.replace(/\d+/g, '').trim();
    return `${grade}, ${quality}) ${itemWithoutNumbers}`.trim();
}
