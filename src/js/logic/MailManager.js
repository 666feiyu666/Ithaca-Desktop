/* src/js/logic/MailManager.js */
import { UserData } from '../data/UserData.js';

export const MailManager = {
    // 📖 21天信件库 (剧本配置)
    letters: {
        1: {
            title: "👋 致新房客",
            sender: "糖水菠萝",
            content: "你好。\n\n这间房间空置了很久，很高兴终于有人搬进来了。\n\n我是这里的前任房客。我在一些家具的缝隙里留下了一些过去的碎片，如果你在打扫（或者装修）的时候发现了它们，请不要介意。\n\n希望这个只有20平米的地方，能容纳你所有的思绪。"
        },
        3: {
            title: "🌧️ 关于下雨天",
            sender: "糖水菠萝",
            content: "今天从窗户看出去，城市是不是灰蒙蒙的？\n\n我以前最讨厌下雨天，因为地铁会很挤。但后来我发现，雨天是这个城市唯一允许我们“不快乐”的时候。\n\n如果今天心情不好，也没关系。"
        },
        7: {
            title: "🪑 习惯",
            sender: "糖水菠萝",
            content: "已经是第7天了。你开始习惯这里的某种声音了吗？\n\n比如冰箱压缩机启动的嗡嗡声，或者隔壁邻居走路的声音。\n\n在这个城市，我们在巨大的噪音中寻找属于自己的频率。"
        },
        // ... 中间可以根据需要填充更多天数 ...
        21: {
            title: "💻 源代码",
            sender: "开发者",
            content: "嗨，朋友。\n\n今天是第21天。按照心理学的说法，你已经养成了一个习惯。\n\n其实，没有什么“糖水菠萝”。\n或者说，**我就是那个写下这些代码的人**。\n\n我创造这个房间，是因为我曾在这个城市的洪流里迷失过。我试图用代码构建一个避难所，但我发现，真正的庇护所不是代码，而是你通过书写建立起来的内心秩序。\n\n从明天起，不会再有信了。\n\n因为这个房间的故事，该由你来独家主笔了。\n\n祝你在伊萨卡，找到回家的路。"
        }
    },

    /**
     * 检查今天是否有新信 (用于红点提示)
     */
    checkNewMail() {
        const day = UserData.state.day;
        const letter = this.letters[day];
        
        // 如果有信，且还没读过
        if (letter && !UserData.hasReadMail(day)) {
            // ✨ 关键点：这里我们手动把 day 拼进去了
            return { day: day, ...letter };
        }
        return null;
    },

    /**
     * 获取今天的信内容 (用于点击打开)
     */
    getTodayMail() {
        const day = UserData.state.day;
        const letter = this.letters[day];

        if (letter) {
            // 🛠️ 修复：这里之前直接返回了 letter，导致缺少 'day' 字段
            // 现在我们像上面一样，手动把 day 拼进去
            return { day: day, ...letter };
        }
        return null;
    }
};