// Общие реквизиты для всех документов «Мой тренер». Заполняются один раз — подставляются везде.
window.REQ = {
  fio: 'Кочетов Иван Максимович',
  inn: '771570623556',
  status: 'плательщик налога на профессиональный доход (самозанятый)',
  email: 'ncochetow@yandex.ru',
  phone: '',
  tax: 'ИФНС России № 15 по г. Москве',
  since: '19.10.2026',
  site: 'https://moytrener-app.ru/',
  app: 'Мой тренер',
  price: '700 ₽ в месяц',
  trial: '7 дней',
  payment: 'ООО «Продамус» (платёжный сервис Prodamus)',
  server: 'сервере хостинг-провайдера RuWeb в Москве (Российская Федерация)',
  date: '1 ноября 2026 г.'
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-r]').forEach(el => { const v = window.REQ[el.dataset.r]; if (v) el.textContent = v; else el.closest('.opt')?.remove(); });
});
