/* src/js/logic/StoryManager.js - 完整版 */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js';
import { UIRenderer } from '../ui/UIRenderer.js';

export const StoryManager = {
    // ============================================================
    // 1. 碎片与合成配置 (Fragments & Synthesis)
    // ============================================================

    // 📜 碎片数据库
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

    // ⚗️ 合成配方
    synthesisRecipes: [
        {
            bookId: "book_pineapple_diary_complete",
            title: "糖水菠萝的日记",
            cover: "assets/images/booksheet/booksheet0.png",
            requiredFragments: ["frag_pineapple_01", "frag_pineapple_02", "frag_pineapple_03"],
            fullContent: `# 糖水菠萝的日记 (完整版)\n\n## 2024年1月15日\n今天下班路过楼下的便利店，那里的关东煮冒着热气...\n\n在这个城市里，只有便利店的灯光是永远为我亮着的。\n\n## 2024年2月20日\n雨下得很大，伞却忘在了地铁上。\n\n我不喜欢雨天，它让城市变得黏糊糊的，像甩不掉的焦虑。\n\n## 2024年5月1日\n房租又涨了。看着窗外的车流，我突然意识到，我可能永远无法真正融入这座城市。\n\n也许是时候去寻找属于我的伊萨卡了。\n\n—— 糖水菠萝`
        }
    ],

    // 🏆 字数里程碑配置
    milestones: [
        { threshold: 10,   fragmentId: "frag_pineapple_01" },
        { threshold: 500,  fragmentId: "frag_pineapple_02" },
        { threshold: 2000, fragmentId: "frag_pineapple_03" }
    ],

    // ============================================================
    // 2. 核心逻辑 (Core Logic)
    // ============================================================

    // --- A. 检查字数里程碑 ---
    checkWordCountMilestones() {
        const currentWords = UserData.state.totalWords || 0;

        this.milestones.forEach(ms => {
            if (currentWords >= ms.threshold) {
                this.unlockFragment(ms.fragmentId);
            }
        });
    },

    // --- B. 解锁碎片 ---
    unlockFragment(fragmentId) {
        const isNew = UserData.addFragment(fragmentId);
        
        if (isNew) {
            const fragInfo = this.fragmentDB[fragmentId];
            if (!fragInfo) return;

            // 视觉反馈
            const room = document.getElementById('scene-room');
            if(room) {
                room.classList.add('shake-room');
                setTimeout(() => room.classList.remove('shake-room'), 500);
            }

            // 弹窗通知
            this.showDialogue("✨ 发现碎片", 
                `你捡到了一张泛黄的纸片：<br><strong style="font-size:1.1em;">《${fragInfo.title}》</strong><br><br>` + 
                `<span style="color:#666; font-size:0.9em; font-style:italic;">"${fragInfo.content.substring(0, 25)}..."</span><br><br>` +
                `<span style="font-size:0.8em; color:#888;">(收集更多碎片或许能还原整本书)</span>`
            );

            // 检查合成
            this.checkSynthesis();
        }
    },

    // --- C. 检查合成 ---
    checkSynthesis() {
        this.synthesisRecipes.forEach(recipe => {
            const alreadyHasBook = Library.getAll().find(b => b.id === recipe.bookId);
            if (alreadyHasBook) return;

            const hasAllFragments = recipe.requiredFragments.every(fid => UserData.hasFragment(fid));

            if (hasAllFragments) {
                console.log(`[StoryManager] 碎片集齐，合成书籍: ${recipe.title}`);
                
                Library.addBook({
                    id: recipe.bookId,
                    title: recipe.title,
                    content: recipe.fullContent,
                    cover: recipe.cover,
                    date: "重组的记忆",
                    isMystery: true
                });

                setTimeout(() => {
                    this.showDialogue("📚 记忆重组", 
                        `手中的碎片仿佛受到了感召，自动拼凑在了一起。<br><br>` +
                        `获得完整书籍：<br><strong style="font-size:1.3em; color:#d84315;">《${recipe.title}》</strong><br><br>` +
                        `它已经出现在你的书架上了。`
                    );
                    
                    if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                        UIRenderer.renderBookshelf();
                    }
                }, 2500);
            }
        });
    },

    getFragmentDetails(id){
        return this.fragmentDB[id] || null;
    },

    // ============================================================
    // 3. UI 与场景控制 (UI & Scene Control)
    // ============================================================

    // --- D. 通用弹窗 (黑底遮罩，用于碎片获得/合成提示) ---
    showDialogue(title, htmlContent) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const skipBtn = document.getElementById('btn-skip-intro');
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');
        
        // ✨ 获取房间引用，用于判断“我在哪”
        const room = document.getElementById('scene-room'); 
        const isCityMode = (room && window.getComputedStyle(room).display === 'none');

        scene.style.display = 'flex';
        scene.style.opacity = 1;
        scene.style.background = 'rgba(0, 0, 0, 0.7)'; // 通用深色遮罩
        
        // 🔴 核心修复逻辑：
        if (bgImg) {
            if (isCityMode) {
                // 1. 如果在街上：显示背景图 (防止黑屏)
                bgImg.style.display = 'block'; 
            } else {
                // 2. 如果在房间里：隐藏背景图 (让房间透过遮罩显示出来)
                bgImg.style.display = 'none';
            }
        }
        
        if (skipBtn) skipBtn.style.display = 'none';

        // 设置内容
        speakerEl.innerText = title;
        speakerEl.style.color = "#d84315"; 
        textEl.innerHTML = htmlContent;
        
        box.style.display = 'flex';

        // 点击关闭逻辑
        box.onclick = () => {
            // 再次检查状态 (防止并在弹窗期间发生了变化)
            const currentCityMode = (room && window.getComputedStyle(room).display === 'none');

            if (currentCityMode) {
                // A. 如果在街上：只隐藏对话框，恢复浅色遮罩
                box.style.display = 'none';
                scene.style.background = 'rgba(0, 0, 0, 0.2)'; 
            } else {
                // B. 如果在房间里：彻底关闭场景层
                scene.style.display = 'none';
                scene.style.background = ''; 
                // 恢复背景图显示状态，为下次去街上做准备
                if (bgImg) bgImg.style.display = 'block';
            }

            speakerEl.style.color = ""; 
            box.onclick = null;
        };
    },

    // --- E. 场景对话 (用于城市探索) ---
    // 切换背景图 + 显示对话框 + 隐藏房间
    showSceneDialogue(title, htmlContent, bgSrc) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const room = document.getElementById('scene-room');
        const skipBtn = document.getElementById('btn-skip-intro');
        
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');

        // 1. 切换场景：隐藏房间，显示全屏层
        if (room) room.style.display = 'none';
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        
        // 2. 设置背景图
        if (bgImg) {
            bgImg.style.display = 'block'; 
            bgImg.src = bgSrc; // 切换为地点的图片
        }
        
        // 移除深色遮罩，让背景图清晰显示
        scene.style.background = 'rgba(0, 0, 0, 0.2)'; 

        // 隐藏跳过按钮
        if (skipBtn) skipBtn.style.display = 'none';
        
        // 确保对话框显示
        box.style.display = 'flex';

        // 设置文本
        speakerEl.innerText = title;
        speakerEl.style.color = "#d84315"; 
        textEl.innerHTML = htmlContent;

        // 3. 点击对话框 -> 仅关闭对话框 (保持背景，等待用户点全局Home键回家)
        box.onclick = () => {
            box.style.display = 'none';
            box.onclick = null; 
        };
    },

    // --- F. 回家逻辑 (被 app.js 全局 Home 按钮调用) ---
    returnHome() {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const room = document.getElementById('scene-room');
        const box = document.getElementById('intro-dialogue-box');

        // 1. 隐藏场景，显示房间
        scene.style.display = 'none';
        if (room) room.style.display = 'block';
        
        // 2. 重置对话框显示状态 (以防下次打开看不到)
        if (box) box.style.display = 'flex';
        
        // 3. 背景归位：设回默认的 street0.png (公寓街道)
        // 这样下次进开场白或者重置时，默认就是家门口
        if (bgImg) {
            bgImg.style.display = 'block';
            bgImg.src = 'assets/images/city/street0.png';
        }
    },

    // ============================================================
    // 4. 初始剧情逻辑 (Original Story Scripts)
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
        
        // 剧情模式背景稍暗
        scene.style.background = 'rgba(0, 0, 0, 0.4)'; 
        
        // 隐藏背景图 (剧情模式下使用纯色或半透明遮罩)
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
            if(room) {
               room.classList.add('shake-room');
               setTimeout(() => room.classList.remove('shake-room'), 500);
            }
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

        UserData.state.hasFoundMysteryEntry = true;
        UserData.save();

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