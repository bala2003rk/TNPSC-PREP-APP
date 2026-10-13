const OPTION_KEYS = ['A', 'B', 'C', 'D'];

function normalizeSelectedOption(selectedOption) {
  if (selectedOption === 0 || selectedOption === '0') return 'A';
  if (typeof selectedOption === 'number' && OPTION_KEYS[selectedOption]) {
    return OPTION_KEYS[selectedOption];
  }
  if (typeof selectedOption === 'string') {
    const key = selectedOption.trim().toUpperCase();
    if (OPTION_KEYS.includes(key)) return key;
  }
  return null;
}

function gradeAttempt({ answers = [], questions = [], exam = {} }) {
  const qMap = Object.fromEntries(
    questions.map((q) => [String(q._id), q])
  );

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  const subjectMap = {};

  const gradedAnswers = answers.map((ans) => {
    const q = qMap[ans.questionId?.toString()];
    const selectedOption = normalizeSelectedOption(ans.selectedOption);

    if (!q) {
      return {
        questionId: ans.questionId,
        selectedOption,
        isCorrect: false,
        marksAwarded: 0,
        timeTaken: ans.timeTaken || 0,
        isFlagged: ans.isFlagged || false,
      };
    }

    const isSkipped = selectedOption == null;
    const isCorrect = !isSkipped && selectedOption === q.correctOption;
    let marks = 0;

    if (isSkipped) {
      skipped += 1;
    } else if (isCorrect) {
      correct += 1;
      marks = exam.marksPerQuestion || 1;
      score += marks;
    } else {
      incorrect += 1;
      marks = -(exam.negativeMarking || 0);
      score += marks;
    }

    const subj = q.subject;
    if (!subjectMap[subj]) {
      subjectMap[subj] = {
        subject: subj,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        marksObtained: 0,
      };
    }
    if (isSkipped) {
      subjectMap[subj].skipped += 1;
    } else {
      subjectMap[subj].attempted += 1;
      if (isCorrect) {
        subjectMap[subj].correct += 1;
        subjectMap[subj].marksObtained += marks;
      } else {
        subjectMap[subj].incorrect += 1;
        subjectMap[subj].marksObtained += marks;
      }
    }

    return {
      questionId: ans.questionId,
      selectedOption,
      isCorrect,
      marksAwarded: marks,
      timeTaken: ans.timeTaken || 0,
      isFlagged: ans.isFlagged || false,
    };
  });

  const attempted = correct + incorrect;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const sectionWiseAnalysis = Object.values(subjectMap).map((s) => ({
    ...s,
    accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
  }));

  return {
    score: Math.max(0, score),
    correct,
    incorrect,
    skipped,
    attempted,
    accuracy,
    gradedAnswers,
    sectionWiseAnalysis,
  };
}

module.exports = { OPTION_KEYS, normalizeSelectedOption, gradeAttempt };
