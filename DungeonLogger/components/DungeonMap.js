// import Dungeon from "../../BloomCore/dungeons/Dungeon"
import { chunkLoaded, DoorTypes, RoomTypes, realCoordToComponent, RoomNameMap, getHighestBlock, hashComponent, hashDoorComponent } from "../utils/utils"
import Door from "./Door"
import Room from "./Room"


/**
 * Stores the rooms and doors. Separate from DmapDungeon so that 'fake' dungeons can be created
 * for dungeon logging stuff.
 */
export default class DungeonMap {
    constructor() {
        this.scanCoords = this.getScanCoords()

        /** @type {Room[]} */
        this.rooms = []

        /** @type {Door[]} */
        this.doors = []

        /** @type {Room[]} */
        this.roomIdMap = new Array(256).fill(null) // Each index corresponds to a room id, can contain a room or null if room isn't present in current dungeon

        /** @type {Room[]} */
        this.componentMap = new Array(36).fill(null) // Component 6y+x -> Room or null

        /** @type {Door[]} */
        this.doorComponentMap = new Array(60).fill(null) // 60 possible door locations in a dungeon

        this.fullyScanned = false

        this.secrets = 0
        this.crypts = 0

        this.mapScore = Infinity // How good the map is. Lower values are better.

    }

    /**
     * Merges two rooms
     * @param {Room} room1 
     * @param {Room} room2 
     */
    mergeRooms(room1, room2) {

        if (room1.roomID !== null && room2.roomID !== null && room1.roomID !== room2.roomID) {
            ChatLib.chat(`DUNGEONLOGGER &cRoom mismatch: ${room1.name} is not the same as ${room2.name}!`)
        }

        // Need to remove this room first
        this.removeRoom(room2)

        for (let component of room2.components) {
            if (!room1.hasComponent(component)) {
                room1.addComponent(component, false)
            }

            this.componentMap[hashComponent(component)] = room1
        }

        if (room2.foundSecrets > 0) {
            room1.foundSecrets = room2.foundSecrets
        }

        if (room2.hasMimic) {
            room2.hasMimic = true
        }

        // Refresh all of the room shape stuff
        room1.updateComponents()
    }
    
    /**
     * Adds a room to this DungeonMap. Merges rooms when necessary.
     * @param {Room} room 
     * @returns 
     */
    addRoom(room) {

        for (let component of room.components) {
            let index = 6*component[1] + component[0]
            if (this.componentMap[index]) {
                // ChatLib.chat(`Component ${component[0]}, ${component[1]} already occupied by ${room.toString()}`)
            }
            this.componentMap[index] = room
        }

        if (room.roomID !== null) {
            this.roomIdMap[room.roomID] = room
        }

        this.rooms.push(room)

    }

    /**
     * Removes a room and its roomID. Only used for the logging system.
     * @param {Room} room 
     */
    removeRoom(room) {
        // Unset component map
        for (let component of room.components) {
            let index = hashComponent(component)
            this.componentMap[index] = null
        }

        // Unset room ID map
        if (room.roomID) {
            this.roomIdMap[room.roomID] = null
        }
        
        // And delete the room for good
        for (let i = 0; i < this.rooms.length; i++) {
            if (this.rooms[i] == room) {
                // ChatLib.chat(`Deleted ${this.rooms[i].toString()}`)
                this.rooms.splice(i, 1)
                break
            }
        }
    }

    /**
     * 
     * @param {Door} door 
     */
    addDoor(door) {
        const index = hashDoorComponent([door.gx, door.gz])

        if (index < 0 || index > 59) return

        if (this.doorComponentMap[index]) {
            // ChatLib.chat(`Door already existed at ${door.gz}, ${door.gz} (${index})`)
            this.removeDoorAtIndex(index)
        }

        this.doorComponentMap[index] = door
        this.doors.push(door)
    }

    /**
     * 
     * @param {Door} door 
     */
    removeDoorAtIndex(index) {
        const door = this.doorComponentMap[index]

        if (!door) return

        this.doorComponentMap[index] = null
        for (let i = 0; i < this.doors.length; i++) {
            if (this.doors[i] == door) {
                this.doors.splice(i, 1)
                break
            }
        }
    }

    /**
     * 
     * @param {Room} room 
     * @param {[Number, Number]} component 
     */
    addComponentToRoom(room, component) {
        room.addComponent(component)

        this.componentMap[hashComponent(component)] = room
    }

    checkRoomRotations() {
        for (let room of this.rooms) {
            if (room.rotation !== null) continue
            room.findRotation()
        }
    }

    checkDoorsOpened() {
        for (let door of this.doors) door.checkOpened()
    }

    /**
     * 
     * @param {[Number, Number]} component - 0-10 component 
     * @returns {Door}
     */
    getDoorWithComponent(component) {
        if (component[0] < 0 || component[1] < 0 || component[0] > 11 || component[1] > 11) {
            return null
        }

        const index = hashDoorComponent(component)

        if (index < 0 || index > 59) return null

        return this.doorComponentMap[index]
    }

    /**
     * 
     * @param {Room} childRoom 
     * @param {Room} parentRoom 
     * @returns {Door}
     */
    getDoorBetweenRooms(childRoom, parentRoom) {
        for (let door of childRoom.doors) {

            if (parentRoom.doors.includes(door)) {
                return door
            }
        }

        return null
        // for (let door of this.doors) {
        //     if ((door.childRoom !== childRoom || door.parentRoom !== parentRoom) && (door.childRoom !== parentRoom || door.parentRoom !== childRoom)) continue
        //     return door
        // }
        // return null
    }

    /**
     * 
     * @param {Number} x - Real world coordinate
     * @param {Number} z - Real world coordinate
     * @returns {Room}
     */
    getRoomAt(x, z) {
        const component = realCoordToComponent([x, z])
        const room = this.getRoomWithComponent(component)

        return room
    }

    /**
     * 
     * @param {String} roomName 
     * @returns {Room}
     */
    getRoomFromName(roomName) {
        const roomData = RoomNameMap.get(roomName)

        if (!roomData) return null

        return this.roomIdMap[roomData.roomID]
    }
    
    getRoomFromID(roomID) {
        if (roomID < 0 || roomID > 255) return null

        return this.roomIdMap[roomID]
    }

    /**
     * 
     * @param {[Number, Number]} component - An array of two numbers from 0-5 
     * @returns {Room}
     */
    getRoomWithComponent(component) {
        if (component[0] < 0 || component[1] < 0 || component[0] > 5 || component[1] > 5) {
            return  null
        }

        const index = hashComponent(component)

        if (index < 0 || index > 35) {
            return null
        }

        return this.componentMap[index]
    }

    /**
     * Returns a map containing every possible [gridx, gridy] coordinate mapped to its [realx, realz] coordinate.
     * @returns 
     */
    getScanCoords() {
        const coords = []

        const x0 = -200
        const z0 = -200

        const halfRoomSize = 15
        const halfCombinedSize = 16

        for (let z = 0; z < 11; z++) {
            for (let x = 0; x < 11; x++) {
                if (x%2 && z%2) {
                    continue
                }
                
                let worldX = x0 + halfRoomSize + x * halfCombinedSize
                let worldZ = z0 + halfRoomSize + z * halfCombinedSize

                coords.push({
                    x,
                    z,
                    worldX,
                    worldZ
                })
            }
        }

        return coords
    }

    /**
     * Scans the world for Rooms and Doors. Will not scan the same location more than once.
     */
    scan() {
        // return
        const directions = [
            [16, 0, 1, 0],
            [-16, 0, -1, 0],
            [0, 16, 0, 1],
            [0, -16, 0, -1]
        ]

        const toDelete = [] // Indexes
        for (let i = 0; i < this.scanCoords.length; i++) {
            let { x, z, worldX, worldZ } = this.scanCoords[i]

            // Can't scan areas which aren't loaded yet
            if (!chunkLoaded(worldX, 0, worldZ)) {
                continue
            }

            toDelete.push(i)
            
            let roofHeight = getHighestBlock(worldX, worldZ)

            // There is nothing here
            if (!roofHeight) {
                continue
            }
            
            // Door logic
            if (x%2 == 1 || z%2 == 1) {
                // ChatLib.chat(`&2Checking door component ${x}, ${z}`)
                // Entrance with no gap
                const block = World.getBlockAt(worldX, 69, worldZ)
    
                if (block.type.getRegistryName() == "minecraft:monster_egg") {
                    let door = new Door(worldX, worldZ, x, z)
                    door.type = DoorTypes.ENTRANCE
                    door.opened = false
    
                    this.addDoor(door)
                    continue
                }
    
                // Normal Door
                if (roofHeight < 85) {
                    let door = new Door(worldX, worldZ, x, z)
    
                    if (z%2 == 1) door.rotation = 0
                    door.opened = block.type.getID() == 0
    
                    this.addDoor(door)
                    continue
                }
    
                // No gap entrance door which has already been opened
                if (this.isDoorComponentNextToEntrance(x, z) && World.getBlockAt(worldX, 76, worldZ).type.getID() !== 0) {
                    let door = new Door(worldX, worldZ, x, z).setType(DoorTypes.ENTRANCE)
                    door.opened = block.type.getID() == 0
                    this.addDoor(door)
                }
    
                if (x % 2 == 0 && z > 0 && z < 11) {
                    let topRoom = this.getRoomWithComponent([x/2, (z-1)/2])
                    let bottomRoom = this.getRoomWithComponent([x/2, (z+1)/2])
    
                    if (topRoom && bottomRoom && topRoom !== bottomRoom && topRoom.roofHeight == bottomRoom.roofHeight && roofHeight == topRoom.roofHeight) {
                        // ChatLib.chat(`&dMerging ${topRoom.getName()} and ${bottomRoom.getName()}`)
                        this.mergeRooms(topRoom, bottomRoom)
                    }
                }
    
                if (z % 2 == 0 && x > 0 && x < 11) {
                    let leftRoom = this.getRoomWithComponent([(x-1)/2, z/2])
                    let rightRoom = this.getRoomWithComponent([(x+1)/2, z/2])
    
                    if (leftRoom && rightRoom && leftRoom !== rightRoom && leftRoom.roofHeight == rightRoom.roofHeight && roofHeight == leftRoom.roofHeight) {
                        // ChatLib.chat(`&dMerging ${leftRoom.getName()} and ${rightRoom.getName()}`)
                        this.mergeRooms(leftRoom, rightRoom)
                    }
                }
    
                continue
            }

            // Room
            x >>= 1
            z >>= 1


            let room = this.getRoomWithComponent([x, z])
            if (!room) {
                room = new Room([[x, z]], roofHeight)
                room.scanAndLoad()
                // ChatLib.chat(`Created room ${room.getName()} at ${x}, ${z}`)
                this.addRoom(room)
            }

            // Try to extend this room out or look for doors
            for (let dir of directions) {
                // break
                let [dxWorld, dzWorld, dx, dz] = dir
                
                let roofHeightBlock = World.getBlockAt(worldX + dxWorld, roofHeight, worldZ + dzWorld)
                let aboveBlock = World.getBlockAt(worldX + dxWorld, roofHeight+1, worldZ + dzWorld)

                // No gap entrance yay! Add an entrance door here and then stop looking in this direction
                if (room.type == RoomTypes.ENTRANCE && roofHeightBlock.type.getID() !== 0) {
                    // Extended back part of entrance room
                    if (World.getBlockAt(worldX+dxWorld, 76, worldZ+dzWorld).type.getID() == 0) {
                        continue
                    }

                    let doorInd = hashDoorComponent([x*2+dx, z*2+dz])
                    if (doorInd >= 0 && doorInd < 60) {
                        // ChatLib.chat(`Added entrance door to ${x*2+dx}, ${z*2+dz}`)
                        this.addDoor(new Door(worldX+dxWorld, worldZ+dzWorld, x*2+dx, z*2+dz).setType(DoorTypes.ENTRANCE))
                    }
                    continue
                }

                let newIndex = hashComponent([x+dx, z+dz])
                // Bounds Check
                if (newIndex < 0 || newIndex > 35) {
                    continue
                }

                let existing = this.getRoomWithComponent([x+dx, z+dz])

                if (existing == room) {
                    continue
                }

                // Valid extension
                if (roofHeightBlock.type.getID() !== 0 && aboveBlock.type.getID() == 0) {
                    // Merge with the existing room
                    if (existing) {
                        // ChatLib.chat(`Merged rooms ${room.getName()} (${room.components}) and ${existing.getName()} (${existing.components})`)
                        // Don't merge entrance
                        if (room.name == "Entrance" || existing.name == "Entrance") {
                            continue
                        }

                        this.mergeRooms(room, existing)
                        // ChatLib.chat(`&7After MERGE: ${room.components}`)
                    }
                    // Or add a new component
                    else {
                        // ChatLib.chat(`Extended ${room.getName()} out to ${x+dx}, ${z+dz}`)
                        this.addComponentToRoom(room, [x+dx, z+dz])
                        // ChatLib.chat(`&7After EXTENSION: ${room.components}`)
                    }

                    continue
                }

                // Invalid Extension

            }
        }

        // Filter out all of the indicides which were deleted. Doing it like this is faster since we know that toDelete are all ordered, so once we
        // get to one element in that array, we never have to check the ones behind it
        const temp = []
        let deleteInd = 0
        for (let i = 0; i < this.scanCoords.length; i++) {
            if (toDelete[deleteInd] == i) {
                deleteInd++
                continue
            }
            temp.push(this.scanCoords[i])
        }

        // Update the list
        this.scanCoords = temp

        this.secrets = this.rooms.reduce((a, b) => a + b.secrets, 0)
        this.crypts = this.rooms.reduce((a, b) => a + b.crypts, 0)

        // Dungeon is fully scanned
        if (!this.scanCoords.length) {
            this.fullyScanned = true
        }
    }

    isDoorComponentNextToEntrance(x, z) {
        if (x % 2 == 0) {
            if (this.getRoomWithComponent([x / 2, (z - 1) / 2])?.type == RoomTypes.ENTRANCE) {
                return true
            }
            if (this.getRoomWithComponent([x / 2, (z + 1) / 2])?.type == RoomTypes.ENTRANCE) {
                return true
            }
        }

        if (this.getRoomWithComponent([(x - 1) / 2, z / 2])?.type == RoomTypes.ENTRANCE) {
            return true
        }
        if (this.getRoomWithComponent([(x + 1) / 2, z / 2])?.type == RoomTypes.ENTRANCE) {
            return true
        }

        return false
    }

    /**
     * Returns the string representation of the Dungeon Map which preserves the location and shapes of all of the rooms and doors.
     * 
     * "floor;date;rooms;doors"
     * floor = F5, F7, M5 etc
     * date = unix timestamp
     * rooms = room id padded to 3 characters long. Eg roomid 13 = 013, roomid 7 = 007, roomid 103 = 103 etc. 999 = no room, 998 = unknown room.
     * doors = door type number, 
     * @returns 
     */
    convertToString(floor) {
        let roomStr = ""
        let doorStr = ""

        for (let entry of this.getScanCoords()) {
            let { x, z, worldX, worldZ } = entry

            // Room
            if (!(x%2 || z%2)) {
                let room = this.getRoomWithComponent([x/2, z/2])
                if (!room) {
                    roomStr += "999"
                    continue
                }
                if (room.roomID == null) {
                    roomStr += "998"
                    continue
                }
                let roomID = room.roomID
                roomStr += `${"0".repeat(3 - roomID.toString().length)}${roomID}`
                continue
            }

            // Door
            let door = this.getDoorWithComponent([x, z])
            if (!door) {
                doorStr += "9"
                continue
            }
            doorStr += door.type.toString()
        }

        if (!floor || roomStr == "" || doorStr == "") return null
        return `${floor};${Date.now()};${roomStr};${doorStr}`
    }

}