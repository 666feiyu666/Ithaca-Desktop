/* src/js/ui/UIRenderer.js */
import { Journal } from '../data/Journal.js';
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';
import { Binder } from '../logic/Binder.js';
import { DragManager } from '../logic/DragManager.js'; 
import { marked } from '../libs/marked.esm.js';

// 物品数据库
const ITEM_DB = {
    // === 初始五件套 (独立类型，独立尺寸) ===
    'item_desk_default':      { src: 'assets/images/desktop.png',   type: 'desk' },
    'item_bookshelf_default': { src: 'assets/images/bookshelf.png', type: 'bookshelf' },
    'item_rug_default':       { src: 'assets/images/rug1.png',      type: 'rug' },
    'item_chair_default':     { src: 'assets/images/chair.png',     type: 'chair' }, 
    'item_bed_default':       { src: 'assets/images/bed.png',       type: 'bed' },   

    // === 商店/其他物品 (统称 deco) ===
    'item_plant_01':          { src: 'assets/images/sofa.png',      type: 'deco' },
    'item_rug_blue':          { src: 'assets/images/rug2.png',      type: 'deco' },
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

    // --- 5. 渲染书架 (Library) [重写] ---
    renderBookshelf() {
        const container = document.getElementById('bookshelf');
        if (!container) return;

        container.innerHTML = "";
        const books = Library.getAll();
        
        books.forEach(book => {
            // 1. 创建容器
            const wrapper = document.createElement('div');
            wrapper.className = 'book-item-container';
            wrapper.title = `${book.title}\n出版日期: ${book.date}`;

            // 2. 创建封面图片
            const img = document.createElement('img');
            // 兼容旧存档：如果没有 cover 字段，默认用第一张
            img.src = book.cover || 'assets/images/booksheet1.png';
            img.className = 'book-cover-img';
            
            // 3. 创建标题文字
            const titleSpan = document.createElement('div');
            titleSpan.className = 'book-title-text';
            titleSpan.innerText = book.title;

            // 4. 组装
            wrapper.appendChild(img);
            wrapper.appendChild(titleSpan);

            // 5. 点击事件
            wrapper.onclick = () => {
                this.openBook(book);
            };
            
            // 6. 悬浮动效 (CSS已处理，JS只需负责点击)
            
            container.appendChild(wrapper);
        });
    },

    openBook(book) {
        this.currentBookId = book.id;
        const modal = document.getElementById('reader-modal');
        const dateEl = document.getElementById('reader-date');
        
        document.getElementById('reader-title').innerText = book.title;
        
        // ✨ 修改这里：使用 marked 解析内容
        // { breaks: true } 允许回车直接换行
        const htmlContent = marked.parse(book.content, { breaks: true });
        document.getElementById('reader-text').innerHTML = htmlContent; // 注意用 innerHTML

        if (dateEl) dateEl.innerText = `出版于: ${book.date}`;

        document.getElementById('reader-title-input').value = book.title;
        document.getElementById('reader-content-input').value = book.content; // 编辑框里还是保留原文

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

    // --- 9. 渲染房间家具 (智能排序修复版) ---
    renderRoomFurniture() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        // 1. 清理旧家具
        const oldItems = container.querySelectorAll('.pixel-furniture');
        oldItems.forEach(el => el.remove());

        if (!UserData.state.layout) return;

        // ✨ 关键修复 A：智能排序
        // 按照 Y 坐标从小到大排序（远处的先画，近处的后画）
        // 这样可以确保视觉遮挡关系和点击层级完全一致
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
            
            // 设置层级：y坐标越大，层级越高（越靠近屏幕）
            img.style.zIndex = Math.floor(itemData.y);

            const dir = itemData.direction || 1;
            img.style.setProperty('--dir', dir); 

            // 尺寸定义
            switch (config.type) {
                case 'desk':      img.style.width = '22%'; break;
                case 'bookshelf': img.style.width = '12%'; break;
                case 'rug':       img.style.width = '25%'; break;
                case 'chair':     img.style.width = '8%';  break;
                case 'bed':       img.style.width = '32%'; break;
                default:          img.style.width = '15%'; break;
            }

            // --- 🖱️ 交互事件修复 ---

            // 1. 拖拽按下
            img.onmousedown = (e) => {
                if (DragManager.isDecorating) {
                    e.stopPropagation(); // 防止穿透
                    DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
                }
            };

            // 新增一个内部私有方法，用于关闭所有弹窗
            this._closeAllModals = () => {
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(m => m.style.display = 'none');
            };

            // 修改家具点击事件
            img.onclick = (e) => {
                e.stopPropagation(); // 阻止事件冒泡

                if (DragManager.isDecorating) return; // 装修模式下不触发功能

                // ✨ 关键修复：打开新弹窗前，先关掉所有正在显示的弹窗
                this._closeAllModals(); 

                if (config.type === 'desk') {
                    document.getElementById('modal-desk').style.display = 'flex';
                    this.renderJournalList();
                } else if (config.type === 'bookshelf') {
                    document.getElementById('modal-bookshelf-ui').style.display = 'flex';
                    if (this.renderBookshelf) this.renderBookshelf();
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
                    const roomEl = document.querySelector('.iso-room');
                    const roomWidth = roomEl ? roomEl.offsetWidth : 1000;

                    // === 📐 拖拽尺寸同步 (按 Type) ===
                    let widthPercent = 0.15; // 默认
                    
                    switch (config.type) {
                        case 'desk':      widthPercent = 0.22; break;
                        case 'bookshelf': widthPercent = 0.12; break;
                        case 'rug':       widthPercent = 0.25; break;
                        case 'chair':     widthPercent = 0.08; break; // 
                        case 'bed':       widthPercent = 0.32; break; // 
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
    }
};