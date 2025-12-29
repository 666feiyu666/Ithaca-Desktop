/* src/js/logic/StoryManager.js */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js'; // 必须引入 Library
import { UIRenderer } from '../ui/UIRenderer.js';

export const StoryManager = {
    // 剧情剧本
    scripts: {
        find_first_note: [
            { speaker: "我", text: "既然已经住下了，整理一下这边的旧书架吧。" },
            { speaker: "我", text: "（指尖划过书脊的声音）" },
            { speaker: "我", text: "嗯？最上层深处好像卡着什么东西……" },
            { speaker: "我", text: "（用力拉拽的声音）" },
            { speaker: "我", text: "掉出来一本封面已经泛黄的日记，上面贴着一个手写的标签：'糖水菠萝'。" },
            { speaker: "我", text: "是前任租客遗留下来的吗？既然留在了书架上，或许是可以阅读的吧。" }
        ]
    },

    currentIndex: 0,
    activeScript: null,

    // 修改：触发点改为书架
    tryTriggerBookshelfStory() {
        if (UserData.state.hasFoundMysteryEntry || !UserData.state.hasWatchedIntro) {
            return false; 
        }
        this.startStory('find_first_note');
        return true;
    },

    startStory(scriptKey) {
        this.activeScript = this.scripts[scriptKey];
        this.currentIndex = 0;
        
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        
        // ✨ 关键修复：将背景设为半透明遮罩，而不是黑屏或街景
        scene.style.background = 'rgba(0, 0, 0, 0.3)'; 
        
        // ✨ 关键修复：隐藏那个硬编码在 HTML 里的开场白背景图
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'none';

        document.getElementById('btn-skip-intro').style.display = 'none';
        this.renderLine();
    },

    renderLine() {
        const line = this.activeScript[this.currentIndex];
        document.getElementById('dialogue-speaker').innerText = line.speaker;
        document.getElementById('dialogue-text').innerText = line.text;
        
        // 增加震动反馈：当台词包含“用力拉拽”时，房间震动
        if (line.text.includes("用力拉拽")) {
            const room = document.getElementById('scene-room');
            room.classList.add('shake-room');
            setTimeout(() => room.classList.remove('shake-room'), 500);
        }

        const box = document.getElementById('intro-dialogue-box');
        box.onclick = () => this.next();
    },

    next() {
        this.currentIndex++;
        if (this.currentIndex < this.activeScript.length) {
            this.renderLine();
        } else {
            this.endStory();
        }
    },

    // 修改：结束后操作 Library 而非 Journal
    endStory() {
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'none';

        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'block';

        // 1. 记录剧情状态
        UserData.state.hasFoundMysteryEntry = true;
        UserData.save();

        // 2. 核心：将这本“日记”作为“书”存入 Library
        Library.addBook({
            id: "mystery_pineapple_01",
            title: "遗留的日记",
            content: "# 糖水菠萝的秘密\n\n角落里的灰尘真厚。搬走的时候，我还是把这本笔记留下了。\n\n后来的住客...\n\n—— 糖水菠萝",
            date: "2025/12/12",
            cover: 'assets/images/booksheet/booksheet0.png' // 使用你提供的专属封面
        });

        // 3. UI 引导：打开书架弹窗并渲染
        document.getElementById('modal-bookshelf-ui').style.display = 'flex';
        UIRenderer.renderBookshelf();
        
        UIRenderer.log("📖 你在书架深处发现了一本前房客留下的日记。");
    }
};