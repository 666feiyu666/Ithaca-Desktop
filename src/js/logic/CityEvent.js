export const CityEvent = {
    explore(location) {
        const roll = Math.random();
        
        if (location === 'subway' && roll > 0.7) {
            return "【地铁】捡到一张旧传单：'所有的漂泊都是为了确认锚点的存在'。(B级事件)";
        }

        const commons = [
            "风很舒服。",
            "什么也没发生。",
            "看到一只流浪猫。"
        ];
        const text = commons[Math.floor(Math.random() * commons.length)];
        return `【${location}】${text}`;
    }
};