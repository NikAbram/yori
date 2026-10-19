import type { Category, Product } from "@/types/catalog";

export const categories: Category[] = [
  { slug: "sets", name: "Сеты", shortName: "Сеты", eyebrow: "Для компании" },
  { slug: "classic", name: "Классические роллы", shortName: "Классика", eyebrow: "Знакомый вкус" },
  { slug: "maki", name: "Маки", shortName: "Маки", eyebrow: "Лаконично" },
  { slug: "baked", name: "Запечённые роллы", shortName: "Запечённые", eyebrow: "Горячая подача" },
  { slug: "tempura", name: "Темпура", shortName: "Темпура", eyebrow: "Хруст снаружи" },
  { slug: "sushi", name: "Суши", shortName: "Суши", eyebrow: "Рыба в фокусе" },
  { slug: "soups-snacks", name: "Супы и закуски", shortName: "Закуски", eyebrow: "К заказу" },
  { slug: "drinks", name: "Напитки", shortName: "Напитки", eyebrow: "Освежиться" },
];

const image = (name: string) => `/images/products/${name}.webp`;

export const products: Product[] = [
  {
    id: "p01", slug: "philadelphia-classic", category: "classic", name: "Филадельфия классическая",
    description: "Нежный лосось и сливочный сыр — чистая, спокойная классика.",
    ingredients: ["лосось", "сливочный сыр", "огурец", "рис", "нори"], allergens: ["рыба", "молоко"],
    image: image("salmon-roll-dark"), imageAlt: "Роллы с лососем на тёмной керамической тарелке", priceKopeks: 64900,
    weightGrams: 240, piecesCount: 8, badge: "Хит", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 1,
  },
  {
    id: "p02", slug: "philadelphia-eel", category: "classic", name: "Филадельфия с угрём",
    description: "Копчёный угорь, лосось и мягкий сыр под тонкой линией унаги.",
    ingredients: ["лосось", "угорь", "сливочный сыр", "огурец", "унаги", "рис", "нори"], allergens: ["рыба", "молоко", "соя", "кунжут"],
    image: image("unagi-nigiri"), imageAlt: "Суши с глазированным угрём на светлой тарелке", priceKopeks: 73900,
    weightGrams: 230, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 2,
  },
  {
    id: "p03", slug: "california-crab", category: "classic", name: "Калифорния с крабом",
    description: "Сочный крабовый микс, авокадо и хрустящий огурец в икре масаго.",
    ingredients: ["крабовый микс", "авокадо", "огурец", "масаго", "рис", "нори"], allergens: ["ракообразные", "яйцо"],
    image: image("creamy-salmon-roll"), imageAlt: "Роллы с кремовой шапочкой и овощами", priceKopeks: 49900,
    weightGrams: 210, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 3,
  },
  {
    id: "p04", slug: "california-shrimp", category: "classic", name: "Калифорния с креветкой",
    description: "Креветка, авокадо и огурец в лёгкой обсыпке из масаго.",
    ingredients: ["креветка", "авокадо", "огурец", "масаго", "рис", "нори"], allergens: ["ракообразные", "яйцо"],
    image: image("nigiri-assortment"), imageAlt: "Ассорти свежих суши с рыбой и креветкой", priceKopeks: 56900,
    weightGrams: 220, piecesCount: 8, badge: "Новинка", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 4,
  },
  {
    id: "p05", slug: "bonito-salmon", category: "classic", name: "Бонито с лососем",
    description: "Лосось, сливочный сыр и огурец под дымной стружкой тунца.",
    ingredients: ["лосось", "сливочный сыр", "огурец", "стружка тунца", "рис", "нори"], allergens: ["рыба", "молоко"],
    image: image("salmon-roll-dark"), imageAlt: "Роллы с лососем и зеленью на чёрной тарелке", priceKopeks: 45900,
    weightGrams: 215, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 5,
  },
  {
    id: "p06", slug: "canada", category: "classic", name: "Канада",
    description: "Угорь поверх ролла с лососем, сыром и огурцом; соус унаги и кунжут.",
    ingredients: ["угорь", "лосось", "сливочный сыр", "огурец", "унаги", "кунжут", "рис", "нори"], allergens: ["рыба", "молоко", "соя", "кунжут"],
    image: image("unagi-nigiri"), imageAlt: "Ломтики угря с соусом и кунжутом", priceKopeks: 72900,
    weightGrams: 245, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 6,
  },
  {
    id: "p07", slug: "chicken-unagi-roll", category: "classic", name: "Ролл с курицей и унаги",
    description: "Курица, сливочный сыр и огурец с насыщенным соусом унаги.",
    ingredients: ["курица", "сливочный сыр", "огурец", "унаги", "кунжут", "рис", "нори"], allergens: ["молоко", "соя", "кунжут"],
    image: image("creamy-salmon-roll"), imageAlt: "Роллы с овощами и кремовым соусом", priceKopeks: 42900,
    weightGrams: 235, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 7,
  },
  {
    id: "p08", slug: "chuka-roll", category: "classic", name: "Ролл с чукой",
    description: "Маринованные водоросли чука, огурец и ореховый соус.",
    ingredients: ["чука", "огурец", "ореховый соус", "кунжут", "рис", "нори"], allergens: ["орехи", "кунжут", "соя"],
    image: image("edamame"), imageAlt: "Зелёная японская закуска в керамической миске", priceKopeks: 39900,
    weightGrams: 195, piecesCount: 8, isAvailable: false, isFeatured: false, isRecommended: false, sortOrder: 8,
  },
  {
    id: "p09", slug: "salmon-maki", category: "maki", name: "Маки с лососем",
    description: "Лосось, рис и нори — три ингредиента без лишних акцентов.",
    ingredients: ["лосось", "рис", "нори"], allergens: ["рыба"],
    image: image("salmon-roll-dark"), imageAlt: "Роллы с лососем на тёмной тарелке", priceKopeks: 32900,
    weightGrams: 120, piecesCount: 6, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 9,
  },
  {
    id: "p10", slug: "cucumber-maki", category: "maki", name: "Маки с огурцом",
    description: "Свежий огурец, кунжут и рис в листе нори.",
    ingredients: ["огурец", "кунжут", "рис", "нори"], allergens: ["кунжут"],
    image: image("creamy-salmon-roll"), imageAlt: "Нарезанные роллы со свежими овощами", priceKopeks: 22900,
    weightGrams: 125, piecesCount: 6, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 10,
  },
  {
    id: "p11", slug: "baked-salmon", category: "baked", name: "Запечённый с лососем",
    description: "Тёплый ролл с лососем, огурцом и румяной сырной шапочкой.",
    ingredients: ["лосось", "сырный соус", "огурец", "унаги", "рис", "нори"], allergens: ["рыба", "молоко", "соя"],
    image: image("baked-roll"), imageAlt: "Горячие запечённые роллы с румяной шапочкой", priceKopeks: 64900,
    weightGrams: 260, piecesCount: 8, badge: "Хит", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 11,
  },
  {
    id: "p12", slug: "baked-crab", category: "baked", name: "Запечённый с крабом",
    description: "Крабовый микс и огурец под горячим сливочным соусом.",
    ingredients: ["крабовый микс", "сырный соус", "огурец", "масаго", "рис", "нори"], allergens: ["ракообразные", "яйцо", "молоко"],
    image: image("baked-roll"), imageAlt: "Порция горячих запечённых роллов", priceKopeks: 48900,
    weightGrams: 250, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 12,
  },
  {
    id: "p13", slug: "baked-eel", category: "baked", name: "Запечённый с угрём",
    description: "Угорь и сливочный сыр под запечённым соусом и кунжутом.",
    ingredients: ["угорь", "сливочный сыр", "сырный соус", "унаги", "кунжут", "рис", "нори"], allergens: ["рыба", "молоко", "соя", "кунжут"],
    image: image("baked-roll"), imageAlt: "Запечённые роллы с соусом на керамической тарелке", priceKopeks: 68900,
    weightGrams: 250, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 13,
  },
  {
    id: "p14", slug: "shrimp-tempura", category: "tempura", name: "Темпура с креветкой",
    description: "Креветка и авокадо в хрустящей темпуре, подаём с унаги.",
    ingredients: ["креветка", "авокадо", "темпура", "унаги", "рис", "нори"], allergens: ["ракообразные", "глютен", "соя"],
    image: image("tempura-roll"), imageAlt: "Хрустящие роллы темпура с соусом", priceKopeks: 59900,
    weightGrams: 240, piecesCount: 8, badge: "Новинка", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 14,
  },
  {
    id: "p15", slug: "chicken-tempura", category: "tempura", name: "Темпура с курицей",
    description: "Сочная курица, огурец и сыр в тонкой хрустящей корочке.",
    ingredients: ["курица", "сливочный сыр", "огурец", "темпура", "рис", "нори"], allergens: ["глютен", "молоко"],
    image: image("tempura-roll"), imageAlt: "Нарезанный горячий ролл в хрустящей панировке", priceKopeks: 47900,
    weightGrams: 250, piecesCount: 8, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 15,
  },
  {
    id: "p16", slug: "salmon-nigiri", category: "sushi", name: "Нигири с лососем",
    description: "Два ломтика охлаждённого лосося на подушке из риса.",
    ingredients: ["лосось", "рис"], allergens: ["рыба"],
    image: image("nigiri-assortment"), imageAlt: "Нигири со свежим лососем крупным планом", priceKopeks: 31900,
    weightGrams: 90, piecesCount: 2, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 16,
  },
  {
    id: "p17", slug: "eel-nigiri", category: "sushi", name: "Нигири с угрём",
    description: "Глазированный угорь на рисе с унаги и кунжутом.",
    ingredients: ["угорь", "рис", "унаги", "кунжут"], allergens: ["рыба", "соя", "кунжут"],
    image: image("unagi-nigiri"), imageAlt: "Два нигири с глазированным угрём", priceKopeks: 34900,
    weightGrams: 95, piecesCount: 2, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 17,
  },
  {
    id: "p18", slug: "set-for-two", category: "sets", name: "Сет «На двоих»",
    description: "Филадельфия, Калифорния с креветкой и маки с огурцом.",
    ingredients: ["Филадельфия — 8 шт.", "Калифорния с креветкой — 8 шт.", "маки с огурцом — 8 шт."], allergens: ["рыба", "ракообразные", "молоко", "кунжут"],
    image: image("sushi-set"), imageAlt: "Разнообразный сет свежих роллов на подносе", priceKopeks: 159000,
    weightGrams: 700, piecesCount: 24, badge: "Хит", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 18,
  },
  {
    id: "p19", slug: "set-favorite", category: "sets", name: "Сет «Фаворит»",
    description: "Филадельфия, Канада, запечённый с крабом и маки с лососем.",
    ingredients: ["Филадельфия — 8 шт.", "Канада — 8 шт.", "запечённый с крабом — 8 шт.", "маки с лососем — 8 шт."], allergens: ["рыба", "ракообразные", "молоко", "соя", "кунжут"],
    image: image("sushi-set"), imageAlt: "Большой сет роллов с лососем и соусами", priceKopeks: 219000,
    weightGrams: 950, piecesCount: 32, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 19,
  },
  {
    id: "p20", slug: "set-large", category: "sets", name: "Сет «Большой»",
    description: "Шесть роллов: классические, запечённые и темпура — на большую компанию.",
    ingredients: ["Филадельфия — 8 шт.", "Калифорния — 8 шт.", "Канада — 8 шт.", "два запечённых ролла — 16 шт.", "темпура — 8 шт."], allergens: ["рыба", "ракообразные", "молоко", "глютен", "соя", "кунжут"],
    image: image("sushi-set"), imageAlt: "Праздничный сет из разных видов суши и роллов", priceKopeks: 339000,
    weightGrams: 1450, piecesCount: 48, isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 20,
  },
  {
    id: "p21", slug: "miso-soup", category: "soups-snacks", name: "Мисо-суп",
    description: "Лёгкий бульон мисо с тофу, вакаме и зелёным луком.",
    ingredients: ["мисо-бульон", "тофу", "вакаме", "зелёный лук"], allergens: ["соя"],
    image: image("miso-soup"), imageAlt: "Мисо-суп с тофу и зеленью в керамической чаше", priceKopeks: 28900,
    weightGrams: 300, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 21,
  },
  {
    id: "p22", slug: "tom-yum-shrimp", category: "soups-snacks", name: "Том-ям с креветкой",
    description: "Пряный кокосовый бульон с креветкой, грибами и томатами.",
    ingredients: ["креветка", "кокосовое молоко", "грибы", "томаты", "лемонграсс", "лайм"], allergens: ["ракообразные"],
    image: image("miso-soup"), imageAlt: "Пряный суп с креветками и зеленью", priceKopeks: 56900,
    weightGrams: 350, badge: "Новинка", isAvailable: true, isFeatured: true, isRecommended: false, sortOrder: 22,
  },
  {
    id: "p23", slug: "edamame", category: "soups-snacks", name: "Эдамаме",
    description: "Тёплые соевые бобы с морской солью и каплей кунжутного масла.",
    ingredients: ["бобы эдамаме", "морская соль", "кунжутное масло"], allergens: ["соя", "кунжут"],
    image: image("edamame"), imageAlt: "Свежие бобы эдамаме с солью в миске", priceKopeks: 24900,
    weightGrams: 150, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 23,
  },
  {
    id: "p24", slug: "berry-mors", category: "drinks", name: "Морс ягодный",
    description: "Домашний морс из клюквы и чёрной смородины, умеренно сладкий.",
    ingredients: ["клюква", "чёрная смородина", "вода", "сахар"], allergens: [],
    image: image("berry-drink"), imageAlt: "Холодный ягодный напиток со льдом", priceKopeks: 16900,
    volumeMl: 500, isAvailable: true, isFeatured: false, isRecommended: true, sortOrder: 24,
  },
  {
    id: "p25", slug: "lemonade", category: "drinks", name: "Лимонад",
    description: "Цитрусовый лимонад с лимоном, лаймом и свежей мятой.",
    ingredients: ["лимон", "лайм", "мята", "вода", "сахар"], allergens: [],
    image: image("lemonade"), imageAlt: "Цитрусовый лимонад со льдом и лимоном", priceKopeks: 19900,
    volumeMl: 500, isAvailable: true, isFeatured: false, isRecommended: false, sortOrder: 25,
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function getCategoryName(slug: Product["category"]) {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}
