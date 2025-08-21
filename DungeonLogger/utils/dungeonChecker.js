
const S3EPacketTeams = Java.type("net.minecraft.network.play.server.S3EPacketTeams")

let inDungeon = false
let floor = null

export const getFloor = () => floor

const dungeonFuncs = []

/**
 * @callback DungeonChangeFunction
 * @param {boolean} inDungeon
 */

/**
 * 
 * @param {DungeonChangeFunction} func 
 */

export const onDungeonChange = (func) => {
    dungeonFuncs.push(func)
}

const setInDungeon = (newState) => {
    if (newState !== inDungeon) {
        for (let i = 0; i < dungeonFuncs.length; i++) {
            dungeonFuncs[i](newState)
        }
    }

    inDungeon = newState

    if (!inDungeon) {
        floor = null
        dungeonChecker.register()
    }
}

const dungeonChecker = register("packetReceived", (packet) => {
    const channel = packet.func_149307_h()
    const teamStr = packet.func_149312_c()

    if (channel !== 2 || !/^team_(\d+)$/.test(teamStr)) {
        return
    }

    const message = packet.func_149311_e().concat(packet.func_149309_f())

    const match = message.match(/^ §7⏣ §cThe Catac§combs §7\((\w+)\)$/)

    if (!match) {
        return
    }

    dungeonChecker.unregister()

    floor = match[1]
    setInDungeon(true)
}).setFilteredClass(S3EPacketTeams)

const scoreboardChecker = register("tick", () => {
    const lines = Scoreboard?.getLines()?.map(a => a.getName().removeFormatting().replace(/[^\u0000-\u007F]/g, "")) ?? []

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]

        let match = line.match(/^\s*The Catacombs \((.{1,3})\)$/)

        if (!match) {
            continue
        }

        floor = match[1]
        setInDungeon(true)
        scoreboardChecker.unregister()

        return
    }
})

register("worldUnload", () => {
    setInDungeon(false)
})