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
        totalWords: 0,   // 生涯总字数
        fragments: [],   // 已收集的碎片ID列表
        
        // ✨ 新增：手记本列表
        // 结构: { id: 'nb_xxx', name: '我的小说', icon: 'path/to/img', isDefault: boolean, createdAt: timestamp }
        notebooks: [], 
        readMails: []   // 已读邮件ID列表
    },

    // 初始化
    async init() {
        const saved = await window.ithacaSystem.loadData('user_data.json');
    
        if (saved) {
            this.state = JSON.parse(saved);
            console.log("存档加载成功！内容：", this.state);
        } else {
            console.log("未找到存档，将创建新进度");
        }

        // --- 1. 基础数据兼容性修补 ---
        if (!this.state.inventory) this.state.inventory = [];

        // 🛡️【新增修复】防止老玩家重复触发开场剧情
        // 逻辑：如果已经不是第一天了，或者已经有墨水积累了，说明肯定看过剧情了
        if (typeof this.state.hasWatchedIntro === 'undefined') {
            if (this.state.day > 1 || this.state.ink > 0 || this.state.totalWords > 0) {
                console.log("检测到老存档，自动标记为已看剧情");
                this.state.hasWatchedIntro = true;
            } else {
                // 确实是纯新号
                this.state.hasWatchedIntro = false;
            }
        }
        
        // 新手礼包/房间重置检测
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
        if (!this.state.fragments) this.state.fragments = [];
        
        // --- 2. ✨ 手记本系统初始化 ---
        // 如果没有 notebook 数据（旧存档或新用户），初始化一个默认的“日常碎片”
        if (!this.state.notebooks || !Array.isArray(this.state.notebooks) || this.state.notebooks.length === 0) {
            console.log("初始化默认手记本...");
            this.state.notebooks = [
                { 
                    id: 'nb_inbox', 
                    name: '日常碎片', 
                    // ✨ 使用上传的软木板素材作为图标
                    icon: 'assets/images/booksheet/notebook.png', 
                    isDefault: true, 
                    createdAt: Date.now() 
                }
            ];
            this.save();
        }

        // --- 3. 旧存档迁移逻辑 (字数统计) ---
        if (this.state.totalWords === 0) {
             let allEntries = Journal.getAll();
             if (allEntries.length === 0) {
                await Journal.init();
                allEntries = Journal.getAll();
             }
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
                 Journal.save();
             }
        }
    },

    // ✨ 新增：信箱相关方法
    hasReadMail(day) {
        if (!this.state.readMails) this.state.readMails = [];
        return this.state.readMails.includes(day);
    },

    markMailAsRead(day) {
        if (!this.state.readMails) this.state.readMails = [];
        if (!this.hasReadMail(day)) {
            this.state.readMails.push(day);
            this.save();
        }
    },

    // ============================================================
    // ✨ 核心新增：手记本 (Notebook) 管理
    // ============================================================

    // 1. 创建新本子
    createNotebook(name) {
        const newNotebook = {
            id: 'nb_' + Date.now(),
            name: name || '未命名手记',
            // ✨ 新建本子默认使用该图标
            icon: 'assets/images/booksheet/notebook.png', 
            createdAt: Date.now(),
            isDefault: false
        };
        this.state.notebooks.push(newNotebook);
        this.save();
        return newNotebook;
    },

    // 2. 重命名本子
    renameNotebook(id, newName) {
        const nb = this.state.notebooks.find(n => n.id === id);
        if (nb) {
            nb.name = newName;
            this.save();
            return true;
        }
        return false;
    },

    // 3. 删除本子
    deleteNotebook(id) {
        // 保护默认收件箱不被删除
        if (id === 'nb_inbox') return false;
        
        const index = this.state.notebooks.findIndex(n => n.id === id);
        if (index !== -1) {
            this.state.notebooks.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },

    // 4. 获取本子信息
    getNotebook(id) {
        return this.state.notebooks.find(n => n.id === id) || null;
    },

    // ============================================================
    // 碎片与字数 (Fragments & Stats)
    // ============================================================

    addFragment(fragmentId) {
        if (!this.state.fragments.includes(fragmentId)) {
            this.state.fragments.push(fragmentId);
            this.save();
            return true; 
        }
        return false;
    },

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

    // ============================================================
    // 基础资源管理 (Ink & Time)
    // ============================================================

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

    // ============================================================
    // 背包系统 (Inventory)
    // ============================================================

    addItem(itemId) {
        if (!this.state.inventory.includes(itemId)) {
            this.state.inventory.push(itemId);
            this.save();
        }
    },

    hasItem(itemId) {
        return this.state.inventory.includes(itemId);
    },

    // ============================================================
    // 装修/布局系统 (Layout)
    // ============================================================

    // 1. 放置新家具
    placeFurniture(itemId, x, y, direction = 1) {
        const newItem = {
            uid: Date.now() + Math.floor(Math.random() * 1000),
            itemId: itemId,
            x: x,
            y: y,
            direction: direction 
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
            item.direction = direction;
            this.save();
        }
    },

    // 3. 移除家具 (从房间 -> 收回背包)
    removeFurniture(uid) {
        this.state.layout = this.state.layout.filter(i => i.uid !== uid);
        this.save();
    }
};