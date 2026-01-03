/* src/js/app.js - 完整版 (含信箱系统) */

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
import { StoryManager } from './logic/StoryManager.js';
import { MailManager } from './logic/MailManager.js'; // ✨ 新增引入
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
    // UIRenderer.init 会调用 renderSidebar，动态绑定 + 号按钮事件
    // 同时 updateStatus 会初始化信箱红点状态
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
            }
        });
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
                
                // 刷新侧边栏（因为图标可能变了）
                UIRenderer.renderSidebar(); 
                
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

            const confirmed = confirm("确定要撕毁这一页日记吗？此操作无法撤销。");
            if (confirmed) {
                // 1. 执行删除
                Journal.deleteEntry(UIRenderer.activeEntryId);
                UIRenderer.log("🗑️ 撕毁了一页记忆。");

                // 2. 重置 UI：尝试选中剩下日记的第一篇
                UIRenderer.activeEntryId = null;

                // 3. 刷新界面
                UIRenderer.renderSidebar();
                UIRenderer.loadActiveEntry();
                UIRenderer.updateStatus(); 
            }
        };
    }


    // --- B. 装订工作台 (Workbench System) ---

    // B1. 打开工作台
    const btnOpenWorkbench = document.getElementById('btn-open-workbench');
    if (btnOpenWorkbench) {
        btnOpenWorkbench.onclick = () => {
            const workbenchModal = document.getElementById('workbench-modal');
            workbenchModal.style.display = 'flex';
            
            // 1. 初始化下拉框 (渲染所有本子)
            UIRenderer.renderWorkbenchNotebookSelector();

            // 2. 重置搜索状态
            const searchInput = document.getElementById('workbench-search');
            const notebookSelect = document.getElementById('workbench-filter-notebook');
            if (searchInput) searchInput.value = ""; 
            if (notebookSelect) notebookSelect.value = "ALL"; // 默认选全部

            // 3. 初始渲染列表
            UIRenderer.renderWorkbenchList("", "ALL");
            
            const titleInput = document.getElementById('manuscript-title-input');
            if (titleInput) titleInput.value = "";
        };
    }

    // ✨ B1.4 监听下拉框变化 (Notebook Filter)
    const notebookSelect = document.getElementById('workbench-filter-notebook');
    const searchInput = document.getElementById('workbench-search'); // 获取引用

    if (notebookSelect) {
        notebookSelect.onchange = () => {
            const selectedNotebookId = notebookSelect.value;
            const searchText = searchInput ? searchInput.value.trim() : "";
            
            // 传入两个参数：搜索词 + 本子ID
            UIRenderer.renderWorkbenchList(searchText, selectedNotebookId);
        };
    }

    // B1.5 监听搜索输入 (Search Filter)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            const selectedNotebookId = notebookSelect ? notebookSelect.value : "ALL";
            
            UIRenderer.renderWorkbenchList(text, selectedNotebookId);
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

            // 获取当前选中的封皮 (逻辑在 Binder/UI 内部处理，这里简化)
            const selectedCover = Binder.currentCover || 'assets/images/booksheet/booksheet1.png';
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

    // C2. 删除书籍按钮
    const btnDeleteBook = document.getElementById('btn-delete-book');
    if (btnDeleteBook) {
        btnDeleteBook.onclick = () => {
            if (!UIRenderer.currentBookId) return;

            const confirmed = confirm("确定要销毁这本书吗？墨水不会返还。");
            if (confirmed) {
                Library.deleteBook(UIRenderer.currentBookId);
                UIRenderer.log("销毁了一本书籍。");
                document.getElementById('reader-modal').style.display = 'none';
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
            UIRenderer.renderSidebar(); 
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
    
    // D.5. 点击地图上的 Luckin
    const luckin = document.getElementById('hotspot-luckin');
    if (luckin) {
        luckin.onclick = () => {
            alert("你点击了 Luckin 咖啡店！(功能开发中)");
        };
    }

    // --- E. 阅读器编辑功能 (Reader Edit System) ---
    const btnEditBook = document.getElementById('btn-edit-book');
    if (btnEditBook) {
        btnEditBook.onclick = () => {
            UIRenderer.toggleReaderMode(true);
        };
    }

    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    if (btnCancelEdit) {
        btnCancelEdit.onclick = () => {
            UIRenderer.toggleReaderMode(false);
        };
    }

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

            Library.updateBook(id, newTitle, newContent);
            document.getElementById('reader-title').innerText = newTitle;
            document.getElementById('reader-text').innerText = newContent;
            UIRenderer.renderBookshelf();
            UIRenderer.toggleReaderMode(false);
            UIRenderer.log(`已修订书籍：《${newTitle}》`);
        };
    }

    // --- F. 城市与时间系统 (City & Time) ---
    const btnPark = document.getElementById('btn-explore-park');
    if (btnPark) {
        btnPark.onclick = () => {
            const msg = CityEvent.explore('公园');
            UIRenderer.log(msg);
        };
    }

    const btnSubway = document.getElementById('btn-explore-subway');
    if (btnSubway) {
        btnSubway.onclick = () => {
            const msg = CityEvent.explore('subway');
            UIRenderer.log(msg);
        };
    }

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

    // // --- ✨✨✨ H. 信箱系统 (Mailbox System) ✨✨✨ ---
    // // 绑定 HUD 上的信箱按钮 (原 Day 图标)
    // const btnMailbox = document.getElementById('btn-mailbox');
    // if (btnMailbox) {
    //     btnMailbox.onclick = () => {
    //         // 🔍 调试代码 B：看看点击是否触发
    //         console.log("信箱被点击了！"); 

    //         const newMail = MailManager.checkNewMail();
    //         const todayMail = MailManager.getTodayMail();
            
    //         const letterToShow = newMail || todayMail;
            
    //         // 调用 UI 渲染器打开信件弹窗
    //         UIRenderer.openLetter(letterToShow);
    //     };
    // } else {
    //     console.error("❌ 找不到 ID 为 'btn-mailbox' 的元素！");
    // }


    // --- 右上角工具栏事件 ---

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
            const modal = document.getElementById('modal-map-selection');
            modal.style.display = 'flex';
            CityEvent.renderSelectionMenu();
        };
    }

    // 3. 日志 (Journal)
    const btnJournal = document.getElementById('btn-icon-journal');
    if (btnJournal) {
        btnJournal.onclick = () => {
            document.getElementById('modal-desk').style.display = 'flex';
            UIRenderer.renderSidebar(); // 使用新的渲染逻辑
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

    // 5. 背包 (Backpack)
    const btnBackpack = document.getElementById('btn-icon-backpack');
    if (btnBackpack) {
        btnBackpack.onclick = () => {
            const modal = document.getElementById('modal-backpack');
            if (modal) {
                modal.style.display = 'flex';
                
                const emptyEl = document.getElementById('bp-detail-empty');
                const contentEl = document.getElementById('bp-detail-content');
                if(emptyEl) emptyEl.style.display = 'block';
                if(contentEl) contentEl.style.display = 'none';
                
                UIRenderer.renderBackpack();
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
                UserData.state = {
                    day: 1,
                    ink: 0,
                    draft: "",
                    inventory: [], 
                    layout: undefined,
                    readMails: [] // 重置信件状态
                };
                
                await window.ithacaSystem.saveData('user_data.json', JSON.stringify(UserData.state));
                await window.ithacaSystem.saveData('journal_data.json', JSON.stringify([]));
                await window.ithacaSystem.saveData('library_data.json', JSON.stringify([]));

                alert("♻️ 世界已重启。");
                window.location.reload();
            }
        };
    }

    // --- 全局回家按钮 ---
    const btnHome = document.getElementById('btn-icon-home');
    if (btnHome) {
        btnHome.onclick = () => {
            const mapScene = document.getElementById('scene-map');
            const streetScene = document.getElementById('scene-intro'); 
            
            // 关闭所有弹窗
            const allModals = document.querySelectorAll('.modal-overlay');
            let hasModalOpen = false;
            allModals.forEach(modal => {
                if (modal.style.display === 'flex' || modal.style.display === 'block') {
                    modal.style.display = 'none';
                    hasModalOpen = true;
                }
            });

            if (mapScene && mapScene.style.display !== 'none') {
                mapScene.style.display = 'none';
                document.getElementById('scene-room').style.display = 'block';
                console.log("从图形地图回家");
            } 
            else if (streetScene && streetScene.style.display !== 'none') {
                StoryManager.returnHome(); 
                console.log("从街景回家");
            } 
            else {
                if (hasModalOpen) {
                    console.log("Home键关闭了所有弹窗");
                } else {
                    UIRenderer.log("已经在房间里了。");
                }
            }
        };
    }

    // --- G. Markdown 预览功能 ---
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

    const btnJournalPreview = document.getElementById('btn-toggle-journal-preview');
    if (btnJournalPreview) {
        btnJournalPreview.onclick = () => {
            togglePreview('editor-area', 'editor-preview', 'btn-toggle-journal-preview');
        };
    }

    const btnManuscriptPreview = document.getElementById('btn-toggle-manuscript-preview');
    if (btnManuscriptPreview) {
        btnManuscriptPreview.onclick = () => {
            togglePreview('manuscript-editor', 'manuscript-preview', 'btn-toggle-manuscript-preview');
        };
    }

    // --- 新增：新建手记本弹窗确认按钮 ---
    const btnCreateNotebook = document.getElementById('btn-submit-notebook');
    if (btnCreateNotebook) {
        btnCreateNotebook.onclick = () => {
            const input = document.getElementById('input-notebook-name');
            const modal = document.getElementById('modal-create-notebook');
            
            if (input && input.value.trim() !== "") {
                const name = input.value.trim();
                
                // 1. 创建数据
                UserData.createNotebook(name);
                
                // 2. 刷新列表
                UIRenderer.renderSidebar();
                
                // 3. 关闭弹窗
                modal.style.display = 'none';
                
                UIRenderer.log(`📂 创建了新手记本：《${name}》`);
            } else {
                alert("请输入手记本名称");
            }
        };
        
        // 体验优化：支持按回车键提交
        const input = document.getElementById('input-notebook-name');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') btnCreateNotebook.click();
            };
        }
    }
}

// 启动程序
init();