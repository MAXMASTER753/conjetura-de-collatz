(() => {
  "use strict";

  class InputWidgetController {
    constructor(widget, canvasWrap, onChange) {
      this.widget = widget;
      this.canvasWrap = canvasWrap;
      this.onChange = onChange;
      this.drag = null;
      this.resizeInProgress = false;
      this.bindEvents();
      this.observer = new ResizeObserver(() => {
        this.constrain();
        this.onChange();
      });
      this.observer.observe(widget);
    }

    constrain() {
      const width = this.canvasWrap.clientWidth;
      const height = this.canvasWrap.clientHeight;
      if (!width || !height) return;

      const minWidth = width / 12;
      const minHeight = height / 12;
      const left = Math.max(0, Math.min(this.widget.offsetLeft, width - minWidth));
      const top = Math.max(0, Math.min(this.widget.offsetTop, height - minHeight));
      this.widget.style.left = `${left}px`;
      this.widget.style.top = `${top}px`;

      const maxWidth = Math.max(minWidth, width - left);
      const maxHeight = Math.max(minHeight, height - top);
      this.widget.style.maxWidth = `${maxWidth}px`;
      this.widget.style.maxHeight = `${maxHeight}px`;
      if (this.widget.offsetWidth > maxWidth) this.widget.style.width = `${maxWidth}px`;
      if (this.widget.offsetHeight > maxHeight) this.widget.style.height = `${maxHeight}px`;

      const scale = Math.min(this.widget.offsetWidth / 260, this.widget.offsetHeight / 188);
      const fontSize = Math.max(8, Math.min(14, 14 * scale));
      const currentFontSize = parseFloat(getComputedStyle(this.widget).fontSize);
      if (Math.abs(currentFontSize - fontSize) > 0.1) this.widget.style.fontSize = `${fontSize}px`;

      const borderWidth = this.widget.offsetWidth - this.widget.clientWidth;
      const borderHeight = this.widget.offsetHeight - this.widget.clientHeight;
      const requiredWidth = this.widget.scrollWidth + borderWidth;
      const requiredHeight = this.widget.scrollHeight + borderHeight;
      if (requiredWidth > this.widget.offsetWidth + 1 && requiredWidth <= maxWidth) {
        this.widget.style.width = `${requiredWidth}px`;
      }
      if (requiredHeight > this.widget.offsetHeight + 1 && requiredHeight <= maxHeight) {
        this.widget.style.height = `${requiredHeight}px`;
      }
    }

    resize() {
      this.constrain();
      this.onChange();
    }

    settleSize() {
      window.requestAnimationFrame(() => {
        this.constrain();
        this.onChange();
        window.requestAnimationFrame(() => {
          this.constrain();
          this.onChange();
        });
      });
    }

    bindEvents() {
      this.widget.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || event.target.closest("input, #generateButton")) return;
        const rect = this.widget.getBoundingClientRect();
        const resizeCorner = event.clientX >= rect.right - 18 && event.clientY >= rect.bottom - 18;
        if (resizeCorner) {
          this.resizeInProgress = true;
          return;
        }

        this.drag = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: this.widget.offsetLeft,
          top: this.widget.offsetTop
        };
        if (event.target instanceof HTMLElement) event.target.setPointerCapture(event.pointerId);
      });

      this.widget.addEventListener("pointermove", (event) => {
        if (!this.drag || event.pointerId !== this.drag.pointerId) return;
        const maxLeft = Math.max(0, this.canvasWrap.clientWidth - this.widget.offsetWidth);
        const maxTop = Math.max(0, this.canvasWrap.clientHeight - this.widget.offsetHeight);
        this.widget.style.left = `${Math.max(0, Math.min(maxLeft, this.drag.left + event.clientX - this.drag.x))}px`;
        this.widget.style.top = `${Math.max(0, Math.min(maxTop, this.drag.top + event.clientY - this.drag.y))}px`;
        this.constrain();
        this.onChange();
      });

      const endDrag = () => { this.drag = null; };
      this.widget.addEventListener("pointerup", () => {
        endDrag();
        this.settleSize();
      });
      this.widget.addEventListener("pointercancel", endDrag);
      this.widget.addEventListener("lostpointercapture", endDrag);
      window.addEventListener("pointerup", () => {
        if (!this.resizeInProgress) return;
        this.resizeInProgress = false;
        this.settleSize();
      });
      window.addEventListener("pointercancel", () => {
        this.resizeInProgress = false;
        this.settleSize();
      });
    }
  }

  window.InputWidgetController = InputWidgetController;
})();
