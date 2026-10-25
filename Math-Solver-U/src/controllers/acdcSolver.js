module.exports = function solveAcDc(voltage, conversionType, rectifierType) {
  const v = parseFloat(voltage);
  if (isNaN(v) || v < 0) {
    return {
      answer: "Invalid Input",
      steps: [
        { label: "Error", katex: "\\text{Please enter a positive numeric voltage value.}" }
      ]
    };
  }

  let answer = "";
  let steps = [];

  if (conversionType === "peak_to_dc") {
    if (rectifierType === "full_wave") {
      // Full-Wave Rectifier: Vdc = 2 * Vpeak / pi = 0.6366 * Vpeak
      const vdc = (2 * v) / Math.PI;
      const vrms = v / Math.SQRT2;
      const vpp = 2 * v;
      answer = `V_{DC} = ${vdc.toFixed(4)} V`;
      steps.push({ label: "Step 1: Given Peak AC Voltage (V_peak)", katex: `V_{peak} = ${v}\\text{ V}` });
      steps.push({ label: "Step 2: Circuit Configuration", katex: `\\text{Full-Wave Rectifier (Bridge / Center-Tapped Diode Network)}` });
      steps.push({ label: "Step 3: Average DC Output Voltage Formula", katex: `V_{DC} = \\frac{2 \\times V_{peak}}{\\pi} \\approx 0.6366 \\times V_{peak}` });
      steps.push({ label: "Step 4: Compute Output DC Voltage", katex: `V_{DC} = \\frac{2 \\times ${v}}{\\pi} = ${vdc.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 5: Equivalent RMS AC Voltage (V_RMS)", katex: `V_{RMS} = \\frac{V_{peak}}{\\sqrt{2}} = \\frac{${v}}{1.4142} = ${vrms.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 6: Peak-to-Peak AC Voltage (V_PP)", katex: `V_{PP} = 2 \\times V_{peak} = 2 \\times ${v} = ${vpp.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 7: Form Factor (V_RMS / V_DC)", katex: `\\text{Form Factor} = \\frac{${vrms.toFixed(4)}}{${vdc.toFixed(4)}} = 1.1107` });
    } else {
      // Half-Wave Rectifier: Vdc = Vpeak / pi = 0.3183 * Vpeak
      const vdc = v / Math.PI;
      const vrms = v / 2;
      const vpp = 2 * v;
      answer = `V_{DC} = ${vdc.toFixed(4)} V`;
      steps.push({ label: "Step 1: Given Peak AC Voltage (V_peak)", katex: `V_{peak} = ${v}\\text{ V}` });
      steps.push({ label: "Step 2: Circuit Configuration", katex: `\\text{Half-Wave Rectifier (Single Diode Configuration)}` });
      steps.push({ label: "Step 3: Average DC Output Voltage Formula", katex: `V_{DC} = \\frac{V_{peak}}{\\pi} \\approx 0.3183 \\times V_{peak}` });
      steps.push({ label: "Step 4: Compute Output DC Voltage", katex: `V_{DC} = \\frac{${v}}{\\pi} = ${vdc.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 5: Equivalent RMS Voltage for Half-Wave", katex: `V_{RMS} = \\frac{V_{peak}}{2} = \\frac{${v}}{2} = ${vrms.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 6: Peak-to-Peak Voltage (V_PP)", katex: `V_{PP} = 2 \\times V_{peak} = ${vpp.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 7: Form Factor (V_RMS / V_DC)", katex: `\\text{Form Factor} = \\frac{${vrms.toFixed(4)}}{${vdc.toFixed(4)}} = 1.5708` });
    }
  } else {
    // RMS to DC (standard 220V/110V AC input)
    // Vpeak = Vrms * sqrt(2)
    const vpeak = v * Math.SQRT2;
    const vpp = 2 * vpeak;

    if (rectifierType === "half_wave") {
      const vdc = vpeak / Math.PI;
      answer = `V_{DC} = ${vdc.toFixed(4)} V`;
      steps.push({ label: "Step 1: Given RMS AC Voltage (V_RMS)", katex: `V_{RMS} = ${v}\\text{ V}` });
      steps.push({ label: "Step 2: Convert RMS to Peak AC Voltage (V_peak = V_RMS × √2)", katex: `V_{peak} = ${v} \\times 1.4142 = ${vpeak.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 3: Circuit Configuration", katex: `\\text{Half-Wave Rectifier (Single Diode)}` });
      steps.push({ label: "Step 4: Compute DC Output Voltage", katex: `V_{DC} = \\frac{V_{peak}}{\\pi} = \\frac{${vpeak.toFixed(4)}}{\\pi} = ${vdc.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 5: Peak-to-Peak Voltage (V_PP)", katex: `V_{PP} = 2 \\times V_{peak} = ${vpp.toFixed(4)}\\text{ V}` });
    } else {
      // Full-wave RMS to DC
      const vdc = (2 * vpeak) / Math.PI;
      answer = `V_{DC} = ${vdc.toFixed(4)} V`;
      steps.push({ label: "Step 1: Given RMS AC Voltage (V_RMS)", katex: `V_{RMS} = ${v}\\text{ V}` });
      steps.push({ label: "Step 2: Convert RMS to Peak AC Voltage (V_peak = V_RMS × √2)", katex: `V_{peak} = ${v} \\times 1.4142 = ${vpeak.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 3: Circuit Configuration", katex: `\\text{Full-Wave Bridge Rectifier}` });
      steps.push({ label: "Step 4: Compute DC Output Voltage", katex: `V_{DC} = \\frac{2 \\times V_{peak}}{\\pi} = \\frac{2 \\times ${vpeak.toFixed(4)}}{\\pi} = ${vdc.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 5: Peak-to-Peak Voltage (V_PP)", katex: `V_{PP} = 2 \\times V_{peak} = ${vpp.toFixed(4)}\\text{ V}` });
      steps.push({ label: "Step 6: Ideal DC to RMS Conversion Ratio", katex: `\\frac{V_{DC}}{V_{RMS}} = \\frac{2\\sqrt{2}}{\\pi} \\approx 0.9003 \implies V_{DC} \\approx 0.9003 \\times ${v} = ${vdc.toFixed(4)}\\text{ V}` });
    }
  }

  return { answer, steps };
};
