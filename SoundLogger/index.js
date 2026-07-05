const MODULE_NAME = "SoundLogger"
const CONFIG_PATH = "data/config.json"

const DEFAULT_CONFIG = {
  enabled: true,
  include: "", // substring match (case-insensitive). empty => include all
  exclude: "", // substring match (case-insensitive)
  showPosition: false,
  showCategory: true,
  showPitchVolume: true,
  throttleMs: 50, // minimum time between chat lines
  dedupeMs: 200, // suppress repeats of same sound name within this window
}

function nowMs() {
  return Date.now()
}

function readConfig() {
  try {
    if (!FileLib.exists(MODULE_NAME, CONFIG_PATH)) return Object.assign({}, DEFAULT_CONFIG)
    const raw = FileLib.read(MODULE_NAME, CONFIG_PATH)
    const parsed = JSON.parse(raw)
    return Object.assign({}, DEFAULT_CONFIG, (parsed || {}))
  } catch (e) {
    return Object.assign({}, DEFAULT_CONFIG)
  }
}

function writeConfig(cfg) {
  try {
    FileLib.write(MODULE_NAME, CONFIG_PATH, JSON.stringify(cfg, null, 2))
  } catch (e) {
    // ignore
  }
}

function norm(s) {
  return String(s || "").toLowerCase()
}

function fmtNumMaybe(n) {
  const v = Number(n)
  if (!isFinite(v)) return String(n)
  try {
    return v.toFixed(2)
  } catch (e) {
    return String(n)
  }
}

function asPosString(pos) {
  if (!pos) return null

  // common shapes: {x,y,z} / {field_...} / array-like / Vec3
  try {
    if (typeof pos.getX === "function" && typeof pos.getY === "function" && typeof pos.getZ === "function") {
      return `${Math.floor(pos.getX())},${Math.floor(pos.getY())},${Math.floor(pos.getZ())}`
    }
  } catch (e) {}

  try {
    if (typeof pos.x !== "undefined" && typeof pos.y !== "undefined" && typeof pos.z !== "undefined") {
      return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`
    }
  } catch (e) {}

  try {
    if (Array.isArray(pos) && pos.length >= 3) {
      return `${Math.floor(pos[0])},${Math.floor(pos[1])},${Math.floor(pos[2])}`
    }
  } catch (e) {}

  return null
}

function safeCall(obj, fnName) {
  try {
    if (obj && typeof obj[fnName] === "function") return obj[fnName]()
  } catch (e) {}
  return null
}

function stringifyId(x) {
  if (x === null || typeof x === "undefined") return null
  try {
    if (typeof x.toString === "function") return String(x.toString())
  } catch (e) {}
  try {
    return String(x)
  } catch (e) {
    return null
  }
}

function parseSoundArgs(args) {
  // Supports both legacy signature and modern "SoundInstance-like" objects.
  // Returns: { name, volume, pitch, type, pos, raw }
  if (!args) args = []

  // Modern: single object
  if (args.length === 1 && args[0] && typeof args[0] === "object") {
    const inst = args[0]

    // Try common getters (names vary by mapping/version)
    const vol = safeCall(inst, "getVolume") || safeCall(inst, "volume")
    const pit = safeCall(inst, "getPitch") || safeCall(inst, "pitch")

    // Category / source / type
    const type =
      stringifyId(safeCall(inst, "getCategory")) ||
      stringifyId(safeCall(inst, "getSource")) ||
      stringifyId(inst.category) ||
      stringifyId(inst.source) ||
      null

    // Sound id (many variants)
    let name =
      stringifyId(safeCall(inst, "getSound")) ||
      stringifyId(safeCall(inst, "getId")) ||
      stringifyId(inst.id) ||
      stringifyId(inst.sound) ||
      null

    // If getSound() returns a nested object, try deeper identifiers
    if (name && name.indexOf("[") !== -1) {
      const snd = safeCall(inst, "getSound")
      name =
        stringifyId(safeCall(snd, "getLocation")) ||
        stringifyId(safeCall(snd, "getId")) ||
        stringifyId(snd) ||
        name
    }

    const x = safeCall(inst, "getX") || inst.x
    const y = safeCall(inst, "getY") || inst.y
    const z = safeCall(inst, "getZ") || inst.z
    const pos = (typeof x !== "undefined" && typeof y !== "undefined" && typeof z !== "undefined") ? { x, y, z } : null

    return { name, volume: vol, pitch: pit, type, pos, raw: args }
  }

  // Legacy-ish: (pos, name, volume, pitch, category, ...)
  const pos = args[0]
  const name = args[1]
  const volume = args[2]
  const pitch = args[3]
  const type = args[4]

  return { name, volume, pitch, type, pos, raw: args }
}

let config = readConfig()
// Always enabled by default (and overrides old config disables).
config.enabled = true
writeConfig(config)
ChatLib.chat(`&b[SoundLogger]&r &aLoaded (enabled)&r`)

let lastChatAt = 0
let lastBySound = new Map() // name -> ms

function shouldLog(name) {
  const n = norm(name)
  if (!config.enabled) return false
  if (config.include && !n.includes(norm(config.include))) return false
  if (config.exclude && n.includes(norm(config.exclude))) return false
  return true
}

function tryLogLine(line, soundName) {
  const t = nowMs()

  if (config.throttleMs > 0 && t - lastChatAt < config.throttleMs) return
  lastChatAt = t

  if (soundName && config.dedupeMs > 0) {
    const key = String(soundName)
    const last = lastBySound.has(key) ? lastBySound.get(key) : 0
    if (t - last < config.dedupeMs) return
    lastBySound.set(key, t)
  }

  ChatLib.chat(line)
}

register("worldUnload", () => {
  lastBySound.clear()
})

// ChatTriggers exposes this trigger as SoundPlay (TriggerType) and "soundPlay" (string).
register("soundPlay", (...args) => {
  const parsed = parseSoundArgs(args)
  const pos = parsed.pos
  const name = parsed.name
  const volume = parsed.volume
  const pitch = parsed.pitch
  const type = parsed.type

  if (!shouldLog(name)) return

  const parts = []
  parts.push(`&b[Sound]&r &f${String(name || "unknown")}`)

  if (config.showPitchVolume) {
    if (typeof volume !== "undefined") parts.push(`&7vol:&r ${fmtNumMaybe(volume)}`)
    if (typeof pitch !== "undefined") parts.push(`&7pit:&r ${fmtNumMaybe(pitch)}`)
  }

  if (config.showCategory && typeof type !== "undefined" && type !== null) {
    parts.push(`&7type:&r ${String(type)}`)
  }

  if (config.showPosition) {
    const ps = asPosString(pos)
    if (ps) parts.push(`&7pos:&r ${ps}`)
  }

  // If CT ever changes argument order, still include a compact args dump when name is missing.
  if (!name && args.length) {
    parts.push(`&7args:&r ${args.map(a => String(a)).join(", ")}`)
  }

  tryLogLine(parts.join(" &8|&r "), name)
})
