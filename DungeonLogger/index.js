import DungeonMap from "./components/DungeonMap"
import { getFloor, onDungeonChange } from "./utils/dungeonChecker"
import { appendToFile } from "./utils/utils"


/** @type {DungeonMap} */
let dungeonMap = null

const scanner = register("tick", () => {
    dungeonMap.scan()

    // Rotation and corner
    for (let i = 0; i < dungeonMap.rooms.length; i++) {
        let room = dungeonMap.rooms[i]

        if (room.corner == null) {
            room.findRotation()
        }
    }

    if (!dungeonMap.fullyScanned) {
        return
    }

    const floor = getFloor()
    const dungeonString = dungeonMap.convertToString(floor)

    if (!dungeonString) {
        ChatLib.chat(`&cCould not convert dungeon to string.`)
        return
    }

    appendToFile("DungeonLogger", "data/dungeons.txt", dungeonString)
    ChatLib.chat(`&aLogged Dungeon`)
    scanner.unregister()
}).unregister()

onDungeonChange(inDungeon => {
    if (inDungeon) {
        dungeonMap = new DungeonMap()
        scanner.register()
    }
    else {
        scanner.unregister()
        dungeonMap = null
    }
})

register("command", () => {
    if (!FileLib.exists("DungeonLogger", "data/dungeons.txt")) {
        ChatLib.chat(`&cNo dungeons logged!`)
        return
    }

    const dungeons = FileLib.read("DungeonLogger", "data/dungeons.txt")

    ChatLib.command(`ct copy ${dungeons}`, true)
    ChatLib.chat(`Copied ${dungeons.split("\n").length} dungeons.`)
}).setName("copydungeons")

register("command", () => {
    if (!dungeonMap) {
        ChatLib.chat(`Not in a dungeon!`)
        return
    }

    const room = dungeonMap.getRoomAt(
        Player.getX(),
        Player.getZ()
    )

    if (!room) {
        ChatLib.chat(`Not in a room!`)
        return
    }

    const la = Player.lookingAt()

    if (!la || !(la instanceof Block)) {
        ChatLib.chat(`Not looking at a block!`)
        return
    }

    const x = la.getX()
    const y = la.getY()
    const z = la.getZ()
    const block = World.getBlockAt(x, y, z)

    const roomCoord = room.getRoomCoord([x, y, z], true)

    if (!roomCoord) {
        ChatLib.chat(`Could not find room coord.`)
        return
    }

    const [x1, y1, z1] = roomCoord

    ChatLib.chat(`${room.getName()} Block: [${x1}, ${y1}, ${z1}]\nName: ${block.type.getRegistryName()} (ID: ${block.type.getID()}) Pos: [${x}, ${y}, ${z}]`)
}).setName("lookingat")