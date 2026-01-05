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
        this.currentBookId = book.id;
        ModalManager.open('reader-modal');
        
        document.getElementById('reader-title').innerText = book.title;
        document.getElementById('reader-text').innerHTML = marked.parse(book.content, {breaks:true});
        
        // 填充编辑框，以备用户点击编辑
        const titleInput = document.getElementById('reader-title-input');
        const contentInput = document.getElementById('reader-content-input');
        if(titleInput) titleInput.value = book.title;
        if(contentInput) contentInput.value = book.content;
        
        this.toggleEditMode(false);
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
            Library.deleteBook(this.currentBookId);
            HUDRenderer.log("销毁了一本书籍。");
            ModalManager.close('reader-modal');
            this.render();
        }
    },

    toggleEditMode(isEdit) {
        const viewMode = document.getElementById('reader-view-mode');
        const editMode = document.getElementById('reader-edit-mode');
        const btnEdit = document.getElementById('btn-edit-book');
        
        if(viewMode) viewMode.style.display = isEdit ? 'none' : 'block';
        if(editMode) editMode.style.display = isEdit ? 'flex' : 'none';
        if(btnEdit) btnEdit.style.display = isEdit ? 'none' : 'inline-block';
    },

    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    }
};