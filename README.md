# 门店经营数据 H5

手机端优先的纯 HTML + CSS + JavaScript + ECharts 门店月结数据展示页面。

## 运行

最简单：

1. 直接双击 `index.html`
2. 或者使用 VS Code Live Server
3. 或者使用任意静态 Web 服务器

例如 Python：

```bash
python3 -m http.server 8080
```

然后浏览器打开：

```text
http://localhost:8080
```

## 部署到帽子云

这是纯静态网页，不需要后端。

GitHub 仓库结构：

```text
store-report-h5/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── data.js
└── data/
    └── 2026-08.json
```

帽子云如果提供 Static Site / 静态网站类型，选择这个项目即可。

如果要求填写：

- Build Command：留空
- Publish Directory：项目根目录

最终需要保证部署后的根目录可以找到：

```text
index.html
```

## 修改数据

第一版为了支持直接双击运行，页面实际读取 `js/data.js`。

后续可以把数据全部改为 JSON API / JSON 文件读取。

## 图表

页面包含：

- 营业收入趋势折线图
- 各门店营业收入柱状图
- 收入构成环形图
- 净利润趋势折线图
- 毛利率趋势折线图

## 注意

ECharts 当前通过 jsDelivr CDN 加载：

```text
https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
```

如果部署环境不能访问 jsDelivr，可以把 ECharts 下载到项目本地，再改成：

```html
<script src="js/echarts.min.js"></script>
```
