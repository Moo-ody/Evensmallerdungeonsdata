

# This is just to generate a list of all of the door locations so that they don't have to be computed at runtime

final = []
for z in range(11):
    for x in range(11):
        if x % 2 == 1 and z % 2 == 1 or x % 2 == 0 and z % 2 == 0:
            continue

        new_x = f"DUNGEON_ORIGIN.0 + {15 + x * 16}"
        new_z = f"DUNGEON_ORIGIN.1 + {15 + z * 16}"

        final.append((new_x, new_z))

print(final)