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
        totalWords: 0   // ✨ 新增：生涯总字数
    },

    // 初始化
    async init() {
        const saved = await window.ithacaSystem.loadData('user_data.json');
        if (saved) {
            this.state = JSON.parse(saved);
        }

        // === 1. 基础数据兼容性修补 ===
        if (!this.state.inventory) this.state.inventory = [];
        if (typeof this.state.ink === 'undefined') this.state.ink = 0;

        // === 2. 初始化默认房间 (新手五件套) ===
        // 只有当完全没有布局记录时才执行（新游戏）
        if (!Array.isArray(this.state.layout)) {
            console.log("检测到新用户/重置状态，发放新手礼包...");
            
            // 显式初始化为空房间
            this.state.layout = []; 

            // 定义新手五件套
            const starterPack = [
                'item_desk_default', 
                'item_bookshelf_default', 
                'item_rug_default', 
                'item_chair_default',
                'item_bed_default'
            ];

            // 只发到背包，不自动摆放
            starterPack.forEach(id => {
                if (!this.state.inventory.includes(id)) {
                    this.state.inventory.push(id);
                }
            });
            
            this.save();
        }

        // === 3. 旧存档迁移：字数统计 (Migration) ===
        // 如果是老存档（totalWords 为 undefined），我们需要遍历现有日记把字数加回来
        if (typeof this.state.totalWords === 'undefined') {
            console.log("正在迁移旧存档字数统计...");
            this.state.totalWords = 0;

            // 为了防止并发加载时 Journal 还没准备好，先检查一下
            let allEntries = Journal.getAll();
            if (allEntries.length === 0) {
                // 如果为空，尝试主动加载一次作为兜底
                await Journal.init();
                allEntries = Journal.getAll();
            }

            allEntries.forEach(entry => {
                if (entry.isConfirmed) {
                    // 补录旧日记的字数 (去除空白符)
                    const count = (entry.content || "").replace(/\s/g, '').length;
                    this.state.totalWords += count;
                    
                    // ✨ 关键：给旧日记补上 savedWordCount 标记，
                    // 这样下次编辑时 Journal.js 就能正确计算“差值”，而不是重复叠加
                    entry.savedWordCount = count;
                }
            });
            
            // 迁移完成后保存 UserData
            // 注意：Journal 的 savedWordCount 变更会在 Journal 模块下次保存时生效，
            // 或者你可以这里手动调用 Journal.save()，但通常由后续操作触发即可。
            this.save();
            console.log(`[UserData] 迁移完成，当前总字数: ${this.state.totalWords}`);
        }
    },

    // --- 核心逻辑：字数增量更新 ---
    // delta 可以是正数（新增）也可以是负数（删除）
    updateWordCount(delta) {
        if (delta === 0) return;
        
        // 确保 totalWords 已初始化
        if (typeof this.state.totalWords === 'undefined') this.state.totalWords = 0;

        this.state.totalWords += delta;
        
        // 兜底防止减成负数
        if (this.state.totalWords < 0) this.state.totalWords = 0;
        
        this.save();
        console.log(`[UserData] 字数变更: ${delta > 0 ? '+' : ''}${delta} -> 当前总计: ${this.state.totalWords}`);
    },

    // 保存数据
    save() {
        // 异步保存，不阻塞UI
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