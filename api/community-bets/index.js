export default async function handler(req, res) {
  const roundDuration = 60 * 1000;
  const currentDrawId = String(Math.floor(Date.now() / roundDuration));
  const timeRemaining = 60 - Math.floor((Date.now() % roundDuration) / 1000);

  // Generate deterministic/pseudo virtual players based on currentDrawId and time
  const names = [
    'Abebe B.', 'Almaz K.', 'Dawit T.', 'Selam W.', 'Tewodros M.',
    'Bethlehem A.', 'Yonas G.', 'Marta H.', 'Ephrem S.', 'Hiwot T.',
    'Biniam Z.', 'Rahel D.', 'Kidus M.', 'Samrawit L.', 'Natnael F.'
  ];

  const bets = [];
  const count = 15 + (Math.floor(Date.now() / 3500) % 10);

  for (let i = 0; i < count; i++) {
    const seed = (parseInt(currentDrawId, 10) || 1000) * 100 + i;
    const name = names[i % names.length];
    const picksCount = 2 + (seed % 6);
    const chosen = [];
    while (chosen.length < picksCount) {
      const n = ((seed * 7 + chosen.length * 13 + i * 3) % 80) + 1;
      if (!chosen.includes(n)) chosen.push(n);
    }
    chosen.sort((a, b) => a - b);
    const stake = [2, 5, 10, 20, 50][seed % 5];

    bets.push({
      id: `cb_${currentDrawId}_${i}`,
      userName: name,
      userMasked: `${name.slice(0, 3)}***`,
      chosenNumbers: chosen,
      stake,
      timestamp: new Date().toTimeString().split(' ')[0],
    });
  }

  return res.status(200).json({
    drawId: currentDrawId,
    currentDrawId,
    timeRemaining,
    totalCount: 750 + (parseInt(currentDrawId, 10) % 200),
    bets,
  });
}
