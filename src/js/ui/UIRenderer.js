/* src/js/ui/UIRenderer.js */
import { Journal } from '../data/Journal.js';
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';
import { Binder } from '../logic/Binder.js';
import { DragManager } from '../logic/DragManager.js'; 

// 物品数据库：定义物品ID对应的图片和功能类型
const ITEM_DB = {
    // 基础家具
    'item_desk_default':      { src: 'assets/images/desktop.png',   type: 'desk' },
    'item_bookshelf_default': { src: 'assets/images/bookshelf.png', type: 'bookshelf' },
    'item_rug_default':       { src: 'assets/images/rug1.png',      type: 'rug' },
    
    // 商店物品
    'item_plant_01':          { src: 'assets/images/sofa.png',      type: 'deco' },
    'item_rug_blue':          { src: 'assets/images/rug2.png',      type: 'rug' }, // 这里的 type 改为 rug 以便能传送
    'item_cat_orange':        { src: 'assets/images/cat.png',       type: 'deco' }
};

export const UIRenderer = {
    activeEntryId: null,
    currentBookId: null, 

    init() {
        // 初始化时，尝试选中第一篇日记
        const all = Journal.getAll();
        if (all.length > 0) {
            this.activeEntryId = all[0].id;
        }
        
        // 初始渲染
        this.updateStatus();
        this.renderJournalList();
        this.loadActiveEntry();
        
        // 渲染房间家具
        this.renderRoomFurniture();
    },

    // --- 1. 渲染左侧日记列表 ---
    renderJournalList() {
        const listEl = document.getElementById('journal-list');
        if (!listEl) return;
        
        listEl.innerHTML = "";
        
        Journal.getAll().forEach(entry => {
            const btn = document.createElement('div');
            btn.className = 'list-item';
            
            if (entry.id === this.activeEntryId) {
                btn.classList.add('active');
            }
            
            const statusIcon = entry.isConfirmed ? "✅" : "📝";
            const displayTime = entry.time || ""; 

            btn.innerText = `${statusIcon} ${entry.date} ${displayTime}\n(字数: ${entry.content.length})`;
            btn.style.fontSize = "13px";
            btn.style.lineHeight = "1.5";
            
            btn.onclick = () => {
                this.activeEntryId = entry.id;
                this.renderJournalList(); 
                this.loadActiveEntry();   
            };
            
            listEl.appendChild(btn);
        });
    },

    // --- 2. 载入当前日记到编辑器 ---
    loadActiveEntry() {
        const editor = document.getElementById('editor-area');
        
        if (!this.activeEntryId) {
            if (editor) editor.value = "";
            return;
        }

        const entry = Journal.getAll().find(e => e.id === this.activeEntryId);
        if (entry) {
            if (editor) editor.value = entry.content;
            this.updateConfirmButtonState(entry);
        }
    },

    // --- 3. 更新“确认记录”按钮的状态 ---
    updateConfirmButtonState(entry) {
        const btn = document.getElementById('btn-confirm-entry');
        if (!btn) return;

        if (entry.isConfirmed) {
            btn.innerText = "已归档 (墨水已领)";
            btn.style.background = "#ccc";
            btn.style.cursor = "default";
            btn.disabled = true; 
        } else {
            btn.innerText = "✅ 确认记录 (+10 墨水)";
            btn.style.background = "#5d4037"; 
            btn.style.cursor = "pointer";
            btn.disabled = false;
        }
    },

    // --- 4. 渲染工作台的素材列表 (支持搜索过滤) ---
    renderWorkbenchList(filterText = "") {
        const listEl = document.getElementById('workbench-sources');
        if (!listEl) return;

        listEl.innerHTML = "";
        
        // 获取所有日记
        const allEntries = Journal.getAll();

        // ✨ 过滤逻辑：
        // 如果 filterText 不为空，就筛选出内容包含该文字的日记
        const filteredEntries = allEntries.filter(entry => {
            if (!filterText) return true; // 没搜东西，显示全部
            return entry.content.toLowerCase().includes(filterText.toLowerCase());
        });

        // 如果搜不到东西，给个提示
        if (filteredEntries.length === 0) {
            listEl.innerHTML = `<div style="color:#999; text-align:center; margin-top:20px;">没有找到"${filterText}"相关的内容</div>`;
            return;
        }
        
        filteredEntries.forEach(entry => {
            const btn = document.createElement('button');
            const displayTime = entry.time || ""; 
            
            // 截取前15个字作为预览
            const preview = entry.content.substring(0, 15).replace(/\n/g, " ") + "...";

            btn.innerHTML = `
                <div style="font-weight:bold; margin-bottom:4px;">➕ ${entry.date} ${displayTime}</div>
                <div style="font-size:12px; color:#666;">${preview}</div>
            `;
            
            // 样式优化
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.marginBottom = '8px';
            btn.style.padding = '10px';
            btn.style.cursor = 'pointer';
            btn.style.textAlign = 'left';
            btn.style.border = '1px solid #eee';
            btn.style.background = '#fff';
            btn.style.borderRadius = '6px';
            btn.style.transition = 'background 0.2s';

            btn.onmouseover = () => { btn.style.background = '#f0f0f0'; };
            btn.onmouseout = () => { btn.style.background = '#fff'; };

            btn.onclick = () => {
                Binder.appendFragment(entry.content);
                const manuscript = document.getElementById('manuscript-editor');
                if (manuscript) manuscript.value = Binder.currentManuscript;
            };
            
            listEl.appendChild(btn);
        });
    },

    // --- 5. 渲染书架 (Library) ---
    renderBookshelf() {
        const container = document.getElementById('bookshelf');
        if (!container) return;

        container.innerHTML = "";
        const books = Library.getAll();
        
        books.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-item';
            div.title = `${book.title}\n出版日期: ${book.date}`;
            
            div.style.backgroundColor = book.color || '#5d4037'; 
            div.style.width = '24px';
            div.style.height = '70px';
            div.style.marginRight = '5px';
            div.style.cursor = 'pointer';
            div.style.borderRadius = '2px';
            div.style.boxShadow = '1px 1px 3px rgba(0,0,0,0.3)';
            div.style.transition = 'transform 0.2s';

            div.onmouseover = () => { div.style.transform = 'translateY(-5px)'; };
            div.onmouseout = () => { div.style.transform = 'translateY(0)'; };

            div.onclick = () => {
                this.openBook(book);
            };
            
            container.appendChild(div);
        });
    },

    openBook(book) {
        this.currentBookId = book.id;
        const modal = document.getElementById('reader-modal');
        const dateEl = document.getElementById('reader-date');
        
        document.getElementById('reader-title').innerText = book.title;
        document.getElementById('reader-text').innerText = book.content;
        if (dateEl) dateEl.innerText = `出版于: ${book.date}`;

        document.getElementById('reader-title-input').value = book.title;
        document.getElementById('reader-content-input').value = book.content;

        this.toggleReaderMode(false); 
        modal.style.display = 'flex';
    },

    toggleReaderMode(isEdit) {
        const viewMode = document.getElementById('reader-view-mode');
        const editMode = document.getElementById('reader-edit-mode');
        const editBtn = document.getElementById('btn-edit-book');

        if (isEdit) {
            viewMode.style.display = 'none';
            editMode.style.display = 'flex';
            editBtn.style.display = 'none'; 
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.style.display = 'inline-block';
        }
    },

    // --- 6. 更新顶部状态栏 ---
    updateStatus() {
        const day = UserData.state.day;
        const ink = UserData.state.ink;

        const roomDayEl = document.getElementById('day-display-room');
        const roomInkEl = document.getElementById('ink-display-room');
        
        if (roomDayEl) roomDayEl.innerText = day;
        if (roomInkEl) roomInkEl.innerText = ink;
    },

    // --- 7. 日志系统 ---
    log(msg) {
        const box = document.getElementById('log-box');
        if (!box) return;

        const time = new Date().toLocaleTimeString();
        const newLog = document.createElement('div');
        newLog.innerHTML = `<span style="color:#999; font-size:12px;">[${time}]</span> ${msg}`;
        newLog.style.borderBottom = "1px dashed #eee";
        newLog.style.padding = "4px 0";
        
        box.prepend(newLog);
    },

    // --- 8. 城市漫步 ---
    toggleMap(show) {
        const room = document.getElementById('scene-room');
        const map = document.getElementById('scene-map');
        
        if (show) {
            room.style.display = 'none';
            map.style.display = 'flex'; 
            this.log("推开门，来到了街道上。");
        } else {
            room.style.display = 'block';
            map.style.display = 'none';
            this.log("回到了房间。");
        }
    },

    // --- 9. 渲染房间里的家具 ---
    renderRoomFurniture() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        // 1. 清理旧的家具元素 (保留背景图 .room-background)
        const oldItems = container.querySelectorAll('.pixel-furniture');
        oldItems.forEach(el => el.remove());

        // 2. 遍历布局数据生成新的家具
        UserData.state.layout.forEach(itemData => {
            const config = ITEM_DB[itemData.itemId];
            if (!config) return; 

            const img = document.createElement('img');
            img.src = config.src;
            img.className = 'pixel-furniture';
            img.id = `furniture-${itemData.uid}`; 
            
            // 定位
            img.style.left = itemData.x + '%';
            img.style.top = itemData.y + '%';

            // --- ✨ 新增：应用翻转 ---
            // 默认为 1
            const dir = itemData.direction || 1;
            // 我们把 scaleX 放在 dataset 里或者直接 apply transform
            // 注意：因为 hover 效果里也有 transform，所以这里不仅要设置初始值，
            // 最好把 direction 存到 dataset 里，让 CSS 或 JS 统一处理
            img.style.setProperty('--dir',dir); 
            // img.style.transform = `scaleX(${dir})`; 

            // ... 设置宽度 ...
            if (config.type === 'desk') img.style.width = '22%';
            else if (config.type === 'bookshelf') img.style.width = '12%';
            else if (config.type === 'rug') img.style.width = '25%';
            else img.style.width = '15%'; 

            img.style.zIndex = Math.floor(itemData.y);

            // ... 事件绑定 (记得把 itemData.direction 传给 startDrag) ...
            img.onmousedown = (e) => {
                if (DragManager.isDecorating) {
                    // ✨ 传入当前的 direction
                    DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
                }
            };
            
            // 样式大小逻辑 (必须与 renderInventoryBar 里的比例保持一致)
            if (config.type === 'desk') img.style.width = '22%';
            else if (config.type === 'bookshelf') img.style.width = '12%';
            else if (config.type === 'rug') img.style.width = '25%';
            else img.style.width = '15%'; // 默认大小

            // 纵深排序
            img.style.zIndex = Math.floor(itemData.y);

            // --- 事件绑定 ---

            // A. 鼠标按下：装修模式下触发拖拽
            img.onmousedown = (e) => {
                if (DragManager.isDecorating) {
                    DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
                }
            };

            // B. 鼠标点击：正常模式下触发功能
            img.onclick = () => {
                if (DragManager.isDecorating) return;

                if (config.type === 'desk') {
                    document.getElementById('modal-desk').style.display = 'flex';
                    this.renderJournalList();
                } else if (config.type === 'bookshelf') {
                    document.getElementById('modal-bookshelf-ui').style.display = 'flex';
                    this.renderBookshelf();
                } else if (config.type === 'rug') {
                    this.toggleMap(true);
                }
            };

            container.appendChild(img);
        });
    },

    // --- 10. 渲染底部背包栏 (修正版：计算像素宽度) ---
    renderInventoryBar() {
        const listEl = document.getElementById('inventory-bar');
        if (!listEl) return;
        
        listEl.innerHTML = "";

        // 1. 统计拥有总数
        const ownedCounts = {};
        UserData.state.inventory.forEach(itemId => {
            ownedCounts[itemId] = (ownedCounts[itemId] || 0) + 1;
        });

        // 2. 统计已摆放数量
        const placedCounts = {};
        UserData.state.layout.forEach(item => {
            placedCounts[item.itemId] = (placedCounts[item.itemId] || 0) + 1;
        });

        // 3. 计算“剩余可用数量”并渲染
        Object.keys(ownedCounts).forEach(itemId => {
            const totalOwned = ownedCounts[itemId];
            const alreadyPlaced = placedCounts[itemId] || 0;
            const availableCount = totalOwned - alreadyPlaced;

            // 无论是否有剩余，只要拥有过就显示，只是置灰
            const config = ITEM_DB[itemId];
            if (!config) return;

            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            const img = document.createElement('img');
            img.src = config.src;
            slot.appendChild(img);
            
            // 如果还有库存 -> 高亮且可拖拽
            if (availableCount > 0) {
                slot.title = `按住拖拽到房间 (剩余: ${availableCount})`;
                
                // 数字角标
                if (availableCount > 1) {
                    const countBadge = document.createElement('span');
                    countBadge.innerText = availableCount;
                    countBadge.style.cssText = "position:absolute; bottom:2px; right:5px; color:white; font-size:12px; font-weight:bold; text-shadow:1px 1px 1px black;";
                    slot.appendChild(countBadge);
                }

                // --- 绑定拖拽 (包含尺寸计算) ---
                slot.onmousedown = (e) => {
                    // 1. 获取当前房间容器的实际像素宽度
                    const roomEl = document.querySelector('.iso-room');
                    const roomWidth = roomEl ? roomEl.offsetWidth : 1000;

                    // 2. 计算目标宽度比例 (必须与 renderRoomFurniture 中的百分比一致)
                    let widthPercent = 0.15; // 默认
                    
                    if (config.type === 'desk') widthPercent = 0.22;
                    else if (config.type === 'bookshelf') widthPercent = 0.12;
                    else if (config.type === 'rug') widthPercent = 0.25;
                    
                    // 3. 算出像素值
                    const targetWidth = roomWidth * widthPercent;

                    // 4. 开始拖拽，传入 targetWidth
                    DragManager.startDragNew(e, itemId, config.src, targetWidth);
                };
            } else {
                // 没有库存 -> 变灰
                slot.style.opacity = '0.4';
                slot.style.cursor = 'default';
                slot.title = "已全部摆放";
                // 不绑定事件
            }

            listEl.appendChild(slot);
        });
    }
};