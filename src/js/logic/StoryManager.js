/* src/js/logic/StoryManager.js - 完整版 */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js';
import { UIRenderer } from '../ui/UIRenderer.js';

export const StoryManager = {
    // ===原有剧情剧本===
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

    // === ✨ 新增：字数里程碑配置 ===
    // threshold: 触发字数
    // id: 书籍唯一ID
    // title: 书名
    // content: 解锁的内容
    milestones: [
        {
            threshold: 10,
            id: "pineapple_page_02",
            title: "日记：便利店的微光",
            content: "# 2024年1月15日\n\n今天下班路过楼下的便利店，那里的关东煮冒着热气...\n\n在这个城市里，只有便利店的灯光是永远为我亮着的。\n\n—— 糖水菠萝",
            cover: 'assets/images/booksheet/booksheet0.png'
        },
        {
            threshold: 2000,
            id: "pineapple_page_03",
            title: "日记：丢失的伞",
            content: "# 2024年2月20日\n\n雨下得很大，伞却忘在了地铁上。\n\n我不喜欢雨天，它让城市变得黏糊糊的，像甩不掉的焦虑。\n\n—— 糖水菠萝",
            cover: 'assets/images/booksheet/booksheet0.png'
        },
        {
            threshold: 5000,
            id: "pineapple_page_04",
            title: "日记：决定离开",
            content: "# 2024年5月1日\n\n房租又涨了。看着窗外的车流，我突然意识到，我可能永远无法真正融入这座城市。\n\n也许是时候去寻找属于我的伊萨卡了。\n\n—— 糖水菠萝",
            cover: 'assets/images/booksheet/booksheet0.png'
        }
    ],

    // === ✨ 新增：检查字数里程碑 ===
    // 这个函数会被 Journal.js 在 updateEntry 或 confirmEntry 时调用
    checkWordCountMilestones() {
        const currentWords = UserData.state.totalWords || 0;

        this.milestones.forEach(milestone => {
            // 1. 检查字数是否达标
            if (currentWords >= milestone.threshold) {
                
                // 2. 检查这本书是否已经拥有了 (防止重复发放)
                const alreadyHas = Library.getAll().find(book => book.id === milestone.id);
                
                if (!alreadyHas) {
                    this.unlockMilestoneReward(milestone);
                }
            }
        });
    },

    // 执行解锁动作
    unlockMilestoneReward(milestone) {
        // 1. 发放书籍
        Library.addBook({
            id: milestone.id,
            title: milestone.title,
            content: milestone.content,
            date: "遗落的记录",
            cover: milestone.cover,
            isMystery: true // 标记为特殊书籍
        });

        // 2. 播放音效或震动 (视觉反馈)
        const room = document.getElementById('scene-room');
        if(room) {
            room.classList.add('shake-room');
            setTimeout(() => room.classList.remove('shake-room'), 500);
        }

        // 3. 刷新书架 UI (如果正开着)
        if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
            UIRenderer.renderBookshelf();
        }

        // 4. ✨ 调用通用对话框显示奖励
        this.showRewardDialogue(milestone);
    },

    // ✨ 新增：显示奖励对话框 (复用 Intro 的 UI)
    showRewardDialogue(milestone) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const skipBtn = document.getElementById('btn-skip-intro');
        
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');

        // A. 设置样式：半透明黑色背景，隐藏街道图，隐藏跳过按钮
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        scene.style.background = 'rgba(0, 0, 0, 0.6)'; // 深色遮罩，突出对话框
        
        if (bgImg) bgImg.style.display = 'none'; // 隐藏原本的街道背景
        if (skipBtn) skipBtn.style.display = 'none'; // 隐藏跳过按钮

        // B. 设置文本内容
        speakerEl.innerText = "✨ 灵感涌现";
        speakerEl.style.color = "#d84315"; // 换个暖色，突显特殊事件
        
        // 支持 HTML 标签来做简单的排版
        textEl.innerHTML = `笔耕不辍，总字数达成 <span style="color:#d32f2f; font-weight:bold;">${milestone.threshold}</span>。<br><br>你好像听到了书架传来的响动。<br>已解锁新记忆：《${milestone.title}》。`;

        // C. 绑定点击关闭事件 (一次性)
        // 注意：这里要先覆盖之前的 onclick，防止触发 next()
        box.onclick = () => {
            scene.style.display = 'none';
            // 恢复现场 (为了不影响下次 IntroScene 使用)
            scene.style.background = ''; // 清除内联样式，恢复 CSS 默认
            if (bgImg) bgImg.style.display = 'block';
            speakerEl.style.color = ""; // 恢复默认颜色
        };
    },

    // === 原有逻辑：书架剧情 ===

    tryTriggerBookshelfStory() {
        // 如果已经拿过第一本神秘日记，或者还没看新手引导，就不触发
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
        
        // 剧情模式：背景稍微亮一点的遮罩
        scene.style.background = 'rgba(0, 0, 0, 0.4)'; 
        
        // 隐藏那个硬编码在 HTML 里的开场白背景图
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'none';

        document.getElementById('btn-skip-intro').style.display = 'none';
        this.renderLine();
    },

    renderLine() {
        const line = this.activeScript[this.currentIndex];
        document.getElementById('dialogue-speaker').innerText = line.speaker;
        document.getElementById('dialogue-text').innerText = line.text;
        
        // 增加震动反馈
        if (line.text.includes("用力拉拽")) {
            const room = document.getElementById('scene-room');
            room.classList.add('shake-room');
            setTimeout(() => room.classList.remove('shake-room'), 500);
        }

        const box = document.getElementById('intro-dialogue-box');
        // 必须重新绑定，防止多次覆盖
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

    endStory() {
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'none';

        // 恢复背景图显示，以免影响下次开场
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'block';

        // 1. 记录剧情状态
        UserData.state.hasFoundMysteryEntry = true;
        UserData.save();

        // 2. 发放第一本特殊日记
        Library.addBook({
            id: "mystery_pineapple_01",
            title: "遗留的日记",
            content: "# 糖水菠萝的秘密\n\n角落里的灰尘真厚。搬走的时候，我还是把这本笔记留下了。\n\n后来的住客...\n\n—— 糖水菠萝",
            date: "2023/12/12",
            cover: 'assets/images/booksheet/booksheet0.png'
        });

        // 3. UI 引导
        document.getElementById('modal-bookshelf-ui').style.display = 'flex';
        UIRenderer.renderBookshelf();
        
        UIRenderer.log("📖 你在书架深处发现了一本前房客留下的日记。");
    }
};