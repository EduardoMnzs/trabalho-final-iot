// Curva diária de chegadas (eventos FREE→OCCUPIED por hora simulada por setor).
// 24 buckets de hora; valores são lambdas relativos (taxa em "chegadas por hora simulada por vaga vazia").
// Picos: 08-10 e 17-19. Vale: madrugada.
const ARRIVALS_PER_HOUR = [
  0.0, 0.0, 0.0, 0.0, 0.0, 0.1,  // 00-05
  0.4, 1.5, 4.0, 5.0, 4.0, 2.0,  // 06-11
  3.0, 4.0, 3.0, 2.0, 2.5, 5.0,  // 12-17
  4.5, 3.0, 1.5, 0.8, 0.3, 0.1,  // 18-23
];

function lambdaForHour(simDate) {
  const h = simDate.getUTCHours();
  return ARRIVALS_PER_HOUR[h] || 0;
}

module.exports = { lambdaForHour };
