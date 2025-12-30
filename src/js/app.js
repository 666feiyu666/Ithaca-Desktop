/* src/js/app.js - 完整版 (修复字数显示) */

// 1. 引入所有模块
import { Journal } from './data/Journal.js';
import { UserData } from './data/UserData.js';
import { Library } from './data/Library.js';
import { IntroScene } from './logic/IntroScene.js';
import { Binder } from './logic/Binder.js';
import { CityEvent } from './logic/CityEvent.js';
import { Shop } from './logic/Shop.js';
import { DragManager } from './logic/DragManager.js';   
import { TimeSystem } from './logic/TimeSystem.js';
import { UIRenderer } from './ui/UIRenderer.js';
import { marked } from './libs/marked.esm.js';  

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
    // UIRenderer.init 会调用 updateStatus，正确显示 天数/墨水/字数
    UIRenderer.init();
    UIRenderer.renderBookshelf();
    
    // 初始化拖拽系统
    DragManager.init(); 
    // 初始渲染一次房间家具
    UIRenderer.renderRoomFurniture(); 
    
    // 播放开场剧情 (如果是新游戏)
    IntroScene.init(); 

    bindEvents();
    UIRenderer.log("欢迎回家。");
}

// 3. 事件绑定中心
function bindEvents() {

    // --- A. 日记与书写区域 (Journal System) ---

    // A1. 输入框自动保存 (Auto-save)
    const editor = document.getElementById('editor-area');
    if (editor) {
        editor.addEventListener('input', () => {
            // 只有当当前有选中的日记时才保存
            if (UIRenderer.activeEntryId) {
                Journal.updateEntry(UIRenderer.activeEntryId, editor.value);
                // 实时刷新左侧列表的字数统计
                UIRenderer.renderJournalList();
            }
        });
    }

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
                UIRenderer.updateStatus(); // 更新顶部墨水数/字数
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

    // A4. 删除日记按钮
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
                UIRenderer.updateStatus(); // 删除可能导致字数减少，刷新UI
            }
        };
    }


    // --- B. 装订工作台 (Workbench System) ---

    // 1. 监听封皮选择点击
    const coverOptions = document.querySelectorAll('.cover-option');
    // 暂存当前选中的封皮，默认为第一张
    let selectedCover = 'assets/images/booksheet/booksheet1.png';

    coverOptions.forEach(img => {
        img.onclick = () => {
            // 移除其他选中状态
            coverOptions.forEach(opt => opt.classList.remove('selected'));
            // 选中当前
            img.classList.add('selected');
            // 更新变量
            selectedCover = 'assets/images/booksheet' + img.getAttribute('data-cover');
        };
    });

    // B1. 打开工作台
    const btnOpenWorkbench = document.getElementById('btn-open-workbench');
    if (btnOpenWorkbench) {
        btnOpenWorkbench.onclick = () => {
            const workbenchModal = document.getElementById('workbench-modal');
            workbenchModal.style.display = 'flex';
            
            // 重置
            const searchInput = document.getElementById('workbench-search');
            if (searchInput) searchInput.value = ""; 
            const titleInput = document.getElementById('manuscript-title-input');
            if (titleInput) titleInput.value = "";
            
            // 重置封皮选择：默认选第一个
            coverOptions.forEach(opt => opt.classList.remove('selected'));
            if(coverOptions.length > 0) {
                coverOptions[0].classList.add('selected');
                selectedCover = 'assets/images/booksheet' + coverOptions[0].getAttribute('data-cover');
            }

            UIRenderer.renderWorkbenchList();
            const manuscriptEditor = document.getElementById('manuscript-editor');
            if (manuscriptEditor) manuscriptEditor.value = Binder.currentManuscript;
        };
    }

    // B1.5 监听搜索输入
    const searchInput = document.getElementById('workbench-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            UIRenderer.renderWorkbenchList(text);
        });
    }

    // B2. 关闭工作台
    const btnCloseWorkbench = document.getElementById('btn-close-workbench');
    if (btnCloseWorkbench) {
        btnCloseWorkbench.onclick = () => {
            document.getElementById('workbench-modal').style.display = 'none';
        };
    }
    
    // B3. 书稿手动编辑同步
    const manuscriptEditor = document.getElementById('manuscript-editor');
    if (manuscriptEditor) {
        manuscriptEditor.addEventListener('input', (e) => {
            Binder.updateManuscript(e.target.value);
        });
    }

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

            // 传入 selectedCover
            const result = Binder.publish(finalTitle, selectedCover);
            
            if (result.success) {
                alert(`🎉 出版成功！\n书名：《${finalTitle}》\n获得墨水：${Math.floor(finalContent.length / 2)} ml`);
                
                UIRenderer.renderBookshelf();
                UIRenderer.updateStatus(); // 刷新墨水
                
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

    // C2. 删除书籍按钮
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

    // --- D. 房间热区交互 ---

    // D.1. 点击桌子 -> 打开日记弹窗
    const desk = document.getElementById('hotspot-desk');
    if (desk) {
        desk.onclick = () => {
            document.getElementById('modal-desk').style.display = 'flex';
            UIRenderer.renderJournalList(); 
        };
    }

    // D.2. 点击书架 -> 打开书架弹窗
    const shelf = document.getElementById('hotspot-bookshelf');
    if (shelf) {
        shelf.onclick = () => {
            document.getElementById('modal-bookshelf-ui').style.display = 'flex';
            UIRenderer.renderBookshelf();
        };
    }

    // D.3. 房间 -> 点击门 -> 去地图
    const door = document.getElementById('hotspot-door');
    if (door) {
        door.onclick = () => {
            UIRenderer.toggleMap(true);
        };
    }

    // D.4. 地图 -> 点击回家按钮 -> 回房间
    const homePin = document.getElementById('hotspot-home-pin');
    if (homePin) {
        homePin.onclick = () => {
            UIRenderer.toggleMap(false); 
            UIRenderer.log("逛累了，回到了温馨的房间。");
        };
    }
    
    // D.5. (可选) 点击地图上的 Luckin
    const luckin = document.getElementById('hotspot-luckin');
    if (luckin) {
        luckin.onclick = () => {
            alert("你点击了 Luckin 咖啡店！(功能开发中)");
        };
    }

    // 🔴 【核心修复】移除了此处原有的 UIRenderer.updateStatus 覆盖代码
    // 现在完全由 UIRenderer.js 内部逻辑控制 UI 刷新，确保字数统计正常显示。

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

            // 3. 刷新书架列表
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

    // F3. 睡觉
    const btnSleep = document.getElementById('btn-sleep');
    if (btnSleep) {
        btnSleep.onclick = () => {
            UserData.save();
            UIRenderer.log(`晚安。今天是来到伊萨卡的第 ${UserData.state.day} 天。`);
            
            const roomBg = document.querySelector('.room-background');
            if (roomBg && !roomBg.classList.contains('night-mode')) {
                roomBg.classList.add('night-mode');
            }
            alert("已保存进度。晚安，明天见！(时间将随现实流逝)");
        };
    }

    // --- 新增：右上角工具栏事件 ---

    // 1. 商店 (Shop)
    const btnShop = document.getElementById('btn-icon-shop');
    if (btnShop) {
        btnShop.onclick = () => {
            document.getElementById('modal-shop').style.display = 'flex';
            document.getElementById('shop-ink-display').innerText = UserData.state.ink;
            Shop.render();
        };
    }

    // 2. 地图 (Map)
    const btnMap = document.getElementById('btn-icon-map');
    if (btnMap) {
        btnMap.onclick = () => {
            UIRenderer.toggleMap(true);
        };
    }

    // 3. 日志 (Journal)
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
            const roomBg = document.querySelector('.room-background');
            
            if (roomBg) {
                roomBg.classList.toggle('night-mode');
                
                if (roomBg.classList.contains('night-mode')) {
                    UIRenderer.log("🌙 夜深了，世界安静了下来。");
                    btnTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
                } else {
                    UIRenderer.log("☀️ 天亮了，又是新的一天。");
                    btnTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
                }
            }
        };
    }

    // --- 重置/初始化按钮 ---
    const btnReset = document.getElementById('btn-icon-reset');
    if (btnReset) {
        btnReset.onclick = async () => {
            const confirmed = confirm("⚠️【高能预警】\n\n确定要重置吗？\n这将清空一切！");
            
            if (confirmed) {
                console.log("正在执行重置...");

                // 重置用户数据
                UserData.state = {
                    day: 1,
                    ink: 0,
                    draft: "",
                    inventory: [], 
                    layout: undefined // 确保触发 init 发放新手家具
                };
                
                await window.ithacaSystem.saveData('user_data.json', JSON.stringify(UserData.state));
                await window.ithacaSystem.saveData('journal_data.json', JSON.stringify([]));
                await window.ithacaSystem.saveData('library_data.json', JSON.stringify([]));

                alert("♻️ 世界已重启。");
                window.location.reload();
            }
        };
    }

    // --- G. Markdown 预览功能 ---

    // 通用切换函数
    const togglePreview = (editorId, previewId, btnId) => {
        const editor = document.getElementById(editorId);
        const preview = document.getElementById(previewId);
        const btn = document.getElementById(btnId);

        if (!editor || !preview || !btn) return;

        if (preview.style.display === 'none') {
            const rawText = editor.value;
            const htmlContent = marked.parse(rawText, { breaks: true }); 
            
            preview.innerHTML = htmlContent;
            preview.style.display = 'block'; 
            
            btn.innerText = "✏️ 继续编辑";
            btn.style.background = "#333";
        } else {
            preview.style.display = 'none';
            
            btn.innerText = "👁️ 预览";
            btn.style.background = "#666";
            editor.focus();
        }
    };

    // 1. 日记预览
    const btnJournalPreview = document.getElementById('btn-toggle-journal-preview');
    if (btnJournalPreview) {
        btnJournalPreview.onclick = () => {
            togglePreview('editor-area', 'editor-preview', 'btn-toggle-journal-preview');
        };
    }

    // 2. 书稿预览
    const btnManuscriptPreview = document.getElementById('btn-toggle-manuscript-preview');
    if (btnManuscriptPreview) {
        btnManuscriptPreview.onclick = () => {
            togglePreview('manuscript-editor', 'manuscript-preview', 'btn-toggle-manuscript-preview');
        };
    }
}

// 启动程序
init();