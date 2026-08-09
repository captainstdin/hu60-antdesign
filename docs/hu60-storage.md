<!-- markdown -->
[2019-07-20] 因为容易遭到CSRF攻击，不再允许通过GET请求新增/修改/删除键值，需要改为POST方式提交。通过GET方式查询键值不受影响。
[2019-07-17] 添加前缀匹配、仅列出长度，以及把数据作为文件下载/载入的功能。
[2022-08-01] `key`可以是任意名称，还可以通过`/`分隔形成目录结构，如：https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js

---------------------------------------

现在网页插件可以存储自定义数据了，并且可以把存储的自定义数据作为文件下载/载入。
本帖将分别介绍如何存储数据，以及如何将其作为文件下载。

自定义数据为键值对形式，具体限制如下：

key可以是任意`utf8mb3`字符，长度限制为255字节。key可以包含`/`，用于在外链中形成目录结构，如`public_tiger/viewerjs/dist.js`。

value只能为字符串，长度限制为16MB，二进制安全（所以可以存储图片等小文件）。

---------------------------------------

## 数据存储API

注意：所有用于**新增/修改/删除**键值的演示链接都**不会生效**。因为容易遭到CSRF攻击，**不再允许**通过GET请求新增/修改/删除键值，需要改为POST方式提交。

### 设置指定键的值

https://hu60.cn/q.php/api.webplug-data.json?key=name&value=xxxxxxxx
https://hu60.cn/q.php/api.webplug-data.json?key=name1&value=xxx222xxx22
https://hu60.cn/q.php/api.webplug-data.json?key=aabbcc1&value=bc2
https://hu60.cn/q.php/api.webplug-data.json?key=aabbcc2&value=bc3

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa&value=bbb'
```

返回的内容如下：
```
{
    "success": true,
    "islogin": true,
    "version": 1
}
```

其中`version`是字段的版本，从`1`开始，每次加`1`。

#### 【重要】公开键值

**`key`以`public_`开头的内容是公开内容，任何用户都可以查看**，但只有内容的创建者可以修改、删除。

设置公开键值：
```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=public_tiger&value=你好，这是公开内容'
```

其他用户可通过`key=1_public_tiger`看到我用上面的命令设置的键值，其中`1`是我的`uid`。


https://hu60.cn/q.php/api.webplug-data.json?key=1_public_tiger
https://hu60.cn/q.php/api.webplug-data.json?key=1_public_tiger&prefix=1
https://hu60.cn/q.php/api.webplug-file.1_public_tiger.txt
https://hu60.cn/q.php/api.webplug-file.1_public_tiger.json?prefix=1

#### 带版本更新

如果要在多个地方使用数据存储API，并且要保证数据的原子同步（防止一个客户端更新的数据被另一个客户端覆盖），可以使用带版本更新功能。

带版本更新使用的`version`字段是一个自增字段，从`1`开始，每次更新后加`1`。`key`被删除后再新增时，`version`会回到`1`。

客户端可获取`version`并存储在本地。下次更新时，可随`key`和`value`一并发送：

https://hu60.cn/q.php/api.webplug-data.json?key=name&value=xxxxxxxx&version=3

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa&value=bbb&version=3'
```

此时，若当前`version`不是`3`，则更新失败（`"success":"false"`），并且会附带当前版本（`version`）和当前内容（`data`）：
```
{
    "success": false,
    "islogin": true,
    "version": 4,
    "data": "ccc"
}
```

出现这种情况，说明其他字段已经被其他客户端更新。当前客户端应该首选拉取更新，获取当前版本，合并其他客户端的修改，然后再尝试进行自己的更新。

若当前`version`的`3`，则更新会成功，返回与不带版本更新没有区别：
```
{
    "success": true,
    "islogin": true,
    "version": 4
}
```

备注：如果要创建新字段，可以传递`version=0`，如：
```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa&value=bbb&version=0'
```

如果字段已存在则会失败。

### 列出所有自定义键值对：
https://hu60.cn/q.php/api.webplug-data.json

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid'
```

结果如下：
```
{
    "success": true,
    "islogin": true,
    "data": {
        "aaa": "11124",
        "aaa2": "xxddx",
        "aaa233": "ffsfau532542",
        "aaasd3": "fji234u532542"
    },
    "version": {
        "aaa": 38,
        "aaa2": 0,
        "aaa233": 0,
        "aaasd3": 0
    }
}
```

### 查询指定的键
https://hu60.cn/q.php/api.webplug-data.json?key=name

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa'
```

结果如下：
```
{
    "success": true,
    "islogin": true,
    "data": "11124",
    "version": 38
}
```

### 前缀匹配查询
https://hu60.cn/q.php/api.webplug-data.json?key=name&prefix=1
https://hu60.cn/q.php/api.webplug-data.json?key=aa&prefix=1

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa&prefix=1'
```

结果如下：
```
{
    "success": true,
    "islogin": true,
    "data": {
        "aaa2": "xxddx",
        "aaa233": "ffsfau532542"
    },
    "version": {
        "aaa2": 0,
        "aaa233": 0
    }
}
```

### 仅获取值的长度
https://hu60.cn/q.php/api.webplug-data.json?onlylen=1
https://hu60.cn/q.php/api.webplug-data.json?key=name&onlylen=1
https://hu60.cn/q.php/api.webplug-data.json?key=aa&prefix=1&onlylen=1


```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'onlylen=1'
```

```
{
    "success": true,
    "islogin": true,
    "data": {
        "aaa": 5,
        "aaa2": 5,
        "aaa233": 12,
        "aaasd3": 13
    },
    "version": {
        "aaa": 38,
        "aaa2": 0,
        "aaa233": 0,
        "aaasd3": 0
    }
}
```

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa233&onlylen=1'
```

```
{
    "success": true,
    "islogin": true,
    "data": 12,
    "version": 0
}
```

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa2&prefix=1&onlylen=1'
```

```
{
    "success": true,
    "islogin": true,
    "data": {
        "aaa2": 5,
        "aaa233": 12
    },
    "version": {
        "aaa2": 0,
        "aaa233": 0
    }
}
```

### 设置value为空，删除指定的键值对

[https://hu60.cn/q.php/api.webplug-data.json?key=name&value=](https://hu60.cn/q.php/api.webplug-data.json?key=name&value=)

```

curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa2&value='
```

结果如下：
```
{
    "success": true,
    "islogin": true,
    "version": null
}
```

### 带版本删除

与带版本更新类似，把`value`的值设为空即可。

### 前缀匹配设置/删除键值对

https://hu60.cn/q.php/api.webplug-data.json?key=aabbcc&value=ddd&prefix=1
https://hu60.cn/q.php/api.webplug-data.json?key=name&value=&prefix=1

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa2&value=ddd&prefix=1'
```

```
{
    "success": true,
    "islogin": true,
    "version": {
        "aaa2": 1,
        "aaa233": 2
    }
}
```

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=aaa2&value=&prefix=1'
```

```
{
    "success": true,
    "islogin": true,
    "version": []
}
```

### 前缀带版本更新/删除

与带版本更新/删除类似，添加`prefix=1`参数即可。

但因为只能传递一个`version`参数，所以只有所有字段的`version`均相同且与传递的参数相等时才能成功。如果任何字段的`version`与传递的参数不相等，整个前缀更新/删除操作都不会成功。

所以，**不建议使用前缀带版本更新/删除**，因为**一但版本不一致就无法补救**。

### 删除所有键值对

注意：点击以下链接~~会~~（不会，因为现在会报错{滑稽}）让你**丢失网页插件存储的所有自定义数据**：

https://hu60.cn/q.php/api.webplug-data.json?key=&value=&prefix=1

```
curl 'https://hu60.cn/q.php/api.webplug-data.json' -H 'Cookie: hu60_sid=你的sid' --data 'key=&value=&prefix=1'
```

```
{
    "success": true,
    "islogin": true,
    "version": []
}
```

## 通过POST传递参数

可以用POST方式传递`key`，`value`，`version`，`prefix`，`onlylen`等参数，作用和GET方式传递相同。

目前，为了防止CSRF，`value`参数必须通过POST方式传递。

## 返回的数据结构

```json
{
    "success": true,
    "islogin": true,
    "data": "xxx",
    "version": 1
}
```
若数据存在，`data`为`string`类型。若数据不存在，`data`为`null`。若`prefix`为`1`，`data`为对象或空数组类型。
若数据存在，`version`为`string`类型。若数据不存在，`data`为`null`。若`prefix`为`1`，`data`为对象或空数组类型。
不指定key时，`data`可能为`null`（该用户从未存储过键值对），空数组（该用户的所有键值对均被删除），或者包含所有键值对的对象。

发生错误时：
```json
{
    "success": false,
    "islogin": true,
    "errmsg": "xxxxxx"
}
```

带版本更新失败时，将给出当前的版本和内容：
```json
{
    "success": false,
    "islogin": true,
    "data": "xxx",
    "version": 1
}
```

---------------------------------------

## 把数据作为文件下载

### 下载单个键的内容

假设要下载的key为`1_public_tiger/viewerjs/dist.js`（公共访问键，`uid`：`1`，`key`：`public_tiger/viewerjs/dist.js`）：

https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js
https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js?mime=application/my-file-mime
https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js?filename=tiger.js

用以上URL，键的内容就可直接作为js、css等web资源载入页面。

加`?array=1`可以强制导出为JSON，可得到用于导入的文件：

https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js?array=1

### 获取版本

版本在`X-Data-Version`头信息里：
```
# curl -v 'https://hu60.cn/q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js' -H 'Cookie: hu60_sid=你的sid'
```
```
> GET /q.php/api.webplug-file/1_public_tiger/viewerjs/dist.js HTTP/2
> Host: hu60.cn
> user-agent: curl/7.68.0
> accept: */*
> cookie: hu60_sid=你的sid

< HTTP/2 200 
< server: Tengine
< date: Thu, 09 Jul 2020 17:12:47 GMT
< content-type: application/javascript
< content-length: 29
< referrer-policy: origin-when-cross-origin
< x-data-version: 1

console.log('hello webplug');
```

### 下载多个键的内容

多个键的内容仅能作为JSON下载，但可设置MIME和文件名。

https://hu60.cn/q.php/api.webplug-file/1_public_tiger?prefix=1
https://hu60.cn/q.php/api.webplug-file/1_public_tiger?prefix=1&filename=tiger.json
https://hu60.cn/q.php/api.webplug-file/1_public_tiger?prefix=1&mime=application/octet-stream

下载全部键的内容：
https://hu60.cn/q.php/api.webplug-file.json
https://hu60.cn/q.php/api.webplug-file.json?filename=tiger.json
https://hu60.cn/q.php/api.webplug-file.json?mime=application/octet-stream

此时`X-Data-Version`字段是对象：
```
# curl -v 'https://hu60.cn/q.php/api.webplug-file/1_public_tiger?prefix=1' -H 'Cookie: hu60_sid=你的sid'
```
```
> GET /q.php/api.webplug-file/1_public_tiger?prefix=1 HTTP/2
> Host: hu60.cn
> user-agent: curl/7.68.0
> accept: */*
> cookie: hu60_sid=你的sid

< HTTP/2 200 
< server: Tengine
< date: Thu, 09 Jul 2020 17:16:36 GMT
< content-type: application/json
< referrer-policy: origin-when-cross-origin
< x-data-version: {"public_tiger":1,"public_tiger-4":1,"public_tiger\/viewerjs\/dist.js":1,"public_tiger2":1,"public_tiger3":1}

{
    "public_tiger": "你好，这是公开内容",
    "public_tiger-4": "第四条公开内容",
    "public_tiger/viewerjs/dist.js": "console.log('hello webplug');",
    "public_tiger2": "这是第2条公开内容",
    "public_tiger3": "这是第3条公开内容"
}
```