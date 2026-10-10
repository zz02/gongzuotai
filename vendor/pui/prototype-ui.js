(function () {
  function ensureStylesheet() {
    if (document.querySelector("link[data-pui-style], link[href*='prototype-ui.css']")) return;

    var script = document.currentScript;
    if (!script) {
      var scripts = document.querySelectorAll("script[src*='prototype-ui.js']");
      script = scripts[scripts.length - 1];
    }

    var href = "./prototype-ui-kit/dist/prototype-ui.css";
    if (script) {
      var src = script.getAttribute("src") || script.src;
      href = src.replace(/prototype-ui\.js(\?.*)?$/, "prototype-ui.css$1");
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-pui-style", "auto");
    document.head.appendChild(link);
  }

  ensureStylesheet();

  var lastFocusedElement = null;

  function setLayerState(layer, open) {
    if (!layer) return;
    layer.classList.toggle("is-open", open);
    layer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("pui-layer-open", Boolean(document.querySelector(".pui-modal-mask.is-open, .pui-drawer-mask.is-open")));
    if (open) {
      lastFocusedElement = document.activeElement;
      window.setTimeout(function () {
        var focusTarget = layer.querySelector("[autofocus], input, select, textarea, button, [href]");
        if (focusTarget) focusTarget.focus();
      }, 0);
    } else if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function closeModal(mask) {
    setLayerState(mask, false);
  }

  function openModal(id) {
    var mask = document.getElementById(id);
    setLayerState(mask, true);
  }

  function closeDrawer(mask) {
    setLayerState(mask, false);
  }

  function openDrawer(id) {
    var mask = document.getElementById(id);
    setLayerState(mask, true);
  }

  document.addEventListener("click", function (event) {
    var toastButton = event.target.closest("[data-pui-toast]");
    if (toastButton) {
      window.PUI.toast(toastButton.getAttribute("data-pui-toast") || "操作成功");
    }

    var openButton = event.target.closest("[data-pui-modal-open]");
    if (openButton) {
      openModal(openButton.getAttribute("data-pui-modal-open"));
      return;
    }

    var closeButton = event.target.closest("[data-pui-modal-close]");
    if (closeButton) {
      closeModal(closeButton.closest(".pui-modal-mask"));
      return;
    }

    if (event.target.classList.contains("pui-modal-mask")) {
      closeModal(event.target);
      return;
    }

    var drawerOpenButton = event.target.closest("[data-pui-drawer-open]");
    if (drawerOpenButton) {
      openDrawer(drawerOpenButton.getAttribute("data-pui-drawer-open"));
      return;
    }

    var drawerCloseButton = event.target.closest("[data-pui-drawer-close]");
    if (drawerCloseButton) {
      closeDrawer(drawerCloseButton.closest(".pui-drawer-mask"));
      return;
    }

    if (event.target.classList.contains("pui-drawer-mask")) {
      closeDrawer(event.target);
      return;
    }

    var dateTrigger = event.target.closest("[data-pui-date-trigger]");
    if (dateTrigger) {
      var date = dateTrigger.closest(".pui-date");
      document.querySelectorAll(".pui-date.is-open").forEach(function (item) {
        if (item !== date) item.classList.remove("is-open");
      });
      if (date) date.classList.toggle("is-open");
      return;
    }

    var dateOption = event.target.closest("[data-pui-date-option]");
    if (dateOption) {
      var dateWrap = dateOption.closest(".pui-date");
      if (dateWrap) {
        var value = dateWrap.querySelector("[data-pui-date-value]");
        if (value) value.textContent = dateOption.getAttribute("data-pui-date-option");
        dateWrap.querySelectorAll(".pui-date-grid button").forEach(function (button) {
          button.classList.remove("is-active");
        });
        dateOption.classList.add("is-active");
        return;
      }
    }

    var dateClose = event.target.closest("[data-pui-date-close]");
    if (dateClose) {
      var closeWrap = dateClose.closest(".pui-date");
      if (closeWrap) closeWrap.classList.remove("is-open");
      return;
    }

    var tab = event.target.closest("[data-pui-tab]");
    if (tab) {
      var group = tab.closest("[data-pui-tabs]");
      var target = tab.getAttribute("data-pui-tab");
      if (!group || !target) return;
      group.querySelectorAll("[data-pui-tab]").forEach(function (item) {
        item.classList.toggle("is-active", item === tab);
      });
      document.querySelectorAll('[data-pui-tab-panel="' + target + '"], [data-pui-tab-panel]').forEach(function (panel) {
        if (panel.closest("[data-pui-tab-scope]") && group.closest("[data-pui-tab-scope]") !== panel.closest("[data-pui-tab-scope]")) return;
        panel.classList.toggle("is-active", panel.getAttribute("data-pui-tab-panel") === target);
      });
      return;
    }

    var segment = event.target.closest(".pui-segmented button");
    if (segment) {
      segment.closest(".pui-segmented").querySelectorAll("button").forEach(function (button) {
        button.classList.toggle("is-active", button === segment);
      });
      return;
    }

    var switchButton = event.target.closest(".pui-switch");
    if (switchButton) {
      var checked = !switchButton.classList.contains("is-checked");
      switchButton.classList.toggle("is-checked", checked);
      switchButton.setAttribute("aria-checked", checked ? "true" : "false");
      return;
    }

    var chip = event.target.closest(".pui-chip");
    if (chip) {
      var chipGroup = chip.closest(".pui-chips");
      if (chipGroup) {
        chipGroup.querySelectorAll(".pui-chip").forEach(function (item) {
          item.classList.toggle("is-active", item === chip);
        });
      }
      return;
    }

    var settingsButton = event.target.closest("[data-pui-settings-tab]");
    if (settingsButton) {
      var settings = settingsButton.closest(".pui-settings");
      var settingsTarget = settingsButton.getAttribute("data-pui-settings-tab");
      if (settings) {
        settings.querySelectorAll("[data-pui-settings-tab]").forEach(function (item) {
          item.classList.toggle("is-active", item === settingsButton);
        });
        settings.querySelectorAll("[data-pui-settings-panel]").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-pui-settings-panel") !== settingsTarget;
        });
      }
      return;
    }

    var collapseButton = event.target.closest("[data-pui-collapse]");
    if (collapseButton) {
      var collapseTarget = document.getElementById(collapseButton.getAttribute("data-pui-collapse"));
      if (collapseTarget) {
        var expanded = !collapseTarget.hidden;
        collapseTarget.hidden = expanded;
        collapseButton.setAttribute("aria-expanded", expanded ? "false" : "true");
      }
    }
  });

  document.addEventListener("click", function (event) {
    document.querySelectorAll(".pui-date.is-open").forEach(function (date) {
      if (!date.contains(event.target)) date.classList.remove("is-open");
    });
  });

  document.addEventListener("change", function (event) {
    var selectAll = event.target.closest("[data-pui-check-all]");
    if (!selectAll) return;
    var table = selectAll.closest("table");
    if (!table) return;
    table.querySelectorAll("tbody input[type='checkbox']").forEach(function (checkbox) {
      checkbox.checked = selectAll.checked;
      var row = checkbox.closest("tr");
      if (row) row.classList.toggle("is-selected", selectAll.checked);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var modal = document.querySelector(".pui-modal-mask.is-open");
    var drawer = document.querySelector(".pui-drawer-mask.is-open");
    if (modal) closeModal(modal);
    else if (drawer) closeDrawer(drawer);
    document.querySelectorAll(".pui-date.is-open").forEach(function (date) {
      date.classList.remove("is-open");
    });
  });

  window.PUI = {
    openModal: openModal,
    closeModal: closeModal,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    toast: function (message, duration) {
      var toast = document.querySelector(".pui-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "pui-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = message || "操作成功";
      toast.classList.add("is-open");
      window.clearTimeout(toast.__timer);
      toast.__timer = window.setTimeout(function () {
        toast.classList.remove("is-open");
      }, duration || 1800);
    }
  };
})();

(function () {
  function closeFloating(except) {
    document.querySelectorAll(".pui-dropdown.is-open, .pui-popover.is-open, .pui-picker.is-open").forEach(function (item) {
      if (item !== except) item.classList.remove("is-open");
    });
  }

  function setExpanded(trigger, open) {
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setOpen(wrap, open) {
    if (!wrap) return;
    wrap.classList.toggle("is-open", open);
    setExpanded(wrap.querySelector("[data-pui-dropdown-trigger], [data-pui-popover-trigger], [data-pui-picker-trigger]"), open);
    if (open) {
      window.setTimeout(function () {
        wrap.querySelectorAll(".pui-time-option.is-active").forEach(function (option) {
          option.scrollIntoView({ block: "center" });
        });
      }, 0);
    }
  }

  function selectedTime(wrap) {
    var values = [];
    wrap.querySelectorAll(".pui-time-column").forEach(function (column) {
      var active = column.querySelector(".pui-time-option.is-active");
      values.push(active ? active.textContent.trim() : "00");
    });
    return values.slice(0, 2).join(":") + (values.length > 2 ? ":" + values[2] : "");
  }

  function updatePickerValue(wrap) {
    if (!wrap) return;
    if (wrap.classList.contains("pui-range-picker")) {
      var startOutput = wrap.querySelector("[data-pui-range-start]");
      var endOutput = wrap.querySelector("[data-pui-range-end]");
      var startPart = wrap.querySelector('[data-pui-range-part="start"]');
      var endPart = wrap.querySelector('[data-pui-range-part="end"]');
      var selectedDates = wrap.querySelectorAll(".pui-mini-calendar-grid button.is-active");
      if (startOutput) {
        if (startPart) startOutput.textContent = selectedTime(startPart).slice(0, 5);
        else if (selectedDates[0]) startOutput.textContent = selectedDates[0].getAttribute("data-pui-date-option");
      }
      if (endOutput) {
        if (endPart) endOutput.textContent = selectedTime(endPart).slice(0, 5);
        else if (selectedDates[1]) endOutput.textContent = selectedDates[1].getAttribute("data-pui-date-option");
      }
      if (wrap.classList.contains("pui-datetime-range-picker") && selectedDates.length > 1) {
        if (startOutput) startOutput.textContent = selectedDates[0].getAttribute("data-pui-date-option") + " " + selectedTime(startPart).slice(0, 5);
        if (endOutput) endOutput.textContent = selectedDates[1].getAttribute("data-pui-date-option") + " " + selectedTime(endPart).slice(0, 5);
      }
      return;
    }
    var output = wrap.querySelector("[data-pui-picker-value]");
    if (!output) return;
    var date = wrap.querySelector(".pui-mini-calendar-grid button.is-active");
    var time = selectedTime(wrap);
    if (date && wrap.classList.contains("pui-datetime-picker")) output.textContent = date.getAttribute("data-pui-date-option") + " " + time.slice(0, 5);
    else if (date && wrap.classList.contains("pui-date-picker")) output.textContent = date.getAttribute("data-pui-date-option");
    else if (wrap.classList.contains("pui-time-picker")) output.textContent = time;
  }

  function notify(options) {
    var settings = typeof options === "string" ? { title: options } : (options || {});
    var stack = document.querySelector(".pui-notification-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "pui-notification-stack";
      document.body.appendChild(stack);
    }
    var item = document.createElement("div");
    item.className = "pui-notification";
    item.setAttribute("role", "status");
    item.innerHTML = '<span class="pui-notification-icon">' + (settings.icon || "i") + '</span><div><p class="pui-notification-title"></p><p class="pui-notification-desc"></p></div><button class="pui-notification-close" type="button" aria-label="关闭">×</button>';
    item.querySelector(".pui-notification-title").textContent = settings.title || "操作通知";
    item.querySelector(".pui-notification-desc").textContent = settings.message || "操作已完成。";
    stack.appendChild(item);
    var timer = window.setTimeout(function () { item.remove(); }, settings.duration || 3600);
    item.querySelector(".pui-notification-close").addEventListener("click", function () {
      window.clearTimeout(timer);
      item.remove();
    });
  }

  function toggleSheet(id, open) {
    var sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.toggle("is-open", open);
    sheet.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("pui-layer-open", Boolean(document.querySelector(".pui-mobile-sheet-mask.is-open, .pui-modal-mask.is-open, .pui-drawer-mask.is-open")));
  }

  document.addEventListener("click", function (event) {
    var dropdownTrigger = event.target.closest("[data-pui-dropdown-trigger]");
    if (dropdownTrigger) {
      var dropdown = dropdownTrigger.closest(".pui-dropdown");
      var willOpen = dropdown && !dropdown.classList.contains("is-open");
      closeFloating(dropdown);
      setOpen(dropdown, willOpen);
      return;
    }

    var popoverTrigger = event.target.closest("[data-pui-popover-trigger]");
    if (popoverTrigger) {
      var popover = popoverTrigger.closest(".pui-popover");
      var popoverOpen = popover && !popover.classList.contains("is-open");
      closeFloating(popover);
      setOpen(popover, popoverOpen);
      return;
    }

    var pickerTrigger = event.target.closest("[data-pui-picker-trigger]");
    if (pickerTrigger && !pickerTrigger.disabled) {
      var picker = pickerTrigger.closest(".pui-picker");
      var pickerOpen = picker && !picker.classList.contains("is-open");
      closeFloating(picker);
      setOpen(picker, pickerOpen);
      return;
    }

    var closePicker = event.target.closest("[data-pui-picker-close]");
    if (closePicker) {
      var pickerWrap = closePicker.closest(".pui-picker");
      if (closePicker.hasAttribute("data-pui-picker-confirm")) updatePickerValue(pickerWrap);
      setOpen(pickerWrap, false);
      return;
    }

    var timeOption = event.target.closest(".pui-time-option");
    if (timeOption) {
      var column = timeOption.closest(".pui-time-column");
      column.querySelectorAll(".pui-time-option").forEach(function (button) { button.classList.toggle("is-active", button === timeOption); });
      return;
    }

    var calendarOption = event.target.closest(".pui-mini-calendar-grid [data-pui-date-option]");
    if (calendarOption) {
      var miniGrid = calendarOption.closest(".pui-mini-calendar-grid");
      var rangePicker = calendarOption.closest(".pui-range-picker");
      if (rangePicker) {
        var activeDates = Array.prototype.slice.call(miniGrid.querySelectorAll("button.is-active"));
        if (activeDates.length >= 2) miniGrid.querySelectorAll("button").forEach(function (button) { button.classList.remove("is-active", "is-range"); });
        calendarOption.classList.add("is-active");
        activeDates = Array.prototype.slice.call(miniGrid.querySelectorAll("button.is-active"));
        if (activeDates.length === 2) {
          var allDates = Array.prototype.slice.call(miniGrid.querySelectorAll("button"));
          var startIndex = allDates.indexOf(activeDates[0]);
          var endIndex = allDates.indexOf(activeDates[1]);
          if (startIndex > endIndex) { var temp = startIndex; startIndex = endIndex; endIndex = temp; }
          allDates.forEach(function (button, index) { button.classList.toggle("is-range", index > startIndex && index < endIndex); });
        }
      } else {
        miniGrid.querySelectorAll("button").forEach(function (button) { button.classList.toggle("is-active", button === calendarOption); });
      }
      return;
    }

    var genericOption = event.target.closest("[data-pui-select-value]");
    if (genericOption) {
      var selectWrap = genericOption.closest(".pui-dropdown, .pui-autocomplete");
      var selectOutput = selectWrap && selectWrap.querySelector("[data-pui-select-output]");
      if (selectOutput) {
        if (selectOutput.matches("input")) selectOutput.value = genericOption.getAttribute("data-pui-select-value");
        else selectOutput.textContent = genericOption.getAttribute("data-pui-select-value");
      }
      setOpen(selectWrap, false);
      return;
    }

    var collapseTrigger = event.target.closest("[data-pui-collapse-target]");
    if (collapseTrigger) {
      var content = document.getElementById(collapseTrigger.getAttribute("data-pui-collapse-target"));
      if (content) {
        var expanded = collapseTrigger.getAttribute("aria-expanded") === "true";
        collapseTrigger.setAttribute("aria-expanded", expanded ? "false" : "true");
        content.hidden = expanded;
      }
      return;
    }

    var numberButton = event.target.closest("[data-pui-number-step]");
    if (numberButton) {
      var numberWrap = numberButton.closest(".pui-input-number, .pui-mobile-stepper");
      var numberInput = numberWrap && numberWrap.querySelector("input");
      if (numberInput) {
        var step = Number(numberButton.getAttribute("data-pui-number-step")) || 0;
        var min = numberInput.min === "" ? -Infinity : Number(numberInput.min);
        var max = numberInput.max === "" ? Infinity : Number(numberInput.max);
        numberInput.value = Math.min(max, Math.max(min, (Number(numberInput.value) || 0) + step));
        numberInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }

    var rateButton = event.target.closest(".pui-rate button");
    if (rateButton) {
      var rate = rateButton.closest(".pui-rate");
      var buttons = Array.prototype.slice.call(rate.querySelectorAll("button"));
      var rating = buttons.indexOf(rateButton) + 1;
      buttons.forEach(function (button, index) { button.classList.toggle("is-active", index < rating); });
      rate.setAttribute("data-value", String(rating));
      rate.setAttribute("aria-label", rating + " 星");
      return;
    }

    var color = event.target.closest(".pui-color-swatch");
    if (color) {
      var palette = color.closest(".pui-color-picker");
      palette.querySelectorAll(".pui-color-swatch").forEach(function (swatch) { swatch.classList.toggle("is-active", swatch === color); });
      palette.setAttribute("data-value", color.getAttribute("data-color") || "");
      return;
    }

    var treeToggle = event.target.closest(".pui-tree-toggle");
    if (treeToggle) {
      var tree = treeToggle.closest(".pui-tree");
      var parent = treeToggle.closest(".pui-tree-node");
      var level = Number(parent.getAttribute("data-level") || 1);
      var next = parent.nextElementSibling;
      var opening = treeToggle.getAttribute("aria-expanded") !== "true";
      treeToggle.setAttribute("aria-expanded", opening ? "true" : "false");
      treeToggle.textContent = opening ? "▾" : "▸";
      while (next && Number(next.getAttribute("data-level") || 1) > level) {
        next.hidden = !opening;
        next = next.nextElementSibling;
      }
      return;
    }

    var transferButton = event.target.closest("[data-pui-transfer]");
    if (transferButton) {
      var transfer = transferButton.closest(".pui-transfer");
      var direction = transferButton.getAttribute("data-pui-transfer");
      var panels = transfer.querySelectorAll(".pui-transfer-panel");
      var from = direction === "right" ? panels[0] : panels[1];
      var to = direction === "right" ? panels[1] : panels[0];
      from.querySelectorAll(".pui-transfer-item input:checked").forEach(function (checkbox) {
        checkbox.checked = false;
        to.querySelector(".pui-transfer-list").appendChild(checkbox.closest(".pui-transfer-item"));
      });
      return;
    }

    var carouselDot = event.target.closest(".pui-carousel-dot");
    if (carouselDot) {
      var carousel = carouselDot.closest(".pui-carousel");
      var dots = Array.prototype.slice.call(carousel.querySelectorAll(".pui-carousel-dot"));
      var index = dots.indexOf(carouselDot);
      carousel.querySelector(".pui-carousel-track").style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (dot) { dot.classList.toggle("is-active", dot === carouselDot); });
      return;
    }

    var notifyTrigger = event.target.closest("[data-pui-notification]");
    if (notifyTrigger) {
      notify({ title: notifyTrigger.getAttribute("data-pui-notification") || "操作通知", message: notifyTrigger.getAttribute("data-pui-notification-message") || "操作已完成。" });
      return;
    }

    var sheetOpen = event.target.closest("[data-pui-sheet-open]");
    if (sheetOpen) {
      toggleSheet(sheetOpen.getAttribute("data-pui-sheet-open"), true);
      return;
    }
    var sheetClose = event.target.closest("[data-pui-sheet-close]");
    if (sheetClose) {
      toggleSheet(sheetClose.closest(".pui-mobile-sheet-mask").id, false);
      return;
    }
    if (event.target.classList.contains("pui-mobile-sheet-mask")) {
      toggleSheet(event.target.id, false);
      return;
    }

    var swipe = event.target.closest(".pui-mobile-swipe-content");
    if (swipe) {
      swipe.closest(".pui-mobile-swipe").classList.toggle("is-open");
      return;
    }

    var tabbarButton = event.target.closest(".pui-mobile-tabbar button");
    if (tabbarButton) {
      tabbarButton.closest(".pui-mobile-tabbar").querySelectorAll("button").forEach(function (button) { button.classList.toggle("is-active", button === tabbarButton); });
      return;
    }

    var viewerOpen = event.target.closest("[data-pui-viewer-open]");
    if (viewerOpen) {
      var viewer = document.getElementById(viewerOpen.getAttribute("data-pui-viewer-open"));
      if (viewer) {
        viewer.classList.add("is-open");
        viewer.setAttribute("aria-hidden", "false");
        document.body.classList.add("pui-layer-open");
      }
      return;
    }

    var viewerClose = event.target.closest("[data-pui-viewer-close]");
    if (viewerClose) {
      var viewerWrap = viewerClose.closest(".pui-image-viewer");
      if (viewerWrap) {
        viewerWrap.classList.remove("is-open");
        viewerWrap.setAttribute("aria-hidden", "true");
        document.body.classList.remove("pui-layer-open");
      }
      return;
    }

    var reorderButton = event.target.closest("[data-pui-reorder-move]");
    if (reorderButton) {
      var reorderItem = reorderButton.closest(".pui-reorder-item");
      var direction = reorderButton.getAttribute("data-pui-reorder-move");
      if (direction === "up" && reorderItem.previousElementSibling) reorderItem.parentNode.insertBefore(reorderItem, reorderItem.previousElementSibling);
      if (direction === "down" && reorderItem.nextElementSibling) reorderItem.parentNode.insertBefore(reorderItem.nextElementSibling, reorderItem);
      return;
    }

    if (!event.target.closest(".pui-dropdown, .pui-popover, .pui-picker")) closeFloating();
  });

  document.addEventListener("input", function (event) {
    if (event.target.matches(".pui-slider")) {
      var row = event.target.closest(".pui-slider-row");
      var output = row && row.querySelector(".pui-slider-value");
      if (output) output.textContent = event.target.value;
    }
    if (event.target.matches("[data-pui-avatar-scale]")) {
      var crop = event.target.closest(".pui-avatar-crop");
      var image = crop && crop.querySelector(".pui-avatar-crop-image");
      if (image) image.style.setProperty("--pui-avatar-scale", event.target.value);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeFloating();
    var sheet = document.querySelector(".pui-mobile-sheet-mask.is-open");
    if (sheet) toggleSheet(sheet.id, false);
    var viewer = document.querySelector(".pui-image-viewer.is-open");
    if (viewer) {
      viewer.classList.remove("is-open");
      viewer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("pui-layer-open");
    }
  });

  window.PUI = window.PUI || {};
  window.PUI.notification = notify;
  window.PUI.openSheet = function (id) { toggleSheet(id, true); };
  window.PUI.closeSheet = function (id) { toggleSheet(id, false); };

  function fillTimeColumn(column) {
    if (column.children.length) return;
    var kind = column.getAttribute("data-pui-time-column") || "minute";
    var max = kind === "hour" ? 23 : 59;
    var step = Number(column.getAttribute("data-step")) || (kind === "hour" ? 1 : 5);
    var selected = column.getAttribute("data-value") || "00";
    for (var value = 0; value <= max; value += step) {
      var label = String(value).padStart(2, "0");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pui-time-option" + (label === selected ? " is-active" : "");
      button.textContent = label;
      column.appendChild(button);
    }
  }

  function hydrate() {
    document.querySelectorAll(".pui-time-column[data-pui-time-column]").forEach(fillTimeColumn);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hydrate);
  else hydrate();
})();
