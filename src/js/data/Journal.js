/* src/js/data/Journal.js - Electron 版 */
export const Journal = {
    entries: [], 

    // 初始化：从本地文件加载数据
    async init() {
        // 调用 preload.js 暴露的接口读取文件
        const saved = await window.ithacaSystem.loadData('journal_data.json');
        if (saved) {
            this.entries = JSON.parse(saved);
        }
        
        // 如果完全没有日记（第一次运行），默认建一篇
        if (this.entries.length === 0) {
            this.createNewEntry();
        }
    },

    // 创建新日记
    createNewEntry() {
        const now = new Date();
        const dateStr = now.toLocaleDateString(); 
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const newEntry = {
            id: Date.now(),
            date: dateStr,
            time: timeStr,
            content: "", 
            isConfirmed: false 
        };
        
        this.entries.unshift(newEntry); // 新的放最上面
        this.save();
        return newEntry;
    },

    // 更新日记内容
    updateEntry(id, content) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.content = content;
            this.save();
        }
    },

    // 确认日记（领取墨水）
    confirmEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry && !entry.isConfirmed) {
            entry.isConfirmed = true;
            this.save();
            return true;
        }
        return false;
    },

    // 删除日记
    deleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index !== -1) {
            this.entries.splice(index, 1); // 从数组中移除
            this.save();
            return true;
        }
        return false;
    },    

    getAll() {
        return this.entries;
    },

    // 保存：写入到本地硬盘
    save() {
        window.ithacaSystem.saveData('journal_data.json', JSON.stringify(this.entries));
    }
};