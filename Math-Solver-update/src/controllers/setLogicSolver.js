// Symbolic Set Theory & Logic Statement Solver
function solveSetLogic(inputStr) {
  let raw = inputStr.trim();

  // Pattern: A \subset B, 4 \subset 6, {1, 2} \subset {1, 2, 3}
  let subsetMatch = raw.match(/^(?:\{([^}]+)\}|(\w+))\s*(?:\\subset|\u2282|subset|⊆|\\subseteq)\s*(?:\{([^}]+)\}|(\w+))$/);
  if (subsetMatch) {
    const leftSetContent = subsetMatch[1];
    const leftAtom = subsetMatch[2];
    const rightSetContent = subsetMatch[3];
    const rightAtom = subsetMatch[4];

    let steps = [];
    steps.push({
      label: "Given input:",
      katex: `${raw.replace(/\subset/g, ' \\subset ')}`
    });

    if (leftAtom && rightAtom) {
      steps.push({
        label: `Step 1: Interpret the symbol. The symbol \\subset denotes a subset relationship between two sets. Since ${leftAtom} and ${rightAtom} are individual integers rather than sets, the expression is mathematically undefined in standard set theory.`,
        katex: `\\text{Symbol } \\subset \\text{ requires sets as operands: } A \\subset B`
      });

      steps.push({
        label: `Step 2: Evaluate the truth value. If ${leftAtom} and ${rightAtom} are treated as sets containing only the elements ${leftAtom} and ${rightAtom} respectively, the statement \\{${leftAtom}\\} \\subset \\{${rightAtom}\\} is false because the element ${leftAtom} is not contained within the set \\{${rightAtom}\\}.`,
        katex: `\\{${leftAtom}\\} \\not\\subset \\{${rightAtom}\\} \\implies \\mathbf{False}`
      });

      return { answer: "False", steps };
    }

    const leftElements = (leftSetContent || leftAtom).split(',').map(s => s.trim());
    const rightElements = (rightSetContent || rightAtom).split(',').map(s => s.trim());

    const isSubset = leftElements.every(el => rightElements.includes(el));
    steps.push({
      label: "Step 1: Definition of Subset: A set A is a subset of B if every element in A belongs to B:",
      katex: `A = \\{${leftElements.join(', ')}\\}, \\quad B = \\{${rightElements.join(', ')}\\}`
    });

    if (isSubset) {
      steps.push({
        label: `Step 2: Every element in A is present in B:`,
        katex: `\\forall x \\in A, \\; x \\in B \\implies \\mathbf{True}`
      });
      return { answer: "True", steps };
    } else {
      const missing = leftElements.filter(el => !rightElements.includes(el));
      steps.push({
        label: `Step 2: The element ${missing[0]} in A is not present in B:`,
        katex: `${missing[0]} \\notin B \\implies \\mathbf{False}`
      });
      return { answer: "False", steps };
    }
  }

  // Pattern: 4 \in {2, 4, 6}
  let inMatch = raw.match(/^(\w+)\s*(?:\\in|\u2208|in)\s*(?:\{([^}]+)\}|(\w+))$/);
  if (inMatch) {
    const el = inMatch[1].trim();
    const setStr = inMatch[2] || inMatch[3];
    const elements = setStr.split(',').map(s => s.trim());

    let steps = [
      { label: "Given input:", katex: `${el} \\in \\{${elements.join(', ')}\\}` },
      { label: "Step 1: Definition of Set Membership (\\in):", katex: `\\text{Checking if } ${el} \\in \\{${elements.join(', ')}\\}` }
    ];

    const exists = elements.includes(el);
    steps.push({
      label: `Step 2: Membership check verdict:`,
      katex: exists ? `${el} \\in \\{${elements.join(', ')}\} \\implies \\mathbf{True}` : `${el} \\notin \\{${elements.join(', ')}\} \\implies \\mathbf{False}`
    });
    return { answer: exists ? "True" : "False", steps };
  }

  return null;
}

module.exports = { solveSetLogic };
