/* src/js/ui/UIRenderer.js - 完整版 (含信箱、手记本管理、仓库系统) */
import { Journal } from '../data/Journal.js';
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';
import { Binder } from '../logic/Binder.js';
import { StoryManager } from '../logic/StoryManager.js';    
import { DragManager } from '../logic/DragManager.js'; 
import { CityEvent } from '../logic/CityEvent.js';
import { MailManager } from '../logic/MailManager.js'; 
import { marked } from '../libs/marked.esm.js';

// 物品数据库配置
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
    currentNotebookId: null, 

    init() {
        const all = Journal.getAll();
        if (all.length > 0) {
            this.activeEntryId = all[0].id;
        }
        
        this.updateStatus(); // 触发信箱检查
        this.renderSidebar();
        this.loadActiveEntry();
        this.renderRoomFurniture();
    },

    // ============================================================
    // 📂 侧边栏逻辑 (Sidebar System)
    // ============================================================

    renderSidebar() {
        // 如果没有选中特定的本子，显示归档目录；否则显示日记列表
        if (!this.currentNotebookId) {
            this.renderNotebookList();
        } else {
            this.renderEntryList(this.currentNotebookId);
        }
    },

    // --- Level 1: 渲染手记本目录 ---
    renderNotebookList() {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";
        
        if (headerEl) headerEl.innerText = "📂 归档系统";
        
        const allEntries = Journal.getAll();

        // ==========================================
        // 1. 渲染仓库 (System: Warehouse / All Memories)
        //    显示所有日记的总入口
        // ==========================================
        const totalCount = allEntries.length;
        
        const repoDiv = document.createElement('div');
        repoDiv.className = 'list-item notebook-folder';
        repoDiv.style.borderLeft = "4px solid #4e342e"; // 深褐色代表仓库
        repoDiv.style.display = "flex"; 
        repoDiv.style.justifyContent = "space-between";
        repoDiv.style.alignItems = "center";

        repoDiv.innerHTML = `
            <div style="display:flex; align-items:center; overflow:hidden;">
                <span class="nb-icon-emoji">💾</span>
                <span class="nb-name">仓库</span>
            </div>
            <span class="nb-count">${totalCount}</span>
        `;
        repoDiv.onclick = () => {
            this.currentNotebookId = 'REPO_ALL_ID'; // 特殊 ID：仓库
            this.renderSidebar();
        };
        listEl.appendChild(repoDiv);

        // ==========================================
        // 2. 渲染日常碎片 (System: Daily Fragments)
        // ==========================================
        const dailyCount = allEntries.filter(e => {
            if (e.notebookIds && Array.isArray(e.notebookIds)) {
                return e.notebookIds.includes('nb_daily');
            }
            return e.notebookId === 'nb_daily';
        }).length;

        const dailyDiv = document.createElement('div');
        dailyDiv.className = 'list-item notebook-folder';
        dailyDiv.style.borderLeft = "4px solid #ffa000"; // 琥珀色
        dailyDiv.style.display = "flex";
        dailyDiv.style.justifyContent = "space-between";
        dailyDiv.style.alignItems = "center";

        dailyDiv.innerHTML = `
            <div style="display:flex; align-items:center; overflow:hidden;">
                <span class="nb-icon-emoji">🧩</span>
                <span class="nb-name">日常碎片</span>
            </div>
            <span class="nb-count">${dailyCount}</span>
        `;
        dailyDiv.onclick = () => {
            this.currentNotebookId = 'nb_daily';
            this.renderSidebar();
        };
        listEl.appendChild(dailyDiv);

        // ==========================================
        // 3. 渲染用户自定义手记本
        // ==========================================
        UserData.state.notebooks.forEach(nb => {
            // 跳过系统预设 ID
            if (nb.id === 'nb_inbox' || nb.id === 'nb_daily') return;

            const count = allEntries.filter(e => {
                if (e.notebookIds && Array.isArray(e.notebookIds)) {
                    return e.notebookIds.includes(nb.id);
                }
                return e.notebookId === nb.id; 
            }).length;
            
            const div = document.createElement('div');
            div.className = 'list-item notebook-folder'; 
            div.style.position = 'relative'; 
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.alignItems = "center";
            
            let iconHtml = '';
            if (nb.icon && nb.icon.includes('/')) {
                iconHtml = `<img src="${nb.icon}" class="nb-icon-img">`;
            } else {
                iconHtml = `<span class="nb-icon-emoji">${nb.icon || '📔'}</span>`;
            }

            const leftContent = document.createElement('div');
            leftContent.style.cssText = "display:flex; align-items:center; flex:1; overflow:hidden; margin-right:10px;";
            leftContent.innerHTML = `${iconHtml}<span class="nb-name">${nb.name}</span>`;
            
            const countSpan = document.createElement('span');
            countSpan.className = 'nb-count';
            countSpan.innerText = count;

            // --- 操作栏 (重命名/删除) ---
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = "display:none; gap:5px;";
            
            // ✏️ 重命名按钮
            const btnRename = document.createElement('span');
            btnRename.innerText = "✏️";
            btnRename.title = "重命名";
            btnRename.style.cssText = "cursor:pointer; font-size:14px; opacity:0.7;";
            btnRename.onmouseover = () => btnRename.style.opacity = 1;
            btnRename.onmouseout = () => btnRename.style.opacity = 0.7;
            btnRename.onclick = (e) => {
                e.stopPropagation(); 
                // 调用自定义输入弹窗
                this.showNotebookInputModal('rename', nb.id, nb.name);
            };

            // 🗑️ 删除按钮
            const btnDelete = document.createElement('span');
            btnDelete.innerText = "🗑️";
            btnDelete.title = "删除手记本";
            btnDelete.style.cssText = "cursor:pointer; font-size:14px; opacity:0.7;";
            btnDelete.onmouseover = () => btnDelete.style.opacity = 1;
            btnDelete.onmouseout = () => btnDelete.style.opacity = 0.7;
            btnDelete.onclick = (e) => {
                e.stopPropagation(); 
                if (confirm(`确定要删除《${nb.name}》吗？\n\n注意：里面的日记不会被删除，它们仍会保留在“所有记忆”中。`)) {
                    if (UserData.deleteNotebook(nb.id)) {
                        this.renderNotebookList(); 
                    } else {
                        alert("无法删除此手记本（可能是默认项）。");
                    }
                }
            };

            actionsDiv.appendChild(btnRename);
            actionsDiv.appendChild(btnDelete);

            div.appendChild(leftContent);
            div.appendChild(countSpan);
            div.appendChild(actionsDiv);
            
            // 悬停显示操作栏
            div.onmouseenter = () => {
                countSpan.style.display = 'none';
                actionsDiv.style.display = 'flex';
                div.style.background = '#fff8e1';
            };
            div.onmouseleave = () => {
                countSpan.style.display = 'inline-block';
                actionsDiv.style.display = 'none';
                div.style.background = '';
            };

            div.onclick = () => {
                this.currentNotebookId = nb.id; 
                this.renderSidebar();
            };
            
            listEl.appendChild(div);
        });

        // 4. 底部新建按钮
        const createBtn = document.createElement('div');
        createBtn.className = 'list-item';
        createBtn.style.textAlign = 'center';
        createBtn.style.color = '#888';
        createBtn.style.marginTop = '10px';
        createBtn.style.border = '1px dashed #ccc';
        createBtn.style.cursor = 'pointer';
        createBtn.innerText = "+ 新建手记本";
        createBtn.onclick = () => {
             this.showNotebookInputModal('create');
        };
        listEl.appendChild(createBtn);

        // 5. 顶部加号逻辑 (默认新建，归入收件箱/未分类)
        if (addBtn) {
            addBtn.title = "新建日记";
            addBtn.onclick = () => {
                const newEntry = Journal.createNewEntry(); 
                this.activeEntryId = newEntry.id;
                this.currentNotebookId = 'INBOX_VIRTUAL_ID'; // 临时跳到收件箱视角查看新日记
                this.renderSidebar();
                this.loadActiveEntry();
                const editor = document.getElementById('editor-area');
                if(editor) editor.focus();
                this.log(`创建了新的空白记录 (${newEntry.time})。`);
            };
        }
    },
    
   // ✨ 通用手记本输入弹窗 (解决 Electron 不支持 prompt 问题)
    showNotebookInputModal(mode = 'create', targetId = null, currentName = '') {
        const existing = document.getElementById('dynamic-modal-input');
        if (existing) existing.remove();

        const isRename = (mode === 'rename');
        const titleText = isRename ? "重命名手记本" : "新建手记本";
        const subTitleText = isRename ? "给它换个新名字" : "为你的新想法建一个家";
        const btnText = isRename ? "保存修改" : "创建";
        const inputValue = isRename ? currentName : "";
        
        const overlay = document.createElement('div');
        overlay.id = 'dynamic-modal-input';
        overlay.className = 'modal-overlay'; 
        overlay.style.display = 'flex'; 
        overlay.style.zIndex = '9999';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.width = '320px';
        content.style.textAlign = 'center';
        content.style.background = '#fff';
        content.style.padding = '20px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        content.style.border = '2px solid #5d4037';

        content.innerHTML = `
            <h3 style="margin-top:0; color:#5d4037;">${titleText}</h3>
            <p style="font-size:12px; color:#888; margin-bottom:15px;">${subTitleText}</p>
            
            <input type="text" id="notebook-input-field" value="${inputValue}" placeholder="请输入名称..." 
                   style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box; font-size:14px;">
            
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-cancel-input" style="padding:6px 12px; cursor:pointer; background:#fff; border:1px solid #ccc; border-radius:4px; color:#333;">取消</button>
                <button id="btn-confirm-input" style="padding:6px 12px; cursor:pointer; background:#5d4037; color:white; border:none; border-radius:4px;">${btnText}</button>
            </div>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        const input = content.querySelector('#notebook-input-field');
        const btnCancel = content.querySelector('#btn-cancel-input');
        const btnConfirm = content.querySelector('#btn-confirm-input');

        const close = () => overlay.remove();
        
        const confirmAction = () => {
            const name = input.value.trim();
            if (!name) {
                alert("名称不能为空");
                return;
            }

            if (isRename) {
                UserData.renameNotebook(targetId, name);
                this.renderNotebookList();
                this.log(`✏️ 手记本重命名为：《${name}》`);
            } else {
                UserData.createNotebook(name);
                this.renderSidebar(); 
                this.log(`📂 创建了新手记本：《${name}》`);
            }
            close();
        };

        btnCancel.onclick = close;
        btnConfirm.onclick = confirmAction;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmAction();
            if (e.key === 'Escape') close();
        };

        setTimeout(() => {
            input.focus();
            if(isRename) input.select();
        }, 50);
    },

    // --- Level 2: 渲染日记列表 ---
    renderEntryList(notebookId) {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";

        let entries = [];
        let title = "";

        // 根据 ID 类型筛选日记
        if (notebookId === 'REPO_ALL_ID') {
            title = "💾 所有记忆";
            entries = Journal.getAll(); // 获取全部
        } else if (notebookId === 'INBOX_VIRTUAL_ID') {
            title = "📥 收件箱";
            entries = Journal.getAll().filter(e => !e.notebookIds || e.notebookIds.length === 0);
        } else {
            const nb = UserData.state.notebooks.find(n => n.id === notebookId);
            title = nb ? nb.name : "未知手记";
            entries = Journal.getAll().filter(e => {
                if (e.notebookIds && Array.isArray(e.notebookIds)) {
                    return e.notebookIds.includes(notebookId);
                }
                return e.notebookId === notebookId;
            });
        }

        // 更新头部标题和返回按钮
        if (headerEl) {
            headerEl.innerHTML = `<span id="btn-back-level" class="nav-back-btn">⬅️</span> ${title}`;
            const backBtn = document.getElementById('btn-back-level');
            if(backBtn) {
                backBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    this.currentNotebookId = null; // 返回上一级
                    this.renderSidebar();
                };
            }
        }

        // 更新右上角加号按钮的功能
        if (addBtn) {
            if (notebookId === 'REPO_ALL_ID' || notebookId === 'INBOX_VIRTUAL_ID') {
                addBtn.title = "新建日记";
                addBtn.onclick = () => {
                    const newEntry = Journal.createNewEntry();
                    this.activeEntryId = newEntry.id;
                    this.renderSidebar();
                    this.loadActiveEntry();
                };
            } else {
                addBtn.title = "在此手记本中新建";
                addBtn.onclick = () => {
                    const newEntry = Journal.createNewEntry();
                    Journal.toggleNotebook(newEntry.id, notebookId); // 自动归入当前本子
                    
                    this.activeEntryId = newEntry.id;
                    this.renderSidebar();
                    this.loadActiveEntry();
                };
            }
        }

        if (entries.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#999; margin-top:20px; font-size:12px;">这里是空的<br>点击右上角 + 添加想法</div>`;
        } else {
            entries.forEach(entry => {
                const btn = document.createElement('div');
                btn.className = 'list-item';
                if (entry.id === this.activeEntryId) btn.classList.add('active');
                
                const statusIcon = entry.isConfirmed ? "✅" : "📝";
                const preview = (entry.content || "").slice(0, 15).replace(/\n/g, ' ') || '新篇章...';
                const timeStr = entry.time || "";

                btn.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:#444;">
                        <span>${statusIcon} ${entry.date}</span>
                        <span style="font-size:11px; font-weight:normal; color:#888;">${timeStr}</span>
                    </div>
                    <div style="font-size:12px; color:#666; margin-top:4px; line-height:1.4;">${preview}</div>
                `;
                
                btn.onclick = () => {
                    this.activeEntryId = entry.id;
                    const allItems = listEl.querySelectorAll('.list-item');
                    allItems.forEach(i => i.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadActiveEntry();   
                };
                listEl.appendChild(btn);
            });
        }
    },

    // ============================================================
    // 📝 编辑器与工作台
    // ============================================================

    renderTagBar(entry) {
        let tagContainer = document.getElementById('entry-tag-bar');
        if (!tagContainer) {
            tagContainer = document.createElement('div');
            tagContainer.id = 'entry-tag-bar';
            tagContainer.style.padding = "10px 15px";
            tagContainer.style.borderTop = "1px solid #eee";
            tagContainer.style.background = "#f9f9f9";
            tagContainer.style.display = "flex";
            tagContainer.style.flexWrap = "wrap";
            tagContainer.style.gap = "8px";
            tagContainer.style.alignItems = "center";
            
            const footer = document.querySelector('.editor-footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(tagContainer, footer);
            } else {
                const container = document.querySelector('.editor-container');
                if(container) container.appendChild(tagContainer);
            }
        }

        tagContainer.innerHTML = `<span style="font-size:12px; color:#999; margin-right:5px;">归档至：</span>`;

        UserData.state.notebooks.forEach(nb => {
            const isSelected = entry.notebookIds && entry.notebookIds.includes(nb.id);
            
            const tag = document.createElement('span');
            
            let iconHtml = nb.icon || '📔';
            if (nb.icon && nb.icon.includes('/')) {
                iconHtml = `<img src="${nb.icon}" style="width:16px; height:16px; object-fit:contain; margin-right:4px;">`;
            }

            tag.innerHTML = `${iconHtml}${nb.name}`;
            
            tag.style.display = "inline-flex";
            tag.style.alignItems = "center";
            tag.style.fontSize = "12px";
            tag.style.padding = "4px 10px";
            tag.style.borderRadius = "15px";
            tag.style.cursor = "pointer";
            tag.style.userSelect = "none";
            tag.style.transition = "all 0.2s";
            
            if (isSelected) {
                tag.style.border = "1px solid #5d4037";
                tag.style.background = "#5d4037";
                tag.style.color = "#fff";
            } else {
                tag.style.border = "1px solid #ddd";
                tag.style.background = "#fff";
                tag.style.color = "#666";
            }
            
            tag.onclick = () => {
                Journal.toggleNotebook(entry.id, nb.id);
                this.renderTagBar(entry);
                if (this.currentNotebookId === nb.id || this.currentNotebookId === 'INBOX_VIRTUAL_ID') {
                     this.renderSidebar(); 
                }
            };
            
            tagContainer.appendChild(tag);
        });
    },

    loadActiveEntry() {
        const editor = document.getElementById('editor-area');
        const tagBar = document.getElementById('entry-tag-bar');

        if (!this.activeEntryId) {
            if (editor) editor.value = "";
            if (tagBar) tagBar.innerHTML = "";
            return;
        }

        const entry = Journal.getAll().find(e => e.id === this.activeEntryId);
        if (entry) {
            if (editor) editor.value = entry.content;
            this.updateConfirmButtonState(entry);
            this.renderTagBar(entry);
        } else {
            if (editor) editor.value = "";
        }
    },

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

    // ============================================================
    // 4.🔨 工作台 (Workbench)
    // ============================================================

    renderWorkbenchNotebookSelector() {
        const selectEl = document.getElementById('workbench-filter-notebook');
        if (!selectEl) return;

        const currentVal = selectEl.value;

        selectEl.innerHTML = `<option value="ALL">📂 所有记忆 (All)</option>`;
        selectEl.innerHTML += `<option value="INBOX_VIRTUAL_ID">📥 收件箱 (Unsorted)</option>`;

        UserData.state.notebooks.forEach(nb => {
            const option = document.createElement('option');
            option.value = nb.id;
            const iconDisplay = (nb.icon && nb.icon.includes('/')) ? '📔' : nb.icon;
            option.text = `${iconDisplay} ${nb.name}`;
            selectEl.appendChild(option);
        });

        if (currentVal) {
            selectEl.value = currentVal;
        }
    },

    renderWorkbenchList(filterText = "", filterNotebookId = "ALL") {
        const listEl = document.getElementById('workbench-sources');
        if (!listEl) return;

        listEl.innerHTML = "";
        const allEntries = Journal.getAll();

        const filteredEntries = allEntries.filter(entry => {
            const matchText = !filterText || entry.content.toLowerCase().includes(filterText.toLowerCase());
            
            let matchNotebook = true;
            if (filterNotebookId === "ALL") {
                matchNotebook = true;
            } else if (filterNotebookId === "INBOX_VIRTUAL_ID") {
                matchNotebook = (!entry.notebookIds || entry.notebookIds.length === 0);
            } else {
                matchNotebook = (entry.notebookIds && entry.notebookIds.includes(filterNotebookId));
            }

            return matchText && matchNotebook;
        });

        if (filteredEntries.length === 0) {
            listEl.innerHTML = `<div style="color:#999; text-align:center; margin-top:20px;">没有找到相关记忆碎片</div>`;
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

    // --- 6. 更新顶部状态栏 (含信箱) ---
    updateStatus() {
        const day = UserData.state.day;
        const ink = UserData.state.ink;
        const totalWords = UserData.state.totalWords || 0;

        const roomDayEl = document.getElementById('day-display-room');
        const roomInkEl = document.getElementById('ink-display-room');
        const roomWordEl = document.getElementById('word-display-room'); 
        
        if (roomDayEl) roomDayEl.innerText = day;
        if (roomInkEl) roomInkEl.innerText = ink;
        if (roomWordEl) roomWordEl.innerText = totalWords;

        // ✨ 更新信箱红点状态
        this.updateMailboxStatus();
    },

    // 1. 更新 HUD 按钮逻辑
    updateMailboxStatus() {
        const newMail = MailManager.checkNewMail();
        const redDot = document.getElementById('mail-red-dot');
        const btnMailbox = document.getElementById('btn-mailbox');
        const iconSpan = btnMailbox ? btnMailbox.querySelector('.hud-icon') : null;
        
        if (btnMailbox) {
            // 点击总是打开目录
            btnMailbox.onclick = () => this.openMailboxDirectory();
        }

        if (redDot) {
            if (newMail) {
                redDot.style.display = 'flex';
                if (iconSpan) iconSpan.innerText = "📬"; 
            } else {
                redDot.style.display = 'none';
                if (iconSpan) iconSpan.innerText = "📭"; 
            }
        }
    },

    // 2. 打开信箱目录 (书架视图)
    openMailboxDirectory() {
        // 关闭其他
        this._closeAllModals(); 
        
        const modal = document.getElementById('modal-mailbox');
        const grid = document.getElementById('mailbox-grid');
        
        if (!modal || !grid) return;

        grid.innerHTML = ""; // 清空旧数据
        const archive = MailManager.getMailArchive(); // 获取列表

        archive.forEach(item => {
            const el = document.createElement('div');
            el.className = 'mail-grid-item';
            el.style.position = 'relative'; // 方便定位 NEW 标签

            if (item.type === 'letter') {
                if (!item.isRead) el.classList.add('unread');
                
                // 简单的信封图标，如果以后你有 envelope.png 可以换成 <img src="...">
                el.innerHTML = `
                    <div class="mail-icon">📩</div>
                    <div class="mail-title">${item.title}</div>
                    <div class="mail-day">Day ${item.day}</div>
                `;
                
                // 点击 -> 打开具体的信 (letter.png 界面)
                el.onclick = () => {
                    this.openLetterDetail(item);
                };
            } else {
                // 待开发 / 空
                el.classList.add('locked');
                el.innerHTML = `
                    <div class="mail-icon" style="filter:grayscale(1); opacity:0.3;">📭</div>
                    <div class="mail-title" style="color:#ccc;">......</div>
                    <div class="mail-day">Day ${item.day}</div>
                `;
            }
            grid.appendChild(el);
        });

        modal.style.display = 'flex';
    },

    // 3. 打开单封信详情 (Letter UI)
    openLetterDetail(letterData) {
        const modal = document.getElementById('modal-letter');
        if (!modal) return;

        // 填充内容
        document.getElementById('letter-view-date').innerText = `Day ${letterData.day}`;
        document.getElementById('letter-view-sender').innerText = letterData.sender;
        document.getElementById('letter-view-title').innerText = letterData.title;
        document.getElementById('letter-view-body').innerHTML = letterData.content.replace(/\n/g, '<br>');

        // 显示阅读界面
        modal.style.display = 'flex';

        // 标记为已读
        if (!UserData.hasReadMail(letterData.day)) {
            UserData.markMailAsRead(letterData.day);
            this.updateMailboxStatus(); // 更新红点
            this.openMailboxDirectory(); // 后台刷新一下目录状态（把NEW去掉），这样关闭信纸时看到的是新的状态
        }
    },

    _closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
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
                    this.renderSidebar(); // ✨ 修正：点击桌子打开时渲染侧边栏
                } else if (config.type === 'rug') {
                    const modal = document.getElementById('modal-map-selection');
                    if (modal) {
                        modal.style.display = 'flex';
                        CityEvent.renderSelectionMenu();
                    }
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

    // --- 11. 渲染背包 ---
    renderBackpack() {
        const gridEl = document.getElementById('backpack-grid');
        const detailEmpty = document.getElementById('bp-detail-empty');
        const detailContent = document.getElementById('bp-detail-content');
        
        if (!gridEl) return;

        gridEl.innerHTML = "";
        
        const fragments = UserData.state.fragments || [];

        if (fragments.length === 0) {
            gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#ccc; margin-top:50px;">背包空空如也</div>`;
            return;
        }

        fragments.forEach(fragId => {
            const info = StoryManager.getFragmentDetails(fragId);
            if (!info) return; 

            const slot = document.createElement('div');
            slot.className = 'bp-slot';
            slot.title = info.title;
            const img = document.createElement('img');
            img.src = info.icon || 'assets/images/item/note1.png'; 
            slot.appendChild(img);

            slot.onclick = () => {
                document.querySelectorAll('.bp-slot').forEach(el => el.classList.remove('active'));
                slot.classList.add('active');
                detailEmpty.style.display = 'none';
                detailContent.style.display = 'block';
                document.getElementById('bp-detail-img').src = info.icon;
                document.getElementById('bp-detail-title').innerText = info.title;
                document.getElementById('bp-detail-origin').innerText = info.origin;
                document.getElementById('bp-detail-desc').innerText = info.content;
            };
            gridEl.appendChild(slot);
        });
    },
};