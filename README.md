# HDownloader 并发批量下载器

轻量级大量文件批量下载。命令行工具，无需安装。

适用范围：大量文件且需要改名的文件下载

少量文件且无需改名的建议使用[IDM](http://www.internetdownloadmanager.com/)下载

## Usage

在命令行中打开，输入 `hdownloader -h`，如看到如下帮助页则正常：
```
usage: hdownloader [path] [options]
       其中 [path] 为 JSON 格式的下载文件列表

options :
  -o [path]         输出目录位置
  -s --sync         开启单线程下载 (默认值: false)
  -b --batch        同时允许并发下载进程的数量 (默认值: 10)
  -h --help         打印此列并退出
```

**程序会自动创建下载存储目录文件夹，无需手动创建**

### 下载文件列表格式

`v1.2.33` 支持两种格式，分别为列表(Array)和字典(Object)

列表(Array)格式形如：

```json
[{
	"url": 文件链接,
	"name": 下载后的文件名,
	"suffix": 文件后缀名,
}, {
    ...
}]
```

其中name、suffix两项可省，如果省去，将会从文件链接中识别相应的字段。

字典(Object)格式形如：

```json
{
    "data": [{
        "url": 文件链接,
        "name": 下载后的文件名,
        "suffix": 文件后缀名,
    }, {
        ...
    }],
    "sync": 是否为同步下载 (false为多线程，true为单线程),
    "batch": 同时并发开启下载的进程数,
    "output": 下载文件存储目录
}
```

### 使用样例

```bash
hdownloader download.json -o .\output
```

具体样例请见 [./examples](./examples)

## 注意事项

**注：不建议使用相同的文件名，程序会因为无法找到目标临时文件而报错。**

**注：如果配置参数发生冲突，命令行中参数优先**