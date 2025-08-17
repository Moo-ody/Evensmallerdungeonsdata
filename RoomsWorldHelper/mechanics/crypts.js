
// let pos1 = null
// let currPrinces = null

// const updateRoomCrypts = (room) => {
//     if (!(room.name in princeObj)) {
//         cryptRenderer.unregister()
//         currPrinces = null
//         return
//     }

//     currPrinces = princeObj[room.name].map((a) => {
//         const pos1 = room.getRealCoord(a[0], true)
//         const pos2 = room.getRealCoord(a[1], true)

//         return [
//             [
//                 Math.min(pos1[0], pos2[0]),
//                 Math.min(pos1[1], pos2[1]),
//                 Math.min(pos1[2], pos2[2]),
//             ],
//             [
//                 Math.max(pos1[0], pos2[0]),
//                 Math.max(pos1[1], pos2[1]),
//                 Math.max(pos1[2], pos2[2]),
//             ]
//         ]
//     })

//     cryptRenderer.register()
// }

// register("command", () => {
//     pos1Renderer.unregister()
//     pos1 = null
//     setter.register()
//     ChatLib.chat(`Select first corner...`)
// }).setName("addcrypt")

// register("command", () => {
//     const room = DmapDungeon.getCurrentRoom(true)
//     if (!room) {
//         return
//     }

//     const princes = princeObj[room.name]
//     if (!princes) {
//         return
//     }

//     const [x0, y0, z0] = room.getRoomCoord([Player.getX(), Player.getY(), Player.getZ()])

//     let closestInd = 0
//     let closestDist = 0

//     for (let i = 1; i < princes.length; i++) {
//         let dist = (princes[i][0] - x0)**2 + (princes[i][1] - y0)**2 + (princes[i][2] - z0)**2

//         if (dist > closestDist) {
//             continue
//         }

//         closestInd = i
//         closestDist = dist
//     }

//     princes.splice(closestInd, 1)

//     if (!princes.length) {
//         delete princeObj[room.name]
//     }

//     princeObj.save()

//     ChatLib.chat(`Deleted Prince`)
//     updateRoomCrypts(room)
// }).setName("delprince")

// const setter = register("playerInteract", (action, _, event) => {
//     if (action.toString() !== "RIGHT_CLICK_BLOCK") {
//         return
//     }

//     const la = Player.lookingAt()
//     if (!la || !(la instanceof Block)) {
//         ChatLib.chat(`No Block!`)
//         return
//     }

//     const x = la.getX()
//     const y = la.getY()
//     const z = la.getZ()

//     if (!pos1) {
//         pos1 = [x, y, z]
//         pos1Renderer.register()
//         return
//     }

//     const x0 = Math.min(x, pos1[0])
//     const y0 = Math.min(y, pos1[1])
//     const z0 = Math.min(z, pos1[2])

//     const x1 = Math.max(x, pos1[0])
//     const y1 = Math.max(y, pos1[1])
//     const z1 = Math.max(z, pos1[2])

//     const room = DmapDungeon.getCurrentRoom(true)

//     if (!room) {
//         ChatLib.chat(`No room!`)
//         return
//     }

//     const roomName = room.getName(false)

//     if (!(roomName in princeObj)) {
//         princeObj[roomName] = []
//     }

//     princeObj[roomName].push([
//         room.getRoomCoord([x0, y0, z0], true),
//         room.getRoomCoord([x1, y1, z1], true)
//     ])

//     princeObj.save()
//     ChatLib.chat(`&aAdded new prince`)
//     updateRoomCrypts(room)

//     pos1Renderer.unregister()
//     pos1 = null

//     setting = false
//     setter.unregister()
// }).unregister()

// DmapDungeon.onRoomExit(() => {
//     pos1Renderer.unregister()
//     pos1 = null

//     setter.unregister()

//     cryptRenderer.unregister()
//     currPrinces = null
// })

// DmapDungeon.onRoomEnter((player, room) => {
//     if (player && player.getName() !== Player.getName() || !room.corner) {
//         return
//     }

//     updateRoomCrypts(room)
// })

// const pos1Renderer = register("renderWorld", () => {
//     renderBoxOutline(pos1[0]+0.5, pos1[1], pos1[2]+0.5, 1, 1, 1, 1, 0, 1, 1, true)
// }).unregister()

// const cryptRenderer = register("renderWorld", () => {
//     for (let i = 0; i < currPrinces.length; i++) {
//         let [x0, y0, z0] = currPrinces[i][0]
//         let [x1, y1, z1] = currPrinces[i][1]

//         renderFilledBoxFromCorners(x0, y0, z0, x1+1, y1+1, z1+1, 0, 1, 0, 0.11, true)
//         renderBoxOutlineFromCorners(x0, y0, z0, x1+1, y1+1, z1+1, 0, 1, 0, 1, 1, true)
//     }
// }).unregister()