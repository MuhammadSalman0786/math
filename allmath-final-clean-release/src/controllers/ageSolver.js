module.exports = function solveAge(dobStr) {
  const dob = new Date(dobStr);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months--;
    let lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += lastMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const diffMs = now - dob;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  const answer = `${years} Years, ${months} Months, ${days} Days`;
  const steps = [
    { label: "Step 1: Given Date of Birth", katex: `\\text{DOB: } ${dob.toDateString()}` },
    { label: "Step 2: Compare with Current Date", katex: `\\text{Current: } ${now.toDateString()}` },
    { label: "Step 3: Calculate Exact Difference", katex: `\\text{Age: } ${years}\\text{ years, } ${months}\\text{ months, } ${days}\\text{ days}` },
    { label: "Step 4: Total Days Lived", katex: `\\text{Days: } ${totalDays.toLocaleString()} \\text{ days}` },
    { label: "Step 5: Total Hours Lived", katex: `\\text{Hours: } ${totalHours.toLocaleString()} \\text{ hours}` }
  ];

  return { answer, steps };
};
