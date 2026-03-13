/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ListRenderer } from "@web/views/list/list_renderer";
import { onMounted, onPatched, onWillRender } from "@odoo/owl";
import { browser } from "@web/core/browser/browser";

/**
 * SM Dynamic List View
 * Allows dragging columns to reorder them in list views
 * Order is persisted in localStorage per model
 */

const STORAGE_KEY_PREFIX = "sm_list_column_order_";

patch(ListRenderer.prototype, {
    setup() {
        super.setup(...arguments);
        
        onMounted(() => {
            this._smSetupDraggableColumns();
        });
        
        onPatched(() => {
            this._smSetupDraggableColumns();
        });
    },

    /**
     * Get storage key for current model
     */
    _smGetStorageKey() {
        const resModel = this.props.list?.resModel || "unknown";
        return STORAGE_KEY_PREFIX + resModel;
    },

    /**
     * Load saved column order from localStorage
     */
    _smLoadColumnOrder() {
        try {
            const saved = browser.localStorage.getItem(this._smGetStorageKey());
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn("[SM] Error loading column order:", e);
            return null;
        }
    },

    /**
     * Save column order to localStorage
     */
    _smSaveColumnOrder(columnNames) {
        try {
            browser.localStorage.setItem(this._smGetStorageKey(), JSON.stringify(columnNames));
        } catch (e) {
            console.warn("[SM] Error saving column order:", e);
        }
    },

    /**
     * Setup draggable columns
     */
    _smSetupDraggableColumns() {
        const tableEl = this.tableRef?.el;
        if (!tableEl) return;
        
        const headerRow = tableEl.querySelector("thead tr");
        if (!headerRow) return;
        
        // Get all column headers (th elements with data-name)
        const headers = headerRow.querySelectorAll("th[data-name]:not(.sm-drag-setup)");
        
        headers.forEach((th) => {
            th.classList.add("sm-drag-setup", "sm-draggable-column");
            th.setAttribute("draggable", "true");
            
            th.addEventListener("dragstart", (e) => this._smOnDragStart(e, th));
            th.addEventListener("dragover", (e) => this._smOnDragOver(e, th));
            th.addEventListener("dragenter", (e) => this._smOnDragEnter(e, th));
            th.addEventListener("dragleave", (e) => this._smOnDragLeave(e, th));
            th.addEventListener("drop", (e) => this._smOnDrop(e, th));
            th.addEventListener("dragend", (e) => this._smOnDragEnd(e, th));
        });
    },

    /**
     * Override getActiveColumns to apply saved order
     */
    getActiveColumns(list) {
        let columns = super.getActiveColumns(list);
        
        const savedOrder = this._smLoadColumnOrder();
        if (!savedOrder || savedOrder.length === 0) {
            return columns;
        }
        
        // Reorder columns based on saved order
        const columnMap = new Map(columns.map(col => [col.name, col]));
        const reordered = [];
        
        // First add columns in saved order
        for (const name of savedOrder) {
            if (columnMap.has(name)) {
                reordered.push(columnMap.get(name));
                columnMap.delete(name);
            }
        }
        
        // Then add any remaining columns
        for (const col of columnMap.values()) {
            reordered.push(col);
        }
        
        return reordered.length > 0 ? reordered : columns;
    },

    _smOnDragStart(e, th) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", th.dataset.name);
        th.classList.add("sm-dragging");
        this._smDraggedColumn = th.dataset.name;
    },

    _smOnDragOver(e, th) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    },

    _smOnDragEnter(e, th) {
        e.preventDefault();
        if (th.dataset.name !== this._smDraggedColumn) {
            th.classList.add("sm-drag-over");
        }
    },

    _smOnDragLeave(e, th) {
        th.classList.remove("sm-drag-over");
    },

    _smOnDrop(e, th) {
        e.preventDefault();
        th.classList.remove("sm-drag-over");
        
        const draggedName = e.dataTransfer.getData("text/plain");
        const targetName = th.dataset.name;
        
        if (draggedName === targetName) return;
        
        // Reorder columns
        const columns = [...this.columns];
        const draggedIdx = columns.findIndex(c => c.name === draggedName);
        const targetIdx = columns.findIndex(c => c.name === targetName);
        
        if (draggedIdx !== -1 && targetIdx !== -1) {
            const [dragged] = columns.splice(draggedIdx, 1);
            columns.splice(targetIdx, 0, dragged);
            
            // Save order and trigger re-render
            const columnNames = columns.map(c => c.name);
            this._smSaveColumnOrder(columnNames);
            
            // Update columns and re-render
            this.columns = columns;
            this.render();
        }
    },

    _smOnDragEnd(e, th) {
        th.classList.remove("sm-dragging");
        document.querySelectorAll(".sm-drag-over").forEach(el => {
            el.classList.remove("sm-drag-over");
        });
        this._smDraggedColumn = null;
    },
});
