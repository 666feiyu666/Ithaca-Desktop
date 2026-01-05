/* src/js/ui/WorkbenchRenderer.js */
import { Binder } from '../logic/Binder.js';
import { Journal } from '../data/Journal.js';
import { UserData } from '../data/UserData.js'; // 用于获取 Notebooks 列表
import { ModalManager } from './ModalManager.js';
import { BookshelfRenderer } from './BookshelfRenderer.js'; // 出版后刷新书架
import { HUDRenderer } from './HUDRenderer.js'; // 出版后刷新墨水状态
import { marked } from '../libs/marked.esm.js';

export const WorkbenchRenderer = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btnOpen = document.getElementById('btn-open-workbench');
        if (btnOpen) {
            btnOpen.onclick = () => {
                ModalManager.open('workbench-modal');
                this.render();
            };
        }

        const btnPublish = document.getElementById('btn-publish');
        if (btnPublish) {
            btnPublish.onclick = () => this.handlePublish();
        }

        // 预览按钮
        const btnPreview = document.getElementById('btn-toggle-manuscript-preview');
        if (btnPreview) {
            btnPreview.onclick = () => this.togglePreview();
        }

        // 筛选器
        const notebookSelect = document.getElementById('workbench-filter-notebook');
        const searchInput = document.getElementById('workbench-search');
        if (notebookSelect) {
            notebookSelect.onchange = () => this.renderList(searchInput?.value, notebookSelect.value);
        }
        if (searchInput) {
            searchInput.addEventListener('input', (e) => 
                this.renderList(e.target.value, notebookSelect?.value || 'ALL')
            );
        }

        // 自动同步编辑器内容到 Binder
        const manuEditor = document.getElementById('manuscript-editor');
        if(manuEditor) {
            manuEditor.addEventListener('input', (e) => Binder.updateManuscript(e.target.value));
        }
    },

    render() {
        this.renderNotebookSelector();
        this.renderList();
        
        // 清空标题输入，保留 draft
        const titleInput = document.getElementById('manuscript-title-input');
        if (titleInput) titleInput.value = "";
    },

    renderNotebookSelector() {
        const selectEl = document.getElementById('workbench-filter-notebook');
        if (!selectEl) return;

        const currentVal = selectEl.value; // 记住之前的选择
        selectEl.innerHTML = `<option value="ALL">📂 所有记忆</option><option value="INBOX_VIRTUAL_ID">📥 收件箱</option>`;
        
        UserData.state.notebooks.forEach(nb => {
            const option = document.createElement('option');
            option.value = nb.id;
            option.text = `${nb.icon||'📔'} ${nb.name}`;
            selectEl.appendChild(option);
        });

        if (currentVal) selectEl.value = currentVal;
    },

    renderList(filterText = "", filterNotebookId = "ALL") {
        const listEl = document.getElementById('workbench-sources');
        if (!listEl) return;
        listEl.innerHTML = "";

        // 筛选逻辑
        const entries = Journal.getAll().filter(entry => {
            const matchText = !filterText || entry.content.toLowerCase().includes(filterText.toLowerCase());
            let matchNotebook = true;
            if (filterNotebookId === "ALL") matchNotebook = true;
            else if (filterNotebookId === "INBOX_VIRTUAL_ID") matchNotebook = (!entry.notebookIds || entry.notebookIds.length === 0);
            else matchNotebook = (entry.notebookIds && entry.notebookIds.includes(filterNotebookId));
            return matchText && matchNotebook;
        });

        if (entries.length === 0) {
            listEl.innerHTML = `<div style="color:#999; text-align:center;">没有找到相关记忆</div>`;
            return;
        }

        entries.forEach(entry => {
            const btn = document.createElement('div');
            btn.className = 'list-item'; // 复用样式
            btn.innerHTML = `
                <div style="font-weight:bold;">➕ ${entry.date}</div>
                <div style="font-size:12px; color:#666;">${entry.content.substring(0, 20)}...</div>
            `;
            btn.onclick = () => {
                Binder.appendFragment(entry.content);
                const editor = document.getElementById('manuscript-editor');
                if (editor) editor.value = Binder.currentManuscript;
            };
            listEl.appendChild(btn);
        });
    },

    handlePublish() {
        const editor = document.getElementById('manuscript-editor');
        const content = editor.value;
        const titleInput = document.getElementById('manuscript-title-input');
        let title = titleInput ? titleInput.value.trim() : "";

        if (content.length < 10) return alert("字数太少，无法出版 (至少10字)");
        if (!title) title = "无题_" + new Date().toLocaleDateString();

        Binder.updateManuscript(content);
        const result = Binder.publish(title, Binder.currentCover || 'assets/images/booksheet/booksheet1.png');

        if (result.success) {
            alert(`🎉 出版成功！\n获得墨水：${Math.floor(content.length / 2)} ml`);
            
            editor.value = ""; // 清空编辑器
            if (titleInput) titleInput.value = "";
            
            // 刷新外部状态
            BookshelfRenderer.render();
            HUDRenderer.updateAll();
            ModalManager.close('workbench-modal');
        } else {
            alert("出版失败：" + result.msg);
        }
    },

    togglePreview() {
        const editor = document.getElementById('manuscript-editor');
        const preview = document.getElementById('manuscript-preview');
        const btn = document.getElementById('btn-toggle-manuscript-preview');

        if (!editor || !preview) return;

        if (preview.style.display === 'none') {
            preview.innerHTML = marked.parse(editor.value, { breaks: true });
            preview.style.display = 'block';
            if(btn) btn.innerText = "✏️ 继续编辑";
        } else {
            preview.style.display = 'none';
            if(btn) btn.innerText = "👁️ 预览";
            editor.focus();
        }
    }
};