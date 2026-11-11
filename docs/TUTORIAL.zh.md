# 教程：从你的运行到 GeoForge 全球运行上的实时页面

本教程一步一步带你完成全部工作：从一台空电脑开始，到你的页面上线，并在
[geoforgehhu.com/cn/global-runs.html](https://geoforgehhu.com/cn/global-runs.html) 上有一张卡片。示例是基于 InSAR 的大坝形变运行；
任何“点 + 时间序列”的项目做法相同。English: [TUTORIAL.md](TUTORIAL.md)。

## 一张图看懂

```
运行所在的电脑
  你的运行 ──(结果)───> csv_to_data.py ───> site/data/       地图数据          （第 8 步，之后每小时）
  你的运行 ──(PID、日志)> status_writer.py ─> site/data/runs/  “是否正在运行”   （第 10 步，每 60 秒）
  serve.py      只在 127.0.0.1 上提供 site/（页面 + data/）                    （第 9 步）
  cloudflared   通过隧道把页面送出去                                           （第 11 步）
                                │
                                ▼
            https://<名称>.geoforgehhu.com             你的页面，所有人可访问
                                ▲
                                │ 读取 data/manifest.json 和 data/runs/*/live.json
            geoforgehhu.com/cn/global-runs.html        你的卡片（第 13 步）
```

- 你的运行不会被改动：这些工具只读取它的文件。
- 外部无法访问运行所在的电脑。隧道由这台电脑向外连接到 Cloudflare，Cloudflare 在公开地址上显示你的页面。
  不需要公网 IP、开放端口、域名或证书。
- GeoForge 为你建好地址并发给你隧道密钥。其他方式（自己的域名、自己的网站服务器）见 `HOSTING.md`。

分两部分：

| 部分 | 在哪里 | 步骤 | 时间 |
| --- | --- | --- | --- |
| A. 做页面 | 你自己的电脑（笔记本即可） | 1–7 | 约半天 |
| B. 上线 | 运行所在的电脑 | 8–13 | 约一小时 |

## 开始之前

| 需要 | 在哪台电脑 | 检查方法 |
| --- | --- | --- |
| Python 3.8 或更新（只用标准库） | 两台都要 | `python3 --version` |
| Node.js 18 或更新（只在构建页面时需要） | 你自己的电脑 | `node --version` |
| git | 两台都要 | `git --version` |
| 能向外连接 Cloudflare 的 7844 端口 | 运行所在的电脑 | 检查方法见第 11 步 |
| sudo 权限、systemd | 运行所在的电脑 | 用来启动三个小服务 |

# A 部分：做页面（你自己的电脑）

## 第 1 步：获取工具包

你已被邀请加入这个私有仓库。在 GitHub 上接受邀请，然后：

```
git clone https://github.com/lzwei196/geoforge-global-run-kit.git
cd geoforge-global-run-kit
```

## 第 2 步：试运行示例

```
python3 tools/make_example_data.py
(cd app && npm ci && npm run dev)
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
3. **`group`、`title`、`text`、`tags`、`facts`**：用你自己的话写中英文。`text` 用两句平实的话说明知识基础设施智能体做什么。
   `facts` 最多 4 条短事实，例如“1,200 座大坝”；卡片上显示前 3 条。
4. **`map_url`**：你的页面将来的地址，例如 `https://cn-dams.geoforgehhu.com/`（第 11 步）。
5. **`runs`**：每个运行一条，最新的在前。`run_id` 只用字母、数字、`_` 和 `-`，例如 `china_2026_10`。
6. **`page.region`、`page.method`、`page.period`**：范围、用平实语言写的方法（卫星、轨道、处理步骤）、第一张和最后一张影像的日期。
7. **`page.values`**：读者可以用来着色的数值。合适就保留 `rate` 和 `total`；可以增删。
   形变用 `"scale": "diverging"`（0 在中间）。分类数值用 `"kind": "cat"` 加 `classes`。
8. **`page.default_value`**：地图默认的数值。缺的数字画成“无对外数字”，不当成 0。只有坝详情里没有 `processing_class` 时，缺值才不计入“已处理”。有该字段时，页面按它分别计实际已处理和仅排队。
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
| `runs/<run_id>/live.json: missing` | 第 10 步之前是正常的：还没有状态。状态写出脚本运行后再检查 |
| `"example": true - this is example data` | manifest 里还有这个标记 |
| `"zh" text missing`（或 `"en"`） | 某段文字只有一种语言 |
| `NaN is not allowed in JSON` | 写文件时没有用 `allow_nan=False` |
| `must be a list as long as "id"` | `dams.json` 中某一列比 `id` 短或长 |
| `written ... s ago`（警告） | 状态写出脚本没有运行或已停止 |

## 第 6 步：查看你自己的数据

```
(cd app && npm run dev)
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
(cd app && npm run build)
```

这会生成 `app/dist/`（`index.html` 和 `assets/`）。只有页面代码改变时才需要重新构建，数据改变不需要。

# B 部分：上线（运行所在的电脑）

下面的例子中，运行所有程序的用户是 `insar`，运行文件夹是 `/data/run`，结果在 `/data/out`，运行名为
`china_2026_10`。请换成你自己的。如果你的运行在计算集群上，或页面要放在另一台电脑上，请先阅读 `HOSTING.md` 中的
“When the run is on another computer”一节。

## 第 8 步：建好站点文件夹

建好两个文件夹：工具包和站点（页面加数据），并把工具包放进去：

```
sudo mkdir -p /opt/geoforge-global-run-kit /opt/geoforge-site
sudo chown insar /opt/geoforge-global-run-kit /opt/geoforge-site
git clone https://github.com/lzwei196/geoforge-global-run-kit.git /opt/geoforge-global-run-kit
```

仓库是私有的，克隆需要这台电脑上有你的 GitHub 登录（令牌或 SSH 密钥）。如果没有，可以从你自己的电脑复制工具包：
`rsync -a --exclude node_modules ./ insar@run-computer:/opt/geoforge-global-run-kit/`。

从你自己的电脑复制：构建好的页面放进站点文件夹，manifest 放进工具包。

```
rsync -a app/dist/ insar@run-computer:/opt/geoforge-site/
scp my_manifest.json insar@run-computer:/opt/geoforge-global-run-kit/
```

你的数据流程在这台电脑上写出 `dams.csv` 和 `series.csv`（第 4 步），这里放在 `/data/out/`。写出一次数据并检查：

```
cd /opt/geoforge-global-run-kit
python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /opt/geoforge-site/data
python3 tools/check_data.py /opt/geoforge-site/data
```

现在只应出现 `live.json: missing` 这一个错误；第 10 步会解决它。

## 第 9 步：启动页面服务

`tools/serve.py` 按正确的响应头提供站点文件夹，只在本机（`127.0.0.1`，端口 8871）。先试一下：

```
python3 tools/serve.py --site /opt/geoforge-site
curl -sI http://127.0.0.1:8871/data/manifest.json        # 在第二个终端里：必须显示 200
```

按 Ctrl+C 停止，再把它做成服务，每次重启后自动运行。保存为 `/etc/systemd/system/geoforge-site.service`：

```ini
[Unit]
Description=GeoForge page server
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/serve.py --site /opt/geoforge-site
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-site
```

## 第 10 步：启动状态写出脚本

状态写出脚本告诉读者和全球运行卡片：你的运行是否真的在工作。它必须和运行进程在同一台电脑上，因为它按进程号检查
进程。它需要运行提供两样东西：

- **PID 文件**：记录运行进程号的文件。如果你的运行不写这个文件，可以这样启动：
  `nohup python3 run_dams.py > run.log 2>&1 & echo $! > run.pid`
- **活动文件**：运行工作时不断写入的日志文件（这里是 `run.log`）。用文件，不要用大文件夹。

先试一下（它每 60 秒写一次，直到按 Ctrl+C）：

```
python3 tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 \
    --pid-file /data/run/run.pid --activity /data/run/run.log \
    --step-en "time series" --step-zh "时间序列"
```

在第二个终端里查看 `/opt/geoforge-site/data/runs/china_2026_10/live.json`：只有运行进程存在时，`status` 才是 `running`。

**进度：**要显示“340 / 1,200 座大坝”，修改 `tools/status_writer.py` 中的 `progress()` 函数，统计已完成的部分，
例如结果文件的数量：

```python
def progress():
    done = len(list(Path("/data/out/results").glob("*.h5")))
    return {"done": done, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}
```

做成服务。保存为 `/etc/systemd/system/geoforge-status.service`：

```ini
[Unit]
Description=GeoForge status writer
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --step-en "time series" --step-zh "时间序列"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-status
```

**运行结束或暂停时，**要自己写明；进程消失只代表“已停止”：

- **已完成：**先彻底关闭服务（否则下次重启后它会再启动，用“已停止”覆盖“已完成”），再写一次 `finished`：

  ```
  sudo systemctl disable --now geoforge-status
  python3 tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --status finished
  ```

- **暂停：**在服务的 `ExecStart` 行加上 `--status paused --note-en "Waiting for new images" --note-zh "等待新影像"`，
  然后运行 `sudo systemctl daemon-reload && sudo systemctl restart geoforge-status`。运行继续时再去掉
  （同样 reload、restart）。

## 第 11 步：获得公开地址

1. 联系 GeoForge（在本仓库提交 issue，或按约定方式），说明你的 `project_id` 并申请地址。我们会建一个类似
   `https://cn-dams.geoforgehhu.com` 的地址，并私下把隧道密钥发给你。
2. 检查这台电脑能否连到 Cloudflare 的隧道端口（向外的 TCP 和 UDP 7844 端口；没有任何连接进来）：

   ```
   nc -vz region1.v2.argotunnel.com 7844        # 必须显示 “succeeded” 或 “open”
   ```

   （如果没有 `nc`：`sudo apt install netcat-openbsd`。）

   如果失败，请网络管理员放行到 Cloudflare 7844 端口的向外连接。
3. 安装 `cloudflared` 2025.4 或更新版本。在中国大陆从 GitHub 下载可能很慢，可以先在你自己的电脑上下载，再复制过去
   （ARM 电脑用 `cloudflared-linux-arm64.deb`；其他系统见
   [下载页面](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)）：

   ```
   curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   scp cloudflared.deb insar@run-computer:
   ```

   然后在运行所在的电脑上：`sudo dpkg -i cloudflared.deb && cloudflared --version`。
4. 把密钥存进只有 root 能读的文件。绝不要把密钥写在命令行里，这台电脑的其他用户可能看到：

   ```
   sudo mkdir -p /etc/cloudflared
   sudo sh -c 'umask 077; read -r k; printf %s "$k" > /etc/cloudflared/geoforge.token'    # 粘贴密钥，按回车
   ```

5. 把隧道做成服务。保存为 `/etc/systemd/system/geoforge-tunnel.service`：

   ```ini
   [Unit]
   Description=GeoForge tunnel
   After=network-online.target
   Wants=network-online.target

   [Service]
   ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token-file /etc/cloudflared/geoforge.token
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

   ```
   sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-tunnel
   systemctl status geoforge-tunnel        # 显示 “active (running)”；日志中有 “Registered tunnel connection”
   ```

6. 在浏览器中打开你的地址：页面就出现了。

请保管好密钥：不要写进代码、聊天或仓库。如果泄露，请告诉我们；我们会换一个新的，旧的随即失效。想用自己的域名或
网站服务器：见 `HOSTING.md` 的方式 2 和方式 3。如果第 3 步（编写 manifest）时还不知道地址，现在把它填入 `my_manifest.json` 的
`map_url`，再运行一次导出（第 8 步）。

## 第 12 步：从外部检查

在任意另一台电脑上：

```
curl -sI -H "Origin: https://geoforgehhu.com" https://cn-dams.geoforgehhu.com/data/manifest.json
```

必须显示 `200`、`Access-Control-Allow-Origin: https://geoforgehhu.com` 和 `Cache-Control: no-store`。在运行所在的电脑上，
`python3 tools/check_data.py /opt/geoforge-site/data` 现在必须显示“ready to publish”。用手机打开页面看看。
然后对照 `CHECKLIST.md` 逐项打勾。

## 第 13 步：加入全球运行

发给 GeoForge：

1. 页面地址和 `project_id`；
2. 一张卡片图片：JPG，1200 × 800 像素，小于 300 KB，图上不要有文字（地图截图效果很好）；
3. 中英文卡片文字：标题（最多 80 个字符）、两句话、最多 6 个标签；
4. 一个处理状态问题的联系人（我们不会公开）。

之后的流程：

1. 我们读取你的文件一天，确认状态持续更新、如实。
2. 我们给你看中英文两种卡片，商定用词。
3. 我们加上卡片并通知你已上线。卡片显示前 3 条 `facts` 和各运行的状态，从你的地址读取；
   图片、标题、文字、标签和按钮地址按商定的保留（需要修改请告诉我们）。

当所有运行都是 `finished`，你的卡片会自动移到“已完成”部分。要下线卡片，把所有运行设为 `finished` 或 `stopped`
并通知我们，当天即可移除。

# 上线之后

## 运行进行中

有新结果时，再运行一次导出，例如用 cron 每小时一次（用 `insar` 用户，`crontab -e`）：

```
0 * * * *  cd /opt/geoforge-global-run-kit && flock -n /tmp/geoforge-export.lock python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /opt/geoforge-site/data >> /tmp/geoforge-export.log 2>&1
```

- 上一次导出还没结束时，`flock` 会跳过这一轮。
- 请让数据流程写完每个 CSV 后再让导出读取（先写临时文件名，再改名）。
- 已打开的页面会在 2 分钟内读到新数据（它们会查看 `updated_at` 是否变化）。状态写出脚本会自己继续运行。

新的运行（例如全球运行）：把它加在 `my_manifest.json` 中 `runs` 的最前面，重新导出，再用新的 `--run-id`
建第二个状态写出服务。

## 从中国扩展到全球

不需要改代码。把新的大坝加入 `dams.csv` 和 `series.csv`。注意：

- 单个 series 文件保持在约 20 MB 以下；如果一个 5° 方格太大，把 `tile_deg` 设为 2 或 1；
- 地图起始视图（第 6 步）适合你的读者；
- 约 60,000 座大坝以内没有问题；超过之前请先告诉我们。

## 获取 GeoForge 的修复

我们会把修复推送到本仓库。在你自己的电脑上：

```
git pull
cat CHANGELOG.md                     # 看改了什么
(cd app && npm ci && npm run build)
rsync -a app/dist/ insar@run-computer:/opt/geoforge-site/     # 绝不要加 --delete：它会删掉 data/
```

在运行所在的电脑上，用 `cd /opt/geoforge-global-run-kit && git pull` 更新工具。如果你在第 10 步改过 `progress()`，
让 git 先把你的修改放到一边，更新后再放回：`git stash && git pull && git stash pop`。然后运行
`sudo systemctl restart geoforge-site`；只有运行还在进行时才重启 `geoforge-status`（写了 `finished` 之后再重启，
它会又写成“已停止”）。`git pull` 不会改动你的数据和 `my_manifest.json`。

## 出问题时

| 你看到 | 可能原因 | 处理 |
| --- | --- | --- |
| 地址上出现 Cloudflare “Error 1033” | 隧道没有连上 | `systemctl status geoforge-tunnel`；做第 11 步的 7844 端口检查 |
| Cloudflare “502 Bad Gateway” | 隧道正常，但页面服务没有响应 | `systemctl status geoforge-site`；`curl -sI http://127.0.0.1:8871/` |
| “状态未知（数据暂停更新）” | `live.json` 超过 3 分钟没有更新 | `systemctl status geoforge-status`；检查时钟是否同步（NTP） |
| 运行在工作却显示“已停止” | PID 文件里的进程号不是运行进程 | 写入真正运行进程的 PID（不是一个启动后就退出的外壳进程） |
| 运行结束后仍显示“正在运行” | 旧 PID 文件的进程号被别的进程用了 | 运行结束时删除 PID 文件；写 `finished`（第 10 步） |
| 页面提示无法读取数据 | 还没有 `data/`，或文件损坏 | 运行导出（第 8 步）和 `check_data.py` |
| 全球运行卡片上没有状态 | 浏览器无法从 geoforgehhu.com 读取你的文件 | 第 12 步的 `curl` 必须显示 `Access-Control-Allow-Origin` 那一行 |
| 新数据没有出现 | `updated_at` 没有变 | 通过 `csv_to_data.py` 导出；查看 `/tmp/geoforge-export.log` |
| 某座大坝显示 0，但应为空 | 缺失值被写成了 0 | 写空值 / `null`；用 `--missing` 指定你的缺失标记 |

其他问题：请在本仓库提交 issue。
