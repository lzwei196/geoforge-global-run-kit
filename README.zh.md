# GeoForge 全球运行：页面工具包

把你的全球运行做成 GeoForge 风格的实时地图页面，并在
[geoforgehhu.com/cn/global-runs.html](https://geoforgehhu.com/cn/global-runs.html) 上显示一张卡片。English: [README.md](README.md)。

## 工作方式

所有程序都在运行所在的电脑上。外部无法访问这台电脑；Cloudflare 隧道把你的页面送到一个公开地址。

```
运行所在的电脑
  你的运行 ──(结果)───> csv_to_data.py ───> site/data/       地图数据
  你的运行 ──(PID、日志)> status_writer.py ─> site/data/runs/  “是否正在运行”，每 60 秒
  serve.py      只在 127.0.0.1 上提供 site/（页面 + data/）
  cloudflared   通过隧道把页面送出去
                                │
                                ▼
            https://<项目名>.geoforgehhu.com           你的页面，所有人可访问
                                ▲
                                │ 读取 data/manifest.json 和 data/runs/*/live.json
            geoforgehhu.com/cn/global-runs.html        你的卡片，带“打开实时地图”按钮
```

你不需要公网 IP、开放端口、自己的域名或证书。GeoForge 为你建好地址并发给你隧道密钥。如果你想用自己的域名或自己的
网站服务器，`docs/HOSTING.md` 也介绍了这两种方式。

起步页面面向**带时间序列的点数据**，例如基于 InSAR 的大坝形变。页面已包含：带返回按钮的 GeoForge 页头、中英文切换、
如实的运行状态、地图、时间序列图和项目面板。你只需填入数据和文字。

## 从这里开始

**[教程](docs/TUTORIAL.zh.md)**（English: [docs/TUTORIAL.md](docs/TUTORIAL.md)）分两部分讲解每一步：

1. **在你自己的电脑上（约半天）：**试运行示例，写好文字，把结果转成页面数据，检查，构建页面。
2. **在运行所在的电脑上（约一小时）：**把页面复制过去，启动三个小服务（页面服务、状态写出、隧道），从外部检查，
   然后向 GeoForge 申请卡片。

现在就可以试运行示例（需要 Python 3.8+ 和 Node 18+）：

```
python3 tools/make_example_data.py    # 生成示例数据（已明确标注为虚构）到 app/public/data/
(cd app && npm ci && npm run dev)    # 打开 http://127.0.0.1:8870/
```

## 内容

| 路径 | 说明 |
| --- | --- |
| `app/` | 页面（React + Leaflet + TypeScript，用 Vite 构建） |
| `tools/csv_to_data.py` | 把你的结果（两个 CSV 文件）转成页面数据 |
| `tools/check_data.py` | 发布前检查数据 |
| `tools/status_writer.py` | 每 60 秒写出运行状态 |
| `tools/serve.py` | 在本机按正确的响应头提供页面和数据 |
| `tools/make_example_data.py` | 生成虚构的示例数据 |
| `docs/TUTORIAL.zh.md` | 从空电脑到页面和卡片上线的每一步 |
| `docs/HOSTING.md` | 获得公开地址的三种方式，以及响应头 |
| `docs/DATA_FORMAT.md` | 页面读取的全部文件和字段 |
| `docs/GLOBAL_RUNS_FEED.md` | 全球运行页面上的卡片及状态规则 |
| `docs/STYLE.md` | 外观、用词及可公开的内容 |
| `docs/CHECKLIST.md` | 上线前检查清单 |

说明：教程有中文版，其他文档正文为英文；字段名和命令可直接照用。用词要求：KI agents 译为“知识基础设施智能体”。

问题和修复：请在本仓库提交 issue。
