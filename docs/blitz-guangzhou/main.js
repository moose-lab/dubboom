const waveforms = {"en": [60, 82, 94, 83, 93, 87, 79, 81, 54, 56, 71, 45, 75, 82, 38, 83, 86, 84, 77, 31, 76, 79, 68, 56, 81, 64, 12, 9, 66, 79, 83, 69, 83, 70, 75, 58, 83, 43, 61, 79, 96, 75, 78, 62, 92, 76, 30, 81, 76, 45, 9, 79, 78, 66, 92, 64, 55, 86, 69, 66, 62, 88, 72, 75, 44, 58, 86, 74, 60, 88, 87, 52], "zh": [44, 75, 79, 59, 93, 89, 68, 88, 90, 85, 82, 87, 92, 90, 74, 74, 81, 75, 71, 86, 65, 81, 96, 51, 74, 78, 90, 69, 67, 9, 61, 91, 81, 71, 87, 81, 87, 90, 70, 77, 78, 88, 74, 92, 88, 75, 57, 9, 35, 90, 84, 57, 90, 64, 89, 92, 84, 74, 89, 90, 68, 89, 90, 54, 10, 76, 83, 74, 82, 80, 75, 68]};
const audio = document.querySelector('#audio');
audio.src = samples.en;
const seek = document.querySelector('#seek');
const bars = document.querySelector('#bars');
const timer = document.querySelector('#timer');
const playBtn = document.querySelector('#playBtn');
const playIcon = document.querySelector('#playIcon');
const audioStatus = document.querySelector('#audioStatus');
const languageButtons = document.querySelectorAll('[data-lang]');
const languageNames = { en: '英语', zh: '中文' };
const expectedDurations = { en: 11.26, zh: 8.91 };
let language = 'en';

function renderWaveform() {
  const elements = waveforms[language].map(height => {
    const bar = document.createElement('i');
    bar.style.height = height + '%';
    return bar;
  });
  bars.replaceChildren(...elements);
}
function timestamp(seconds) {
  const total = Math.floor(seconds);
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}
function renderProgress() {
  const length = Number.isFinite(audio.duration) ? audio.duration : expectedDurations[language];
  const fraction = Math.min(1, audio.currentTime / length);
  timer.textContent = timestamp(audio.currentTime) + ' / ' + timestamp(length);
  seek.value = Math.round(fraction * Number(seek.max));
  seek.setAttribute('aria-valuetext', timer.textContent);
  Array.from(bars.children).forEach((bar, i, collection) => {
    bar.classList.toggle('done', i < fraction * collection.length);
  });
}
function renderPlayState() {
  const playing = !audio.paused && !audio.ended;
  playIcon.setAttribute('href', playing ? '#pause' : '#play');
  playBtn.setAttribute('aria-label', (playing ? '暂停' : '播放') + languageNames[language] + '讲解');
}
async function playTrack() {
  audioStatus.hidden = true;
  try {
    await audio.play();
  } catch (error) {
    if (error.name === 'AbortError') return;
    audioStatus.textContent = '无法播放这段讲解，请重新点击播放。';
    audioStatus.hidden = false;
    renderPlayState();
  }
}
playBtn.addEventListener('click', () => {
  if (audio.paused) playTrack();
  else audio.pause();
});
languageButtons.forEach(button => button.addEventListener('click', () => {
  if (language === button.dataset.lang) return;
  const resume = !audio.paused;
  audio.pause();
  language = button.dataset.lang;
  languageButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  audio.src = samples[language];
  audio.load();
  audioStatus.hidden = true;
  renderWaveform();
  renderProgress();
  renderPlayState();
  if (resume) playTrack();
}));
seek.addEventListener('input', () => {
  if (Number.isFinite(audio.duration)) {
    audio.currentTime = Number(seek.value) / Number(seek.max) * audio.duration;
    renderProgress();
  }
});
['timeupdate','loadedmetadata','durationchange'].forEach(event => audio.addEventListener(event, renderProgress));
['play','pause','ended'].forEach(event => audio.addEventListener(event, renderPlayState));
renderWaveform();
renderProgress();

const methods = {
  fund: ['fund(bytes32 videoHash, string targetLanguage)', '资助人随调用转入测试 MON。合约保存视频标识和目标语言，生成独立的请求编号。'],
  complete: ['complete(uint256 id, string resultUri)', '指定服务方（operator）登记成片链接，合约把这笔锁定的资助转给服务方，状态更新为 Completed。'],
  refund: ['refund(uint256 id)', '请求仍处于 Funded 状态时，原资助人可以调用此方法。合约退回该笔资助，并记录 Refunded 事件。']
};
const methodButtons = document.querySelectorAll('[data-method]');
methodButtons.forEach(button => button.addEventListener('click', () => {
  const [signature, description] = methods[button.dataset.method];
  document.querySelector('#signature').textContent = signature;
  document.querySelector('#methodDesc').textContent = description;
  methodButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));

const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
function setMenu(open) {
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '收起导航' : '展开导航');
}
menu.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    setMenu(false);
    menu.focus();
  }
});
