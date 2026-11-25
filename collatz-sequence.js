(() => {
  "use strict";

  class CollatzSequence {
    static format(value) {
      return value.toLocaleString("es-ES");
    }

    static ratio(numerator, denominator) {
      if (numerator === 0n) return 0;
      const safeLimit = BigInt(Number.MAX_SAFE_INTEGER);
      if (numerator <= safeLimit && denominator <= safeLimit) {
        return Number(numerator) / Number(denominator);
      }

      const numeratorText = numerator.toString();
      const denominatorText = denominator.toString();
      const numeratorDigits = Math.min(16, numeratorText.length);
      const denominatorDigits = Math.min(16, denominatorText.length);
      const numeratorHead = Number(numeratorText.slice(0, numeratorDigits)) / (10 ** (numeratorDigits - 1));
      const denominatorHead = Number(denominatorText.slice(0, denominatorDigits)) / (10 ** (denominatorDigits - 1));
      return (numeratorHead / denominatorHead) * (10 ** (numeratorText.length - denominatorText.length));
    }

    static async calculate(start, onProgress, isCancelled) {
      const values = [start];
      let current = start;
      let maximum = start;
      const chunkSize = 4000;

      while (current !== 1n) {
        for (let count = 0; count < chunkSize && current !== 1n; count += 1) {
          current = current % 2n === 0n ? current / 2n : current * 3n + 1n;
          values.push(current);
          if (current > maximum) maximum = current;
        }

        if (isCancelled()) return null;
        if (current !== 1n) {
          onProgress(values.length - 1);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }

      return new CollatzSequence(values, maximum);
    }

    constructor(values, maximum) {
      this.values = values;
      this.maximum = maximum;
      this.steps = values.length - 1;
      this.positions = new Float64Array(values.length);
      this.parities = new Uint8Array(values.length);

      const range = maximum > 1n ? maximum - 1n : 1n;
      let maximumDelta = 0n;
      const seen = new Set();
      this.markers = [];

      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        this.positions[index] = CollatzSequence.ratio(value - 1n, range);
        this.parities[index] = value % 2n === 0n ? 0 : 1;
        if (!seen.has(value)) {
          seen.add(value);
          this.markers.push({
            value,
            index,
            label: CollatzSequence.format(value),
            position: this.positions[index],
            even: this.parities[index] === 0
          });
        }

        if (index < this.steps) {
          const next = values[index + 1];
          const delta = value > next ? value - next : next - value;
          if (delta > maximumDelta) maximumDelta = delta;
        }
      }

      this.maxDelta = CollatzSequence.ratio(maximumDelta, range);
      this.markers.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
    }

    formatValues() {
      const chunks = [];
      let batch = [];
      for (let index = 0; index < this.values.length; index += 1) {
        batch.push(CollatzSequence.format(this.values[index]));
        if (batch.length === 256 || index === this.values.length - 1) {
          chunks.push(batch.join(" → "));
          batch = [];
        }
      }
      return chunks.join(" → ");
    }
  }

  window.CollatzSequence = CollatzSequence;
})();
