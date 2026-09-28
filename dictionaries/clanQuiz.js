/**
 * Pool of daily clan quiz questions (Genshin-themed).
 * Each entry: { question, options: [...], answer: <index into options> }.
 *
 * The daily scheduler (resetClanQuizzes.js) rotates clan.quiz.questionIndex
 * over this array, so keep answers stable — don't reorder options of an
 * existing question without also updating its `answer`.
 */
export default [
    { question: "Из какого региона родом Кэ Цин?", options: ["Мондштадт", "Ли Юэ", "Инадзума", "Сумеру"], answer: 1 },
    { question: "Какой стихией управляет Кли?", options: ["Пиро", "Гидро", "Электро", "Крио"], answer: 0 },
    { question: "Как зовут путешественника-барда в Мондштадте?", options: ["Дилюк", "Венти", "Кэйа", "Беннет"], answer: 1 },
    { question: "Какое оружие использует Гань Юй?", options: ["Меч", "Клеймор", "Копьё", "Лук"], answer: 3 },
    { question: "Кто из этих персонажей — Архонт Гео?", options: ["Чжун Ли", "Райдэн", "Нахида", "Фурина"], answer: 0 },
    { question: "Какая валюта используется для молитв (баннеров)?", options: ["Мора", "Примогемы", "Камни судьбы", "Очки славы"], answer: 1 },
    { question: "Как называется столица региона Инадзума?", options: ["Мондштадт", "Ли Юэ", "Наруками", "Сумеру"], answer: 2 },
    { question: "Какой стихией управляет Хутао?", options: ["Гидро", "Пиро", "Анемо", "Гео"], answer: 1 },
    { question: "Сколько всего стихий (элементов) в Genshin Impact?", options: ["5", "6", "7", "8"], answer: 2 },
    { question: "Как зовут маленького компаньона-путешественника?", options: ["Паймон", "Тевкр", "Ци-Ци", "Дона"], answer: 0 },
    { question: "Какой Архонт правит Сумеру?", options: ["Венти", "Нахида", "Райдэн", "Чжун Ли"], answer: 1 },
    { question: "Какое оружие носит Дилюк?", options: ["Лук", "Катализатор", "Клеймор", "Копьё"], answer: 2 },
    { question: "Реакция «Перегрузка» возникает при сочетании Пиро и...", options: ["Гидро", "Крио", "Электро", "Анемо"], answer: 2 },
    { question: "Из какого региона родом Аято и Аяка Камисато?", options: ["Ли Юэ", "Мондштадт", "Инадзума", "Фонтейн"], answer: 2 },
    { question: "Какой Архонт правит Фонтейном?", options: ["Фурина", "Нахида", "Венти", "Райдэн"], answer: 0 }
];
