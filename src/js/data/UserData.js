/* src/js/data/UserData.js */
export const UserData = {
    state: {
        startDate: null, // 记录存档创建的时间戳
        day: 1,
        ink: 0,
        draft: "",
        inventory: [], // 背包：记录拥有哪些物品ID，例如 ['item_desk_default', 'item_cat_orange']
        layout: []     // 房间布局：记录摆出来的物品位置，例如 [{ uid: 123, itemId: '...', x: 30, y: 40 }]
    },

    // 初始化
    async init() {
        // 0. 读取存档
        const saved = await window.ithacaSystem.loadData('user_data.json');
        
        if (saved) {
            this.state = JSON.parse(saved);
        }

        // --- 存档兼容性修补 (Migration) ---

        // 1. 确保背包存在
        if (!this.state.inventory) {
            this.state.inventory = [];
        }
        
        // 2. 确保墨水存在
        if (typeof this.state.ink === 'undefined') {
            this.state.ink = 0;
        }

        // 3. 【新增】初始化房间布局
        // 如果存档里没有 layout 字段（说明是老存档或新玩家），初始化默认家具
        if (!Array.isArray(this.state.layout)) {
            // 定义默认家具布局 (uid 使用时间戳防止重复)
            const now = Date.now();
            this.state.layout = [
                { uid: now,     itemId: 'item_desk_default',      x: 38, y: 35 }, // 默认桌子位置
                { uid: now + 1, itemId: 'item_bookshelf_default', x: 65, y: 32 }, // 默认书架位置
                { uid: now + 2, itemId: 'item_rug_default',       x: 45, y: 55 }  // 默认地毯位置
            ];

            // 确保这些默认家具的所有权也在背包里
            ['item_desk_default', 'item_bookshelf_default', 'item_rug_default'].forEach(id => {
                if (!this.state.inventory.includes(id)) {
                    this.state.inventory.push(id);
                }
            });
            
            // 保存一次初始状态
            this.save();
        }
    },

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

   // 1. 放置新家具 (增加 direction 参数)
    placeFurniture(itemId, x, y, direction = 1) {
        const newItem = {
            uid: Date.now() + Math.floor(Math.random() * 1000),
            itemId: itemId,
            x: x,
            y: y,
            direction: direction // ✨ 新增：记录朝向 (1 或 -1)
        };
        this.state.layout.push(newItem);
        this.save();
        return newItem;
    },

    // 2. 更新已有家具 (增加 direction 参数)
    updateFurniture(uid, x, y, direction = 1) {
        const item = this.state.layout.find(i => i.uid === uid);
        if (item) {
            item.x = x;
            item.y = y;
            item.direction = direction; // ✨ 新增
            this.save();
        }
    },

    // 3. 移除家具 (从房间 -> 收回背包)
    // 注意：背包里的数据(inventory)不用动，因为我们始终拥有它，只是从房间布局(layout)里拿走了
    removeFurniture(uid) {
        this.state.layout = this.state.layout.filter(i => i.uid !== uid);
        this.save();
    }
};