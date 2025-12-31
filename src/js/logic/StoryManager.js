/* src/js/logic/StoryManager.js - 完整版 (碎片收集与合成机制) */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js';
import { UIRenderer } from '../ui/UIRenderer.js';

export const StoryManager = {
    // ============================================================
    // 1. 碎片与合成配置 (Fragments & Synthesis)
    // ============================================================

    // 📜 碎片数据库：定义每一页的内容
    fragmentDB: {
        "frag_pineapple_01": {
            title: "日记残页：微光",
            content: "2024年1月... 只有便利店的灯光是永远为我亮着的...",
            origin: "字数里程碑",
            icon: "assets/images/item/note1.png"
        },
        "frag_pineapple_02": {
            title: "日记残页：雨伞",
            content: "2024年2月... 雨下得很大，伞却忘在了地铁上...",
            origin: "字数里程碑",
            icon: "assets/images/item/note1.png"
        },
        "frag_pineapple_03": {
            title: "日记残页：决定",
            content: "2024年5月... 也许是时候去寻找属于我的伊萨卡了。",
            origin: "高阶里程碑或探索",
            icon: "assets/images/item/note1.png"
        }
    },

    // ⚗️ 合成配方：定义集齐哪些碎片可以合成哪本书
    synthesisRecipes: [
        {
            bookId: "book_pineapple_diary_complete",
            title: "糖水菠萝的日记",
            cover: "assets/images/booksheet/booksheet0.png",
            requiredFragments: ["frag_pineapple_01", "frag_pineapple_02", "frag_pineapple_03"],
            // 合成后的完整内容
            fullContent: `# 糖水菠萝的日记 (完整版)\n\n## 2024年1月15日\n今天下班路过楼下的便利店，那里的关东煮冒着热气...\n\n在这个城市里，只有便利店的灯光是永远为我亮着的。\n\n## 2024年2月20日\n雨下得很大，伞却忘在了地铁上。\n\n我不喜欢雨天，它让城市变得黏糊糊的，像甩不掉的焦虑。\n\n## 2024年5月1日\n房租又涨了。看着窗外的车流，我突然意识到，我可能永远无法真正融入这座城市。\n\n也许是时候去寻找属于我的伊萨卡了。\n\n—— 糖水菠萝`
        }
    ],

    // 🏆 字数里程碑配置：达到字数 -> 获得碎片 ID
    milestones: [
        { threshold: 10,   fragmentId: "frag_pineapple_01" }, // 测试用：10字
        { threshold: 500,  fragmentId: "frag_pineapple_02" }, // 500字
        { threshold: 2000, fragmentId: "frag_pineapple_03" }  // 2000字
    ],

    // ============================================================
    // 2. 核心逻辑 (Core Logic)
    // ============================================================

    // --- A. 检查字数里程碑 (被 Journal.js 调用) ---
    checkWordCountMilestones() {
        const currentWords = UserData.state.totalWords || 0;

        this.milestones.forEach(ms => {
            if (currentWords >= ms.threshold) {
                // 尝试解锁对应的碎片
                this.unlockFragment(ms.fragmentId);
            }
        });
    },

    // --- B. 解锁碎片 (通用接口) ---
    // 这个函数也可以被 CityEvent.js 调用，实现"探索获得碎片"
    unlockFragment(fragmentId) {
        // 尝试添加到 UserData (addFragment 返回 true 代表是新获得的)
        const isNew = UserData.addFragment(fragmentId);
        
        if (isNew) {
            const fragInfo = this.fragmentDB[fragmentId];
            if (!fragInfo) return;

            // 1. 视觉反馈 (房间震动)
            const room = document.getElementById('scene-room');
            if(room) {
                room.classList.add('shake-room');
                setTimeout(() => room.classList.remove('shake-room'), 500);
            }

            // 2. 弹窗通知玩家
            this.showDialogue("✨ 发现碎片", 
                `你捡到了一张泛黄的纸片：<br><strong style="font-size:1.1em;">《${fragInfo.title}》</strong><br><br>` + 
                `<span style="color:#666; font-size:0.9em; font-style:italic;">"${fragInfo.content.substring(0, 25)}..."</span><br><br>` +
                `<span style="font-size:0.8em; color:#888;">(收集更多碎片或许能还原整本书)</span>`
            );

            // 3. 获得碎片后，立刻检查是否满足合成条件
            this.checkSynthesis();
        }
    },

    // --- C. 检查合成 (Synthesis Check) ---
    checkSynthesis() {
        this.synthesisRecipes.forEach(recipe => {
            // 1. 检查 Library 里是否已经有这本书了 (防止重复合成)
            const alreadyHasBook = Library.getAll().find(b => b.id === recipe.bookId);
            if (alreadyHasBook) return;

            // 2. 检查 UserData 里是否拥有所有需要的碎片
            const hasAllFragments = recipe.requiredFragments.every(fid => UserData.hasFragment(fid));

            if (hasAllFragments) {
                console.log(`[StoryManager] 碎片集齐，合成书籍: ${recipe.title}`);
                
                // 3. 执行合成：添加到书架
                Library.addBook({
                    id: recipe.bookId,
                    title: recipe.title,
                    content: recipe.fullContent,
                    cover: recipe.cover,
                    date: "重组的记忆",
                    isMystery: true // 标记为特殊书籍 (会有光效)
                });

                // 4. 延迟一点弹窗，让玩家先看完碎片的提示
                setTimeout(() => {
                    this.showDialogue("📚 记忆重组", 
                        `手中的碎片仿佛受到了感召，自动拼凑在了一起。<br><br>` +
                        `获得完整书籍：<br><strong style="font-size:1.3em; color:#d84315;">《${recipe.title}》</strong><br><br>` +
                        `它已经出现在你的书架上了。`
                    );
                    
                    // 5. 实时刷新书架 UI (如果正开着)
                    if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                        UIRenderer.renderBookshelf();
                    }
                }, 2500); // 2.5秒后提示合成成功
            }
        });
    },

    getFragmentDetails(id){
        return this.fragmentDB[id] || null;
    },

    // --- D. 通用弹窗显示 (UI Helper) ---
    // 复用 IntroScene 的 HTML 结构，伪装成系统通知
    showDialogue(title, htmlContent) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const skipBtn = document.getElementById('btn-skip-intro');
        
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');

        // 显示遮罩
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        scene.style.background = 'rgba(0, 0, 0, 0.7)'; // 深色背景
        
        // 隐藏不需要的元素
        if (bgImg) bgImg.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';

        // 设置内容
        speakerEl.innerText = title;
        speakerEl.style.color = "#d84315"; // 暖色标题
        textEl.innerHTML = htmlContent;

        // 点击关闭
        box.onclick = () => {
            scene.style.display = 'none';
            scene.style.background = ''; // 恢复默认
            if (bgImg) bgImg.style.display = 'block';
            speakerEl.style.color = ""; 
            box.onclick = null; // 解绑防止污染
        };
    },

    // ============================================================
    // 3. 初始剧情逻辑 (Original Story Scripts)
    // ============================================================
    
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
        scene.style.background = 'rgba(0, 0, 0, 0.4)'; 
        
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'none';

        document.getElementById('btn-skip-intro').style.display = 'none';
        this.renderLine();
    },

    renderLine() {
        const line = this.activeScript[this.currentIndex];
        document.getElementById('dialogue-speaker').innerText = line.speaker;
        document.getElementById('dialogue-text').innerText = line.text;
        
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

    endStory() {
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'none';

        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'block';

        // 记录状态
        UserData.state.hasFoundMysteryEntry = true;
        UserData.save();

        // 发放第一本引导书籍 (这个不走碎片逻辑，直接给，作为新手引导)
        Library.addBook({
            id: "mystery_pineapple_01",
            title: "遗留的日记",
            content: "# 糖水菠萝的秘密\n\n角落里的灰尘真厚。搬走的时候，我还是把这本笔记留下了。\n\n后来的住客...\n\n—— 糖水菠萝",
            date: "2023/12/12",
            cover: 'assets/images/booksheet/booksheet0.png'
        });

        document.getElementById('modal-bookshelf-ui').style.display = 'flex';
        UIRenderer.renderBookshelf();
        
        UIRenderer.log("📖 你在书架深处发现了一本前房客留下的日记。");
    }
};