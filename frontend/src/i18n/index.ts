// i18n tayyor struktura: uz (to'liq), ru va en (qisman; yetishmagan kalit uz'dan olinadi).
// Yangi til qo'shish: shu yerga lug'at qo'shing va LANGS'ga yozing.
export type Lang = "uz" | "ru" | "en";

const uz = {
  appName: "Baholash",
  login: "Kirish",
  logout: "Chiqish",
  password: "Parol",
  email: "Email",
  username: "Login",
  loading: "Yuklanmoqda...",
  save: "Saqlash",
  cancel: "Bekor qilish",
  delete: "O'chirish",
  edit: "Tahrirlash",
  add: "Qo'shish",
  close: "Yopish",
  yes: "Ha",
  no: "Yo'q",
  next: "Keyingi",
  back: "Orqaga",
  send: "Yuborish",
  copy: "Nusxa olish",
  copied: "Nusxa olindi",
  darkMode: "Tungi rejim",
  teachers: "O'qituvchilar",
  students: "O'quvchilar",
  questions: "Savollar",
  settings: "Sozlamalar",
  dashboard: "Bosh sahifa",
  schools: "Maktablar",
  subject: "Fan",
  average: "O'rtacha",
  status: "Holat",
  trend: "O'zgarish",
  responses: "Javoblar soni",
  noData: "Ma'lumot yo'q",
  statusGood: "Yaxshi",
  statusAverage: "O'rtacha",
  statusCritical: "Ogohlantirish",
  roleStudent: "O'quvchi",
  roleTeacher: "O'qituvchi",
  roleDirector: "Direktor",
  roleAdmin: "Super admin",
  chooseRole: "Kim sifatida kirasiz?",
};

const ru: Partial<typeof uz> = {
  appName: "Оценка",
  login: "Войти",
  logout: "Выйти",
  password: "Пароль",
  loading: "Загрузка...",
  save: "Сохранить",
  cancel: "Отмена",
  next: "Далее",
  back: "Назад",
  teachers: "Учителя",
  students: "Ученики",
  settings: "Настройки",
};

const en: Partial<typeof uz> = {
  appName: "Baholash",
  login: "Sign in",
  logout: "Sign out",
  password: "Password",
  loading: "Loading...",
  save: "Save",
  cancel: "Cancel",
  next: "Next",
  back: "Back",
  teachers: "Teachers",
  students: "Students",
  settings: "Settings",
};

const dicts: Record<Lang, Partial<typeof uz>> = { uz, ru, en };
export const LANGS: Lang[] = ["uz", "ru", "en"];
export const ACTIVE_LANG: Lang = "uz"; // faol til — o'zbekcha

export type Key = keyof typeof uz;
export function t(key: Key, lang: Lang = ACTIVE_LANG): string {
  return dicts[lang][key] ?? uz[key];
}

export const MONTHS_UZ = [
  "", "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
