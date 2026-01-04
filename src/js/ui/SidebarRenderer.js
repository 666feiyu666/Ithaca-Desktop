import { Journal } from '../data/Journal.js';
import { UserData } from '../data/UserData.js';
import { ModalManager } from './ModalManager.js';

export const SidebarRenderer = {
    currentNotebookId: null, // 当前选中的手记本ID (null 代表顶层目录)
    activeEntryId: null,     // 当前正在编辑/查看的日记ID

    init() {
        // 绑定 + 号按钮事件 (原 app.js 逻辑移入此处)
        const addBtn = document.getElementById('btn-new-entry');
        if (addBtn) {
            addBtn.onclick = () => this.handleNewEntry();
        }
        
        // 初始化时如果有数据，默认选中第一条
        const all = Journal.getAll();
        if (all.length > 0 && !this.activeEntryId) {
            this.activeEntryId = all[0].id;
        }

        // 初始渲染编辑器内容
        this.loadActiveEntry();
    },

    /**
     * 主渲染入口
     * 根据当前状态决定渲染“手记本列表”还是“特定手记本内的日记列表”
     */
    render() {
        if (!this.currentNotebookId) {
            this.renderNotebookList();
        } else {
            this.renderEntryList(this.currentNotebookId);
        }
    },

    /**
     * Level 1: 渲染手记本目录 (归档系统)
     */
    renderNotebookList() {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";
        
        if (headerEl) headerEl.innerText = "📂 归档系统";
        
        // 恢复右上角加号为默认功能
        if (addBtn) {
            addBtn.title = "新建日记";
            addBtn.onclick = () => this.handleNewEntry();
        }

        const allEntries = Journal.getAll();

        // 1. 仓库 (所有日记)
        const totalCount = allEntries.length;
        this._createFolderItem(listEl, {
            name: "仓库",
            icon: "💾",
            count: totalCount,
            color: "#4e342e",
            onClick: () => {
                this.currentNotebookId = 'REPO_ALL_ID';
                this.render();
            }
        });

        // 2. 日常碎片
        const dailyCount = allEntries.filter(e => {
            return (e.notebookIds && e.notebookIds.includes('nb_daily')) || e.notebookId === 'nb_daily';
        }).length;
        this._createFolderItem(listEl, {
            name: "日常碎片",
            icon: "🧩",
            count: dailyCount,
            color: "#ffa000",
            onClick: () => {
                this.currentNotebookId = 'nb_daily';
                this.render();
            }
        });

        // 3. 用户自定义手记本
        UserData.state.notebooks.forEach(nb => {
            if (nb.id === 'nb_inbox' || nb.id === 'nb_daily') return;

            const count = allEntries.filter(e => {
                return (e.notebookIds && e.notebookIds.includes(nb.id)) || e.notebookId === nb.id;
            }).length;
            
            this._createCustomNotebookItem(listEl, nb, count);
        });

        // 4. 底部新建按钮
        const createBtn = document.createElement('div');
        createBtn.className = 'list-item';
        createBtn.style.cssText = 'text-align:center; color:#888; margin-top:10px; border:1px dashed #ccc; cursor:pointer;';
        createBtn.innerText = "+ 新建手记本";
        createBtn.onclick = () => this.showNotebookInputModal('create');
        listEl.appendChild(createBtn);
    },

    /**
     * Level 2: 渲染日记列表
     */
    renderEntryList(notebookId) {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";

        let entries = [];
        let title = "";

        // 获取数据
        if (notebookId === 'REPO_ALL_ID') {
            title = "💾 所有记忆";
            entries = Journal.getAll();
        } else if (notebookId === 'INBOX_VIRTUAL_ID') {
            title = "📥 收件箱";
            entries = Journal.getAll().filter(e => !e.notebookIds || e.notebookIds.length === 0);
        } else {
            const nb = UserData.state.notebooks.find(n => n.id === notebookId);
            title = nb ? nb.name : "未知手记";
            entries = Journal.getAll().filter(e => {
                return (e.notebookIds && e.notebookIds.includes(notebookId)) || e.notebookId === notebookId;
            });
        }

        // 更新头部 (带返回按钮)
        if (headerEl) {
            headerEl.innerHTML = `<span id="btn-back-level" class="nav-back-btn" style="cursor:pointer; margin-right:5px;">⬅️</span> ${title}`;
            const backBtn = document.getElementById('btn-back-level');
            if(backBtn) {
                backBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    this.currentNotebookId = null; // 返回上一级
                    this.render();
                };
            }
        }

        // 更新加号按钮 (在当前本子内新建)
        if (addBtn) {
            addBtn.title = "在此手记本中新建";
            addBtn.onclick = () => this.handleNewEntry();
        }

        // 渲染列表项
        if (entries.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#999; margin-top:20px; font-size:12px;">这里是空的<br>点击右上角 + 添加想法</div>`;
        } else {
            entries.forEach(entry => {
                const btn = document.createElement('div');
                btn.className = 'list-item';
                if (entry.id === this.activeEntryId) btn.classList.add('active');
                
                const statusIcon = entry.isConfirmed ? "✅" : "📝";
                const preview = (entry.content || "").slice(0, 15).replace(/\n/g, ' ') || '新篇章...';
                
                btn.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:#444;">
                        <span>${statusIcon} ${entry.date}</span>
                        <span style="font-size:11px; font-weight:normal; color:#888;">${entry.time || ""}</span>
                    </div>
                    <div style="font-size:12px; color:#666; margin-top:4px; line-height:1.4;">${preview}</div>
                `;
                
                btn.onclick = () => {
                    this.activeEntryId = entry.id;
                    // 高亮切换
                    listEl.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    btn.classList.add('active');
                    // 加载到编辑器
                    this.loadActiveEntry();   
                };
                listEl.appendChild(btn);
            });
        }
    },

    /**
     * 处理新建日记逻辑
     */
    handleNewEntry() {
        const newEntry = Journal.createNewEntry();
        this.activeEntryId = newEntry.id;

        // 如果在特定本子内，自动归档
        if (this.currentNotebookId && !['REPO_ALL_ID', 'INBOX_VIRTUAL_ID'].includes(this.currentNotebookId)) {
            Journal.toggleNotebook(newEntry.id, this.currentNotebookId);
        } else {
            // 如果在仓库视图新建，临时跳转到“收件箱”视图以便看到新日记
            if (!this.currentNotebookId || this.currentNotebookId === 'REPO_ALL_ID') {
                 this.currentNotebookId = 'INBOX_VIRTUAL_ID';
            }
        }

        this.render();
        this.loadActiveEntry();
        
        // 聚焦编辑器
        const editor = document.getElementById('editor-area');
        if(editor) {
            editor.focus();
        }
        console.log(`[Sidebar] Created new entry: ${newEntry.id}`);
    },

    /**
     * 将当前激活的日记加载到右侧编辑器
     */
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
            // ID 存在但找不到数据（可能被删除了）
            if (editor) editor.value = "";
        }
    },

    /**
     * 渲染编辑器下方的标签栏
     */
    renderTagBar(entry) {
        let tagContainer = document.getElementById('entry-tag-bar');
        
        // 如果容器不存在，动态创建
        if (!tagContainer) {
            tagContainer = document.createElement('div');
            tagContainer.id = 'entry-tag-bar';
            tagContainer.style.cssText = "padding:10px 15px; border-top:1px solid #eee; background:#f9f9f9; display:flex; flex-wrap:wrap; gap:8px; align-items:center;";
            
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
            tag.style.cssText = "display:inline-flex; align-items:center; font-size:12px; padding:4px 10px; border-radius:15px; cursor:pointer; user-select:none; transition:all 0.2s;";
            
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
                this.renderTagBar(entry); // 重新渲染自己以更新状态
                
                // 如果当前正好在这个本子的视图里，移除了标签可能需要刷新列表
                if (this.currentNotebookId === nb.id || this.currentNotebookId === 'INBOX_VIRTUAL_ID') {
                     this.render(); 
                }
            };
            
            tagContainer.appendChild(tag);
        });
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
    // 🛠️ 辅助方法 (内部使用)
    // ============================================================

    _createFolderItem(container, { name, icon, count, color, onClick }) {
        const div = document.createElement('div');
        div.className = 'list-item notebook-folder';
        div.style.borderLeft = `4px solid ${color}`;
        div.style.display = "flex"; 
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        div.innerHTML = `
            <div style="display:flex; align-items:center; overflow:hidden;">
                <span class="nb-icon-emoji">${icon}</span>
                <span class="nb-name">${name}</span>
            </div>
            <span class="nb-count">${count}</span>
        `;
        div.onclick = onClick;
        container.appendChild(div);
    },

    _createCustomNotebookItem(container, nb, count) {
        const div = document.createElement('div');
        div.className = 'list-item notebook-folder'; 
        div.style.cssText = 'position:relative; display:flex; justify-content:space-between; align-items:center;';
        
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

        // 操作栏 (重命名/删除)
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = "display:none; gap:5px;";
        
        // 重命名
        const btnRename = this._createActionBtn("✏️", "重命名", (e) => {
            this.showNotebookInputModal('rename', nb.id, nb.name);
        });
        // 删除
        const btnDelete = this._createActionBtn("🗑️", "删除手记本", (e) => {
            if (confirm(`确定要删除《${nb.name}》吗？\n\n注意：里面的日记不会被删除，它们仍会保留在“所有记忆”中。`)) {
                if (UserData.deleteNotebook(nb.id)) {
                    this.render(); 
                } else {
                    alert("无法删除此手记本。");
                }
            }
        });

        actionsDiv.appendChild(btnRename);
        actionsDiv.appendChild(btnDelete);

        div.appendChild(leftContent);
        div.appendChild(countSpan);
        div.appendChild(actionsDiv);
        
        // 悬停交互
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
            this.render();
        };
        
        container.appendChild(div);
    },

    _createActionBtn(icon, title, onClick) {
        const btn = document.createElement('span');
        btn.innerText = icon;
        btn.title = title;
        btn.style.cssText = "cursor:pointer; font-size:14px; opacity:0.7;";
        btn.onmouseover = () => btn.style.opacity = 1;
        btn.onmouseout = () => btn.style.opacity = 0.7;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
        return btn;
    },

    /**
     * 手记本输入弹窗 (新建/重命名)
     */
    showNotebookInputModal(mode = 'create', targetId = null, currentName = '') {
        // 先移除可能存在的旧弹窗
        const existing = document.getElementById('dynamic-modal-input');
        if (existing) existing.remove();

        const isRename = (mode === 'rename');
        const titleText = isRename ? "重命名手记本" : "新建手记本";
        const btnText = isRename ? "保存修改" : "创建";
        const inputValue = isRename ? currentName : "";
        
        // 创建 DOM
        const overlay = document.createElement('div');
        overlay.id = 'dynamic-modal-input';
        overlay.className = 'modal-overlay'; 
        overlay.style.cssText = 'display:flex; z-index:9999;';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = 'width:320px; text-align:center; background:#fff; padding:20px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.3); border:2px solid #5d4037;';

        content.innerHTML = `
            <h3 style="margin-top:0; color:#5d4037;">${titleText}</h3>
            <input type="text" id="notebook-input-field" value="${inputValue}" placeholder="请输入名称..." 
                   style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box; font-size:14px;">
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-cancel-input" style="padding:6px 12px; cursor:pointer; background:#fff; border:1px solid #ccc; border-radius:4px;">取消</button>
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
            } else {
                UserData.createNotebook(name);
            }
            this.render(); // 刷新列表
            close();
        };

        btnCancel.onclick = close;
        btnConfirm.onclick = confirmAction;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmAction();
            if (e.key === 'Escape') close();
        };

        // 自动聚焦
        setTimeout(() => {
            input.focus();
            if(isRename) input.select();
        }, 50);
    }
};