/* js/logic/Binder.js */
import { Library } from '../data/Library.js';
import { UserData } from '../data/UserData.js';

export const Binder = {
    // 暂存当前正在编辑的书稿 (Manuscript)
    currentManuscript: "", 

    // 把某篇日记的内容追加到书稿里 (Import)
    appendFragment(text) {
        // 自动加两个换行符，区分段落
        this.currentManuscript += text + "\n\n"; 
    },

    // 手动修改书稿内容
    updateManuscript(text) {
        this.currentManuscript = text;
    },

    // 最终出版 (Finalize)
    publish(title) {
        if (this.currentManuscript.length < 10) {
            return { success: false, msg: "书稿内容太少，无法出版。" };
        }

        const newBook = {
            id: Date.now(),
            title: title || "无题",
            content: this.currentManuscript,
            date: new Date().toLocaleDateString()
        };

        Library.addBook(newBook);
        
        // 奖励结算
        const reward = Math.floor(this.currentManuscript.length / 2);
        UserData.addInk(reward);

        // 清空工作台
        this.currentManuscript = "";

        return { success: true, msg: `《${newBook.title}》出版成功！获得 ${reward}ml 墨水。` };
    }
};