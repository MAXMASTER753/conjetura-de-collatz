(() => {
  "use strict";

  class CollatzApp {
    constructor() {
      this.form = document.getElementById("sequenceForm");
      this.input = document.getElementById("numberInput");
      this.generateButton = document.getElementById("generateButton");
      this.status = document.getElementById("statusText");
      this.orientationButton = document.getElementById("orientationButton");
      this.orientationLabel = document.getElementById("orientationLabel");
      this.colorButton = document.getElementById("colorButton");
      this.colorLabel = document.getElementById("colorLabel");
      this.fillButton = document.getElementById("fillButton");
      this.fillLabel = document.getElementById("fillLabel");
      this.numberLabelsButton = document.getElementById("numberLabelsButton");
      this.numberLabelsLabel = document.getElementById("numberLabelsLabel");
      this.themeButton = document.getElementById("themeButton");
      this.themeLabel = document.getElementById("themeLabel");
      this.stepsValue = document.getElementById("stepsValue");
      this.maximumValue = document.getElementById("maximumValue");
      this.termsValue = document.getElementById("termsValue");
      this.sequenceDetails = document.getElementById("sequenceDetails");
      this.sequenceText = document.getElementById("sequenceText");
      this.model = null;
      this.calculationId = 0;

      this.canvas = new CollatzCanvas(
        document.getElementById("collatzCanvas"),
        document.getElementById("canvasWrap"),
        document.getElementById("tooltip"),
        document.getElementById("emptyState"),
        document.getElementById("inputWidget")
      );
      this.inputWidget = new InputWidgetController(
        document.getElementById("inputWidget"),
        document.getElementById("canvasWrap"),
        () => this.canvas.draw()
      );

      this.bindEvents();
      this.resizeObserver = new ResizeObserver(() => this.canvas.resize());
      this.resizeObserver.observe(document.getElementById("canvasWrap"));
      this.canvas.resize();
      this.inputWidget.resize();
      this.updateSequenceText();
    }

    bindEvents() {
      this.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.generate();
      });

      this.input.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const allowedKeys = [
          "Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight",
          "ArrowUp", "ArrowDown", "Home", "End"
        ];
        if (allowedKeys.includes(event.key)) return;
        if (!/^[0-9]$/.test(event.key)) event.preventDefault();
      });

      this.input.addEventListener("beforeinput", (event) => {
        if (event.inputType.startsWith("delete")) return;
        if (event.data !== null && !/^[0-9]+$/.test(event.data)) event.preventDefault();
      });

      this.input.addEventListener("paste", (event) => {
        const pasted = event.clipboardData.getData("text");
        if (!/^[0-9]+$/.test(pasted)) event.preventDefault();
      });

      this.input.addEventListener("input", () => {
        this.input.value = this.input.value.replace(/[^0-9]/g, "");
        const valid = /^[0-9]+$/.test(this.input.value) && /[1-9]/.test(this.input.value);
        this.input.setCustomValidity(valid || this.input.value === "" ? "" : "Ingresa un entero positivo.");
      });

      this.orientationButton.addEventListener("click", () => {
        const orientation = this.canvas.orientation === "horizontal" ? "vertical" : "horizontal";
        this.canvas.setOrientation(orientation);
        this.orientationLabel.textContent = `Orientación: ${orientation}`;
        this.orientationButton.setAttribute("aria-pressed", String(orientation === "vertical"));
      });

      this.colorButton.addEventListener("click", () => {
        const mode = this.canvas.colorMode === "parity" ? "rainbow" : "parity";
        this.canvas.setColorMode(mode);
        this.colorLabel.textContent = mode === "parity" ? "Color: por paridad" : "Color: arcoíris";
        this.colorButton.setAttribute("aria-pressed", String(mode === "rainbow"));
      });

      this.themeButton.addEventListener("click", () => {
        const dark = document.body.classList.toggle("dark");
        this.themeLabel.textContent = dark ? "Tema claro" : "Tema oscuro";
        this.themeButton.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
        this.themeButton.setAttribute("aria-pressed", String(dark));
        this.canvas.draw();
      });

      this.fillButton.addEventListener("click", () => {
        const fill = !this.canvas.fillSemicircles;
        this.canvas.setFillSemicircles(fill);
        this.fillLabel.textContent = fill ? "Relleno: activado" : "Relleno: desactivado";
        this.fillButton.setAttribute("aria-pressed", String(fill));
      });

      this.numberLabelsButton.addEventListener("click", () => {
        const visible = !this.canvas.valueLabelsVisible;
        this.canvas.setValueLabelsVisible(visible);
        this.numberLabelsLabel.textContent = `Números de la recta: ${visible ? "visibles" : "ocultos"}`;
        this.numberLabelsButton.setAttribute("aria-pressed", String(visible));
      });

      this.sequenceDetails.addEventListener("toggle", () => this.updateSequenceText());
    }

    async generate() {
      const raw = this.input.value;
      if (!/^[0-9]+$/.test(raw) || !/[1-9]/.test(raw)) {
        this.input.setCustomValidity("Ingresa un entero positivo.");
        this.input.reportValidity();
        return;
      }

      const start = BigInt(raw);
      const calculationId = ++this.calculationId;
      this.generateButton.disabled = true;
      this.status.textContent = "Calculando secuencia…";
      this.input.setCustomValidity("");

      try {
        const model = await CollatzSequence.calculate(
          start,
          (progress) => {
            if (calculationId === this.calculationId) {
              this.status.textContent = `Calculando… ${progress.toLocaleString("es")}`;
            }
          },
          () => calculationId !== this.calculationId
        );

        if (calculationId !== this.calculationId || !model) return;
        this.model = model;
        this.canvas.setSequence(model);
        this.stepsValue.textContent = CollatzSequence.format(BigInt(model.steps));
        this.maximumValue.textContent = CollatzSequence.format(model.maximum);
        this.termsValue.textContent = CollatzSequence.format(BigInt(model.values.length));
        this.status.textContent = `Secuencia generada: ${CollatzSequence.format(start)}.`;
        this.updateSequenceText();
      } catch (error) {
        if (calculationId === this.calculationId) {
          console.error("No se pudo calcular la secuencia de Collatz.", error);
          this.status.textContent = `No se pudo calcular la secuencia: ${error.message}`;
        }
      } finally {
        if (calculationId === this.calculationId) this.generateButton.disabled = false;
      }
    }

    updateSequenceText() {
      if (!this.model) {
        this.sequenceText.textContent = "Genera una secuencia para verla.";
      } else if (this.sequenceDetails.open) {
        this.sequenceText.textContent = this.model.formatValues();
      } else {
        this.sequenceText.textContent = "Expande para cargar la secuencia completa.";
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.collatzApp = new CollatzApp();
  }, { once: true });
})();
