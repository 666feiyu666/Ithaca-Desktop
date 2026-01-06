/* src/js/ui/BookshelfRenderer.js */
import { Library } from '../data/Library.js';
import { ModalManager } from './ModalManager.js';
import { HUDRenderer } from './HUDRenderer.js'; // 用于记录日志
import { marked } from '../libs/marked.esm.js';

export const BookshelfRenderer = {
    currentBookId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // 阅读器内部按钮
        this._bindClick('btn-delete-book', () => this.handleDeleteBook());
        this._bindClick('btn-edit-book', () => this.toggleEditMode(true));
        this._bindClick('btn-cancel-edit', () => this.toggleEditMode(false));
        this._bindClick('btn-save-book', () => this.handleSaveBook());
    },

    render() {
        const container = document.getElementById('bookshelf');
        if (!container) return;
        
        container.innerHTML = "";
        Library.getAll().forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-item-container';
            if(book.isMystery) div.style.filter = "sepia(0.2) drop-shadow(0 0 5px gold)";
            
            div.innerHTML = `
                <img src="${book.cover||'assets/images/booksheet/booksheet1.png'}" class="book-cover-img">
                <div class="book-title-text">${book.title}</div>
            `;
            
            div.onclick = () => this.openBook(book);
            container.appendChild(div);
        });
    },

    openBook(book) {
        console.log("正在打开书籍:", book.title, "ID:", book.id, "只读:", book.isReadOnly);

        // 1. 立即更新当前 ID
        this.currentBookId = book.id;
        
        // 2. 强制重置 UI 到“阅读模式”（防止上一次关闭时还停留在编辑模式）
        this.toggleEditMode(false);

        ModalManager.open('reader-modal');
        
        // 3. 填充阅读内容
        const titleEl = document.getElementById('reader-title');
        const contentEl = document.getElementById('reader-text');
        if(titleEl) titleEl.innerText = book.title;
        if(contentEl) contentEl.innerHTML = marked.parse(book.content);

        // 4. 获取所有相关按钮
        const btnDelete = document.getElementById('btn-delete-book');
        const btnEdit = document.getElementById('btn-edit-book');
        const btnSave = document.getElementById('btn-save-book'); // 获取保存按钮以备不时之需

        // 5. 🔒 按钮显隐逻辑 (使用 strict 判断)
        if (book.isReadOnly === true) {
            // 只读模式：强力隐藏
            if(btnDelete) btnDelete.style.setProperty('display', 'none', 'important');
            if(btnEdit)   btnEdit.style.setProperty('display', 'none', 'important');
        } else {
            // 编辑模式：恢复显示
            if(btnDelete) btnDelete.style.display = 'inline-block';
            if(btnEdit)   btnEdit.style.display = 'inline-block';
            
            // 预填充编辑框（防止打开编辑框时是空的）
            const titleInput = document.getElementById('reader-title-input');
            const contentInput = document.getElementById('reader-content-input');
            if(titleInput) titleInput.value = book.title;
            if(contentInput) contentInput.value = book.content;
        }
    },

    toggleEditMode(isEdit) {
        // 增加安全检查
        if (isEdit) {
            // 如果试图进入编辑模式，再次检查当前书是否允许编辑
            const currentBook = Library.getAll().find(b => b.id === this.currentBookId);
            if (currentBook && currentBook.isReadOnly) {
                console.warn("阻止进入编辑模式：书籍是只读的");
                return; // 直接打断
            }
        }

        const viewMode = document.getElementById('reader-view-mode');
        const editMode = document.getElementById('reader-edit-mode');
        const btnEdit = document.getElementById('btn-edit-book');
        
        if(viewMode) viewMode.style.display = isEdit ? 'none' : 'block';
        if(editMode) editMode.style.display = isEdit ? 'flex' : 'none';
        
        // 编辑模式下隐藏“编辑”按钮，非编辑模式下显示（前提是它不是只读的）
        if(btnEdit && !isEdit) {
             const currentBook = Library.getAll().find(b => b.id === this.currentBookId);
             if (currentBook && !currentBook.isReadOnly) {
                 btnEdit.style.display = 'inline-block';
             }
        } else if (btnEdit && isEdit) {
            btnEdit.style.display = 'none';
        }
    },

    handleSaveBook() {
        const id = this.currentBookId;
        const newTitle = document.getElementById('reader-title-input').value;
        const newContent = document.getElementById('reader-content-input').value;

        if (!newTitle || !newContent) return alert("内容不能为空");

        Library.updateBook(id, newTitle, newContent);
        
        // 刷新显示
        document.getElementById('reader-title').innerText = newTitle;
        document.getElementById('reader-text').innerHTML = marked.parse(newContent, {breaks:true});
        
        this.render(); // 刷新书架封面标题
        this.toggleEditMode(false);
        HUDRenderer.log(`已修订书籍：《${newTitle}》`);
    },

    handleDeleteBook() {
        if (!this.currentBookId) return;
        
        if (confirm("确定要销毁这本书吗？")) {
            // ✨ 修复：这里原来调用的是 deleteBook，现在改为 removeBook
            // 并且接收返回值判断是否删除成功
            const success = Library.removeBook(this.currentBookId);
            
            if (success) {
                HUDRenderer.log("销毁了一本书籍。");
                ModalManager.close('reader-modal');
                this.render(); // 刷新书架
            } else {
                alert("无法销毁：可能是系统书籍或数据出错。");
            }
        }
    },

    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    }
};