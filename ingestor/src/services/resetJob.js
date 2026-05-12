const { resetData } = require('@parking/shared');

// Reset PERIÓDICO: só limpa o banco. Não toca no simulador para preservar
// faults injetados pelo operador (FLAPPING/STUCK/fill seguem ativos
// até o operador desfazer com mode=normal).
async function runReset({ log }) {
  log('reset: truncating data tables + reseeding spots...');
  await resetData();
  log('reset: db cleaned (simulator faults preserved)');
}

module.exports = { runReset };
