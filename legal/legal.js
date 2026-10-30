// Общие реквизиты для всех документов «Мой тренер». Заполняются один раз — подставляются везде.
window.REQ = {
  fio: 'Кочетов Иван Максимович',
  inn: '771570623556',
  status: 'плательщик налога на профессиональный доход (самозанятый)',
  email: 'ncochetow@yandex.ru',
  phone: '',
  tax: 'ИФНС России № 15 по г. Москве',
  since: '19.10.2026',
  site: 'https://ivan552776.github.io/moy-trener/',
  app: 'Мой тренер',
  price: '700 ₽ в месяц',
  trial: '7 дней',
  payment: 'ООО «Продамус» (платёжный сервис Prodamus)',
  server: 'сервер, расположенный на территории Российской Федерации',
  date: '30 октября 2026 г.'
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-r]').forEach(el => { const v = window.REQ[el.dataset.r]; if (v) el.textContent = v; else el.closest('.opt')?.remove(); });
});
