odoo.define('sm_dynamic_list_view.ListRenderer', function (require) {
"use strict";

var ListRenderer = require('web.ListRenderer');

const STORAGE_KEY_PREFIX = "sm_list_column_order_";

ListRenderer.include({
    /**
     * Get storage key for current model
     */
    _smGetStorageKey: function () {
        const resModel = (this.state && this.state.model) || (this.state && this.state.modelName) || "unknown";
        return STORAGE_KEY_PREFIX + resModel;
    },

    /**
     * Load saved column order from localStorage
     */
    _smLoadColumnOrder: function () {
        try {
            const saved = localStorage.getItem(this._smGetStorageKey());
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn("[SM] Error loading column order:", e);
            return null;
        }
    },

    /**
     * Save column order to localStorage
     */
    _smSaveColumnOrder: function (columnNames) {
        try {
            localStorage.setItem(this._smGetStorageKey(), JSON.stringify(columnNames));
        } catch (e) {
            console.warn("[SM] Error saving column order:", e);
        }
    },

    /**
     * Override _processColumns to apply saved order
     */
    _processColumns: function () {
        this._super.apply(this, arguments);
        
        const savedOrder = this._smLoadColumnOrder();
        if (savedOrder && savedOrder.length > 0) {
            const columnMap = new Map(this.columns.map(col => [col.attrs.name, col]));
            const reordered = [];
            
            for (const name of savedOrder) {
                if (columnMap.has(name)) {
                    reordered.push(columnMap.get(name));
                    columnMap.delete(name);
                }
            }
            
            for (const col of columnMap.values()) {
                reordered.push(col);
            }
            
            if (reordered.length > 0) {
                this.columns = reordered;
            }
        }
    },

    /**
     * Override _renderView to attach drag/drop listeners
     */
    _renderView: function () {
        return this._super.apply(this, arguments).then(() => {
            this._smSetupDraggableColumns();
        });
    },

    /**
     * Setup draggable columns on header cells
     */
    _smSetupDraggableColumns: function () {
        const self = this;
        const $headers = this.$('thead th[data-name]:not(.sm-drag-setup)');
        
        $headers.each(function () {
            const $th = $(this);
            $th.addClass('sm-drag-setup sm-draggable-column');
            $th.attr('draggable', 'true');
            
            this.addEventListener('dragstart', (e) => self._smOnDragStart(e, $th));
            this.addEventListener('dragover', (e) => self._smOnDragOver(e, $th));
            this.addEventListener('dragenter', (e) => self._smOnDragEnter(e, $th));
            this.addEventListener('dragleave', (e) => self._smOnDragLeave(e, $th));
            this.addEventListener('drop', (e) => self._smOnDrop(e, $th));
            this.addEventListener('dragend', (e) => self._smOnDragEnd(e, $th));
        });
    },

    _smOnDragStart: function (e, $th) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", $th.data('name'));
        $th.addClass("sm-dragging");
        this._smDraggedColumn = $th.data('name');
    },

    _smOnDragOver: function (e, $th) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    },

    _smOnDragEnter: function (e, $th) {
        e.preventDefault();
        if ($th.data('name') !== this._smDraggedColumn) {
            $th.addClass("sm-drag-over");
        }
    },

    _smOnDragLeave: function (e, $th) {
        $th.removeClass("sm-drag-over");
    },

    _smOnDrop: function (e, $th) {
        e.preventDefault();
        $th.removeClass("sm-drag-over");
        
        const draggedName = e.dataTransfer.getData("text/plain");
        const targetName = $th.data('name');
        
        if (draggedName === targetName) return;
        
        const columns = [...this.columns];
        const draggedIdx = columns.findIndex(c => c.attrs.name === draggedName);
        const targetIdx = columns.findIndex(c => c.attrs.name === targetName);
        
        if (draggedIdx !== -1 && targetIdx !== -1) {
            const [dragged] = columns.splice(draggedIdx, 1);
            columns.splice(targetIdx, 0, dragged);
            
            const columnNames = columns.map(c => c.attrs.name);
            this._smSaveColumnOrder(columnNames);
            
            // Re-process columns and re-render the view
            this._processColumns(this.columnInvisibleFields);
            this._render();
        }
    },

    _smOnDragEnd: function (e, $th) {
        $th.removeClass("sm-dragging");
        this.$('.sm-drag-over').removeClass('sm-drag-over');
        this._smDraggedColumn = null;
    },
});

});
