/* src/js/data/Journal.js */
import { UserData } from './UserData.js';
import { StoryManager } from '../logic/StoryManager.js';

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
            isConfirmed: false,
            savedWordCount: 0 // 初始化基准字数
        };
        
        this.entries.unshift(newEntry); // 新的放最上面
        this.save();
        return newEntry;
    },

    // 更新日记内容 (支持增量字数统计)
    updateEntry(id, content) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.content = content;

            // ✨ 核心逻辑：如果是"已确认"的日记，需要实时同步字数变化
            if (entry.isConfirmed) {
                const newCount = this._countWords(content);
                const oldCount = entry.savedWordCount || 0; // 兼容旧数据
                const diff = newCount - oldCount;

                // 只有字数发生实际变化时才更新 UserData
                if (diff !== 0) {
                    // 1. 更新全局总字数 (diff 可正可负)
                    UserData.updateWordCount(diff);
                    
                    // 2. 更新当前日记的基准值
                    entry.savedWordCount = newCount;
                    
                    // 3. 如果是字数增加，尝试检查剧情里程碑
                    if (diff > 0) {
                        StoryManager.checkWordCountMilestones();
                    }
                }
            }

            this.save();
        }
    },

    // 确认日记（领取墨水 & 首次计入字数）
    confirmEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry && !entry.isConfirmed) {
            entry.isConfirmed = true;

            // 1. 计算当前字数
            const currentCount = this._countWords(entry.content);
            
            // 2. 记录为基准值
            entry.savedWordCount = currentCount;
            
            // 3. 计入生涯总字数
            if (currentCount > 0) {
                UserData.updateWordCount(currentCount);
                // 4. 触发剧情检查
                StoryManager.checkWordCountMilestones();
            }

            this.save();
            return true;
        }
        return false;
    },

    // 删除日记
    deleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index !== -1) {
            const entry = this.entries[index];

            // ✨ 防刷分逻辑：如果删除的是已确认日记，需要扣除它贡献的字数
            if (entry.isConfirmed) {
                const countToRemove = entry.savedWordCount || this._countWords(entry.content);
                if (countToRemove > 0) {
                    UserData.updateWordCount(-countToRemove); // 传入负数进行扣减
                }
            }

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
    },

    // --- 内部工具 ---
    
    // 统一字数统计规则：去除所有空格、换行符后计算长度
    _countWords(text) {
        if (!text) return 0;
        return text.replace(/\s/g, '').length;
    }
};