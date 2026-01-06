/* src/js/data/Library.js */

// 定义系统书籍内容
const GUIDE_BOOK_I = {
    id: "guide_book_part1",
    title: "伊萨卡手记 I：出发",
    cover: "assets/images/booksheet/booksheet0.png",
    date: "系统指南",
    isReadOnly: true, // 🔒 核心标记：只读
    content: `
# 导言：为何我们要书写？

> "当你启程前往伊萨卡，但愿你的道路漫长，充满奇迹，充满发现。" —— 康斯坦丁·卡瓦菲斯

## 1. 叙事与存在
哲学家保罗·利科（Paul Ricoeur）曾提出一个核心观点：**我们并非通过生物学特征定义自我，而是通过“叙事身份”（Narrative Identity）来确认我是谁。**
生活本身是混乱的、碎片化的、充满噪音的。如果不去整理，时间就会像流沙一样从指缝溜走。而**书写**，就是一种将无序的时间编织成有序情节的技艺。

## 2. 为什么是“伊萨卡”？
在荷马史诗《奥德赛》中，奥德修斯在海上漂泊十年，只为回到故乡伊萨卡。在这款应用中，“房间”就是你的伊萨卡——它是你精神的避难所。 书写则是你探索自我、理解世界的航程。每一篇日记、每一段文字，都是你驶向内心伊萨卡的桨。
现在，请拿起笔。在这个房间里，只有你是唯一的叙事者。
`
};

export const Library = {
    books: [],
    
   async init() {
        // 1. 读取存档
        const saved = await window.ithacaSystem.loadData('library_data.json');
        if (saved) {
            this.books = JSON.parse(saved);
        } else {
            this.books = [];
        }

        // --- 🧹 现有逻辑：清理旧的系统书 ---
        this.books = this.books.filter(b => {
            const isOldSystemBook = (b.title.includes("伊萨卡手记") && b.id !== GUIDE_BOOK_I.id && !b.isMystery);
            return !isOldSystemBook;
        });

        // --- 🛠️ 现有逻辑：注入/更新《伊萨卡手记 I》 ---
        const guideIndex = this.books.findIndex(b => b.id === GUIDE_BOOK_I.id);
        if (guideIndex === -1) {
            this.books.unshift(GUIDE_BOOK_I);
        } else {
            this.books[guideIndex] = { 
                ...this.books[guideIndex], 
                content: GUIDE_BOOK_I.content,
                isReadOnly: true,
                title: GUIDE_BOOK_I.title
            };
        }

        // ============================================================
        // ✨ 新增修复逻辑：强制更新《糖水菠萝的日记》的封面
        // ============================================================
        const targetBookId = "book_pineapple_diary_complete";
        const pineappleBook = this.books.find(b => b.id === targetBookId);
        
        if (pineappleBook) {
            // 强制覆盖为新的绿色封面 (booksheet1)
            pineappleBook.cover = "assets/images/booksheet/booksheet1.png"; 
            
            // 顺手再次确保它是只读的
            pineappleBook.isReadOnly = true; 
            
            console.log("已修复《糖水菠萝的日记》封面与属性");
        }

        // 3. 保存更改到硬盘
        this.save(); 
    },async init() {
        // 1. 读取存档
        const saved = await window.ithacaSystem.loadData('library_data.json');
        if (saved) {
            this.books = JSON.parse(saved);
        } else {
            this.books = [];
        }

        // --- 🧹 现有逻辑：清理旧的系统书 ---
        this.books = this.books.filter(b => {
            const isOldSystemBook = (b.title.includes("伊萨卡手记") && b.id !== GUIDE_BOOK_I.id && !b.isMystery);
            return !isOldSystemBook;
        });

        // --- 🛠️ 现有逻辑：注入/更新《伊萨卡手记 I》 ---
        const guideIndex = this.books.findIndex(b => b.id === GUIDE_BOOK_I.id);
        if (guideIndex === -1) {
            this.books.unshift(GUIDE_BOOK_I);
        } else {
            this.books[guideIndex] = { 
                ...this.books[guideIndex], 
                content: GUIDE_BOOK_I.content,
                isReadOnly: true,
                title: GUIDE_BOOK_I.title
            };
        }

        // ============================================================
        // ✨ 新增修复逻辑：强制更新《糖水菠萝的日记》的封面
        // ============================================================
        const targetBookId = "book_pineapple_diary_complete";
        const pineappleBook = this.books.find(b => b.id === targetBookId);
        
        if (pineappleBook) {
            // 强制覆盖为新的绿色封面 (booksheet1)
            pineappleBook.cover = "assets/images/booksheet/booksheet1.png"; 
            
            // 顺手再次确保它是只读的
            pineappleBook.isReadOnly = true; 
            
            console.log("已修复《糖水菠萝的日记》封面与属性");
        }

        // 3. 保存更改到硬盘
        this.save(); 
    },

    // 增
    addBook(book) {
        this.books.push(book);
        this.save();
    },

    // 特殊增加逻辑
    addMysteryBook(data) {
        const mysteryBook = {
            id: "mystery_book_01", // 这里如果以后有多本神秘书，建议用 uuid 或传入 ID
            title: data.title,
            author: data.author,
            content: data.content,
            cover: data.cover,
            isMystery: true,
            isCollected: true
        };
        
        if (!this.books.find(b => b.id === mysteryBook.id)) {
            this.books.unshift(mysteryBook);
            this.save();
        }
    },

    // 改 (合并后的版本)
    updateBook(id, title, content) {
        const book = this.books.find(b => b.id === id);
        if (book) {
            // 🔒 保护逻辑
            if (book.isReadOnly) {
                console.warn("试图修改只读书籍，操作被拦截");
                return false; // 返回 false 表示失败
            }
            book.title = title;
            book.content = content;
            this.save();
            return true; // 返回 true 表示成功
        }
        return false;
    },

    // 删 (合并后的版本，去掉了 deleteBook，统一用 removeBook)
    removeBook(id) {
        const book = this.books.find(b => b.id === id);
        
        // 🔒 保护逻辑
        if (book && book.isReadOnly) {
            console.warn(`书籍 ${book.title} 是系统书籍，无法销毁。`);
            return false; 
        }

        const initialLength = this.books.length;
        this.books = this.books.filter(b => b.id !== id);
        
        if (this.books.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    },

    // 查
    getAll() {
        return this.books;
    },

    // 存
    save() {
        window.ithacaSystem.saveData('library_data.json', JSON.stringify(this.books));
    }
};