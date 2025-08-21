


export let roomsJson = JSON.parse(FileLib.read("DungeonLogger", "utils/rooms.json"))

export const RoomMap = new Map(roomsJson.map(a => [a.roomID, a]))
export const RoomNameMap = new Map(roomsJson.map(a => [a.name, a]))

export const getHighestBlock = (x, z) => {
    for (let y = 255; y > 0; y--) {
        let id = World.getBlockAt(x, y, z)?.type?.getID()
        // Ignore gold blocks too because of Gold room with a random ass gold block on the roof sometimes.
        if (id == 0 || id == 41) continue
        return y
    }
    return null
}

/**
 * Checks if the chunk at the specified coordinate is loaded.
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 * @returns 
 */
export const chunkLoaded = (x, y, z) => {
    if (!World || !World.getWorld()) return false
    return World.getChunk(x, y, z).chunk.func_177410_o()
}

export const DoorTypes = {
    NORMAL: 0,
    WITHER: 1,
    BLOOD: 2,
    ENTRANCE: 3
}

export const RoomTypes = {
    NORMAL: 0,
    PUZZLE: 1,
    TRAP: 2,
    YELLOW: 3,
    BLOOD: 4,
    FAIRY: 5,
    RARE: 6,
    ENTRANCE: 7,
    UNKNOWN: 8
}

export const ClearTypes = {
    MOB: 0,
    MINIBOSS: 1
}

export const RoomTypesStrings = new Map([
    ["normal", RoomTypes.NORMAL],
    ["puzzle", RoomTypes.PUZZLE],
    ["trap", RoomTypes.TRAP],
    ["yellow", RoomTypes.YELLOW],
    ["blood", RoomTypes.BLOOD],
    ["fairy", RoomTypes.FAIRY],
    ["rare", RoomTypes.RARE],
    ["entrance", RoomTypes.ENTRANCE]
])

/**
 * 
 * @param {[Number, Number]} coord - Real world x, z coordinate
 * @param {Boolean} isIncludingDoors - Map the coordinates based on a 0-10 grid instead of 0-5
 */
export const realCoordToComponent = ([x, z], isIncludingDoors=false) => {
    const x0 = -200
    const z0 = -200
    
    const componentSize = isIncludingDoors ? 16 : 32

    return [
        Math.floor((x - x0 + 0.5) / componentSize),
        Math.floor((z - z0 + 0.5) / componentSize)
    ]
}

/**
 * 
 * @param {[Number, Number]} component 
 * @param {Boolean} isIncludingDoors - Map the coordinates based on a 0-10 grid instead of 0-5
 */
export const componentToRealCoords = ([x, z], isIncludingDoors=false) => {
    const x0 = -200
    const z0 = -200

    if (isIncludingDoors) return [
        x0 + 15 + 16 * x,
        z0 + 15 + 16 * z,
    ]
    return [
        x0 + 15 + 32 * x,
        z0 + 15 + 32 * z,
    ]
}

export const hashComponent = (component) => 6*component[1]+component[0]

export const hashDoorComponent = (component) => {
    let ind = (component[0]-1 >> 1) + 6*component[1]

    return ind - Math.floor(ind / 12)
}

/**
 * Appends a string to a new line in a file. If the file does not exist, the file is created.
 * @param {String} moduleName 
 * @param {String} filePath 
 * @param {String} toWrite 
 * @returns 
 */
export const appendToFile = (moduleName, filePath, toWrite) => {
    if (!FileLib.exists(moduleName, filePath)) {
        FileLib.write(moduleName, filePath, toWrite, true)
        return
    }

    FileLib.append(moduleName, filePath, `\n${toWrite}`)
}

const blacklisted = [
    101,    // Iron Bars
    54,     // Chest
]

export const hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) // From https://stackoverflow.com/a/15710692/15767968

export const getCore = (x, z) => {
    let blockIds = ""
    for (let y = 140; y >= 12; y--) {
        let block = World.getBlockAt(x, y, z)
        // Blacklisted blocks should just be counted as air.
        if (blacklisted.includes(block.type.getID())) {
            blockIds += "0"
            continue
        }

        blockIds += block.type.getID()
    }

    return hashCode(blockIds)
}

/**
 * Rotates a set of coordinates clockwise.
 * @param {[Number, Number, Number]} coordinates 
 * @param {Number} degree - Angle in 90 degree intervals 
 * @returns 
 */
export const rotateCoords = ([x, y, z], degree) => {
    if (degree < 0) degree = degree + 360

    if (degree == 0) return [x, y, z]
    if (degree == 90) return [z, y, -x]
    if (degree == 180) return [-x, y, -z]
    if (degree == 270) return [-z, y, x]
    return [x, y, z]
}