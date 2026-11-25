(() => {
  "use strict";

  class CollatzCanvas {
    constructor(canvas, canvasWrap, tooltip, emptyState, inputWidget) {
      this.canvas = canvas;
      this.canvasWrap = canvasWrap;
      this.tooltip = tooltip;
      this.emptyState = emptyState;
      this.inputWidget = inputWidget;
      this.context = canvas.getContext("2d");
      this.model = null;
      this.orientation = "horizontal";
      this.colorMode = "parity";
      this.fillSemicircles = true;
      this.valueLabelsVisible = true;
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.baseScale = 1;
      this.width = 0;
      this.height = 0;
      this.hoveredStep = -1;
      this.drag = null;
      this.bindEvents();
      this.resize();
    }

    setSequence(model) {
      this.model = model;
      this.hoveredStep = -1;
      this.tooltip.hidden = true;
      this.fitView();
    }

    setOrientation(orientation) {
      this.orientation = orientation;
      this.hoveredStep = -1;
      this.tooltip.hidden = true;
      this.fitView();
    }

    setColorMode(mode) {
      this.colorMode = mode;
      this.draw();
    }

    setFillSemicircles(fill) {
      this.fillSemicircles = fill;
      this.draw();
    }

    setValueLabelsVisible(visible) {
      this.valueLabelsVisible = visible;
      this.draw();
    }

    resize() {
      const rect = this.canvasWrap.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      this.canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (this.model) this.fitView();
      else this.draw();
    }

    fitView() {
      if (!this.model) return;
      const padding = 54;
      const scale = this.orientation === "horizontal"
        ? Math.min(
          (this.width - padding * 2),
          (this.height - padding * 2) / Math.max(this.model.maxDelta, 0.001)
        )
        : Math.min(
          (this.height - padding * 2),
          (this.width - padding * 2) / Math.max(this.model.maxDelta, 0.001)
        );
      this.baseScale = Math.max(0.01, Math.min(scale, 100000));
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.draw();
    }

    colorFor(index, even) {
      if (this.colorMode === "rainbow") {
        const fraction = this.model.steps <= 1 ? 0 : Math.min(index, this.model.steps - 1) / (this.model.steps - 1);
        return `hsl(${240 * fraction}, 82%, 54%)`;
      }
      const fraction = this.model.steps <= 1 ? 0 : index / (this.model.steps - 1);
      const hue = even ? 4 + fraction * 48 : 190 + fraction * 90;
      return `hsl(${hue}, 78%, 53%)`;
    }

    theme() {
      const dark = document.body.classList.contains("dark");
      return {
        axis: dark ? "rgba(204, 214, 235, .55)" : "rgba(65, 78, 105, .52)",
        text: dark ? "#e8edf8" : "#33405a",
        labelBackground: dark ? "rgba(21, 27, 41, .96)" : "rgba(255, 255, 255, .96)",
        initialBackground: "#5358d8"
      };
    }

    drawValueMarkers(scale, centerX, centerY, theme) {
      const horizontal = this.orientation === "horizontal";
      const axis = horizontal ? centerY : centerX;
      const initialValue = this.model.values[0];
      this.model.markers.forEach((marker) => {
        const position = (marker.position - 0.5) * scale + (horizontal ? centerX : centerY);
        const color = this.colorFor(marker.index, marker.even);
        const isInitial = marker.value === initialValue;
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(horizontal ? position : axis, horizontal ? axis : position, isInitial ? 4.2 : 2.2, 0, Math.PI * 2);
        if (isInitial) {
          this.context.fillStyle = "#ffffff";
          this.context.fill();
          this.context.beginPath();
          this.context.arc(horizontal ? position : axis, horizontal ? axis : position, 2.8, 0, Math.PI * 2);
          this.context.fillStyle = theme.initialBackground;
        }
        this.context.fill();
      });
    }

    drawValueLabels(scale, centerX, centerY, theme) {
      const markers = this.model.markers;
      if (!markers.length) return;
      if (!this.valueLabelsVisible) {
        this.drawValueMarkers(scale, centerX, centerY, theme);
        return;
      }

      const horizontal = this.orientation === "horizontal";
      const rotatedVertical = !horizontal && markers.length > 20;
      const axisLength = horizontal ? this.width : this.height;
      const axis = horizontal ? centerY : centerX;
      const lanes = [[], []];
      const labels = [];
      const fontSize = 9;
      const labelHeight = 15;
      const laneGap = 2;
      const laneStep = labelHeight + 2;
      const initialValue = this.model.values[0];
      const labelWidths = markers.map((marker) => {
        const isInitial = marker.value === initialValue;
        this.context.font = `${isInitial ? 700 : 600} ${isInitial ? 10 : fontSize}px system-ui, sans-serif`;
        return Math.ceil(this.context.measureText(marker.label).width) + (isInitial ? 12 : 8);
      });
      const verticalLaneWidth = labelWidths.reduce((maximum, width) => Math.max(maximum, width), 0);
      const widgetLeft = this.inputWidget.offsetLeft;
      const widgetTop = this.inputWidget.offsetTop;
      const widgetRight = widgetLeft + this.inputWidget.offsetWidth;
      const widgetBottom = widgetTop + this.inputWidget.offsetHeight;

      const findLane = (side, position, width, interval) => {
        const sideLanes = lanes[side];
        const start = position - interval / 2;
        for (let lane = 0; ; lane += 1) {
          const previous = sideLanes[lane];
          if (previous && start <= previous.end + laneGap) continue;

          const crossOffset = horizontal
            ? 10 + lane * laneStep
            : rotatedVertical
              ? 10 + lane * laneStep + labelHeight / 2
              : 10 + lane * (verticalLaneWidth + laneGap) + width / 2;
          const crossCenter = axis + (side === 0 ? -1 : 1) * crossOffset;
          const rectWidth = rotatedVertical ? labelHeight : width;
          const rectHeight = rotatedVertical ? width : labelHeight;
          const left = horizontal ? position - width / 2 : crossCenter - rectWidth / 2;
          const top = horizontal ? crossCenter - labelHeight / 2 : position - rectHeight / 2;
          if (left < 0 || top < 0 || left + rectWidth > this.width || top + rectHeight > this.height) {
            return null;
          }

          const overlapsWidget = left < widgetRight && left + rectWidth > widgetLeft &&
            top < widgetBottom && top + rectHeight > widgetTop;
          if (overlapsWidget) continue;
          return { side, lane, left, top, rectWidth, rectHeight };
        }
      };

      markers.forEach((marker, index) => {
        const position = (marker.position - 0.5) * scale + (horizontal ? centerX : centerY);
        const width = labelWidths[index];
        const interval = horizontal || rotatedVertical ? width : labelHeight + laneGap;
        if (position + interval / 2 < 0 || position - interval / 2 > axisLength) return;

        const options = [findLane(0, position, width, interval), findLane(1, position, width, interval)]
          .filter((option) => option !== null);
        if (!options.length) return;
        options.sort((a, b) => a.lane - b.lane ||
          lanes[a.side].filter(Boolean).length - lanes[b.side].filter(Boolean).length ||
          a.side - b.side);
        const placement = options[0];
        const { side, lane } = placement;
        const end = position + interval / 2;
        if (lanes[side][lane]) lanes[side][lane].end = end;
        else lanes[side][lane] = { end };
        labels.push({ marker, position, width, ...placement });
      });

      labels.sort((a, b) => Number(a.marker.value === initialValue) - Number(b.marker.value === initialValue));
      labels.forEach(({ marker, position, width, left, top, side, rectWidth, rectHeight }) => {
        const color = this.colorFor(marker.index, marker.even);
        const isInitial = marker.value === initialValue;
        this.context.beginPath();
        if (horizontal) {
          this.context.moveTo(position, axis);
          this.context.lineTo(position, side === 0 ? top + labelHeight : top);
        } else {
          this.context.moveTo(axis, position);
          this.context.lineTo(side === 0 ? left + rectWidth : left, position);
        }
        this.context.strokeStyle = theme.axis;
        this.context.lineWidth = isInitial ? 1.8 : 0.8;
        this.context.stroke();

        if (rotatedVertical) {
          this.context.save();
          this.context.translate(left + rectWidth / 2, top + rectHeight / 2);
          this.context.rotate(-Math.PI / 2);
          this.context.fillStyle = isInitial ? theme.initialBackground : theme.labelBackground;
          this.context.fillRect(-width / 2, -labelHeight / 2, width, labelHeight);
          this.context.strokeStyle = isInitial ? theme.initialBackground : color;
          this.context.lineWidth = isInitial ? 1.6 : 1;
          this.context.strokeRect(-width / 2, -labelHeight / 2, width, labelHeight);
          this.context.fillStyle = isInitial ? "#ffffff" : theme.text;
          this.context.font = `${isInitial ? 700 : 600} ${isInitial ? 10 : fontSize}px system-ui, sans-serif`;
          this.context.textAlign = "center";
          this.context.textBaseline = "middle";
          this.context.fillText(marker.label, 0, 0);
          this.context.restore();
        } else {
          this.context.fillStyle = isInitial ? theme.initialBackground : theme.labelBackground;
          this.context.fillRect(left, top, width, labelHeight);
          this.context.strokeStyle = isInitial ? theme.initialBackground : color;
          this.context.lineWidth = isInitial ? 1.6 : 1;
          this.context.strokeRect(left, top, width, labelHeight);
          this.context.fillStyle = isInitial ? "#ffffff" : theme.text;
          this.context.font = `${isInitial ? 700 : 600} ${isInitial ? 10 : fontSize}px system-ui, sans-serif`;
          this.context.textAlign = "center";
          this.context.textBaseline = "middle";
          this.context.fillText(marker.label, position, top + labelHeight / 2);
        }

      });
      this.drawValueMarkers(scale, centerX, centerY, theme);
    }

    draw() {
      if (!this.context || !this.width || !this.height) return;
      const pixelRatio = window.devicePixelRatio || 1;
      this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.context.clearRect(0, 0, this.width, this.height);
      if (!this.model) {
        this.emptyState.hidden = false;
        return;
      }
      this.emptyState.hidden = true;

      const theme = this.theme();
      const scale = this.baseScale * this.zoom;
      const centerX = this.width / 2 + this.panX;
      const centerY = this.height / 2 + this.panY;
      this.context.lineWidth = 1.4;
      this.context.strokeStyle = theme.axis;
      this.context.beginPath();
      if (this.orientation === "horizontal") {
        this.context.moveTo(0, centerY);
        this.context.lineTo(this.width, centerY);
      } else {
        this.context.moveTo(centerX, 0);
        this.context.lineTo(centerX, this.height);
      }
      this.context.stroke();

      for (let index = 0; index < this.model.steps; index += 1) {
        const start = this.model.positions[index];
        const end = this.model.positions[index + 1];
        const center = (start + end) / 2;
        const radius = Math.abs(end - start) * scale / 2;
        if (radius < 0.2) continue;
        const even = this.model.parities[index] === 0;
        const coords = this.orientation === "horizontal"
          ? {
            x1: centerX + (start - 0.5) * scale,
            center: centerX + (center - 0.5) * scale,
            axis: centerY,
            radius
          }
          : {
            y1: centerY + (start - 0.5) * scale,
            center: centerY + (center - 0.5) * scale,
            axis: centerX,
            radius
          };
        const color = this.colorFor(index, even);
        const isHovered = index === this.hoveredStep;
        this.context.beginPath();
        if (this.orientation === "horizontal") {
          const startAngle = even ? 0 : Math.PI;
          const endAngle = even ? Math.PI : Math.PI * 2;
          this.context.arc(coords.center, coords.axis, radius, startAngle, endAngle, false);
          this.context.lineTo(coords.x1, coords.axis);
        } else {
          const startAngle = even ? Math.PI / 2 : -Math.PI / 2;
          const endAngle = even ? Math.PI * 1.5 : Math.PI / 2;
          this.context.arc(coords.axis, coords.center, radius, startAngle, endAngle, false);
          this.context.lineTo(coords.axis, coords.y1);
        }
        this.context.closePath();
        if (this.fillSemicircles) {
          this.context.fillStyle = color;
          this.context.globalAlpha = isHovered ? 0.3 : 0.12;
          this.context.fill();
          this.context.globalAlpha = 1;
        }
        this.context.strokeStyle = color;
        this.context.lineWidth = isHovered ? 2.8 : 1.7;
        this.context.stroke();
      }

      this.drawValueLabels(scale, centerX, centerY, theme);
    }

    hitTest(point) {
      if (!this.model || !this.model.steps) return -1;
      const scale = this.baseScale * this.zoom;
      const centerX = this.width / 2 + this.panX;
      const centerY = this.height / 2 + this.panY;
      const horizontal = this.orientation === "horizontal";
      const along = horizontal
        ? (point.x - centerX) / scale + 0.5
        : (point.y - centerY) / scale + 0.5;
      const displacement = (horizontal ? point.y - centerY : point.x - centerX) / scale;

      for (let index = this.model.steps - 1; index >= 0; index -= 1) {
        const start = this.model.positions[index];
        const end = this.model.positions[index + 1];
        const lower = Math.min(start, end);
        const upper = Math.max(start, end);
        if (along < lower || along > upper) continue;
        const even = this.model.parities[index] === 0;
        const signed = displacement * (horizontal ? (even ? 1 : -1) : (even ? -1 : 1));
        const center = (start + end) / 2;
        const radius = Math.abs(end - start) / 2;
        if (signed >= 0 && Math.hypot(along - center, displacement) <= radius) return index;
      }
      return -1;
    }

    showTooltip(event, index) {
      if (index < 0) {
        this.tooltip.hidden = true;
        return;
      }
      const previous = this.model.values[index];
      const next = this.model.values[index + 1];
      const delta = previous > next ? previous - next : next - previous;
      const parity = this.model.parities[index] === 0 ? "par" : "impar";
      this.tooltip.innerHTML = `<strong>Paso ${CollatzSequence.format(BigInt(index + 1))}</strong>` +
        `Actual: ${CollatzSequence.format(previous)}<br>Siguiente: ${CollatzSequence.format(next)}` +
        `<br>Delta: ${CollatzSequence.format(delta)} · ${parity}`;

      const bounds = this.canvasWrap.getBoundingClientRect();
      const canvasBounds = this.canvas.getBoundingClientRect();
      const x = event.clientX - canvasBounds.left;
      const y = event.clientY - canvasBounds.top;
      this.tooltip.hidden = false;
      this.tooltip.style.left = `${Math.max(8, Math.min(x + 14, bounds.width - this.tooltip.offsetWidth - 8))}px`;
      this.tooltip.style.top = `${Math.max(8, Math.min(y + 14, bounds.height - this.tooltip.offsetHeight - 8))}px`;
    }

    bindEvents() {
      this.canvas.addEventListener("pointerdown", (event) => {
        if (event.target !== this.canvas || event.button !== 0) return;
        this.drag = { x: event.clientX, y: event.clientY, panX: this.panX, panY: this.panY };
        this.canvas.setPointerCapture(event.pointerId);
        this.canvas.classList.add("dragging");
      });
      this.canvas.addEventListener("pointermove", (event) => {
        if (event.target !== this.canvas) {
          this.hoveredStep = -1;
          this.tooltip.hidden = true;
          this.draw();
          return;
        }
        if (this.drag) {
          this.panX = this.drag.panX + event.clientX - this.drag.x;
          this.panY = this.drag.panY + event.clientY - this.drag.y;
          this.draw();
          this.tooltip.hidden = true;
          return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const index = this.hitTest({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        if (index !== this.hoveredStep) {
          this.hoveredStep = index;
          this.draw();
        }
        this.showTooltip(event, index);
      });

      const endDrag = () => {
        this.drag = null;
        this.canvas.classList.remove("dragging");
      };
      this.canvas.addEventListener("pointerup", endDrag);
      this.canvas.addEventListener("pointercancel", endDrag);
      this.canvas.addEventListener("pointerleave", () => {
        if (!this.drag) {
          this.hoveredStep = -1;
          this.tooltip.hidden = true;
          this.draw();
        }
      });

      this.canvas.addEventListener("wheel", (event) => {
        if (event.target !== this.canvas || !this.model) return;
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const oldScale = this.baseScale * this.zoom;
        const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
        const newZoom = Math.max(0.08, Math.min(80, this.zoom * factor));
        const newScale = this.baseScale * newZoom;
        const centerX = this.width / 2 + this.panX;
        const centerY = this.height / 2 + this.panY;
        const anchorX = (point.x - centerX) / oldScale;
        const anchorY = (point.y - centerY) / oldScale;
        this.zoom = newZoom;
        this.panX = point.x - this.width / 2 - anchorX * newScale;
        this.panY = point.y - this.height / 2 - anchorY * newScale;
        this.draw();
      }, { passive: false });

      document.getElementById("zoomInButton").addEventListener("click", () => this.zoomBy(1.35));
      document.getElementById("zoomOutButton").addEventListener("click", () => this.zoomBy(1 / 1.35));
      document.getElementById("resetViewButton").addEventListener("click", () => this.fitView());
    }

    zoomBy(factor) {
      if (!this.model) return;
      this.zoom = Math.max(0.08, Math.min(80, this.zoom * factor));
      this.draw();
    }
  }

  window.CollatzCanvas = CollatzCanvas;
})();
