/* src/js/logic/Shop.js */
import { UserData } from '../data/UserData.js';
import { UIRenderer } from '../ui/UIRenderer.js';

export const Shop = {
    // 定义商品目录 (Catalog)
    // 你以后可以在这里加几十个家具，只需改这里
    catalog: [
        { 
            id: 'item_plant_01', 
            name: '沙发', 
            price: 50, 
            desc: '开躺！',
            img: 'assets/images/room/sofa.png' 
        },
        { 
            id: 'item_rug_blue', 
            name: '波斯地毯', 
            price: 120, 
            desc: '踩上去软软的，很舒服。',
            img: 'assets/images/room/rug2.png' 
        },
        { 
            id: 'item_cat_orange', 
            name: '橘猫', 
            price: 500, 
            desc: '它吃得很多，但很可爱。',
            img: 'assets/images/room/cat.png' // 以后换猫图
        }
    ],

    // 购买动作
    buy(itemId) {
        const item = this.catalog.find(i => i.id === itemId);
        if (!item) return;

        // 1. 检查钱够不够
        if (UserData.state.ink < item.price) {
            alert("💧 墨水不足！多写点日记吧。");
            return;
        }

        // 2. 扣钱
        if (UserData.consumeInk(item.price)) {
            // 3. 给货
            UserData.addItem(itemId);
            
            // 4. 刷新界面
            UIRenderer.updateStatus(); // 更新顶部墨水栏
            this.render(); // 刷新商店按钮状态
            
            alert(`🎉 购买成功：${item.name}`);
        }
    },

    // 渲染商店界面
    render() {
        const listEl = document.getElementById('shop-list');
        if (!listEl) return;

        listEl.innerHTML = "";

        this.catalog.forEach(item => {
            const isOwned = UserData.hasItem(item.id);
            
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            
            card.innerHTML = `
                <div class="shop-icon-box">
                    <img src="${item.img}" class="shop-icon">
                </div>
                <div class="shop-info">
                    <h4>${item.name}</h4>
                    <p class="desc">${item.desc}</p>
                    <div class="price-tag">💧 ${item.price} ml</div>
                </div>
                <button class="btn-buy ${isOwned ? 'owned' : ''}" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '购买'}
                </button>
            `;

            // 绑定购买事件
            if (!isOwned) {
                card.querySelector('.btn-buy').onclick = () => {
                    this.buy(item.id);
                };
            }

            listEl.appendChild(card);
        });
    }
};