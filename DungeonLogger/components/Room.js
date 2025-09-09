import { chunkLoaded, ClearTypes, rotateCoords } from "../utils/utils"
import { roomsJson } from "../utils/utils"
import { getCore, RoomTypesStrings, RoomMap, getHighestBlock, componentToRealCoords, RoomTypes } from "../utils/utils"

const offsets = [
    [-15, -15],
    [15, -15],
    [15, 15],
    [-15, 15]
]

export default class Room {
    constructor(components=[], roofHeight=null) {

        this.name = null
        this.type = RoomTypes.UNKNOWN
        this.secrets = 0
        this.cores = []
        this.roomID = null
        this.clearType = null
        this.crypts = 0

        this.foundSecrets = null

        this.shape = "1x1"
        this.rotation = null
        this.corner = null

        this.roofHeight = roofHeight

        this.highlighted = false
        
        this.explored = false
        this.hasMimic = false

        // Rendering stuff
        this.width = 0
        this.height = 0
        this.center = [0, 0] // RoomTypes name is drawn here
        this.checkmarkCenter = [0, 0]

        /** @type {Room} */
        this.parent = null
        /** @type {Room[]} */
        this.children = []
        /** @type {Door[]} */
        this.doors = []

        this.components = []

        this.addComponents(components)

        this.doors = []
    }

    getRealComponents() {
        return this.components.map(a => componentToRealCoords(a, false))
    }

    scanAndLoad() {
        for (let c of this.getRealComponents()) {
            let [x, z] = c
            if (!this.roofHeight) this.roofHeight = getHighestBlock(x, z)
            let core = getCore(x, z)
            if (!this.loadRoomFromCore(core)) continue

            return
        }
    }

    loadFromData(roomData) {
        this.name = roomData.name
        this.type = RoomTypesStrings.get(roomData.type) ?? RoomTypes.NORMAL
        this.secrets = roomData.secrets
        this.cores = roomData.cores
        this.roomID = roomData.roomID
        this.clear = roomData.clear == "mob" ? ClearTypes.MOB : ClearTypes.MINIBOSS
        this.crypts = roomData.crypts ?? 0
    }

    loadFromRoomId(roomID) {
        const roomData = RoomMap.get(roomID)

        if (!roomData) {
            return false
        }

        this.loadFromData(roomData)

        return true
    }

    loadRoomFromCore(core) {
        for (let roomData of roomsJson) {
            if (!roomData.cores.includes(core)) {
                continue
            }

            this.loadFromData(roomData)

            return true
        }
        return false
    }

    findRotation() {
        if (!this.roofHeight) {
            return
        }

        const realComponents = this.getRealComponents()

        if (this.type == RoomTypes.FAIRY) {
            this.rotation = 0
            let [x, z] = realComponents[0]
            this.corner = [x-15+0.5, this.roofHeight, z-15+0.5]
            return
        }

        for (let c of realComponents) {
            let [x, z] = c
            for (let i = 0; i < offsets.length; i++) {
                let [dx, dz] = offsets[i]
                let [nx, nz] = [x+dx, z+dz]

                if (!chunkLoaded(nx, this.roofHeight, nz)) {
                    return
                }
                
                let block = World.getBlockAt(nx, this.roofHeight, nz)

                if (block.type.getID() !== 159 || block.getMetadata() !== 11) {
                    continue
                }

                this.rotation = i*90
                this.corner = [nx+0.5, this.roofHeight, nz+0.5]
                return
            }
        }
    }

    /**
     * 
     * @param {[Number, Number]} component 
     */
    hasComponent([x, z]) {
        for (let c of this.components) {
            if (c[0] == x && c[1] == z) {
                return true
            }
        }
        return false
    }

    updateComponents() {
        // Sort components so the top left on the map is always first
        // this.components.sort((a, b) => hashComponent(a) - hashComponent(b))
        this.components.sort((a, b) => a[1] - b[1]).sort((a, b) => a[0] - b[0])
        // this.realComponents = this.components.map(a => componentToRealCoords(a, false))
        this.scanAndLoad()

        this.corner = null
        this.rotation = null
    }

    addComponent(component, doProcessing=true) {
        let [x, z] = component
        // ChatLib.chat(`Adding component ${x} ${z}`)
        if (this.hasComponent([x, z])) return this

        this.components.push([x, z])
        
        if (doProcessing) {
            this.updateComponents()
        }

        return this
    }
    
    addComponents(components) {
        for (let i = 0; i < components.length; i++) {
            this.addComponent(components[i], false)
        }

        this.updateComponents()

        return this
    }

    merge(room) {
        
        room.components.forEach(c => this.addComponent(c))

        // If the merging room is already loaded then load it
        for (let core of room.cores) {
            if (this.loadRoomFromCore(core)) break
        }

        // If not loaded
        if (this.type == RoomTypes.UNKNOWN) this.scanAndLoad()

    }

    /**
     * 
     * @returns {Room[]}
     */
    getAdjacentRooms() {
        let adjacent = []
        for (let door of this.doors) {
            if (door.childRoom == this) adjacent.push(door.parentRoom)
            else if (door.parentRoom == this) adjacent.push(door.childRoom)
        }
        return adjacent
    }
    /**
     * Checks whether the entire room is within render distance
     * @returns {Boolean}
     */
    isWithinRender() {
        for (let c of this.getRealComponents()) {
            let [x, z] = c
            for (let i = 0; i < offsets.length; i++) {
                let [dx, dz] = offsets[i]
                let [nx, nz] = [x+dx, z+dz]
                if (!chunkLoaded(nx, this.roofHeight, nz)) return false
            }
        }
        return true
    }

    /**
     * Gets the name of this room with formatting codes.
     * @param {Boolean} formatted 
     */
    getName() {
        return this.name
    }

    getRoomScore() {
        if (this.roomID == null) {
            return Infinity
        }

        const roomData = RoomMap.get(this.roomID)
        
        if ("roomScore" in roomData) {
            return roomData.roomScore
        }

        if ("secretScore" in roomData && "clearScore" in roomData) {
            return roomData.secretScore/2 + roomData.clearScore/2
        }
    }

    toString() {
        return `Room[&ename=&6${this.getName(true)}&f, &7components=${JSON.stringify(this.components)}&f, &2explored=${this.explored}&f]`
    }

    /**
     * Converts coordinates from the real world into relative, rotated room coordinates
     * @param {[Number, Number, Number]} coord 
     * @returns 
     */
    getRoomCoord(coord, ints=false) {
        if (this.rotation == null || !this.corner) return

        const cornerCoord = ints ? this.corner.map(Math.floor) : this.corner
        const roomCoord = rotateCoords(coord.map((v, i) => v - cornerCoord[i]), this.rotation)

        if (ints) {
            return [
                Math.floor(roomCoord[0]),
                coord[1],
                Math.floor(roomCoord[2]),
            ]
        }
        
        return [
            roomCoord[0],
            coord[1],
            roomCoord[2]
        ]
    }

    // NEW: Top-left origin coordinate system (parallel to existing system)
    getTopLeftOrigin() {
        return [this.x, this.z + this.length] // Top-left corner
    }

    // Convert world coordinates to room-relative using top-left origin
    getTopLeftRelativeCoords(worldX, worldZ) {
        const [topLeftX, topLeftZ] = this.getTopLeftOrigin()
        return {
            x: worldX - topLeftX,
            z: topLeftZ - worldZ  // Note the flip for Z-axis
        }
    }

    // Convert room-relative coordinates (top-left origin) to world coordinates
    getTopLeftWorldPos(relativeX, relativeZ) {
        const [topLeftX, topLeftZ] = this.getTopLeftOrigin()
        return {
            x: topLeftX + relativeX,
            z: topLeftZ - relativeZ  // Note the flip for Z-axis
        }
    }

    // Check if coordinates are within room bounds using top-left origin
    isInTopLeftRoomBounds(x0, z0) {
        const [topLeftX, topLeftZ] = this.getTopLeftOrigin()
        return x0 >= topLeftX && 
               x0 <= topLeftX + this.width && 
               z0 <= topLeftZ && 
               z0 >= topLeftZ - this.length
    }

    // Get door positions using top-left origin system
    getTopLeftDoorPositions() {
        const door_info = {
            "1x1": [
                [15, 31, 5, 7],    // bottom door (was 15, -1)
                [31, 15, 7, 5],    // right door (stays same)
                [15, -1, 5, 7],    // top door (was 15, 31)
                [-1, 15, 7, 5],    // left door (stays same)
            ],
            "1x2": [
                [15, 63, 5, 7],    // bottom door
                [31, 15, 7, 5],    // right door
                [15, -1, 5, 7],    // top door
                [-1, 15, 7, 5],    // left door
            ],
            "1x3": [
                [15, 95, 5, 7],    // bottom door
                [31, 15, 7, 5],    // right door
                [15, -1, 5, 7],    // top door
                [-1, 15, 7, 5],    // left door
            ],
            "1x4": [
                [15, 127, 5, 7],   // bottom door
                [31, 15, 7, 5],    // right door
                [15, -1, 5, 7],    // top door
                [-1, 15, 7, 5],    // left door
            ],
            "2x2": [
                [15, 63, 5, 7],    // bottom door
                [63, 15, 7, 5],    // right door
                [15, -1, 5, 7],    // top door
                [-1, 15, 7, 5],    // left door
            ],
            "L": [
                [15, 63, 5, 7],    // bottom door
                [63, 15, 7, 5],    // right door
                [15, -1, 5, 7],    // top door
                [-1, 15, 7, 5],    // left door
            ]
        }
        return door_info[this.shape] || door_info["1x1"]
    }
}