/* src/js/ui/UIRenderer.js */
import { Journal } from '../data/Journal.js';
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';
import { Binder } from '../logic/Binder.js';
import { StoryManager } from '../logic/StoryManager.js';    
import { DragManager } from '../logic/DragManager.js'; 
import { marked } from '../libs/marked.esm.js';

// 物品数据库
const ITEM_DB = {
    'item_desk_default':      { src: 'assets/images/room/desktop.png',   type: 'desk' },
    'item_bookshelf_default': { src: 'assets/images/room/bookshelf.png', type: 'bookshelf' },
    'item_rug_default':       { src: 'assets/images/room/rug1.png',      type: 'rug' },
    'item_chair_default':     { src: 'assets/images/room/chair.png',     type: 'chair' }, 
    'item_bed_default':       { src: 'assets/images/room/bed.png',       type: 'bed' },   
    'item_plant_01':          { src: 'assets/images/room/sofa.png',      type: 'deco' },
    'item_rug_blue':          { src: 'assets/images/room/rug2.png',      type: 'deco' },
    'item_cat_orange':        { src: 'assets/images/room/cat.png',       type: 'deco' }
};

export const UIRenderer = {
    activeEntryId: null,
    currentBookId: null, 

    init() {
        const all = Journal.getAll();
        if (all.length > 0) {
            this.activeEntryId = all[0].id;
        }
        
        this.updateStatus();
        this.renderJournalList();
        this.loadActiveEntry();
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

    // --- 4. 渲染工作台 ---
    renderWorkbenchList(filterText = "") {
        const listEl = document.getElementById('workbench-sources');
        if (!listEl) return;

        listEl.innerHTML = "";
        const allEntries = Journal.getAll();

        const filteredEntries = allEntries.filter(entry => {
            if (!filterText) return true;
            return entry.content.toLowerCase().includes(filterText.toLowerCase());
        });

        if (filteredEntries.length === 0) {
            listEl.innerHTML = `<div style="color:#999; text-align:center; margin-top:20px;">没有找到"${filterText}"相关的内容</div>`;
            return;
        }
        
        filteredEntries.forEach(entry => {
            const btn = document.createElement('button');
            const displayTime = entry.time || ""; 
            const preview = entry.content.substring(0, 15).replace(/\n/g, " ") + "...";

            btn.innerHTML = `
                <div style="font-weight:bold; margin-bottom:4px;">➕ ${entry.date} ${displayTime}</div>
                <div style="font-size:12px; color:#666;">${preview}</div>
            `;
            
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

    // --- 5. 渲染书架 ---
    renderBookshelf() {
        const container = document.getElementById('bookshelf');
        if (!container) return;

        container.innerHTML = "";
        const books = Library.getAll();
        
        books.forEach(book => {
            const wrapper = document.createElement('div');
            wrapper.className = 'book-item-container';
            wrapper.title = `${book.title}\n出版日期: ${book.date}`;
            
            // ✨ 如果是特殊书籍，加个特殊效果
            if (book.isMystery) {
                 wrapper.style.filter = "sepia(0.2) drop-shadow(0 0 5px gold)";
            }

            const img = document.createElement('img');
            img.src = book.cover || 'assets/images/booksheet/booksheet1.png';
            img.className = 'book-cover-img';
            
            const titleSpan = document.createElement('div');
            titleSpan.className = 'book-title-text';
            titleSpan.innerText = book.title;

            wrapper.appendChild(img);
            wrapper.appendChild(titleSpan);

            wrapper.onclick = () => {
                this.openBook(book);
            };
            
            container.appendChild(wrapper);
        });
    },

    openBook(book) {
        this.currentBookId = book.id;
        const modal = document.getElementById('reader-modal');
        const dateEl = document.getElementById('reader-date');
        
        document.getElementById('reader-title').innerText = book.title;
        
        const htmlContent = marked.parse(book.content, { breaks: true });
        document.getElementById('reader-text').innerHTML = htmlContent;

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

    // --- 6. 更新顶部状态栏 (优化版) ---
    updateStatus() {
        const day = UserData.state.day;
        const ink = UserData.state.ink;
        const totalWords = UserData.state.totalWords || 0;

        // 获取三个 DOM 元素
        const roomDayEl = document.getElementById('day-display-room');
        const roomInkEl = document.getElementById('ink-display-room');
        const roomWordEl = document.getElementById('word-display-room'); // ✨ 新增获取
        
        // 分别更新，互不干扰
        if (roomDayEl) roomDayEl.innerText = day;
        if (roomInkEl) roomInkEl.innerText = ink;
        
        // ✨ 专门更新字数
        if (roomWordEl) roomWordEl.innerText = totalWords;
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

    // --- 9. 渲染房间家具 ---
    renderRoomFurniture() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        const oldItems = container.querySelectorAll('.pixel-furniture');
        oldItems.forEach(el => el.remove());

        if (!UserData.state.layout) return;

        // Y轴排序
        const sortedLayout = [...UserData.state.layout].sort((a, b) => a.y - b.y);

        sortedLayout.forEach(itemData => {
            const config = ITEM_DB[itemData.itemId];
            if (!config) return; 

            const img = document.createElement('img');
            img.src = config.src;
            img.className = 'pixel-furniture';
            img.id = `furniture-${itemData.uid}`; 
            
            img.style.left = itemData.x + '%';
            img.style.top = itemData.y + '%';
            img.style.zIndex = Math.floor(itemData.y);

            const dir = itemData.direction || 1;
            img.style.setProperty('--dir', dir); 

            switch (config.type) {
                case 'desk':      img.style.width = '22%'; break;
                case 'bookshelf': img.style.width = '12%'; break;
                case 'rug':       img.style.width = '25%'; break;
                case 'chair':     img.style.width = '8%';  break;
                case 'bed':       img.style.width = '32%'; break;
                default:          img.style.width = '15%'; break;
            }

            // 拖拽
            img.onmousedown = (e) => {
                if (DragManager.isDecorating) {
                    e.stopPropagation(); 
                    DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
                }
            };

            this._closeAllModals = () => {
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(m => m.style.display = 'none');
            };

            // 点击事件
            img.onclick = (e) => {
                e.stopPropagation(); 

                if (DragManager.isDecorating) return; 

                this._closeAllModals(); 

                if (config.type === 'bookshelf') {
                    const isStoryTriggered = StoryManager.tryTriggerBookshelfStory();
                    
                    if (!isStoryTriggered) {
                        document.getElementById('modal-bookshelf-ui').style.display = 'flex';
                        this.renderBookshelf(); 
                    }
                } else if (config.type === 'desk') {
                    document.getElementById('modal-desk').style.display = 'flex';
                    this.renderJournalList();
                } else if (config.type === 'rug') {
                    this.toggleMap(true);
                }
            };
            
            container.appendChild(img);
        });
    },

    // --- 10. 渲染底部背包栏 ---
    renderInventoryBar() {
        const listEl = document.getElementById('inventory-bar');
        if (!listEl) return;
        
        listEl.innerHTML = "";

        const ownedCounts = {};
        UserData.state.inventory.forEach(itemId => {
            ownedCounts[itemId] = (ownedCounts[itemId] || 0) + 1;
        });

        const placedCounts = {};
        UserData.state.layout.forEach(item => {
            placedCounts[item.itemId] = (placedCounts[item.itemId] || 0) + 1;
        });

        Object.keys(ownedCounts).forEach(itemId => {
            const totalOwned = ownedCounts[itemId];
            const alreadyPlaced = placedCounts[itemId] || 0;
            const availableCount = totalOwned - alreadyPlaced;

            const config = ITEM_DB[itemId];
            if (!config) return;

            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            const img = document.createElement('img');
            img.src = config.src;
            slot.appendChild(img);
            
            if (availableCount > 0) {
                slot.title = `按住拖拽到房间 (剩余: ${availableCount})`;
                
                if (availableCount > 1) {
                    const countBadge = document.createElement('span');
                    countBadge.innerText = availableCount;
                    countBadge.style.cssText = "position:absolute; bottom:2px; right:5px; color:white; font-size:12px; font-weight:bold; text-shadow:1px 1px 1px black;";
                    slot.appendChild(countBadge);
                }

               slot.onmousedown = (e) => {
                    const roomEl = document.querySelector('.iso-room');
                    const roomWidth = roomEl ? roomEl.offsetWidth : 1000;

                    let widthPercent = 0.15; 
                    
                    switch (config.type) {
                        case 'desk':      widthPercent = 0.22; break;
                        case 'bookshelf': widthPercent = 0.12; break;
                        case 'rug':       widthPercent = 0.25; break;
                        case 'chair':     widthPercent = 0.08; break; 
                        case 'bed':       widthPercent = 0.32; break; 
                        default:          widthPercent = 0.15; break;
                    }
                    
                    const targetWidth = roomWidth * widthPercent;
                    DragManager.startDragNew(e, itemId, config.src, targetWidth);
                };
            } else {
                slot.style.opacity = '0.4';
                slot.style.cursor = 'default';
                slot.title = "已全部摆放";
            }
            listEl.appendChild(slot);
        });
    },

    // ✨ 新增：渲染背包
    renderBackpack() {
        const gridEl = document.getElementById('backpack-grid');
        const detailEmpty = document.getElementById('bp-detail-empty');
        const detailContent = document.getElementById('bp-detail-content');
        
        if (!gridEl) return;

        gridEl.innerHTML = "";
        
        // 1. 获取所有收集到的碎片 ID
        // (将来可以在这里合并 fragments 和 otherItems)
        const fragments = UserData.state.fragments || [];

        if (fragments.length === 0) {
            gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#ccc; margin-top:50px;">背包空空如也</div>`;
            return;
        }

        // 2. 遍历渲染
        fragments.forEach(fragId => {
            // 从 StoryManager 获取静态数据
            const info = StoryManager.getFragmentDetails(fragId);
            if (!info) return; // 防止数据对不上

            const slot = document.createElement('div');
            slot.className = 'bp-slot';
            slot.title = info.title;
            
            const img = document.createElement('img');
            img.src = info.icon || 'assets/images/items/note1.png'; // 默认图标
            
            slot.appendChild(img);

            // 点击查看详情
            slot.onclick = () => {
                // 移除其他选中态
                document.querySelectorAll('.bp-slot').forEach(el => el.classList.remove('active'));
                slot.classList.add('active');

                // 显示详情
                detailEmpty.style.display = 'none';
                detailContent.style.display = 'block';
                
                document.getElementById('bp-detail-img').src = info.icon;
                document.getElementById('bp-detail-title').innerText = info.title;
                document.getElementById('bp-detail-origin').innerText = info.origin;
                // 显示具体的文本内容
                document.getElementById('bp-detail-desc').innerText = info.content;
            };

            gridEl.appendChild(slot);
        });
    },
};