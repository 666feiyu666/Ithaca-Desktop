/* src/js/ui/RoomRenderer.js */
import { UserData } from '../data/UserData.js';
import { DragManager } from '../logic/DragManager.js';
import { StoryManager } from '../logic/StoryManager.js';
import { CityEvent } from '../logic/CityEvent.js';
import { ModalManager } from './ModalManager.js';
import { SidebarRenderer } from './SidebarRenderer.js';
import { BookshelfRenderer } from './BookshelfRenderer.js';

// 物品配置数据库
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

export const RoomRenderer = {
    
    init() {
        // 初始化逻辑 (如需)
    },

    /**
     * 主渲染方法：渲染房间内家具 + 底部物品栏
     */
    render() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        // 1. 清理旧家具
        container.querySelectorAll('.pixel-furniture').forEach(el => el.remove());

        // 2. 获取布局数据并排序 (简单的 Z-Index 处理)
        const layout = UserData.state.layout || [];
        const sortedLayout = [...layout].sort((a, b) => a.y - b.y);

        // 3. 生成房间内 DOM
        sortedLayout.forEach(itemData => {
            this.createFurnitureElement(container, itemData);
        });

        // 4. 同时刷新底部物品栏 (Inventory Bar)
        this.renderInventoryBar();
    },

    /**
     * 创建单个家具的 DOM 元素并绑定事件
     */
    createFurnitureElement(container, itemData) {
        const config = ITEM_DB[itemData.itemId];
        if (!config) return;

        const img = document.createElement('img');
        img.src = config.src;
        img.className = 'pixel-furniture';
        img.id = `furniture-${itemData.uid}`;

        // 设置位置样式
        img.style.left = itemData.x + '%';
        img.style.top = itemData.y + '%';
        img.style.zIndex = Math.floor(itemData.y); 

        // 设置朝向
        const dir = itemData.direction || 1;
        img.style.setProperty('--dir', dir);

        // 设置宽度
        img.style.width = this.getFurnitureWidth(config.type);

        // --- 事件绑定 ---

        // 1. 拖拽开始 (MouseDown)
        img.onmousedown = (e) => {
            if (DragManager.isDecorating) {
                e.stopPropagation();
                DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
            }
        };

        // 2. 点击交互 (Click)
        img.onclick = (e) => {
            e.stopPropagation();
            if (DragManager.isDecorating) return;

            ModalManager.closeAll();
            this.handleFurnitureInteraction(config.type);
        };

        container.appendChild(img);
    },

    /**
     * 渲染底部物品栏 (Inventory Bar) - 补全了此处逻辑
     */
    renderInventoryBar() {
        const listEl = document.getElementById('inventory-bar');
        if (!listEl) return;
        
        listEl.innerHTML = "";

        // 统计拥有的物品
        const ownedCounts = {};
        (UserData.state.inventory || []).forEach(itemId => {
            ownedCounts[itemId] = (ownedCounts[itemId] || 0) + 1;
        });

        // 统计已摆放的物品
        const placedCounts = {};
        (UserData.state.layout || []).forEach(item => {
            placedCounts[item.itemId] = (placedCounts[item.itemId] || 0) + 1;
        });

        // 渲染每一个种类的物品槽
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
                // 显示数量角标
                if (availableCount > 1) {
                    const countBadge = document.createElement('span');
                    countBadge.innerText = availableCount;
                    countBadge.style.cssText = "position:absolute; bottom:2px; right:5px; color:white; font-size:12px; font-weight:bold; text-shadow:1px 1px 1px black;";
                    slot.appendChild(countBadge);
                }

               // 绑定拖拽生成新家具事件
               slot.onmousedown = (e) => {
                    const roomEl = document.querySelector('.iso-room');
                    const roomWidth = roomEl ? roomEl.offsetWidth : 1000;
                    
                    // 计算拖拽时的相对宽度
                    let widthPercent = 0.15;
                    const widthStr = this.getFurnitureWidth(config.type);
                    if(widthStr.includes('%')) widthPercent = parseFloat(widthStr) / 100;
                    
                    const targetWidth = roomWidth * widthPercent;
                    
                    // 调用 DragManager 开始创建新家具
                    DragManager.startDragNew(e, itemId, config.src, targetWidth);
                };
            } else {
                // 如果用光了，变灰
                slot.style.opacity = '0.4';
                slot.style.cursor = 'default';
                slot.title = "已全部摆放";
            }
            listEl.appendChild(slot);
        });
    },

    /**
     * 处理家具点击交互
     */
    handleFurnitureInteraction(type) {
        switch (type) {
            case 'desk':
                ModalManager.open('modal-desk');
                SidebarRenderer.render(); 
                break;

            case 'bookshelf':
                const isStoryTriggered = StoryManager.tryTriggerBookshelfStory();
                if (!isStoryTriggered) {
                    ModalManager.open('modal-bookshelf-ui');
                    BookshelfRenderer.render();
                }
                break;

            case 'rug':
                ModalManager.open('modal-map-selection');
                CityEvent.renderSelectionMenu();
                break;

            default:
                break;
        }
    },

    getFurnitureWidth(type) {
        switch (type) {
            case 'desk':      return '22%';
            case 'bookshelf': return '12%';
            case 'rug':       return '25%';
            case 'chair':     return '8%';
            case 'bed':       return '32%';
            default:          return '15%';
        }
    }
};