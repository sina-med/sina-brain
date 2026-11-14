export function points(q, chosen) {
  let right = 0, wrong = 0;
  for (const c of chosen) (q.answer.includes(c) ? right++ : wrong++);
  return wrong ? 0 : right / q.answer.length;
}
