// Depth within one five-flight climb. This is not an endless difficulty tier.
const ROW_LEVELS = [1, 2, 2, 3, 4, 4, 5];
const GAP_SCALES = [1, .97, .94, .91, .88];
const GAP_REDUCTIONS = [0, .03, .06, .09, .12];
const LABELS = ['WIDER PASSAGES', 'TIGHTER PASSAGES', 'TIGHTER PASSAGES', 'DEEP ASCENT', 'FINAL TRIAL'];

export function getAscentInfo(nodeOrRow = 0, tutorial = false) {
  const node = nodeOrRow && typeof nodeOrRow === 'object' ? nodeOrRow : null;
  const raw = Number(node ? node.row ?? 0 : nodeOrRow);
  const isTutorial = Boolean(tutorial || node?.isTutorial || node?.tutorialLesson);
  const row = !isTutorial && node?.type === 'finale' ? 6 : Math.max(0, Math.min(6, Math.floor(Number.isFinite(raw) ? raw : 0)));
  const isSupport = node?.type === 'support' || row === 1 || row === 4;
  if (isTutorial) return {
    row, level: 0, total: 5, label: 'PRACTICE', challengeLabel: 'LEARN THE RHYTHM',
    riskSummary: 'GENTLE PRACTICE', isTutorial: true, isSupport, isUpcoming: isSupport,
    isFinal: false, completedFlights: 0, nextLevel: null, nextLabel: null,
    hardGapScale: 1, hardGapReduction: 0, requestedHardWindows: 0,
  };
  const level = ROW_LEVELS[row], nextLevel = isSupport ? level : level < 5 ? level + 1 : null;
  return {
    row, level, total: 5, label: `ASCENT ${level}/5`, challengeLabel: LABELS[level - 1],
    riskSummary: LABELS[level - 1], isTutorial: false, isSupport, isUpcoming: isSupport,
    isFinal: level === 5, completedFlights: level - 1,
    nextLevel, nextLabel: nextLevel === null ? null : `ASCENT ${nextLevel}/5`,
    hardGapScale: GAP_SCALES[level - 1], hardGapReduction: GAP_REDUCTIONS[level - 1],
    requestedHardWindows: level === 1 ? 1 : level < 4 ? 2 : 3,
  };
}
