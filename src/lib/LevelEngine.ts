export type SymbolType = 
  | 'CircleFilled' 
  | 'CircleEmpty' 
  | 'TriangleUp' 
  | 'TriangleDown'
  | 'Mul2'
  | 'Div2'
  | 'Prev1'
  | 'Prev2'
  | 'ReverseNext'
  | 'Star'
  | 'InvertAll'
  | 'Heart'
  | 'Plus'; 

export const getCheckpointForLevel = (level: number): number => {
  if (level < 25) return 1;
  if (level <= 250) {
    return Math.floor(level / 25) * 25;
  } else {
    return 250 + Math.floor((level - 250) / 50) * 50;
  }
};

export const getNextCheckpoint = (level: number): number => {
  const currentCP = getCheckpointForLevel(level);
  if (currentCP < 250) {
    return currentCP === 1 ? 25 : currentCP + 25;
  } else {
    return currentCP + 50;
  }
};

export const getUnlockedSymbols = (level: number): SymbolType[] => {
  const symbols: SymbolType[] = ['CircleFilled', 'CircleEmpty'];
  if (level >= 11) symbols.push('TriangleUp', 'TriangleDown');
  if (level >= 31) symbols.push('Mul2', 'Div2');
  if (level >= 51) symbols.push('Prev1', 'Prev1'); // Make Prev1 weight heavier
  if (level >= 71) symbols.push('ReverseNext');
  if (level >= 91) symbols.push('InvertAll');
  if (level >= 101) symbols.push('Star');
  if (level >= 111) symbols.push('Heart');
  if (level >= 131) symbols.push('Prev2');
  return symbols;
};

export const evaluateSequence = (sequence: SymbolType[], prevAnswers: number[]): { result: number, valid: boolean } => {
  let runningTotal = 0;
  let hasInvertAll = false;
  let hasHeart = false;
  let hasStar = false;
  let isReverseActive = false;
  
  // We process left to right. Plus just means continuing, but doesn't change math.
  for (let i = 0; i < sequence.length; i++) {
    const sym = sequence[i];

    if (sym === 'Plus') {
      isReverseActive = false;
      continue;
    }

    if (sym === 'Star') hasStar = true;
    if (sym === 'Heart') hasHeart = true;
    if (sym === 'InvertAll') hasInvertAll = true;

    const modifier = isReverseActive ? -1 : 1;

    let applied = false;

    if (sym === 'CircleFilled') { runningTotal += 1 * modifier; applied = true; }
    if (sym === 'CircleEmpty') { runningTotal -= 1 * modifier; applied = true; }
    
    if (sym === 'TriangleUp') { runningTotal += 1 * modifier; applied = true; }
    if (sym === 'TriangleDown') { runningTotal -= 1 * modifier; applied = true; }
    if (sym === 'Prev1') { runningTotal += (prevAnswers[0] ?? 0) * modifier; applied = true; }
    if (sym === 'Prev2') { runningTotal += (prevAnswers[1] ?? 0) * modifier; applied = true; }

    if (sym === 'Mul2') {
      runningTotal = runningTotal * (isReverseActive ? 0.5 : 2);
      if (!Number.isInteger(runningTotal)) return { result: NaN, valid: false };
      applied = true;
    }

    if (sym === 'Div2') {
      if (isReverseActive) {
        runningTotal = runningTotal * 2;
      } else {
        if (runningTotal % 2 !== 0) return { result: NaN, valid: false }; // Must be even for Div2
        runningTotal = runningTotal / 2;
      }
      applied = true;
    }

    if (sym === 'ReverseNext') {
      isReverseActive = !isReverseActive; 
    } else if (applied) {
      isReverseActive = false; // Reset if we applied an operation
    }
  }

  if (hasInvertAll) {
    runningTotal = -runningTotal;
  }

  if (hasStar) return { result: 0, valid: true };

  if (hasHeart) {
    if (runningTotal < 0) return { result: 0, valid: true };
  }

  if (runningTotal < -9 || runningTotal > 9 || !Number.isInteger(runningTotal)) {
    return { result: runningTotal, valid: false };
  }

  if (Object.is(runningTotal, -0)) runningTotal = 0;

  return { result: runningTotal, valid: true };
};

export const generatePuzzle = (level: number, previousResults: number[]): { sequence: SymbolType[], expectedResult: number } => {
  const unlocked = getUnlockedSymbols(level);
  const maxTries = 3000;
  
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const sequence: SymbolType[] = [];
    
    let combinationsCount = 1 + Math.floor((level - 1) / 10); // L1-10 = 1 combo
    if (combinationsCount > 5) combinationsCount = 5;

    // Dedicated Memory Symbol Logic (Prev1 = ~33%, Prev2 = ~6.6%)
    let memorySymbolToAdd: 'Prev1' | 'Prev2' | null = null;
    
    const lastCheckpoint = getCheckpointForLevel(level);
    const isJustAfterCheckpoint = level === lastCheckpoint + 1;
    const isSecondAfterCheckpoint = level === lastCheckpoint + 2;
    // Check if we are at the beginning of a checkpoint (C, C+1, C+2)
    const canUsePrev1 = level >= 52 && level !== lastCheckpoint && !isJustAfterCheckpoint;
    const canUsePrev2 = level >= 133 && level !== lastCheckpoint && !isJustAfterCheckpoint && !isSecondAfterCheckpoint;

    // Prev2 intro modal is at 131. Give grace period (133) + Checkpoint grace (3 turns)
    if (canUsePrev2 && Math.random() < 0.08) {
      memorySymbolToAdd = 'Prev2';
    } 
    // Prev1 intro modal is at 51. Give grace period (52) + Checkpoint grace (2 turns)
    else if (canUsePrev1 && Math.random() < 0.35) {
      memorySymbolToAdd = 'Prev1';
    }
    
    // Choose which segment will hold the memory symbol (must not be c=0 since c=0 is circles)
    const memoryInstallIndex = memorySymbolToAdd && combinationsCount > 1 
      ? Math.floor(Math.random() * (combinationsCount - 1)) + 1 
      : -1;

    for (let c = 0; c < combinationsCount; c++) {
      if (c > 0) sequence.push('Plus');
      
      let segmentTypePool = unlocked.filter(u => !['Star','Heart','InvertAll','Plus','ReverseNext','CircleFilled','CircleEmpty', 'Prev1', 'Prev2'].includes(u));

      // Decide if this combination is Circles or an Operator
      const isCircleCombo = (c === 0);

      if (isCircleCombo) {
        let len = 1;
        if (level <= 10) {
          len = level;
        } else {
          len = Math.max(1, Math.floor(Math.random() * 5) + 2);
        }

        const limitedLen = Math.min(len, 9);
        for (let i = 0; i < limitedLen; i++) {
          sequence.push(Math.random() > 0.5 ? 'CircleFilled' : 'CircleEmpty');
        }
      } else {
        let sym: SymbolType;

        if (c === memoryInstallIndex && memorySymbolToAdd) {
          sym = memorySymbolToAdd;
        } else {
          let pool = segmentTypePool;
          
          const hasMathMulDiv = sequence.includes('Mul2') || sequence.includes('Div2');
          if (hasMathMulDiv) {
            pool = pool.filter(u => u !== 'Mul2' && u !== 'Div2');
          }

          if (pool.length === 0) pool = ['TriangleUp']; 
          sym = pool[Math.floor(Math.random() * pool.length)];
        }

        const canBeReversed = ['TriangleUp', 'TriangleDown', 'Mul2', 'Div2'].includes(sym);
        if (canBeReversed && unlocked.includes('ReverseNext') && Math.random() > 0.7) {
          sequence.push('ReverseNext');
        }

        sequence.push(sym);
      }
    }

    if (unlocked.includes('Star') && Math.random() > 0.85) {
      sequence.push('Plus', 'Star');
    }
    
    if (unlocked.includes('Heart') && !sequence.includes('Star') && Math.random() > 0.85) {
      sequence.push('Plus', 'Heart');
    }

    if (unlocked.includes('InvertAll') && !sequence.includes('Star') && Math.random() > 0.80) {
      sequence.push('Plus', 'InvertAll');
    }

    const cleanSeq = sequence.filter((s, i, arr) => {
      if (s === 'Plus') {
        if (i === 0) return false;
        if (i === arr.length - 1) return false;
        if (arr[i+1] === 'Plus') return false;
      }
      return true;
    });

    const { result, valid } = evaluateSequence(cleanSeq, previousResults);
    
    if (valid && result >= -9 && result <= 9) {
      return { sequence: cleanSeq, expectedResult: result };
    }
  }

  return { sequence: ['CircleFilled', 'Plus', 'CircleFilled'], expectedResult: 2 };
};

export const getTutorialSymbols = (level: number): SymbolType[] => {
  if (level === 1) return ['CircleFilled', 'CircleEmpty'];
  if (level === 11) return ['TriangleUp', 'TriangleDown'];
  if (level === 31) return ['Mul2', 'Div2'];
  if (level === 51) return ['Prev1'];
  if (level === 71) return ['ReverseNext'];
  if (level === 91) return ['InvertAll'];
  if (level === 101) return ['Star'];
  if (level === 111) return ['Heart'];
  if (level === 131) return ['Prev2'];
  return [];
};

export const isTutorialLevel = (level: number): boolean => {
  return getTutorialSymbols(level).length > 0;
};
