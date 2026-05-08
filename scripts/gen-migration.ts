import { QUESTIONS } from '../src/data/questions';

const escape = (s: string) => s.replace(/'/g, "''");

const rows = QUESTIONS.map(q => {
  const answers = q.answers.map(a => `'${escape(a)}'`).join(', ');
  return `  ('${q.id}', '${q.category}', '${escape(q.question)}', ARRAY[${answers}], ${q.correctIndex}, '${q.difficulty}', true)`;
});

console.log(`INSERT INTO remote_questions (id, category_id, question, answers, correct_index, difficulty, active)`);
console.log(`VALUES`);
console.log(rows.join(',\n'));
console.log(`ON CONFLICT (id) DO NOTHING;`);
