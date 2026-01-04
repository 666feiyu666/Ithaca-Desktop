import { UserData } from '../data/UserData.js';
import { DragManager } from '../logic/DragManager.js';
import { StoryManager } from '../logic/StoryManager.js';
import { CityEvent } from '../logic/CityEvent.js';
import { ModalManager } from './ModalManager.js';
import { SidebarRenderer } from './SidebarRenderer.js';
// 如果你也拆分了书架渲染器，可以在这里导入，或者暂时通过全局 UIRenderer 调用
// import { BookshelfRenderer } from './BookshelfRenderer.js'; 

// 物品配置数据库 (建议后续移入单独的 config 文件)
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
        // 如果有需要初始化的逻辑放在这里
    },

    /**
     * 主渲染方法：根据 UserData.layout 渲染房间内所有家具
     */
    render() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        // 1. 清理旧家具
        container.querySelectorAll('.pixel-furniture').forEach(el => el.remove());

        // 2. 获取布局数据
        const layout = UserData.state.layout || [];

        // 3. 排序：按 Y 轴坐标从小到大排序，确保近处的物体遮挡远处的 (简单的画家算法)
        const sortedLayout = [...layout].sort((a, b) => a.y - b.y);

        // 4. 生成 DOM
        sortedLayout.forEach(itemData => {
            this.createFurnitureElement(container, itemData);
        });
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
        img.style.zIndex = Math.floor(itemData.y); // Z-Index 基于 Y 坐标

        // 设置朝向 (CSS Variable)
        const dir = itemData.direction || 1;
        img.style.setProperty('--dir', dir);

        // 设置特定类型的宽度
        img.style.width = this.getFurnitureWidth(config.type);

        // --- 事件绑定 ---

        // 1. 拖拽开始 (MouseDown)
        img.onmousedown = (e) => {
            if (DragManager.isDecorating) {
                e.stopPropagation();
                // 启动拖拽逻辑
                DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1);
            }
        };

        // 2. 点击交互 (Click)
        img.onclick = (e) => {
            e.stopPropagation();
            
            // 装修模式下禁止交互
            if (DragManager.isDecorating) return;

            // 交互前关闭其他可能存在的遮罩
            ModalManager.closeAll();

            this.handleFurnitureInteraction(config.type);
        };

        container.appendChild(img);
    },

    /**
     * 处理不同家具的点击交互逻辑
     */
    handleFurnitureInteraction(type) {
        switch (type) {
            case 'desk':
                // 打开书桌界面
                ModalManager.open('modal-desk');
                // 确保侧边栏是最新的（因为可能在别处修改了手记本）
                SidebarRenderer.render(); 
                break;

            case 'bookshelf':
                // 尝试触发剧情
                const isStoryTriggered = StoryManager.tryTriggerBookshelfStory();
                if (!isStoryTriggered) {
                    // 如果没剧情，打开书架 UI
                    ModalManager.open('modal-bookshelf-ui');
                    
                    // 注意：如果书架内容的渲染逻辑在别处（如 BookshelfRenderer），需要在这里调用
                    // UIRenderer.renderBookshelf(); // 如果保留在旧 UIRenderer 中
                    // 或者: BookshelfRenderer.render(); 
                    
                    // 临时兼容方案：如果 UIRenderer 还在全局且有此方法
                    if (window.ithacaSystem && window.ithacaSystem.ui && window.ithacaSystem.ui.renderBookshelf) {
                        window.ithacaSystem.ui.renderBookshelf();
                    }
                    // 如果是在 ES6 模块环境中直接引入了 UIRenderer (Facade)
                    // import { UIRenderer } from './UIRenderer.js'; 
                    // UIRenderer.renderBookshelf();
                }
                break;

            case 'rug':
                // 地毯通常用于触发地图/外出
                const modal = document.getElementById('modal-map-selection');
                if (modal) {
                    ModalManager.open('modal-map-selection');
                    CityEvent.renderSelectionMenu();
                }
                break;

            default:
                // 其他家具暂无交互，或者可以播放一个音效
                console.log(`Clicked on ${type}, no action defined.`);
                break;
        }
    },

    /**
     * 获取家具的预设宽度百分比
     */
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