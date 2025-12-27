/* src/js/data/Library.js - Electron 版 */
export const Library = {
    books: [],

    // 初始化：从本地文件加载书籍数据
    async init() {
        const saved = await window.ithacaSystem.loadData('library_data.json');
        if (saved) {
            this.books = JSON.parse(saved);
        }
    },

    // 保存：写入到本地硬盘
    save() {
        window.ithacaSystem.saveData('library_data.json', JSON.stringify(this.books));
    },

    addBook(book) {
        this.books.push(book);
        this.save();
    },

    updateBook(id, newTitle, newContent) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            book.title = newTitle;
            book.content = newContent;
            this.save();
            return true;
        }
        return false;
    },

    // 删除书籍
    deleteBook(id) {
        const index = this.books.findIndex(b => b.id === id);
        if (index !== -1) {
            this.books.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },

    getAll() {
        return this.books;
    }
};