# 多语言自动翻译组件(webpack loader)

## 环境

1. vue
2. i18n

## 用法

直接在源文件中写中文，组件会自动把中文部分替换成占位符，同时生成语言文件。
设置 autoS2T为true则自动生成繁体中文版本翻译
配置说明：
```
config.module.rules.push({
        test: /\.vue$/,
        exclude: [
          /node_modules/,
          /\.nuxt/,
          /examples\//
        ],
        loader: "i18n-cn-autotrans-loader",
        enforce: "pre",
        options: {
          hashLength: 8,
          writeFile: true,
          repeatFlag: "\\[R\\]",
          root: "locales",
          prefix: "",
          originalLang: "zh_Hans_CN", // 原语言名
          targetLangs: ["zh_Hant_HK", "en_US"], // 目标语言，如有zh_Hant_HK则会自动生成繁体翻译
          deprecatedMark:'****DEPRECATED****', // 对一些旧的翻译进行标记
          cacheTime: 5000
        }
      });
```
第一次升级的时候注意先停掉正在运行的服务，不然容易因为热加载导致文件出错 
## 支持的语法

1. 属性

```html
<b-modal v-model="alertPriceVisible" title="价格警告" :hide-footer="true">
```

2. 模板引擎

```html
<template v-if="(!isBuy)&&!limited">
  <p class="market-price">以当前买盘挂单价格依次卖出</p>
  <div class="input-box total">
    <span class="label">卖出量{{this.dest}}</span>
    <input type="text" min="0" step="any" v-model="amount" @focus="focusElem='amount';amountErrorText='';" @change="amountErrorText=''"
      @blur="focusElem='';validateAmount()">
  </div>
</template>
```

3. 代码中的中文

```javascript
this.alertMsg = "您的卖出价（" + this.inputPrice + "）低于最新成交价（" + this.marketItem.price + "）的  " + this.alertPercent +
              "，请确认是否以该价格卖出。"
```


## 不支持的语法

1. 中文中包含 <> {} 等符号

```html
//下面这种写法不支持
<span>{{"{coinType}充值".replace("coinType", coinType)}}</span>
//应改为
<span>{{"[coinType]充值".replace("coinType", coinType)}}</span>
```