# 译鸣惊人 / DubBoom

社区先把资助锁在 Monad 上，再让 AI 把视频配成另一种语言的可播放成片。

这是 [Monad Blitz 广州](https://luma.com/blitz-guangzhou-nov-2026)（2026 年 11 月 21 日）当天新建的参赛仓库。我们把已有的视频翻译能力，做成一个能在测试网实时结清的社区资助流程：资助、交稿、验收打款都可以在链上查到。

> 现有视频翻译产品的仓库代码没有复制进本仓库。翻译生成继续使用已经跑通的后端服务；本仓库只包含智能合约、公开演示前端和说明文档。

## 现场演示

- 公开前端：[https://moose-lab.github.io/dubboom/](https://moose-lab.github.io/dubboom/)
- 仓库：[https://github.com/moose-lab/dubboom](https://github.com/moose-lab/dubboom)

打开页面后：连接 Monad 测试网钱包 → 播放英文原片 → 用测试 MON 资助翻译 → 查看链上交易 → 播放中文版。如果连接的是 operator 钱包，还可以点「验收并打款」，把锁定的资助转给翻译服务方。

## 已部署合约（Monad Testnet）

| 合约 | 地址 |
| --- | --- |
| TranslationFund | [`0x6343582628A4C4FFfd83A986B1034f3E41944E17`](https://testnet.monadvision.com/address/0x6343582628A4C4FFfd83A986B1034f3E41944E17) |

- 部署交易：https://testnet.monadvision.com/tx/0x76615c2c51bd256260af855aab0a95f5251cb00a8d07508d3329570f3fd3e133
- 部署钱包 / operator：`0x2772500E61Ec42bf3bD907f8E18E2f52b35AdE20`
- Chain ID：`10143`
- RPC：`https://testnet-rpc.monad.xyz`
- 区块浏览器：https://testnet.monadvision.com
- 水龙头：https://faucet.monad.xyz

合约在黑客松当天部署到 Monad 测试网，满足「活动期间上链」的常见提交要求。广州站提交页为 [mojo.devnads.com/events/18](https://mojo.devnads.com/events/18)，截止时间为当天 18:30（北京时间）。

## 它解决什么问题

视频翻译真正要交付的，不只是字幕，而是：**原片里的人，用另一种语言把话说出来**，并尽量保留音色、背景声和时间轴。

但谁来为一次翻译付费、付了之后能否公开查到，普通支付链路说不清楚。DubBoom 把「为这段视频锁一笔资助」放到 Monad 上：资金先锁定，翻译完成后打给服务方；未完成则资助人可以退款。

## 怎么工作

1. 资助人选择一段视频和目标语言（演示为英→中），调用 `fund(videoHash, targetLanguage)` 并支付测试 MON。合约锁定这笔资助，并记录视频哈希。
2. 链下翻译服务生成中文配音成片。演示页为了三分钟内听完效果，使用已经跑通的英→中样片；资助交易本身是刚刚在测试网确认的。
3. 翻译服务方（operator）调用 `complete(id, resultUri)`，合约把锁定金额打给服务方，并记下结果地址。
4. 若尚未完成，资助人可调用 `refund(id)` 退回资金。

`videoHash` 是视频标识的 keccak256，链上只存凭证和结算，不存储视频文件。

## 为什么用 Monad

翻译资助是小额、需要马上确认的结算。慢链或高手续费不适合在现场连续提交和展示。Monad 是并行 EVM L1，测试网可以低费用、快速确认这类交易，评委也能立刻在浏览器里看到结果。

本项目不是「给现有翻译网站加一个钱包收款按钮」。去掉链上锁定和公开结算，社区资助这条路径就不成立。

## 合约方法

`src/TranslationFund.sol`

- `fund(bytes32 videoHash, string targetLanguage)` payable：锁定资助
- `complete(uint256 id, string resultUri)`：仅 operator，标记完成并打款
- `refund(uint256 id)`：尚未完成时，仅资助人可退款
- `setOperator(address)`：仅当前 operator 可更换服务方地址

## 本地开发

智能合约需要 [Foundry](https://book.getfoundry.sh/)（已在 `foundry.toml` 中配置 Monad 测试网）：

```bash
git clone https://github.com/moose-lab/dubboom.git
cd dubboom
forge install foundry-rs/forge-std
forge test
```

本地打开前端：

```bash
cd docs
python3 -m http.server 5173
```

浏览器访问 `http://localhost:5173`。请使用带钱包的浏览器，并添加 Monad Testnet。演示和提交请使用上面的公开页面，不要提交 localhost。

重新部署合约（通常不必，当天地址已写在本 README）：

```bash
forge script script/Deploy.s.sol:DeployTranslationFund --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

## 技术栈

- 智能合约：Solidity 0.8.24、Foundry，已部署到 Monad Testnet
- 公开前端：原生 HTML / CSS / JavaScript，ethers.js v6，托管于 GitHub Pages
- 翻译后端：复用已有视频翻译服务（主攻英→中配音翻译），不在本仓库内重写

## 诚实边界

- 这是 Monad 测试网演示，使用测试 MON，不收真实资金，也不构成商用上线。
- 当前验证充分的方向是 **英→中**。中→英和其他语言不要在演示里说成已经跑通。
- 现有管线里的音色克隆模型权重存在非商用许可限制，因此本场只做技术演示。
- 演示素材必须是团队拥有或已获授权的内容。完整配音管线的生成时间可能长于三分钟路演，所以页面会明确区分「刚刚上链的资助」和「已跑通的样片效果」。

## 队伍

- 队名：译鸣惊人 / DubBoom
- 产品与路演：李命好（Kai Su）

## License

MIT
