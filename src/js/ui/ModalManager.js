/* src/js/ui/ModalManager.js */
export const ModalManager = {
    // 注册所有的弹窗 ID
    modals: [
        'modal-mailbox', 'modal-letter', 'modal-desk', 
        'modal-bookshelf-ui', 'modal-shop', 'modal-backpack',
        'workbench-modal', 'reader-modal', 'modal-map-selection',
        'modal-create-notebook'
    ],

    init() {
        // 绑定所有关闭按钮（带有 .btn-close-modal 类或特定 ID 的）
        document.querySelectorAll('.btn-close-modal, .close-text-btn, .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 找到最近的 modal-overlay 父级并关闭
                const modal = btn.closest('.modal-overlay');
                if (modal) this.close(modal.id);
            });
        });
        
        // 绑定遮罩层点击关闭 (可选)
        /* this.modals.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('click', (e) => {
                    if(e.target === el) this.close(id);
                });
            }
        });
        */
    },

    open(modalId) {
        // 1. 关闭所有其他全屏弹窗 (互斥)
        this.closeAll();
        
        // 2. 打开目标弹窗
        const el = document.getElementById(modalId);
        if (el) {
            el.style.display = 'flex';
        } else {
            console.warn(`[ModalManager] 找不到弹窗 ID: ${modalId}`);
        }
    },

    close(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = 'none';
    },

    closeAll() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
    }
};