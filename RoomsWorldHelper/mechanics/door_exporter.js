
// First door will always be the blood door (Exclusive to blood)
// Second door will be the entrance door (Not exclusive to entrance, can be wither door)
// Other doors follow, can spawn anywhere (Can be wither doors)

const x0 = 0
const y0 = 69
const z0 = 0

const DOOR_COUNT = 8

register("command", () => {
    let door_strs = []

    for (let i = 0; i < DOOR_COUNT; i++) {
        let door_x = x0 + i * 6
        
        let door_str = ""
        for (let y = y0; y <= 73; y++) {
            for (let z = z0 - 2; z <= z0 + 2; z++) {
                for (let x = door_x - 2; x <= door_x + 2; x++) {
                    let block = World.getBlockAt(x, y, z)       
                    let id = block.type.getID()
                    let meta = block.getMetadata()

                    let state = id << 4 | meta
                    let str = state.toString(16)

                    door_str += "0".repeat(4 - str.length) + str
                }
            }
        }

        door_strs.push(door_str)
    }

    FileLib.write("RoomsWorldHelper", "door_output/doors.txt", door_strs.join("\n"), true)
    ChatLib.chat(`Wrote ${DOOR_COUNT} doors to door_output/doors.txt`)
}).setName("exportdoors")