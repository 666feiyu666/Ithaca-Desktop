/* js/app.js - 完整版 */

// 1. 引入所有模块
import { Journal } from './data/Journal.js';
import { UserData } from './data/UserData.js';
import { Library } from './data/Library.js';
import { Binder } from './logic/Binder.js';
import { CityEvent } from './logic/CityEvent.js';
import { Shop } from './logic/Shop.js';
import { DragManager } from './logic/DragManager.js';   
import { TimeSystem } from './logic/TimeSystem.js';
import { UIRenderer } from './ui/UIRenderer.js';

// 2. 程序入口：初始化所有数据和界面
async function init() {
    console.log("正在启动伊萨卡手记 (Electron)...");
    
    // 等待所有数据文件读取完毕
    await Promise.all([
        UserData.init(),
        Library.init(),
        Journal.init()
    ]);

    // 初始化时间系统
    TimeSystem.init();
    
    // 数据就绪后，再渲染界面
    UIRenderer.init();
    UIRenderer.renderBookshelf();
    UIRenderer.updateStatus();

    DragManager.init(); // 初始化拖拽系统
    UIRenderer.renderRoomFurniture(); // 初始渲染一次房间家具
    
    bindEvents();
    UIRenderer.log("欢迎回家。");
}

// 3. 事件绑定中心
function bindEvents() {

    // --- A. 日记与书写区域 (Journal System) ---

    // A1. 输入框自动保存 (Auto-save)
    const editor = document.getElementById('editor-area');
    editor.addEventListener('input', () => {
        // 只有当当前有选中的日记时才保存
        if (UIRenderer.activeEntryId) {
            Journal.updateEntry(UIRenderer.activeEntryId, editor.value);
            // 实时刷新左侧列表的字数统计
            UIRenderer.renderJournalList();
        }
    });

    // A2. 新建日记按钮 (+)
    const btnNewEntry = document.getElementById('btn-new-entry');
    if (btnNewEntry) {
        btnNewEntry.onclick = () => {
            const newEntry = Journal.createNewEntry();
            // 自动切换焦点到新日记
            UIRenderer.activeEntryId = newEntry.id;
            UIRenderer.renderJournalList(); // 刷新列表
            UIRenderer.loadActiveEntry();   // 载入编辑器
            UIRenderer.log(`创建了新的空白记录 (${newEntry.time})。`);
        };
    }

    // A3. 确认记录按钮 (Confirm & Reward)
    const btnConfirm = document.getElementById('btn-confirm-entry');
    if (btnConfirm) {
        btnConfirm.onclick = () => {
            if (!UIRenderer.activeEntryId) return;

            // 尝试在数据层标记为"已确认"
            const isSuccess = Journal.confirmEntry(UIRenderer.activeEntryId);
            
            if (isSuccess) {
                // 1. 发放奖励
                UserData.addInk(10);
                // 2. 刷新界面状态
                UIRenderer.updateStatus(); // 更新顶部墨水数
                UIRenderer.renderJournalList(); // 更新左侧列表图标
                
                // 3. 刷新按钮状态（变为灰色不可点）
                const currentEntry = Journal.getAll().find(e => e.id === UIRenderer.activeEntryId);
                UIRenderer.updateConfirmButtonState(currentEntry);
                
                UIRenderer.log("✅ 记忆已确认。墨水 +10ml。");
            } else {
                UIRenderer.log("这条记忆已经确认过了，无法重复获取墨水。");
            }
        };
    }

    // A4. [新增] 删除日记按钮
    const btnDeleteEntry = document.getElementById('btn-delete-entry');
    if (btnDeleteEntry) {
        btnDeleteEntry.onclick = () => {
            if (!UIRenderer.activeEntryId) return;

            // 简单的确认框 (以后可以换成好看的 Modal)
            const confirmed = confirm("确定要撕毁这一页日记吗？此操作无法撤销。");
            if (confirmed) {
                // 1. 执行删除
                Journal.deleteEntry(UIRenderer.activeEntryId);
                UIRenderer.log("🗑️ 撕毁了一页记忆。");

                // 2. 重置 UI：尝试选中剩下日记的第一篇
                const remaining = Journal.getAll();
                if (remaining.length > 0) {
                    UIRenderer.activeEntryId = remaining[0].id;
                } else {
                    UIRenderer.activeEntryId = null; // 一篇都没了
                }

                // 3. 刷新界面
                UIRenderer.renderJournalList();
                UIRenderer.loadActiveEntry();
            }
        };
    }


    // --- B. 装订工作台 (Workbench System) ---

    // 1. 监听封皮选择点击
    const coverOptions = document.querySelectorAll('.cover-option');
    // 暂存当前选中的封皮，默认为第一张
    let selectedCover = 'assets/images/booksheet1.png';

    coverOptions.forEach(img => {
        img.onclick = () => {
            // 移除其他选中状态
            coverOptions.forEach(opt => opt.classList.remove('selected'));
            // 选中当前
            img.classList.add('selected');
            // 更新变量 (注意：这里需要完整的路径，或者你只存文件名然后在 Binder 里拼路径)
            // 这里我们简单处理，假设 data-cover 里存的是文件名
            selectedCover = 'assets/images/' + img.getAttribute('data-cover');
        };
    });

    // B1. 打开工作台
    document.getElementById('btn-open-workbench').onclick = () => {
        const workbenchModal = document.getElementById('workbench-modal');
        workbenchModal.style.display = 'flex';
        
        // 重置
        const searchInput = document.getElementById('workbench-search');
        if (searchInput) searchInput.value = ""; 
        const titleInput = document.getElementById('manuscript-title-input');
        if (titleInput) titleInput.value = "";
        
        // ✨ 重置封皮选择：默认选第一个
        coverOptions.forEach(opt => opt.classList.remove('selected'));
        if(coverOptions.length > 0) {
            coverOptions[0].classList.add('selected');
            selectedCover = 'assets/images/' + coverOptions[0].getAttribute('data-cover');
        }

        UIRenderer.renderWorkbenchList();
        document.getElementById('manuscript-editor').value = Binder.currentManuscript;
    };

    // ✨ 新增：B1.5 监听搜索输入
    const searchInput = document.getElementById('workbench-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            // 实时调用渲染器，传入搜索词
            UIRenderer.renderWorkbenchList(text);
        });
    }

    // B2. 关闭工作台
    document.getElementById('btn-close-workbench').onclick = () => {
        workbenchModal.style.display = 'none';
    };

    // B3. 书稿手动编辑同步
    document.getElementById('manuscript-editor').addEventListener('input', (e) => {
        Binder.updateManuscript(e.target.value);
    });

   // B4. 出版书籍 (Publish)
    const btnPublish = document.getElementById('btn-publish');
    if (btnPublish) {
        btnPublish.onclick = () => {
            const editor = document.getElementById('manuscript-editor');
            const finalContent = editor.value;
            Binder.updateManuscript(finalContent);

            const titleInput = document.getElementById('manuscript-title-input');
            let finalTitle = titleInput.value.trim();

            if (finalContent.length < 10) {
                alert(`🚫 字数不够！\n至少需要 10 个字。`);
                return;
            }

            if (!finalTitle) {
                finalTitle = "无题_" + new Date().toLocaleDateString().replace(/\//g, '');
            }

            // ✨ 修改：传入 selectedCover
            const result = Binder.publish(finalTitle, selectedCover);
            
            if (result.success) {
                alert(`🎉 出版成功！\n书名：《${finalTitle}》\n获得墨水：${Math.floor(finalContent.length / 2)} ml`);
                
                UIRenderer.renderBookshelf();
                UIRenderer.updateStatus();
                
                editor.value = "";
                if (titleInput) titleInput.value = "";
                document.getElementById('workbench-modal').style.display = 'none';
            } else {
                alert("❌ 出版出错：" + result.msg);
            }
        };
    }

    // --- C. 阅读模式 (Reader System) ---
    const btnCloseReader = document.getElementById('btn-close-reader');
    if (btnCloseReader) {
        btnCloseReader.onclick = () => {
            document.getElementById('reader-modal').style.display = 'none';
        };
    }

    // C2. [新增] 删除书籍按钮
    const btnDeleteBook = document.getElementById('btn-delete-book');
    if (btnDeleteBook) {
        btnDeleteBook.onclick = () => {
            if (!UIRenderer.currentBookId) return;

            const confirmed = confirm("确定要销毁这本书吗？墨水不会返还。");
            if (confirmed) {
                // 1. 执行删除
                Library.deleteBook(UIRenderer.currentBookId);
                UIRenderer.log("销毁了一本书籍。");

                // 2. 关闭阅读器
                document.getElementById('reader-modal').style.display = 'none';

                // 3. 刷新书架
                UIRenderer.renderBookshelf();
            }
        };
    }

        // --- 新增：D.房间热区交互 ---

    // D.1. 点击桌子 -> 打开日记弹窗
    const desk = document.getElementById('hotspot-desk');
    if (desk) {
        desk.onclick = () => {
            document.getElementById('modal-desk').style.display = 'flex';
            // 重新刷新一下列表，确保数据最新
            UIRenderer.renderJournalList(); 
        };
    }

    // D.2. 点击书架 -> 打开书架弹窗
    const shelf = document.getElementById('hotspot-bookshelf');
    if (shelf) {
        shelf.onclick = () => {
            document.getElementById('modal-bookshelf-ui').style.display = 'flex';
            // 刷新书架显示
            UIRenderer.renderBookshelf();
        };
    }

    // D.3.  --- 1. 房间 -> 点击门 -> 去地图 ---
    const door = document.getElementById('hotspot-door');
    if (door) {
        door.onclick = () => {
            // 调用 UI 渲染器的切换方法
            UIRenderer.toggleMap(true);
        };
    }

    // --- 2. 地图 -> 点击回家按钮 -> 回房间 ---
    const homePin = document.getElementById('hotspot-home-pin');
    if (homePin) {
        homePin.onclick = () => {
            // 切换回房间场景
            UIRenderer.toggleMap(false); 
            UIRenderer.log("逛累了，回到了温馨的房间。");
        };
    }
    // --- 3. (可选) 点击地图上的 Luckin ---
    const luckin = document.getElementById('hotspot-luckin');
    if (luckin) {
        luckin.onclick = () => {
            alert("你点击了 Luckin 咖啡店！(功能开发中)");
        };
    }

    // --- 同步房间里的 HUD ---
    // 每次 updateStatus 时，也更新房间里的显示
    const originalUpdateStatus = UIRenderer.updateStatus;
    UIRenderer.updateStatus = function() {
        originalUpdateStatus.call(UIRenderer); // 调用原来的逻辑
        
        // 额外更新房间里的 UI
        const dayEl = document.getElementById('day-display-room');
        const inkEl = document.getElementById('ink-display-room');
        if (dayEl) dayEl.innerText = UserData.state.day;
        if (inkEl) inkEl.innerText = UserData.state.ink;
    };

    // --- E. 阅读器编辑功能 (Reader Edit System) ---
    
    // E1. 点击“修订”按钮 -> 进入编辑模式
    const btnEditBook = document.getElementById('btn-edit-book');
    if (btnEditBook) {
        btnEditBook.onclick = () => {
            UIRenderer.toggleReaderMode(true);
        };
    }

    // E2. 点击“取消” -> 回到阅读模式
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.onclick = () => {
            // 重新把书的内容填回去（防止用户改了一半取消，下次打开还是改了一半的样子）
            // 简单点，直接切回视图即可，因为下次 openBook 会重置 input
            UIRenderer.toggleReaderMode(false);
        };
    }

    // E3. 点击“保存修订”
    const btnSaveBook = document.getElementById('btn-save-book');
    if (btnSaveBook) {
        btnSaveBook.onclick = () => {
            const id = UIRenderer.currentBookId;
            const newTitle = document.getElementById('reader-title-input').value;
            const newContent = document.getElementById('reader-content-input').value;

            if (!newTitle || !newContent) {
                alert("标题和内容不能为空");
                return;
            }

            // 1. 更新数据
            Library.updateBook(id, newTitle, newContent);
            
            // 2. 更新阅读模式的显示文本
            document.getElementById('reader-title').innerText = newTitle;
            document.getElementById('reader-text').innerText = newContent;

            // 3. 刷新书架列表 (因为标题可能变了，tooltips需要更新)
            UIRenderer.renderBookshelf();

            // 4. 切回阅读模式
            UIRenderer.toggleReaderMode(false);
            
            UIRenderer.log(`已修订书籍：《${newTitle}》`);
        };
    }

    // --- F. 城市与时间系统 (City & Time) ---

    // F1. 探索公园
    const btnPark = document.getElementById('btn-explore-park');
    if (btnPark) {
        btnPark.onclick = () => {
            const msg = CityEvent.explore('公园');
            UIRenderer.log(msg);
        };
    }

    // F2. 探索地铁
    const btnSubway = document.getElementById('btn-explore-subway');
    if (btnSubway) {
        btnSubway.onclick = () => {
            const msg = CityEvent.explore('subway');
            UIRenderer.log(msg);
        };
    }

    // F3. 睡觉 (不再增加天数，而是作为一种仪式)
    const btnSleep = document.getElementById('btn-sleep');
    if (btnSleep) {
        btnSleep.onclick = () => {
            // 1. 执行保存
            UserData.save();
            
            // 2. 视觉反馈
            UIRenderer.log(`晚安。今天是来到伊萨卡的第 ${UserData.state.day} 天。`);
            
            // 3. (可选) 切换到夜间模式作为反馈
            const roomBg = document.querySelector('.room-background');
            if (roomBg && !roomBg.classList.contains('night-mode')) {
                roomBg.classList.add('night-mode');
            }
            
            // 4. (可选) 提示明天再来
            alert("已保存进度。晚安，明天见！(时间将随现实流逝)");
        };
    }

    // --- 新增：右上角工具栏事件 ---

    // 1. 商店 (Shop)
    const btnShop = document.getElementById('btn-icon-shop');
    if (btnShop) {
        btnShop.onclick = () => {
            // 打开弹窗
            document.getElementById('modal-shop').style.display = 'flex';
            // 更新商店里显示的余额
            document.getElementById('shop-ink-display').innerText = UserData.state.ink;
            // 渲染商品列表
            Shop.render();
        };
    }

    // 2. 地图 (Map) - 直接复用 toggleMap
    const btnMap = document.getElementById('btn-icon-map');
    if (btnMap) {
        btnMap.onclick = () => {
            UIRenderer.toggleMap(true);
        };
    }

    // 3. 日志 (Journal) - 复用打开书桌的逻辑
    const btnJournal = document.getElementById('btn-icon-journal');
    if (btnJournal) {
        btnJournal.onclick = () => {
            document.getElementById('modal-desk').style.display = 'flex';
            UIRenderer.renderJournalList();
        };
    }

   // 4. 白天/黑夜切换 (Theme)
    const btnTheme = document.getElementById('btn-icon-theme');
    if (btnTheme) {
        btnTheme.onclick = () => {
            // 1. 获取背景图元素
            // 注意：你的 HTML 里 class 是 'room-background'，不是 'room-bg'
            const roomBg = document.querySelector('.room-background');
            
            if (roomBg) {
                // 2. 切换 class (有就删，无就加)
                roomBg.classList.toggle('night-mode');
                
                // 3. 给点反馈日志
                if (roomBg.classList.contains('night-mode')) {
                    UIRenderer.log("🌙 夜深了，世界安静了下来。");
                    // 改变按钮图标为月亮 (可选)
                    btnTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
                } else {
                    UIRenderer.log("☀️ 天亮了，又是新的一天。");
                    // 改变按钮图标为太阳 (可选)
                    btnTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
                }
            }
        };
    }

    // --- 新增：重置/初始化按钮逻辑 ---
    const btnReset = document.getElementById('btn-icon-reset');
    if (btnReset) {
        btnReset.onclick = async () => {
            const confirmed = confirm("⚠️【高能预警】\n\n确定要重置吗？\n这将清空一切！");
            
            if (confirmed) {
                console.log("正在执行重置...");

                // 2. 重置用户数据 (UserData)
                UserData.state = {
                    day: 1,
                    ink: 0,
                    draft: "",
                    inventory: [], 
                    // 🔴 修复点：这里不要写 []，要写 undefined 或者 null
                    // 这样 UserData.init() 才会认为“这个号没初始化过”，从而自动发家具
                    layout: undefined 
                };
                
                // 保存这个“未初始化”的状态
                await window.ithacaSystem.saveData('user_data.json', JSON.stringify(UserData.state));

                // 3. 清空日记和书架 (保持不变)
                await window.ithacaSystem.saveData('journal_data.json', JSON.stringify([]));
                await window.ithacaSystem.saveData('library_data.json', JSON.stringify([]));

                alert("♻️ 世界已重启。");
                
                // 5. 刷新页面
                window.location.reload();
            }
        };
    }
}

// 启动程序
init();