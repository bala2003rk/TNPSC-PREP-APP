const { normalizeSelectedOption, gradeAttempt } = require('./gradeAttempt');

describe('normalizeSelectedOption', () => {
  test('keeps letter keys', () => {
    expect(normalizeSelectedOption('A')).toBe('A');
    expect(normalizeSelectedOption('c')).toBe('C');
  });

  test('maps numeric indices, including 0', () => {
    expect(normalizeSelectedOption(0)).toBe('A');
    expect(normalizeSelectedOption(1)).toBe('B');
  });

  test('treats empty values as skipped', () => {
    expect(normalizeSelectedOption(null)).toBeNull();
    expect(normalizeSelectedOption(undefined)).toBeNull();
    expect(normalizeSelectedOption('')).toBeNull();
  });
});

describe('gradeAttempt', () => {
  const questions = [
    { _id: 'q1', correctOption: 'A', subject: 'HISTORY' },
    { _id: 'q2', correctOption: 'B', subject: 'POLITY' },
    { _id: 'q3', correctOption: 'C', subject: 'HISTORY' },
  ];
  const exam = { marksPerQuestion: 1, negativeMarking: 0.25 };

  test('grades a correct numeric index of 0 instead of treating it as skipped', () => {
    const result = gradeAttempt({
      exam,
      questions,
      answers: [
        { questionId: 'q1', selectedOption: 0 },
        { questionId: 'q2', selectedOption: 'B' },
        { questionId: 'q3', selectedOption: null },
      ],
    });

    expect(result.correct).toBe(2);
    expect(result.incorrect).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.score).toBe(2);
    expect(result.gradedAnswers[0].selectedOption).toBe('A');
    expect(result.gradedAnswers[0].isCorrect).toBe(true);
  });

  test('applies negative marking for a wrong letter answer', () => {
    const result = gradeAttempt({
      exam,
      questions,
      answers: [{ questionId: 'q1', selectedOption: 'D' }],
    });

    expect(result.incorrect).toBe(1);
    expect(result.score).toBe(0);
    expect(result.gradedAnswers[0].marksAwarded).toBe(-0.25);
  });
});
