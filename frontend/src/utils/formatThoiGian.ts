export const formatThoiGian = (plan: any) => {
  if (!plan.weeks || plan.weeks.length === 0) return '';
  const formatWeek = (w: any, month: number) => {
    if (!w.date) return '';
    const dates = w.date.split(',').map((d: string) => parseInt(d.trim().split('-')[2], 10)).filter((d: number)=>!isNaN(d)).sort((a: number, b: number)=>a-b);
    if (dates.length === 0) return '';
    let dateParts = [];
    let start = dates[0];
    let end = dates[0];
    for (let i = 1; i <= dates.length; i++) {
      if (dates[i] === end + 1) {
        end = dates[i];
      } else {
        if (start === end) dateParts.push(start.toString());
        else if (end === start + 1) dateParts.push(start + ',' + end);
        else dateParts.push(start + '-' + end);
        start = dates[i];
        end = dates[i];
      }
    }
    return `Ngày ${dateParts.join(',')}/${month}; ${(w.startLesson || 1)}-${(w.endLesson || w.startLesson || 1)}`;
  };
  return plan.weeks.map((w: any) => formatWeek(w, plan.month)).filter(Boolean).join('\n');
};
