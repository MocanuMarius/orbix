// Five flights per map; the campaign difficulty tier is a separate value.
const ROW_LEVELS = [1, 2, 2, 3, 4, 4, 5];
const GAP_SCALES = [1, .97, .94, .91, .88];
const GAP_REDUCTIONS = [0, .03, .06, .09, .12];
const LABELS = ['WIDER PASSAGES', 'TIGHTER PASSAGES', 'TIGHTER PASSAGES', 'DEEP ASCENT', 'FINAL TRIAL'];

export function getAscentInfo(nodeOrRow = 0, tutorial = false) {
  const node = nodeOrRow && typeof nodeOrRow === 'object' ? nodeOrRow : null;
  const raw = Number(node ? node.row ?? 0 : nodeOrRow);
  const isTutorial = Boolean(tutorial || node?.isTutorial || node?.tutorialLesson);
  const row = !isTutorial && node?.type === 'finale' ? 6 : Math.max(0, Math.min(6, Math.floor(Number.isFinite(raw) ? raw : 0)));
  const isSupport = node ? node.type === 'support' : row === 1 || row === 4;
  const difficulty = Math.max(1, Math.floor(Number(node?.difficulty) || 1));
  const difficultyPressure = Math.min(.10, (difficulty - 1) * .02);
  const difficultyGapScale = 1 - difficultyPressure;
  const draftForceScale = 1 + Math.min(.20, (difficulty - 1) * .04);
  if (isTutorial) return {
    row, level: 0, total: 5, label: 'PRACTICE', challengeLabel: 'LEARN THE RHYTHM',
    riskSummary: 'GENTLE PRACTICE', isTutorial: true, isSupport, isUpcoming: isSupport,
    isFinal: false, completedFlights: 0, nextLevel: null, nextLabel: null,
    hardGapScale: 1, hardGapReduction: 0, requestedHardWindows: 0,
    difficulty: 1, difficultyPressure: 0, difficultyGapScale: 1, draftForceScale: 1,
  };
  const pressureLevel = ROW_LEVELS[row];
  const level = Math.max(1, Math.floor(Number(node?.flightNumber) || pressureLevel));
  const nextLevel = isSupport ? level : node?.type === 'finale' ? null : level + 1;
  return {
    row, level, total: null, label: `FLIGHT ${level}`, challengeLabel: LABELS[pressureLevel - 1],
    riskSummary: LABELS[pressureLevel - 1], isTutorial: false, isSupport, isUpcoming: isSupport,
    isFinal: node?.type === 'finale' || row === 6, completedFlights: level - 1,
    nextLevel, nextLabel: nextLevel === null ? null : `FLIGHT ${nextLevel}`,
    hardGapScale: Math.max(.78, GAP_SCALES[pressureLevel - 1] * difficultyGapScale),
    hardGapReduction: 1 - Math.max(.78, GAP_SCALES[pressureLevel - 1] * difficultyGapScale),
    difficulty, difficultyPressure, difficultyGapScale, draftForceScale,
    requestedHardWindows: pressureLevel === 1 ? 1 : pressureLevel < 4 ? 2 : 3,
  };
}
