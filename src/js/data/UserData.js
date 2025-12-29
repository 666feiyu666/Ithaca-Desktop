/* src/js/data/UserData.js */
export const UserData = {
    state: {
        startDate: null, // 记录存档创建的时间戳
        day: 1,
        ink: 0,
        draft: "",
        inventory: [], // 背包：记录拥有哪些物品ID，例如 ['item_desk_default', 'item_cat_orange']
        layout: [],     // 房间布局：记录摆出来的物品位置，例如 [{ uid: 123, itemId: '...', x: 30, y: 40 }]
        hasFoundMysteryBook: false // 是否已获得神秘书籍
    },

    // 初始化
  async init() {
        const saved = await window.ithacaSystem.loadData('user_data.json');
        if (saved) {
            this.state = JSON.parse(saved);
        }

        // 兼容性修补
        if (!this.state.inventory) this.state.inventory = [];
        if (typeof this.state.ink === 'undefined') this.state.ink = 0;

        // === 初始化默认房间布局 (初始五件套) ===
        // 只有当完全没有布局记录时才执行（新游戏）
        if (!Array.isArray(this.state.layout)) {
            console.log("检测到新用户/重置状态，发放新手礼包...");
            
            // 1. 显式初始化为空房间
            this.state.layout = []; 

            // 2. 定义新手五件套
            const starterPack = [
                'item_desk_default', 
                'item_bookshelf_default', 
                'item_rug_default', 
                'item_chair_default',
                'item_bed_default'
            ];

            // 3. 只发到背包，不自动摆放
            starterPack.forEach(id => {
                if (!this.state.inventory.includes(id)) {
                    this.state.inventory.push(id);
                }
            });
            
            // 保存状态
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