import { chunkLoaded, DoorTypes } from "../utils/utils"

export default class Door {
    constructor(x, z, gx, gz) {
        this.childRoom = null // The room which leads deeper into the dungeon
        this.parentRoom = null // The room closest to the entrance

        this.type = DoorTypes.NORMAL
        this.rotation = null // 0 has rooms above/below, 90 has rooms either side. 180/270 rotation not possible.
        this.highlighted = false
        
        this.explored = false
        this.opened = true // Only for Wither and Blood doors. This is just so that the dungeon logging doesn't log opened wither doors as normal doors.

        // World x/z coordinates
        this.x = x
        this.z = z

        // Map x/z coordinates (0-10)
        this.gx = gx
        this.gz = gz

        // Dummy doors have an x and z of 0
        if (x == 0 && z == 0) return
        
        this.updateType()
    }

    updateType() {
        if (!chunkLoaded(this.x, 69, this.z)) return

        const id = World.getBlockAt(this.x, 69, this.z).type.getID()

        if (id == 0 || id == 166) return

        if (id == 97) this.type = DoorTypes.ENTRANCE
        if (id == 173) this.type = DoorTypes.WITHER
        if (id == 159) this.type = DoorTypes.BLOOD

        this.opened = false
    }
    setType(type) {
        this.type = type
        return this
    }

    getCoords() {
        return [this.x, 69, this.z]
    }

    toString() {
        return `Door[&7component=${JSON.stringify([this.gx, this.gz])}&f, &dx=${this.x}&f, &dz=${this.z}&f, &erotation=${this.rotation}&f, &aopen=${this.opened}&f]`
    }
}