/* src/js/data/UserData.js */
import { Journal } from './Journal.js';

export const UserData = {
    state: {
        startDate: null, // 记录存档创建的时间戳
        day: 1,
        ink: 0,
        draft: "",
        inventory: [], // 背包：记录拥有哪些物品ID
        layout: [],    // 房间布局：记录摆出来的物品位置
        hasFoundMysteryBook: false, // 是否已获得神秘书籍
        totalWords: 0,   // ✨ 新增：生涯总字数
        fragments: []
    },

    // 初始化
    async init() {
        const saved = await window.ithacaSystem.loadData('user_data.json');
        if (saved) {
            this.state = JSON.parse(saved);
        }

        // 兼容性修补
        if (!this.state.inventory) this.state.inventory = [];
        if (!this.state.layout) {
            console.log("检测到新用户/重置状态，发放新手礼包...");
            this.state.layout = []; 
            const starterPack = ['item_desk_default', 'item_bookshelf_default', 'item_rug_default', 'item_chair_default', 'item_bed_default'];
            starterPack.forEach(id => {
                if (!this.state.inventory.includes(id)) this.state.inventory.push(id);
            });
            this.save();
        }
        if (typeof this.state.ink === 'undefined') this.state.ink = 0;
        if (typeof this.state.totalWords === 'undefined') this.state.totalWords = 0;
        
        // ✨ 兼容性修补：如果旧存档没有 fragments 字段，补上
        if (!this.state.fragments) this.state.fragments = [];

        // 旧存档迁移逻辑 (字数统计)
        if (this.state.totalWords === 0) {
             let allEntries = Journal.getAll();
             if (allEntries.length === 0) {
                await Journal.init();
                allEntries = Journal.getAll();
             }
             // 简单的迁移检查：只有当 truly 0 且有日记时才跑，防止反复跑
             // 这里简化处理，假设如果 savedWordCount 没记录过才跑
             let needSave = false;
             allEntries.forEach(entry => {
                if (entry.isConfirmed && typeof entry.savedWordCount === 'undefined') {
                    const count = (entry.content || "").replace(/\s/g, '').length;
                    this.state.totalWords += count;
                    entry.savedWordCount = count;
                    needSave = true;
                }
             });
             if(needSave) {
                 this.save();
                 Journal.save(); // Journal 也变了，需要保存
             }
        }
    },

    // ✨ 新增：添加碎片
    // 返回 true 表示是新获得的，返回 false 表示已经有了
    addFragment(fragmentId) {
        if (!this.state.fragments.includes(fragmentId)) {
            this.state.fragments.push(fragmentId);
            this.save();
            return true; 
        }
        return false;
    },

    // ✨ 新增：检查是否拥有某碎片
    hasFragment(fragmentId) {
        return this.state.fragments.includes(fragmentId);
    },

    updateWordCount(delta) {
        if (delta === 0) return;
        if (typeof this.state.totalWords === 'undefined') this.state.totalWords = 0;
        this.state.totalWords += delta;
        if (this.state.totalWords < 0) this.state.totalWords = 0;
        this.save();
        console.log(`[UserData] 字数变更: ${delta} -> 总计: ${this.state.totalWords}`);
    },

    save() {
        window.ithacaSystem.saveData('user_data.json', JSON.stringify(this.state));
    },

    // --- 基础资源管理 ---

    addInk(amount) {
        this.state.ink += amount;
        this.save();
    },

    consumeInk(amount) {
        if (this.state.ink >= amount) {
            this.state.ink -= amount;
            this.save();
            return true;
        }
        return false;
    },

    nextDay() {
        this.state.day++;
        this.save();
    },

    // --- 背包系统 (Inventory) ---

    addItem(itemId) {
        if (!this.state.inventory.includes(itemId)) {
            this.state.inventory.push(itemId);
            this.save();
        }
    },

    hasItem(itemId) {
        return this.state.inventory.includes(itemId);
    },

    // --- 装修/布局系统 (Layout) ---

    // 1. 放置新家具
    placeFurniture(itemId, x, y, direction = 1) {
        const newItem = {
            uid: Date.now() + Math.floor(Math.random() * 1000),
            itemId: itemId,
            x: x,
            y: y,
            direction: direction // 记录朝向 (1 或 -1)
        };
        this.state.layout.push(newItem);
        this.save();
        return newItem;
    },

    // 2. 更新已有家具
    updateFurniture(uid, x, y, direction = 1) {
        const item = this.state.layout.find(i => i.uid === uid);
        if (item) {
            item.x = x;
            item.y = y;
            item.direction = direction; // 更新朝向
            this.save();
        }
    },

    // 3. 移除家具 (从房间 -> 收回背包)
    removeFurniture(uid) {
        this.state.layout = this.state.layout.filter(i => i.uid !== uid);
        this.save();
    }
};