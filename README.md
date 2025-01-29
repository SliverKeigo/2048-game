# 2048 游戏

一个使用 Next.js 和 TypeScript 开发的现代化 2048 游戏。

## 特点

- 🎮 流畅的游戏体验
- 🎯 平滑的动画效果
- 📱 支持触屏操作
- 💾 自动保存最高分
- 🖥️ 响应式设计，支持移动端
- 🎨 现代化 UI 设计

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- CSS Animations

## 游戏操作

### 键盘控制
- ⬆️ 向上移动：上方向键
- ⬇️ 向下移动：下方向键
- ⬅️ 向左移动：左方向键
- ➡️ 向右移动：右方向键

### 触屏控制
- 👆 上滑：向上移动
- 👇 下滑：向下移动
- 👈 左滑：向左移动
- 👉 右滑：向右移动

## 本地运行

1. 克隆项目
```bash
git clone [repository-url]
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 打开浏览器访问 `http://localhost:3000`

## 游戏规则

1. 使用方向键或滑动操作移动方块
2. 相同数字的方块相撞时会合并成为它们的和
3. 每次移动后会在空位置随机出现一个新的数字（2或4）
4. 当方块到达2048时获胜
5. 当无法进行有效移动时游戏结束

## 项目结构

```
├── app/
│   ├── components/    # 游戏组件
│   ├── types/        # TypeScript 类型定义
│   ├── globals.css   # 全局样式
│   └── page.tsx      # 主页面
├── public/           # 静态资源
└── package.json      # 项目配置
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License
