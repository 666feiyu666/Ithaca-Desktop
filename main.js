/* main.js */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. 定义数据存储路径
// app.getPath('userData') 会自动定位到系统的标准数据目录
// Mac 上通常是: /Users/你的用户名/Library/Application Support/ithaca-desktop/
const DATA_DIR = path.join(app.getPath('userData'), 'save_data');

// 如果目录不存在，就创建一个
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createWindow() {
    // 2. 创建浏览器窗口
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "伊萨卡手记",
        webPreferences: {
            // 加载预加载脚本，建立安全桥梁
            preload: path.join(__dirname, 'preload.js'),
            // 开启上下文隔离，这是 Electron 的安全标准
            contextIsolation: true,
            nodeIntegration: false 
        }
    });

    // 3. 加载前端页面
    win.loadFile('src/index.html');

    // 开发阶段可以打开控制台 (F12) 方便调试，发布时注释掉
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    // --- 注册 IPC 监听 (处理前端发来的请求) ---

    // A. 读取文件
    ipcMain.handle('read-file', async (event, filename) => {
        try {
            const filePath = path.join(DATA_DIR, filename);
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf-8');
            }
            return null; // 文件不存在
        } catch (err) {
            console.error("读取失败:", err);
            return null;
        }
    });

    // B. 写入文件
    ipcMain.handle('write-file', async (event, filename, content) => {
        try {
            const filePath = path.join(DATA_DIR, filename);
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch (err) {
            console.error("写入失败:", err);
            return false;
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});