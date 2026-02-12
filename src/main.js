import './style.css'

const GRID_SIZE = 24
const CELL_SIZE = 20
const BOARD_SIZE = GRID_SIZE * CELL_SIZE
const BASE_STEP_MS = 165
const MIN_STEP_MS = 70
const SPEED_STEP = 7
const SCORE_PER_LEVEL = 4

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')

const scoreEl = document.querySelector('#score')
const highScoreEl = document.querySelector('#high-score')
const levelEl = document.querySelector('#level')
const overlayEl = document.querySelector('#overlay')
const startBtn = document.querySelector('#start-btn')
const soundBtn = document.querySelector('#sound-btn')

const dpadButtons = Array.from(document.querySelectorAll('[data-dir]'))

canvas.width = BOARD_SIZE
canvas.height = BOARD_SIZE

const VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITES = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const STORAGE_KEY = 'phosphor-pit-snake-high-score'

let snake = []
let fruit = { x: 0, y: 0 }
let direction = 'right'
let pendingDirection = 'right'
let score = 0
let highScore = Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
let running = false
let gameOver = false

let lastFrameTime = 0
let stepAccumulator = 0

let soundOn = true
let audioContext

function levelFromScore(currentScore) {
  return 1 + Math.floor(currentScore / SCORE_PER_LEVEL)
}

function stepInterval() {
  const decrease = Math.floor(score / SCORE_PER_LEVEL) * SPEED_STEP
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - decrease)
}

function setOverlay(message, visible = true) {
  overlayEl.innerHTML = message
  overlayEl.classList.toggle('hidden', !visible)
}

function updateHud() {
  scoreEl.textContent = String(score)
  highScoreEl.textContent = String(highScore)
  levelEl.textContent = String(levelFromScore(score))
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  }
}

function cellIsSnake(cell) {
  return snake.some((segment) => segment.x === cell.x && segment.y === cell.y)
}

function spawnFruit() {
  let candidate = randomCell()
  while (cellIsSnake(candidate)) {
    candidate = randomCell()
  }
  fruit = candidate
}

function resetGame() {
  const mid = Math.floor(GRID_SIZE / 2)

  snake = [
    { x: mid - 2, y: mid },
    { x: mid - 1, y: mid },
    { x: mid, y: mid },
  ]

  direction = 'right'
  pendingDirection = 'right'
  score = 0
  gameOver = false
  running = true
  stepAccumulator = 0

  spawnFruit()
  updateHud()
  setOverlay('')
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    audioContext = new AudioCtx()
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }

  return audioContext
}

function playTone({ frequency = 440, duration = 0.08, gain = 0.08, type = 'square' }) {
  if (!soundOn) return
  const ctxAudio = ensureAudio()
  if (!ctxAudio) return

  const now = ctxAudio.currentTime
  const oscillator = ctxAudio.createOscillator()
  const envelope = ctxAudio.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(envelope)
  envelope.connect(ctxAudio.destination)

  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

function sfxEat() {
  playTone({ frequency: 610, duration: 0.06, gain: 0.08, type: 'square' })
  setTimeout(() => playTone({ frequency: 780, duration: 0.05, gain: 0.07, type: 'triangle' }), 36)
}

function sfxGameOver() {
  playTone({ frequency: 220, duration: 0.18, gain: 0.1, type: 'sawtooth' })
  setTimeout(() => playTone({ frequency: 140, duration: 0.22, gain: 0.08, type: 'triangle' }), 70)
}

function setDirection(nextDir) {
  if (!running && !gameOver) return
  if (OPPOSITES[direction] === nextDir) return
  pendingDirection = nextDir
}

function outOfBounds(head) {
  return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE
}

function collidesWithBody(head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y)
}

function endGame() {
  running = false
  gameOver = true

  if (score > highScore) {
    highScore = score
    localStorage.setItem(STORAGE_KEY, String(highScore))
  }

  updateHud()
  sfxGameOver()

  setOverlay(
    `<span class="overlay-label">SYSTEM FAIL</span><strong>${score} PTS</strong><p>Press START or SPACE to run it back.</p>`
  )
}

function step() {
  direction = pendingDirection

  const head = snake[snake.length - 1]
  const nextHead = {
    x: head.x + VECTORS[direction].x,
    y: head.y + VECTORS[direction].y,
  }

  if (outOfBounds(nextHead) || collidesWithBody(nextHead)) {
    endGame()
    return
  }

  snake.push(nextHead)

  const ateFruit = nextHead.x === fruit.x && nextHead.y === fruit.y

  if (ateFruit) {
    score += 1
    if (score > highScore) {
      highScore = score
      localStorage.setItem(STORAGE_KEY, String(highScore))
    }
    spawnFruit()
    sfxEat()
  } else {
    snake.shift()
  }

  updateHud()
}

function drawGrid() {
  ctx.save()
  ctx.strokeStyle = 'rgba(58, 194, 136, 0.12)'
  ctx.lineWidth = 1

  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const pos = i * CELL_SIZE + 0.5

    ctx.beginPath()
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, BOARD_SIZE)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, pos)
    ctx.lineTo(BOARD_SIZE, pos)
    ctx.stroke()
  }

  ctx.restore()
}

function drawFruit(frameTick) {
  const pulse = 0.84 + Math.sin(frameTick / 140) * 0.13
  const size = CELL_SIZE * pulse
  const offset = (CELL_SIZE - size) / 2

  const x = fruit.x * CELL_SIZE + offset
  const y = fruit.y * CELL_SIZE + offset

  ctx.save()
  ctx.shadowBlur = 18
  ctx.shadowColor = 'rgba(255, 132, 40, 0.9)'
  ctx.fillStyle = '#ff8e2f'
  ctx.fillRect(x, y, size, size)

  ctx.fillStyle = 'rgba(255, 238, 204, 0.65)'
  ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.26, size * 0.26)
  ctx.restore()
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const isHead = index === snake.length - 1
    const x = segment.x * CELL_SIZE
    const y = segment.y * CELL_SIZE

    ctx.save()
    ctx.shadowBlur = isHead ? 22 : 12
    ctx.shadowColor = isHead ? 'rgba(175, 255, 122, 0.9)' : 'rgba(100, 231, 150, 0.7)'

    ctx.fillStyle = isHead ? '#b4ff79' : '#59d17f'
    ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2)

    ctx.fillStyle = isHead ? '#172413' : 'rgba(22, 33, 24, 0.5)'
    const eyeSize = 3

    if (direction === 'left' || direction === 'right') {
      const eyeX = direction === 'right' ? x + CELL_SIZE - 7 : x + 4
      ctx.fillRect(eyeX, y + 6, eyeSize, eyeSize)
      ctx.fillRect(eyeX, y + CELL_SIZE - 9, eyeSize, eyeSize)
    } else {
      const eyeY = direction === 'down' ? y + CELL_SIZE - 7 : y + 4
      ctx.fillRect(x + 6, eyeY, eyeSize, eyeSize)
      ctx.fillRect(x + CELL_SIZE - 9, eyeY, eyeSize, eyeSize)
    }

    ctx.restore()
  })
}

function drawFrame(timeStamp) {
  ctx.fillStyle = '#060b08'
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE)

  drawGrid()
  drawFruit(timeStamp)
  drawSnake()

  if (!running && !gameOver) {
    setOverlay(
      `<span class="overlay-label">INSERT CREDIT</span><strong>PHOSPHOR PIT SNAKE</strong><p>Press START to begin.</p>`
    )
  }
}

function gameLoop(timeStamp) {
  if (!lastFrameTime) {
    lastFrameTime = timeStamp
  }

  const delta = timeStamp - lastFrameTime
  lastFrameTime = timeStamp

  if (running) {
    stepAccumulator += delta
    const currentStepMs = stepInterval()

    while (stepAccumulator >= currentStepMs) {
      step()
      stepAccumulator -= currentStepMs
      if (!running) break
    }
  }

  drawFrame(timeStamp)
  window.requestAnimationFrame(gameLoop)
}

function startGame() {
  ensureAudio()
  resetGame()
}

function toggleSound() {
  soundOn = !soundOn
  soundBtn.textContent = soundOn ? 'SOUND: ON' : 'SOUND: OFF'
  soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false')

  if (soundOn) {
    playTone({ frequency: 520, duration: 0.05, gain: 0.06, type: 'triangle' })
  }
}

function handleDirectionInput(dir) {
  if (!running && gameOver) {
    resetGame()
  }
  setDirection(dir)
}

startBtn.addEventListener('click', startGame)
soundBtn.addEventListener('click', toggleSound)
canvas.addEventListener('click', () => {
  if (!running) startGame()
})

dpadButtons.forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    const { dir } = button.dataset
    if (dir) {
      ensureAudio()
      handleDirectionInput(dir)
    }
  })
})

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()

  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'enter'].includes(key)) {
    event.preventDefault()
  }

  if (key === ' ' || key === 'enter') {
    if (!running || gameOver) {
      startGame()
    }
    return
  }

  if (key === 'arrowup' || key === 'w') handleDirectionInput('up')
  if (key === 'arrowdown' || key === 's') handleDirectionInput('down')
  if (key === 'arrowleft' || key === 'a') handleDirectionInput('left')
  if (key === 'arrowright' || key === 'd') handleDirectionInput('right')
})

window.addEventListener(
  'pointerdown',
  () => {
    ensureAudio()
  },
  { once: true }
)

updateHud()
drawFrame(0)
window.requestAnimationFrame(gameLoop)
