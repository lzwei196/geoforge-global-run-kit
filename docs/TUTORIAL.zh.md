# 教程：从你的运行到 GeoForge 全球运行上的实时页面

本教程一步一步带你完成全部工作：从一台空电脑开始，到你的页面上线，并在
[geoforgehhu.com/cn/global-runs.html](https://geoforgehhu.com/cn/global-runs.html) 上有一张卡片。示例是基于 InSAR 的大坝形变运行；
任何“点 + 时间序列”的项目做法相同。English: [TUTORIAL.md](TUTORIAL.md)。

第一次做大约需要一天：一半时间在自己电脑上完成第 1–7 步，一半时间在服务器上完成第 8–11 步。

## 你要搭建的东西

```
你的 InSAR 运行 ──(结果)───> tools/csv_to_data.py ──> data/manifest.json、dams.json、series/
你的 InSAR 运行 ──(PID、日志)> tools/status_writer.py ─> data/runs/<run_id>/live.json   （每 60 秒）

你的网站服务器提供：  index.html + assets/  （页面，构建一次）
                      data/                  （上面的文件，持续更新）

读者的浏览器 ──> 你的页面                    读取 data/ 中的全部文件
GeoForge 全球运行卡片 ──> 你的 data/          只读取 manifest.json 和 runs/*/live.json
```

你的运行不会被改动：两个工具都只读取它的文件。GeoForge 只从你的网站服务器读取两类小文件。
外部不需要访问运行所在的电脑。

`status_writer.py` 必须和运行进程在同一台电脑上运行（它按进程号检查进程）。如果网站服务器是另一台电脑，
第 8 步介绍如何把状态文件复制过去。

## 开始之前

| 需要 | 版本 | 检查方法 |
| --- | --- | --- |
| Python | 3.8 或更新（只用标准库） | `python3 --version` |
| Node.js + npm | 18 或更新（只在构建页面时需要） | `node --version` |
| git | 任意 | `git --version` |
| 支持 HTTPS 的网站服务器 | nginx、Apache 等 | 你的地址能打开，证书有效 |

页面可以在任何电脑上构建（笔记本即可），再复制到服务器。服务器上不需要 Node。

## 第 1 步：获取工具包

你已被邀请加入这个私有仓库。在 GitHub 上接受邀请，然后：

```
git clone https://github.com/lzwei196/geoforge-global-run-kit.git
cd geoforge-global-run-kit
```

## 第 2 步：试运行示例

```
python3 tools/make_example_data.py
cd app && npm ci && npm run dev
```

打开 http://127.0.0.1:8870/ 看一看：

- 黄色的“示例数据”横幅（80 座大坝全是虚构的）；
- 点按形变速率着色；点击一个点，查看它带误差带的时间序列；
- 左上角的图层框：换一个数值着色；
- 语言按钮：所有文字都会切换，包括 `manifest.json` 里的文字；
- 状态标签一开始显示“已停止”，3 分钟后显示“状态未知（数据暂停更新）”：示例运行并没有在运行任何东西，
  也没有程序持续写它的状态。这正是如实状态规则在起作用，不是故障。

按 Ctrl+C 停止开发服务器。示例文件在 `app/public/data/`，用编辑器打开看看。你的数据流程要写出同样格式的文件。

## 第 3 步：编写 manifest

manifest 是唯一需要手写的文件。它包含你的文字、读者可用来给地图着色的数值、每座大坝显示的信息，以及你的运行。

```
cp app/public/data/manifest.json my_manifest.json
```

打开 `my_manifest.json` 并修改：

1. **删除** `"example": true` 和 `"updated_at": ...` 两行（转换脚本会自动写 `updated_at`）。
2. **`project_id`**：一个短 id，例如 `cn-dam-insar`。需与 GeoForge 商定（它是你卡片的名字）。
3. **`group`、`title`、`text`、`tags`、`facts`**：用你自己的话写中英文。`text` 用两句平实的话说明智能体做什么。
   `facts` 最多 4 条短事实，例如“1,200 座大坝”；卡片上显示前 3 条。
4. **`map_url`**：你的页面将来的地址，例如 `https://your.domain/dams/`。
5. **`runs`**：每个运行一条，最新的在前。`run_id` 只用字母、数字、`_` 和 `-`，例如 `china_2026_10`。
6. **`page.region`、`page.method`、`page.period`**：范围、用平实语言写的方法（卫星、轨道、处理步骤）、第一张和最后一张影像的日期。
7. **`page.values`**：读者可以用来着色的数值。合适就保留 `rate` 和 `total`；可以增删。
   形变用 `"scale": "diverging"`（0 在中间）。分类数值用 `"kind": "cat"` 加 `classes`。
8. **`page.default_value`**：地图默认的数值。这一项没有值的大坝算作“尚未处理”。
9. **`page.fields`**：每座大坝显示的普通信息（坝高、建成年份、所在河流……）。
10. **`page.series`**：时间序列的单位和名称。中国范围的 `tile_deg` 保持 5 即可。

每个字段的全部规则见 `DATA_FORMAT.md`。用词规则（平实用语、“率定”、“验证”、固定中文术语）见 `STYLE.md`。

## 第 4 步：把你的结果转成页面数据

大多数 InSAR 流程都能写出两张普通表格。写成带表头的 UTF-8 CSV 文件（Excel：另存为 >“CSV UTF-8”）：

`dams.csv`：每座大坝一行。列为 `id`、`lat`、`lon`、`name_en`、`name_zh`，然后 `page.values` 里每个数值 id 一列，
`page.fields` 里每个信息 id 一列。其他列会被忽略。

```
id,lat,lon,name_en,name_zh,rate,total,type,height_m,year_built
CN00001,30.8231,111.0034,Dam A,甲坝,-1.8,-14.2,1,181,2006
CN00002,25.1102,101.4410,,乙坝,,,0,42,
```

`series.csv`：每座大坝每个影像日期一行。列为 `dam_id`、`date`、`d`（按时间序列单位的形变），有误差的话加 `e`（± 误差）。

```
dam_id,date,d,e
CN00001,2017-01-03,0.0,1.2
CN00001,2017-01-15,-0.4,1.1
```

然后先删除示例数据（只需一次），再转换：

```
rm -rf app/public/data
python3 tools/csv_to_data.py --manifest my_manifest.json --dams dams.csv --series series.csv --out app/public/data
```

需要知道的事：

- **缺失值：**单元格留空。空白、`NaN` 和 `NA` 都会变成 `null`（“暂无数值”）。如果你的流程用 `-9999` 表示缺失，
  加上 `--missing -9999`（`-9999.0` 也会被识别）。绝不要让缺失值变成 0：地图会把它当成真实数值显示。
- **id：**每座大坝要有自己的 id，同一座大坝在每次更新中保持同一个 id。
- **分类数值**（如坝型）写类别编号 0、1、2……，顺序与 `classes` 一致（`1.0` 按 1 处理）。
- **写出顺序：**转换脚本先写 series，再写 `dams.json`，最后写 `manifest.json`，读者不会看到只更新了一半的数据。
  它还会删掉已经没有大坝的方格的 series 文件。
- **自己写转换：**如果你想直接从流程写 JSON，请按 `DATA_FORMAT.md`，以 `tools/make_example_data.py` 为模板。
  保持同样的写出顺序，并且绝不写 `NaN`（用 `allow_nan=False`）。

## 第 5 步：检查数据

```
python3 tools/check_data.py app/public/data
```

它会列出全部问题，最后显示“ready to publish”（0 个错误）或“NOT ready to publish”。常见的第一批错误：

| 提示 | 处理 |
| --- | --- |
| `runs/<run_id>/live.json: missing` | 第 8 步之前是正常的：还没有状态。状态写出脚本运行后再检查 |
| `"example": true - this is example data` | manifest 里还有这个标记 |
| `"zh" text missing`（或 `"en"`） | 某段文字只有一种语言 |
| `NaN is not allowed in JSON` | 写文件时没有用 `allow_nan=False` |
| `must be a list as long as "id"` | `dams.json` 中某一列比 `id` 短或长 |
| `written ... s ago`（警告） | 状态写出脚本没有运行或已停止 |

## 第 6 步：查看你自己的数据

```
cd app && npm run dev
```

再次打开 http://127.0.0.1:8870/，检查：

- 点的位置就是你的大坝位置；如果地图起始位置不对，修改 `app/src/MapView.tsx` 中的
  `map.setView([33, 105], 4)`（纬度、经度、缩放级别）；
- 点开几座大坝：名称、信息、时间序列和单位都正确；
- 切换到 English，再把每段文字读一遍；
- 把窗口拉窄（约 390 像素，手机宽度）：所有功能仍然可用。

页面代码中哪些可以改、哪些必须保留，见 `STYLE.md`（页头、颜色和状态规则保持不变）。

## 第 7 步：构建页面

```
cd app && npm run build
```

这会生成 `app/dist/`（`index.html` 和 `assets/`）。只有页面代码改变时才需要重新构建，数据改变不需要。

## 第 8 步：启动状态写出脚本

状态写出脚本告诉读者和全球运行卡片：你的运行是否真的在工作。

**在哪里运行：**在运行进程所在的电脑上。先把工具包放到那台电脑上
（仓库是私有的，请用你自己的用户克隆，再移动过去：
`git clone https://github.com/lzwei196/geoforge-global-run-kit.git && sudo mv geoforge-global-run-kit /opt/`），
再把 `my_manifest.json` 复制到这个文件夹。在计算集群上，作业进程在计算节点上，登录节点看不到它：
请在作业内部、和运行一起启动状态写出脚本。

它需要运行提供两样东西：

- **PID 文件**：记录运行进程号的文件。如果你的运行不写这个文件，可以这样启动：
  `nohup python3 run_dams.py > run.log 2>&1 & echo $! > run.pid`
- **活动文件**：运行工作时不断写入的日志文件（这里是 `run.log`）。用文件，不要用大文件夹。

先在终端里试一下（它每 60 秒写一次，直到按 Ctrl+C；在第二个终端里查看文件）：

```
python3 tools/status_writer.py --data app/public/data --run-id china_2026_10 \
    --pid-file /path/to/run.pid --activity /path/to/run.log \
    --step-en "time series" --step-zh "时间序列"
```

查看 `app/public/data/runs/china_2026_10/live.json`：只有运行进程存在时，`status` 才是 `running`。

**进度：**要显示“340 / 1,200 座大坝”，修改 `tools/status_writer.py` 中的 `progress()` 函数，统计已完成的部分，
例如结果文件的数量：

```python
def progress():
    done = len(list(Path("/path/to/results").glob("*.h5")))
    return {"done": done, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}
```

**重启后自动运行：**用 systemd。状态写出脚本和数据导出（“运行进行中”一节）使用同一个用户，并让这个用户能写数据文件夹。保存为 `/etc/systemd/system/dam-status.service`（修改路径和用户）：

```ini
[Unit]
Description=Status writer for the dam InSAR run
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/status_writer.py --data /var/www/dams/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --step-en "time series" --step-zh "时间序列"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now dam-status
```

**运行结束或暂停时，**要自己写明；进程消失只代表“已停止”：

```
python3 tools/status_writer.py ... --status finished                       # 写一次后退出
python3 tools/status_writer.py ... --status paused --note-en "Waiting for new images" --note-zh "等待新影像"
```

写 `finished` 之前，要彻底关闭服务，否则下次重启后它会再启动，用“已停止”覆盖“已完成”：
`sudo systemctl disable --now dam-status`。写 `paused` 之前，在服务的 `ExecStart` 行加上 `--status paused` 和说明，然后运行
`sudo systemctl daemon-reload && sudo systemctl restart dam-status`（只用 `stop` 的话，下次重启后又会恢复），以免两个脚本轮流写。

**如果网站服务器是另一台电脑，**让状态写出脚本写到本地文件夹（`--data /data/feed`），再由运行所在的电脑每分钟
推送状态文件（cron）。运行所在的电脑只向外发送，没有任何东西连接到它：

```
* * * * *  rsync -a --delay-updates /data/feed/runs/ webuser@your.domain:/var/www/dams/data/runs/
```

地图数据（`manifest.json`、`dams.json`、`series/`）也要到达网站服务器。最简单的做法：把两个 CSV 文件和
`my_manifest.json` 复制到网站服务器，在那里运行导出（见“运行进行中”一节）。如果在运行所在的电脑上导出
（`--out /data/feed`），请按下面的顺序推送，不要一次复制整个文件夹，这样 manifest 最后到达：

```
rsync -a --delay-updates --delete /data/feed/series/ webuser@your.domain:/var/www/dams/data/series/ \
  && rsync -a /data/feed/dams.json webuser@your.domain:/var/www/dams/data/ \
  && rsync -a /data/feed/manifest.json webuser@your.domain:/var/www/dams/data/
```

## 第 9 步：放到网站服务器上

```
/var/www/dams/          <- app/dist/ 中的内容
/var/www/dams/data/     <- csv_to_data.py 和 status_writer.py 写入的位置（用 --out / --data /var/www/dams/data）
```

用 `rsync -a app/dist/ server:/var/www/dams/` 复制页面，这里绝不要加 `--delete`：它会删掉 `data/`。

按 `HOSTING.md` 配置 nginx：`index.html` 和 `data/` 不缓存，`assets/` 长期缓存，并在 `data/` 上加这一行，
让 GeoForge 卡片能读取你的文件：

```
add_header Access-Control-Allow-Origin "https://geoforgehhu.com" always;
```

在中国大陆服务器上用域名公开网站需要 ICP 备案。可以问学校网络中心；很多学校已有备案域名，可以用其下的一个子路径。

## 第 10 步：从外部检查

在另一台电脑上：

```
curl -sI -H "Origin: https://geoforgehhu.com" https://your.domain/dams/data/manifest.json
python3 tools/check_data.py /var/www/dams/data          # 在服务器上
```

第一条必须显示 `200`、`Access-Control-Allow-Origin: https://geoforgehhu.com` 和 `Cache-Control: no-store`。
第二条必须显示“ready to publish”。然后用手机打开页面。最后对照 `CHECKLIST.md` 逐项打勾。

## 第 11 步：加入全球运行

发给 GeoForge（在本仓库提交 issue，或按约定方式）：

1. 页面地址和 `project_id`；
2. 一张卡片图片：JPG，1200 × 800 像素，小于 300 KB，图上不要有文字（地图截图效果很好）；
3. 中英文卡片文字：标题（最多 80 个字符）、两句话、最多 6 个标签；
4. 一个处理状态问题的联系人（我们不会公开）。

之后的流程：

1. 我们读取你的文件一天，确认状态持续更新、如实。
2. 我们给你看中英文两种卡片，商定用词。
3. 我们加上卡片并通知你已上线。卡片显示前 3 条 `facts` 和各运行的状态，从你的服务器读取；
   图片、标题、文字、标签和按钮地址按商定的保留（需要修改请告诉我们）。

当所有运行都是 `finished`，你的卡片会自动移到“已完成”部分。要下线卡片，把所有运行设为 `finished` 或 `stopped`
并通知我们，当天即可移除。

## 运行进行中

有新结果时，再执行第 4 步，并用 `--out /var/www/dams/data`，例如每批结果之后，或用 cron 每小时一次：

```
0 * * * *  cd /opt/geoforge-global-run-kit && flock -n /tmp/dams-export.lock python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /var/www/dams/data >> /var/log/dams-export.log 2>&1
```

上一次导出还没结束时，`flock` 会跳过这一轮。请让数据流程写完每个 CSV 后再让导出读取（先写临时文件名，再改名）。
已打开的页面会在 2 分钟内读到新数据（它们会查看 `updated_at` 是否变化）。状态写出脚本会自己继续运行。

新的运行（例如全球运行）：把它加在 `my_manifest.json` 中 `runs` 的最前面，重新导出，再用新的 `--run-id`
启动第二个状态写出脚本。

## 从中国扩展到全球

不需要改代码。把新的大坝加入 `dams.csv` 和 `series.csv`。注意：

- 单个 series 文件保持在约 20 MB 以下；如果一个 5° 方格太大，把 `tile_deg` 设为 2 或 1；
- 地图起始视图（第 6 步）适合你的读者；
- 约 60,000 座大坝以内没有问题；超过之前请先告诉我们。

## 获取 GeoForge 的修复

我们会把修复推送到本仓库。使用方法：

```
git pull
cat CHANGELOG.md                     # 看改了什么
cd app && npm ci && npm run build    # 然后把 app/dist/ 再复制到服务器（不加 --delete，见第 9 步）
```

`git pull` 不会改动你的数据文件夹和 `my_manifest.json`。如果你改过页面代码，git 会告诉你哪里有冲突。

## 出问题时

| 你看到 | 可能原因 | 处理 |
| --- | --- | --- |
| “状态未知（数据暂停更新）” | `live.json` 超过 3 分钟没有更新 | 状态写出脚本停了：`systemctl status dam-status`；检查服务器时钟（NTP） |
| 运行在工作却显示“已停止” | PID 文件里的进程号不是运行进程 | 写入真正运行进程的 PID（不是一个启动后就退出的外壳进程） |
| 运行结束后仍显示“正在运行” | 旧 PID 文件的进程号被别的进程用了 | 运行结束时删除 PID 文件；设置 `--status finished` |
| 页面空白 | 地址末尾没有斜杠，或浏览器用了旧缓存 | 打开 `https://your.domain/dams/`；检查 `no-cache` 那一行 |
| 全球运行卡片上没有状态 | 浏览器无法从 geoforgehhu.com 读取你的文件 | 检查 `Access-Control-Allow-Origin` 那一行和 HTTPS 证书 |
| 新数据没有出现 | `updated_at` 没有变 | 通过 `csv_to_data.py` 写，或最后写 `manifest.json` 并更新 `updated_at` |
| 某座大坝显示 0，但应为空 | 缺失值被写成了 0 | 写空值 / `null`；用 `--missing` 指定你的缺失标记 |

其他问题：请在本仓库提交 issue。
