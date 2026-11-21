const CONFIG = {
  chainId: 10143,
  chainIdHex: "0x279f",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadvision.com",
  contract: "0x6343582628A4C4FFfd83A986B1034f3E41944E17",
  videoId: "dubboom-demo-en-zh-2026-11-21",
  language: "zh",
  samples: {
    en: "./samples/en.mp4",
    zh: "./samples/zh.mp4",
  },
};

const SCRIPT = {
  en: {
    kicker: "EN · 原片",
    lang: "en-US",
    lines: [
      "A good video shouldn’t lose its audience just because of language.",
      "This is a product walkthrough.",
      "I want people everywhere to hear it in their own language.",
    ],
  },
  zh: {
    kicker: "ZH · 中文译制版",
    lang: "zh-CN",
    lines: [
      "一个好视频，不该因为语言不同就没人看懂。",
      "这是一段产品讲解。",
      "我希望不同地方的人，都能用自己的语言听完。",
    ],
  },
};

const els = {
  connectBtn: document.getElementById("connectBtn"),
  walletMeta: document.getElementById("walletMeta"),
  fundBtn: document.getElementById("fundBtn"),
  completeBtn: document.getElementById("completeBtn"),
  amount: document.getElementById("amount"),
  status: document.getElementById("status"),
  playBtn: document.getElementById("playBtn"),
  tabEn: document.getElementById("tabEn"),
  tabZh: document.getElementById("tabZh"),
  visual: document.getElementById("visual"),
  visualLine: document.getElementById("visualLine"),
  visualKicker: document.getElementById("visualKicker"),
  wave: document.getElementById("wave"),
  filePlayer: document.getElementById("filePlayer"),
};

let provider;
let signer;
let contract;
let account;
let operator;
let requestId = null;
let currentLang = "en";
let speaking = false;
let hasFile = { en: false, zh: false };

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = "status" + (kind ? " " + kind : "");
}

function shortAddr(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function explorerTx(hash) {
  return `${CONFIG.explorer}/tx/${hash}`;
}

async function probeSamples() {
  for (const lang of ["en", "zh"]) {
    try {
      const res = await fetch(CONFIG.samples[lang], { method: "HEAD" });
      hasFile[lang] = res.ok;
    } catch {
      hasFile[lang] = false;
    }
  }
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  speaking = false;
  els.wave.classList.remove("playing");
  els.playBtn.textContent = "播放";
}

function showLang(lang) {
  currentLang = lang;
  els.tabEn.setAttribute("aria-pressed", String(lang === "en"));
  els.tabZh.setAttribute("aria-pressed", String(lang === "zh"));
  const script = SCRIPT[lang];
  els.visualKicker.textContent = script.kicker;
  els.visualLine.textContent = script.lines[0];
  if (hasFile[lang]) {
    els.filePlayer.hidden = false;
    els.visual.hidden = true;
    els.filePlayer.src = CONFIG.samples[lang];
  } else {
    els.filePlayer.pause();
    els.filePlayer.hidden = true;
    els.visual.hidden = false;
  }
}

async function playCurrent() {
  if (hasFile[currentLang]) {
    if (!els.filePlayer.paused) {
      els.filePlayer.pause();
      els.playBtn.textContent = "播放";
      return;
    }
    await els.filePlayer.play();
    els.playBtn.textContent = "暂停";
    els.filePlayer.onended = () => {
      els.playBtn.textContent = "播放";
    };
    return;
  }

  if (!window.speechSynthesis) {
    setStatus("当前浏览器不支持语音播放，请直接讲解画面中的台词。", "err");
    return;
  }
  if (speaking) {
    stopSpeech();
    return;
  }

  const script = SCRIPT[currentLang];
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang.toLowerCase().startsWith(script.lang.toLowerCase().slice(0, 2))) ||
    null;
  let index = 0;
  speaking = true;
  els.wave.classList.add("playing");
  els.playBtn.textContent = "停止";

  const next = () => {
    if (!speaking || index >= script.lines.length) {
      stopSpeech();
      return;
    }
    const utter = new SpeechSynthesisUtterance(script.lines[index]);
    utter.lang = script.lang;
    if (voice) utter.voice = voice;
    utter.rate = currentLang === "zh" ? 1 : 0.98;
    els.visualLine.textContent = script.lines[index];
    utter.onend = () => {
      index += 1;
      next();
    };
    utter.onerror = () => stopSpeech();
    window.speechSynthesis.speak(utter);
  };
  next();
}

async function ensureChain() {
  const eth = window.ethereum;
  if (!eth) throw new Error("请先安装或打开支持的浏览器钱包");
  const current = await eth.request({ method: "eth_chainId" });
  if (current === CONFIG.chainIdHex) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.chainIdHex }],
    });
  } catch (err) {
    if (err.code === 4902 || (err.data && err.data.originalError && err.data.originalError.code === 4902)) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CONFIG.chainIdHex,
            chainName: "Monad Testnet",
            nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
            rpcUrls: [CONFIG.rpcUrl],
            blockExplorerUrls: [CONFIG.explorer],
          },
        ],
      });
      return;
    }
    throw err;
  }
}

async function connect() {
  if (!window.ethereum) {
    setStatus("没有检测到钱包。请用 MetaMask 等钱包打开这个页面。", "err");
    return;
  }
  await ensureChain();
  provider = new ethers.BrowserProvider(window.ethereum, CONFIG.chainId);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  contract = new ethers.Contract(CONFIG.contract, window.TRANSLATION_FUND_ABI, signer);
  operator = await contract.operator();
  const bal = await provider.getBalance(account);
  els.walletMeta.textContent = `${shortAddr(account)} · ${Number(ethers.formatEther(bal)).toFixed(3)} MON`;
  els.connectBtn.textContent = "已连接";
  els.completeBtn.hidden = account.toLowerCase() !== operator.toLowerCase();
  setStatus("钱包已连接到 Monad 测试网。可以锁定资助了。", "ok");
}

async function fund() {
  try {
    if (!contract) await connect();
    await ensureChain();
    const amount = els.amount.value;
    if (!amount || Number(amount) <= 0) {
      setStatus("请输入大于 0 的资助金额。", "err");
      return;
    }
    const videoHash = ethers.id(CONFIG.videoId);
    setStatus("请在钱包中确认交易…");
    const tx = await contract.fund(videoHash, CONFIG.language, {
      value: ethers.parseEther(String(amount)),
    });
    setStatus("交易已提交，正在等待确认… " + tx.hash);
    const receipt = await tx.wait();
    requestId = await contract.nextId().then((v) => v - 1n);
    const url = explorerTx(receipt.hash);
    setStatus(`资助已锁定。编号 #${requestId}。查看交易：${url}`, "ok");
    els.status.innerHTML = `资助已锁定。编号 #${requestId}。<a href="${url}" target="_blank" rel="noreferrer">查看交易</a>`;
    els.status.className = "status ok";
    showLang("zh");
  } catch (err) {
    console.error(err);
    setStatus(err.shortMessage || err.message || "资助失败", "err");
  }
}

async function complete() {
  try {
    if (!contract) await connect();
    if (requestId === null) {
      const next = await contract.nextId();
      if (next === 0n) {
        setStatus("还没有可验收的资助。", "err");
        return;
      }
      requestId = next - 1n;
    }
    setStatus("请在钱包中确认验收打款…");
    const tx = await contract.complete(requestId, "demo://dubboom-zh-2026-11-21");
    const receipt = await tx.wait();
    const url = explorerTx(receipt.hash);
    els.status.innerHTML = `验收完成，资助已打给翻译服务方。<a href="${url}" target="_blank" rel="noreferrer">查看交易</a>`;
    els.status.className = "status ok";
  } catch (err) {
    console.error(err);
    setStatus(err.shortMessage || err.message || "验收失败", "err");
  }
}

els.connectBtn.addEventListener("click", () => connect().catch((err) => setStatus(err.message, "err")));
els.fundBtn.addEventListener("click", () => fund());
els.completeBtn.addEventListener("click", () => complete());
els.playBtn.addEventListener("click", () => playCurrent());
els.tabEn.addEventListener("click", () => {
  stopSpeech();
  showLang("en");
});
els.tabZh.addEventListener("click", () => {
  stopSpeech();
  showLang("zh");
});
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => connect().catch(() => {}));
  window.ethereum.on("chainChanged", () => window.location.reload());
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

probeSamples().then(() => showLang("en"));
showLang("en");
